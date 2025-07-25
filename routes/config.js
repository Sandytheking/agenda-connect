// 📁 routes/config.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

// ───────────────────────────────────────────────────────────
//  Supabase
// ───────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY          // ⬅️  role‑level key
);

// ───────────────────────────────────────────────────────────
//  GET /api/config/:slug   (protegido)
// ───────────────────────────────────────────────────────────

router.get('/api/config/:slug', verifyAuth, async (req, res) => {
  const { slug } = req.params;

  try {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        max_per_day,
        max_per_hour,
        duration_minutes,
        work_days,
        start_hour,
        end_hour,
        timezone,
        per_day_config  -- 🆕 Añadido aquí
      `)
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    // Aseguramos defaults por si vienen null
    data.duration_minutes = Number(data.duration_minutes || 30);
    data.max_per_day      = Number(data.max_per_day || 5);
    data.max_per_hour     = Number(data.max_per_hour || 1);
    data.start_hour       = data.start_hour || "08:00";
    data.end_hour         = data.end_hour   || "17:00";
    data.work_days        = (data.work_days || []).map(String);

    // ✅ Garantizar que per_day_config sea un objeto (incluso si null)
    data.per_day_config = data.per_day_config || {};

    res.json(data);
  } catch (err) {
    console.error('❌ GET /api/config error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// ───────────────────────────────────────────────────────────
//  PUT /api/config/:slug   (protegido)
// ───────────────────────────────────────────────────────────

router.put('/api/config/:slug', verifyAuth, async (req, res) => {
  const { slug } = req.params;

  const {
    max_per_day,
    max_per_hour,
    duration_minutes,
    work_days,
    start_hour,
    end_hour,
    timezone,
    per_day_config // ← 🆕 este es el nuevo campo que enviaremos desde el frontend
  } = req.body;

  if (!max_per_day || !max_per_hour) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  if (!start_hour || !end_hour) {
    return res.status(400).json({ error: 'Debes indicar hora de inicio y fin de trabajo' });
  }
  if (!Array.isArray(work_days) || work_days.length === 0) {
    return res.status(400).json({ error: 'Debes indicar al menos un día laborable' });
  }

  // ✅ Validación opcional para per_day_config (si se desea hacer)
  if (per_day_config && typeof per_day_config !== 'object') {
    return res.status(400).json({ error: 'Formato inválido para per_day_config' });
  }

  try {
    const { error } = await supabase
      .from('clients')
      .update({
        max_per_day: Number(max_per_day),
        max_per_hour: Number(max_per_hour),
        duration_minutes: duration_minutes ? Number(duration_minutes) : null,
        work_days,
        start_hour,
        end_hour,
        timezone,
        per_day_config // ← 🆕 nuevo campo JSONB
      })
      .eq('slug', slug);

    if (error) {
      console.error('❌ Error al actualizar configuración:', error);
      return res.status(500).json({ error: 'Error al actualizar configuración' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ PUT /api/config error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});



export default router;
