import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';

const router = express.Router();

function pad(n) {
  return n.toString().padStart(2, '0');
}

/* ---------- POST /:slug/disponibilidad (protegida) ---------- */
router.post('/:slug/disponibilidad', async (req, res) => {
  try {
    const { slug } = req.params;
    const { dateTime } = req.body; // Esperado: YYYY-MM-DDTHH:mm:ss-04:00
    if (!slug || !dateTime) {
      return res.status(400).json({ available: false, message: 'Faltan parámetros' });
    }

    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ available: false, message: 'Negocio no encontrado' });
    }

    const timezone = cfg.timezone || 'America/Santo_Domingo';
    const access = await getAccessToken(cfg.refresh_token);

    // Parsear dateTime
    const dateTimeMatch = dateTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!dateTimeMatch) {
      return res.status(400).json({ available: false, message: 'Formato de dateTime inválido' });
    }
    const [_, y, m, d, hh, mm] = dateTimeMatch.map(Number);
    const date = `${y}-${pad(m)}-${pad(d)}`;

    const events = await getEventsForDay(access, date, timezone);

    if (events.length >= (cfg.max_per_day ?? 5)) {
      return res.json({ available: false, message: 'Día completo' });
    }

    // Construir el slot en UTC para comparación
    const start = new Date(Date.UTC(y, m - 1, d, hh + 4, mm));
    const end = new Date(start.getTime() + (cfg.duration_minutes ?? 30) * 60000);

    console.log('Disponibilidad POST - start (UTC):', start.toISOString());
    console.log('Disponibilidad POST - end (UTC):', end.toISOString());

    const solapados = events.filter(ev => {
      const s = new Date(ev.start);
      const e = new Date(ev.end);
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
    const { dateTime } = req.query; // Esperado: YYYY-MM-DDTHH:mm:ss-04:00
    if (!slug || !dateTime) {
      return res.status(400).json({ available: false, message: 'Faltan parámetros' });
    }

    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ available: false, message: 'Negocio no encontrado' });
    }

    const timezone = cfg.timezone || 'America/Santo_Domingo';
    const access = await getAccessToken(cfg.refresh_token);

    // Parsear dateTime
    const dateTimeMatch = dateTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!dateTimeMatch) {
      return res.status(400).json({ available: false, message: 'Formato de dateTime inválido' });
    }
    const [_, y, m, d, hh, mm] = dateTimeMatch.map(Number);
    const date = `${y}-${pad(m)}-${pad(d)}`;

    const events = await getEventsForDay(access, date, timezone);

    if (events.length >= (cfg.max_per_day ?? 5)) {
      return res.json({ available: false, message: 'Día completo' });
    }

    // Construir el slot en UTC para comparación
    const start = new Date(Date.UTC(y, m - 1, d, hh + 4, mm));
    const end = new Date(start.getTime() + (cfg.duration_minutes ?? 30) * 60000);

    console.log('Disponibilidad GET - start (UTC):', start.toISOString());
    console.log('Disponibilidad GET - end (UTC):', end.toISOString());

    const solapados = events.filter(ev => {
      const s = new Date(ev.start);
      const e = new Date(ev.end);
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