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

router.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    // 1. Buscar cliente por slug
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('slug', slug)
      .single();

    if (clientError || !client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // 2. Buscar configuración existente
    const { data: config, error: configError } = await supabase
      .from('config')
      .select('*')
      .eq('client_id', client.id)
      .single();

    // 3. Si existe la config, la devolvemos
    if (config) {
      return res.json(config);
    }

    // 4. Si no existe, creamos una configuración por defecto
    const defaultConfig = {
      client_id: client.id,
      max_per_day: 2,
      max_per_hour: 2,
      duration_minutes: 30,
      work_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      horarios: {
        Monday: { entrada: '08:00', salida: '17:00', almuerzoInicio: null, almuerzoFin: null },
        Tuesday: { entrada: '08:00', salida: '17:00', almuerzoInicio: null, almuerzoFin: null },
        Wednesday: { entrada: '08:00', salida: '17:00', almuerzoInicio: null, almuerzoFin: null },
        Thursday: { entrada: '08:00', salida: '17:00', almuerzoInicio: null, almuerzoFin: null },
        Friday: { entrada: '08:00', salida: '17:00', almuerzoInicio: null, almuerzoFin: null },
        Saturday: { entrada: '08:00', salida: '12:00', almuerzoInicio: null, almuerzoFin: null },
        Sunday: { entrada: '00:00', salida: '00:00', almuerzoInicio: null, almuerzoFin: null }
      },
      per_day_config: null, // para no romper tu frontend actual
      created_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase.from('config').insert(defaultConfig);

    if (insertError) {
      return res.status(500).json({ error: 'Error creando configuración por defecto' });
    }

    return res.json(defaultConfig);
  } catch (err) {
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
    //start_hour,
    //end_hour,
    timezone,
    per_day_config // ← 🆕 este es el nuevo campo que enviaremos desde el frontend
  } = req.body;

  if (!max_per_day || !max_per_hour) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });

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
        //start_hour,
        //end_hour,
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
