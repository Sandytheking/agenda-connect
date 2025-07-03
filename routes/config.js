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
      .select(
        `
          max_per_day,
          max_per_hour,
          duration_minutes,
          work_days,
          start_hour,
          end_hour,
          timezone
        `
      )
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

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
    work_days,          // ← nuevo  (array de strings ej: ["Mon","Tue"])
    start_hour,         // ← nuevo  (string "09" … "17")
    end_hour,           // ← nuevo  (string "18" … "22")
    timezone            // ← opcional ("America/Santo_Domingo")
  } = req.body;

  // ─── Validaciones mínimas ───────────────────────────────
  if (!max_per_day || !max_per_hour) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  if (!start_hour || !end_hour) {
    return res
      .status(400)
      .json({ error: 'Debes indicar hora de inicio y fin de trabajo' });
  }
  if (!Array.isArray(work_days) || work_days.length === 0) {
    return res
      .status(400)
      .json({ error: 'Debes indicar al menos un día laborable' });
  }

  try {
    const { error } = await supabase
      .from('clients')
      .update({
        max_per_day: Number(max_per_day),
        max_per_hour: Number(max_per_hour),
        duration_minutes: duration_minutes ? Number(duration_minutes) : null,
        work_days,          // text[] en la DB
        start_hour,         // guardado como texto (ej: "09")
        end_hour,           // guardado como texto (ej: "18")
        timezone            // opcional
      })
      .eq('slug', slug);

    if (error) {
      console.error('❌ Error al actualizar configuración:', error);
      return res
        .status(500)
        .json({ error: 'Error al actualizar configuración' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ PUT /api/config error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
