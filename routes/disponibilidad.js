// 📁 routes/disponibilidad.js
import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { verificarSuscripcionActiva } from '../utils/verificarSuscripcionActiva.js';
import { sendReconnectEmail } from '../utils/sendReconnectEmail.js'; // Asegúrate que el path sea correcto

const router = express.Router();

/* ---------- POST /:slug/disponibilidad (protegida) ---------- */
router.post('/:slug/disponibilidad', async (req, res) => {
  const { slug } = req.params;

  // Validar suscripción
  const { valido, mensaje } = await verificarSuscripcionActiva(slug);
  if (!valido) return res.status(403).json({ available: false, message: mensaje });

  try {
    const { date, time } = req.body;
    if (!slug || !date || !time) {
      return res.status(400).json({ available: false, message: 'Faltan parámetros' });
    }

    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ available: false, message: 'Negocio no encontrado' });
    }

    // 🔁 Intentar obtener token válido
    let access;
    try {
      access = await getAccessToken(cfg.refresh_token);
    } catch (err) {
      console.error('⚠️ Error al obtener access token:', err.message);
      await sendReconnectEmail(slug);
      return res.status(401).json({ available: false, message: '⛔ Conexión a Google Calendar vencida. Se ha enviado un correo al dueño.' });
    }

    const events = await getEventsForDay(access, date);
    if (events.length >= (cfg.max_per_day ?? 5)) {
      return res.json({ available: false, message: 'Día completo' });
    }

    const [hh, mm] = time.split(':').map(Number);
    const [year, month, day] = date.split('-').map(Number);
    const start = new Date(year, month - 1, day, hh, mm, 0, 0);
    const end = new Date(start.getTime() + (cfg.duration_minutes ?? 30) * 60000);

    const solapados = events.filter(ev => {
      const s = new Date(ev.start), e = new Date(ev.end);
      return s < end && start < e;
    });

    if (solapados.length >= (cfg.max_per_hour ?? 1)) {
      return res.json({ available: false, message: 'Hora ocupada' });
    }

    res.json({ available: true });

  } catch (err) {
    console.error('❌ Error en disponibilidad POST:', err);
    res.status(500).json({ available: false, message: 'Error interno' });
  }
});

export default router;
