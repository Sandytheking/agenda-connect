import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { verificarSuscripcionActiva } from '../utils/verificarSuscripcionActiva.js';
import { sendReconnectEmail } from '../utils/sendReconnectEmail.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ✅ NUEVO: Endpoint público con fallback
router.get('/api/availability/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { date, time } = req.query;

    if (!slug || !date || !time) {
      return res.status(400).json({ available: false, message: 'Faltan parámetros' });
    }

    const cfg = await getConfigBySlug(slug);
    if (!cfg) {
      return res.status(404).json({ available: false, message: 'Negocio no encontrado en Supabase' });
    }

    const maxPerDay = cfg.max_per_day ?? 5;
    const maxPerHour = cfg.max_per_hour ?? 1;
    const duracion = cfg.duration_minutes ?? 30;

    const [hh, mm] = time.split(':').map(Number);
    const [year, month, day] = date.split('-').map(Number);
    const start = new Date(year, month - 1, day, hh, mm);
    const end = new Date(start.getTime() + duracion * 60000);

    // ✅ Si hay refresh_token, intentamos usar Google Calendar
    if (cfg.refresh_token) {
      try {
        const accessToken = await getAccessToken(cfg.refresh_token, slug);
        const eventos = await getEventsForDay(accessToken, date);

        if (eventos.length >= maxPerDay) {
          return res.json({ available: false, message: 'Día completo (Google)' });
        }

        const solapados = eventos.filter(ev => {
          const s = new Date(ev.start.dateTime || ev.start.date);
          const e = new Date(ev.end.dateTime || ev.end.date);
          return s < end && start < e;
        });

        if (solapados.length >= maxPerHour) {
          return res.json({ available: false, message: 'Hora ocupada (Google)' });
        }

        return res.json({ available: true });
      } catch (err) {
        console.error('⚠️ Error al usar Google Calendar:', err.message);

        // Si el error es "invalid_grant", disparar reconexión
        if (err.message?.includes('invalid_grant') && cfg.calendar_email) {
          await sendReconnectEmail({
            to: cfg.calendar_email,
            nombre: cfg.nombre || slug,
            slug
          });
          console.log(`📧 Correo de reconexión enviado a ${cfg.calendar_email}`);
        }

        // Continuamos con Supabase como fallback
      }
    }

    // 🔁 Fallback: consultar en Supabase
    const { data: citas, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('slug', slug)
      .eq('fecha', date);

    if (error) {
      console.error("❌ Supabase error:", error.message);
      return res.status(500).json({ available: false, message: 'Error al consultar citas' });
    }

    if (citas.length >= maxPerDay) {
      return res.json({ available: false, message: 'Día completo (local)' });
    }

    const solapados = citas.filter(cita => {
      const inicio = new Date(cita.inicio);
      const fin = new Date(cita.fin);
      return inicio < end && start < fin;
    });

    if (solapados.length >= maxPerHour) {
      return res.json({ available: false, message: 'Hora ocupada (local)' });
    }

    return res.json({ available: true });

  } catch (err) {
    console.error('❌ Error en disponibilidad GET:', err);
    res.status(500).json({ available: false, message: 'Error interno' });
  }
});

export default router;
