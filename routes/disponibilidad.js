// 📁 routes/disponibilidad.js          (ES Module)
import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';

const router = express.Router();

/* ---------- POST /:slug/disponibilidad (versión protegida) ---------- */
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

    const access = await getAccessToken(cfg.refresh_token);
    const events = await getEventsForDay(access, date);

    // Límite diario
    if (events.length >= (cfg.max_per_day ?? 5)) {
      return res.json({ available: false, message: 'Día completo' });
    }

    // Construir fecha segura
    const [hh, mm] = time.split(':').map(Number);
    const [year, month, day] = date.split('-').map(Number);
    const slotStart = new Date(y, m - 1, d, hh, mm, 0, 0);
    const slotEnd   = new Date(slotStart.getTime() + (cfg.duration_minutes || 30) * 60000);

    const solapados = events.filter(ev => {
      const s = new Date(ev.start), e = new Date(ev.end);
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

/* ---------- GET /api/availability/:slug (pública p/ iframe) ---------- */
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

    const access = await getAccessToken(cfg.refresh_token);
    const events = await getEventsForDay(access, date);

    // Límite diario
    if (events.length >= (cfg.max_per_day ?? 5)) {
      return res.json({ available: false, message: 'Día completo' });
    }

    // Construir fecha segura
    const [hh, mm] = time.split(':').map(Number);
    const [year, month, day] = date.split('-').map(Number);
    const start = new Date(year, month - 1, day, h, m, 0);
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
    console.error('❌ disponibilidad GET:', err);
    res.status(500).json({ available: false, message: 'Error interno' });
  }
});

export default router;
