// 📁 routes/config.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from '../middleware/verifyAuth.js';
import { getConfigBySlug } from '../supabaseClient.js';


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

router.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const client = await getConfigBySlug(slug);

    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    console.log("🔍 config recibido del backend:", client); // ← aquí debe salir per_day_config
    return res.json(client);
  } catch (err) {
    console.error('❌ Error en GET /config/:slug:', err);
    return res.status(500).json({ error: 'Error inesperado' });
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
  per_day_config
} = req.body;

if (
  typeof max_per_day !== 'number' ||
  typeof max_per_hour !== 'number' ||
  typeof duration_minutes !== 'number'
) {
  return res.status(400).json({ error: 'Faltan campos requeridos o están mal formateados' });
}

if (!Array.isArray(work_days) || work_days.length === 0) {
  return res.status(400).json({ error: 'Debes indicar al menos un día laborable' });
}

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
        //start_hour,
        //end_hour,
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
