// 📁 routes/disponibilidad.js
import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { DateTime } from 'luxon';
import { getDateTimeFromStrings } from '../utils/fechas.js';

const router = express.Router();

/* ---------- POST /:slug/disponibilidad (protegida) ---------- */
router.post('/:slug/disponibilidad', async (req, res) => {
  try {
    const { slug } = req.params;
    const { date, time } = req.body;

    if (!slug || !date || !time) {
      return res.status(400).json({ available: false, message: 'Faltan parámetros' });
    }

    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ available: false, message: 'Negocio no encontrado' });
    }

    const timezone = cfg.timezone || 'America/Santo_Domingo';
    const access = await getAccessToken(cfg.refresh_token);
    const events = await getEventsForDay(access, date);

    if (events.length >= (cfg.max_per_day ?? 5)) {
      return res.json({ available: false, message: 'Día completo' });
    }

    const slotStart = getDateTimeFromStrings(date, time, timezone);
    const slotEnd = slotStart.plus({ minutes: cfg.duration_minutes ?? 30 });

    const solapados = events.filter(ev => {
      const s = DateTime.fromISO(ev.start, { zone: timezone });
      const e = DateTime.fromISO(ev.end, { zone: timezone });
      return s < slotEnd && slotStart < e;
    });

    if (solapados.length >= (cfg.max_per_hour ?? 1)) {
      return res.json({ available: false, message: 'Hora ocupada' });
    }

    return res.json({ available: true });

  } catch (err) {
    console.error('❌ disponibilidad POST:', err);
    res.status(500).json({ available: false, message: 'Error interno' });
  }
});

/* ---------- GET /api/availability/:slug (pública) ---------- */
router.get('/api/availability/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { date, time } = req.query;

    if (!slug || !date || !time) {
      return res.status(400).json({ available: false, message: 'Faltan parámetros' });
    }

    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ available: false, message: 'Negocio no encontrado' });
    }

    const timezone = cfg.timezone || 'America/Santo_Domingo';
    const access = await getAccessToken(cfg.refresh_token);
    const events = await getEventsForDay(access, date);

    if (events.length >= (cfg.max_per_day ?? 5)) {
      return res.json({ available: false, message: 'Día completo' });
    }

    const start = getDateTimeFromStrings(date, time, timezone);
    const end = start.plus({ minutes: cfg.duration_minutes ?? 30 });

    const solapados = events.filter(ev => {
      const s = DateTime.fromISO(ev.start, { zone: timezone });
      const e = DateTime.fromISO(ev.end, { zone: timezone });
      return s < end && start < e;
    });

    if (solapados.length >= (cfg.max_per_hour ?? 1)) {
      return res.json({ available: false, message: 'Hora ocupada' });
    }

    res.json({ available: true });

  } catch (err) {
    console.error('❌ disponibilidad GET:', err);
    res.status(500).json({ available: false, message: 'Error interno' });
  }
});

export default router;
