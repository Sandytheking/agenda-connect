// 📁 routes/disponibilidad.js  (ES‑modules)
import express from 'express';
import { getConfigBySlug }       from '../supabaseClient.js';
import { getAccessToken,
         getEventsForDay }       from '../utils/google.js';

const router = express.Router();

/* ---------- POST  /:slug/disponibilidad   (protegida) ---------- */
router.post('/:slug/disponibilidad', async (req, res) => {
  try {
    const { slug }       = req.params;
    const { date, time } = req.body;               // date = 'YYYY-MM-DD'

    if (!slug || !date || !time) {
      return res.status(400).json({ available:false, message:'Faltan parámetros' });
    }

    /* 1. Config */
    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ available:false, message:'Negocio no encontrado' });
    }

    /* 2. Eventos del día */
    const access  = await getAccessToken(cfg.refresh_token);
    const eventos = await getEventsForDay(access, date);

    /* 3. Límite diario */
    if (eventos.length >= (cfg.max_per_day || 5)) {
      return res.json({ available:false, message:'Día completo' });
    }

    /* 4. Construir slot seguro */
    const [year, month, day] = date.split('-').map(Number);
    const [hh,   mm]         = time.split(':').map(Number);

    const start = new Date(year, month - 1, day, hh, mm, 0); // local
    const end   = new Date(start.getTime() + (cfg.duration_minutes || 30) * 60000);

    /* 5. Colisión */
    const chocan = eventos.filter(ev => {
      const s = new Date(ev.start), e = new Date(ev.end);
      return s < end && start < e;
    });

    if (chocan.length >= (cfg.max_per_hour || 1)) {
      return res.json({ available:false, message:'Hora ocupada' });
    }

    return res.json({ available:true });

  } catch (err) {
    console.error('❌ disponibilidad POST:', err);
    res.status(500).json({ available:false, message:'Error interno' });
  }
});

/* ---------- GET  /api/availability/:slug   (pública) ---------- */
router.get('/api/availability/:slug', async (req, res) => {
  try {
    const { slug }       = req.params;
    const { date, time } = req.query;

    if (!slug || !date || !time) {
      return res.status(400).json({ available:false, message:'Faltan parámetros' });
    }

    /* 1. Config */
    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ available:false, message:'Negocio no encontrado' });
    }

    /* 2. Eventos */
    const access  = await getAccessToken(cfg.refresh_token);
    const eventos = await getEventsForDay(access, date);

    /* 3. Límite diario */
    if (eventos.length >= (cfg.max_per_day || 5)) {
      return res.json({ available:false, message:'Día completo' });
    }

    /* 4. Slot */
    const [year, month, day] = date.split('-').map(Number);
    const [hh,   mm]         = time.split(':').map(Number);

    const start = new Date(year, month - 1, day, hh, mm, 0);
    const end   = new Date(start.getTime() + (cfg.duration_minutes || 30) * 60000);

    /* 5. Colisión */
    const chocan = eventos.filter(ev => {
      const s = new Date(ev.start), e = new Date(ev.end);
      return s < end && start < e;
    });

    if (chocan.length >= (cfg.max_per_hour || 1)) {
      return res.json({ available:false, message:'Hora ocupada' });
    }

    return res.json({ available:true });

  } catch (err) {
    console.error('❌ disponibilidad GET:', err);
    res.status(500).json({ available:false, message:'Error interno' });
  }
});

/* -------------------------------------------------------------- */
export default router;
