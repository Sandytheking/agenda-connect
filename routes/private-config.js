// 📁 routes/private-config.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { verificarJWT } from '../middleware/verificarJWT.js';


const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─────────────────────────────────────────────────────────────
// 🔐 GET configuración usando user_id (ruta privada)
// ─────────────────────────────────────────────────────────────
router.get('/', verificarJWT, async (req, res) => {
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    return res.json(data);
  } catch (err) {
    console.error('❌ Error en GET /private-config:', err);
    return res.status(500).json({ error: 'Error inesperado' });
  }
});

// ─────────────────────────────────────────────────────────────
// 🔐 PUT configuración usando user_id (ruta privada)
// ─────────────────────────────────────────────────────────────
router.put('/', verificarJWT, async (req, res) => {
  const userId = req.user.id;

  const {
    max_per_day,
    max_per_hour,
    duration_minutes,
    work_days,
    timezone,
    activo,
    plan,
    per_day_config,
  } = req.body;

  console.log("📥 Body recibido en PUT /private-config:", JSON.stringify(req.body, null, 2));

  if (
    typeof max_per_day !== 'number' ||
    typeof max_per_hour !== 'number' ||
    typeof duration_minutes !== 'number'
  ) {
    return res.status(400).json({ error: 'Faltan campos requeridos o están mal formateados' });
  }

if (res.status === 404) {
  setError('Tu cuenta no está completamente configurada. Contacta soporte.');
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
        max_per_day,
        max_per_hour,
        duration_minutes,
        work_days,
        per_day_config,
        timezone,
        plan,
        activo,
      })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error al actualizar configuración:', error);
      return res.status(500).json({ error: 'Error al actualizar configuración' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ PUT /private-config error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
