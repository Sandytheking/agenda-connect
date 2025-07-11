// 📁 routes/disponibilidad.js
import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { parseDateTime, getSlotDates, toDateString } from '../utils/fechas.js';

const router = express.Router();

/* ---------- POST /:slug/disponibilidad (protegida) ---------- */
router.post('/:slug/disponibilidad', async (req, res) => {
  try {
    const { slug } = req.params;
    const { date, time } = req.body; // YYYY-MM-DD / HH:mm
    if (!slug || !date || !time) {
      return res.status(400).json({ available: false, message: 'Faltan parámetros' });
    }

    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ available: false, message: 'Negocio no encontrado' });
    }

    const timezone = cfg.timezone || 'America/Santo_Domingo';
    const access = await getAccessToken(cfg.refresh_token);
    const dateTime = parseDateTime(date, time);
    const dateStr = toDateString(dateTime);
    const events = await getEventsForDay(access, dateStr, timezone);

    if (events.length >= (cfg.max_per_day ?? 5)) {
      return res.json({ available: false, message: 'Día completo' });
    }

    // Construir el slot en UTC para comparación (servidor en UTC)
    const { start, end } = getSlotDates(date, time, cfg.duration_minutes ?? 30);

    console.log('Disponibilidad POST - start (UTC):', start.toISO());
    console.log('Disponibilidad POST - end (UTC):', end.toISO());

    const solapados = events.filter(ev => {
      const s = DateTime.fromISO(ev.start, { zone: 'utc' });
      const e = DateTime.fromISO(ev.end, { zone: 'utc' });
      console.log('Evento existente:', { start: ev.start, end: ev.end });
      return s < end && start < e;
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
    const { date, time } = req.query; // YYYY-MM-DD / HH:mm
    if (!slug || !date || !time) {
      return res.status(400).json({ available: false, message: 'Faltan parámetros' });
    }

    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ available: false, message: 'Negocio no encontrado' });
    }

    const timezone = cfg.timezone || 'America/Santo_Domingo';
    const access = await getAccessToken(cfg.refresh_token);
    const dateTime = parseDateTime(date, time);
    const dateStr = toDateString(dateTime);
    const events = await getEventsForDay(access, dateStr, timezone);

    if (events.length >= (cfg.max_per_day ?? 5)) {
      return res.json({ available: false, message: 'Día completo' });
    }

    // Construir el slot en UTC para comparación (servidor en UTC)
    const { start, end } = getSlotDates(date, time, cfg.duration_minutes ?? 30);

    console.log('Disponibilidad GET - start (UTC):', start.toISO());
    console.log('Disponibilidad GET - end (UTC):', end.toISO());

    const solapados = events.filter(ev => {
      const s = DateTime.fromISO(ev.start, { zone: 'utc' });
      const e = DateTime.fromISO(ev.end, { zone: 'utc' });
      console.log('Evento existente:', { start: ev.start, end: ev.end });
      return s < end && start < e;
    });

    if (solapados.length >= (cfg.max_per_hour ?? 1)) {
      return res.json({ available: false, message: 'Hora ocupada' });
    }

    return res.json({ available: true });
  } catch (err) {
    console.error('❌ disponibilidad GET:', err);
    res.status(500).json({ available: false, message: 'Error interno' });
  }
});

export default router;