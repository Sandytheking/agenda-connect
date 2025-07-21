// 📁 routes/disponibilidad.js
import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { verificarSuscripcionActiva } from '../utils/verificarSuscripcionActiva.js';

const router = express.Router();
/* ---------- POST /:slug/disponibilidad (protegida) ---------- */
router.post('/:slug/disponibilidad', async (req, res) => {
   const { slug }       = req.params;

   // 👇 verificar suscripción antes de continuar
  const { valido, mensaje } = await verificarSuscripcionActiva(slug);
  if (!valido) return res.status(403).json({ error: mensaje });

  try {
    const { date, time } = req.body;               // YYYY‑MM‑DD  / HH:mm
    if (!slug || !date || !time) {
      return res.status(400).json({ available:false, message:'Faltan parámetros' });
    }

const cfg = await getConfigBySlug(slug);
if (!cfg || !cfg.refresh_token) {
  return res.status(404).json({ available: false, message: 'Negocio no encontrado' });
}

let access;
try {
  access = await getAccessToken(cfg.refresh_token);
} catch (err) {
  console.error('❌ Error obteniendo token de acceso:', err);

  if (err.code === 401 || err.response?.status === 401) {
    console.log('📩 Intentando enviar correo de reconexión…');
    await sendReconnectEmail({ slug: cfg.slug, email: cfg.email, nombre: cfg.nombre });
 // asegúrate que cfg.email y cfg.slug existan
  }

  return res.status(200).json({ available: false, message: 'No hay horas disponibles' });
}

const events = await getEventsForDay(access, date); // 👈 ESTO FALTABA

if (events.length >= (cfg.max_per_day ?? 5)) {
  return res.json({ available: false, message: 'Día completo' });
}


    // Construir el slot de forma segura
    const [hh, mm]                = time.split(':').map(Number);
    const [year, month, day]      = date.split('-').map(Number);
   const start             = new Date(y, m - 1, d, hh, mm, 0, 0);
   const end               = new Date(start.getTime() + (cfg.duration_minutes ?? 30) * 60000);

    const solapados = events.filter(ev => {
      const s = new Date(ev.start), e = new Date(ev.end);
      return s < slotEnd && slotStart < e;
    });

    if (solapados.length >= (cfg.max_per_hour ?? 1)) {
      return res.json({ available:false, message:'Hora ocupada' });
    }

    return res.json({ available:true });
  } catch (err) {
    console.error('❌ disponibilidad POST:', err);
    res.status(500).json({ available:false, message:'Error interno' });
  }
});

/* ---------- GET /api/availability/:slug (pública) ---------- */
router.get('/api/availability/:slug', async (req, res) => {
  try {
    const { slug }       = req.params;
    const { date, time } = req.query;
    if (!slug || !date || !time) {
      return res.status(400).json({ available:false, message:'Faltan parámetros' });
    }

    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ available:false, message:'Negocio no encontrado' });
    }

    const access = await getAccessToken(cfg.refresh_token);
    const events = await getEventsForDay(access, date);

    if (events.length >= (cfg.max_per_day ?? 5)) {
      return res.json({ available:false, message:'Día completo' });
    }

    const [hh, mm]           = time.split(':').map(Number);
    const [year, month, day] = date.split('-').map(Number);
    const start              = new Date(year, month - 1, day, hh, mm, 0, 0);
    const end                = new Date(start.getTime() +
                              (cfg.duration_minutes ?? 30) * 60000);

    const solapados = events.filter(ev => {
      const s = new Date(ev.start), e = new Date(ev.end);
      return s < end && start < e;
    });

    if (solapados.length >= (cfg.max_per_hour ?? 1)) {
      return res.json({ available:false, message:'Hora ocupada' });
    }

    res.json({ available:true });
  } catch (err) {
    console.error('❌ disponibilidad GET:', err);
    res.status(500).json({ available:false, message:'Error interno' });
  }
});

export default router;
