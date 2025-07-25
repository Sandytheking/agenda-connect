// 📁 routes/publicConfig.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


router.get('/api/public-config/:slug', async (req, res) => {
  const { slug } = req.params;
  console.log('[public-config] slug recibido =>', slug);

  try {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        nombre,
        work_days,
        start_hour,
        end_hour,
        duration_minutes,
        max_per_day,
        max_per_hour,
        timezone,
        per_day_config  -- 🆕 añadido aquí
      `)
      .eq('slug', slug)
      .single();

    if (error || !data) {
      console.error('❌ Error Supabase:', error);
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    // Valores con fallback por si vienen null
    data.duration_minutes = Number(data.duration_minutes || 30);
    data.max_per_day      = Number(data.max_per_day || 5);
    data.max_per_hour     = Number(data.max_per_hour || 1);
    data.start_hour       = data.start_hour || "08:00";
    data.end_hour         = data.end_hour   || "17:00";
    data.work_days        = (data.work_days || []).map(String);
    data.per_day_config   = data.per_day_config || {}; // 🆕 aseguramos estructura

    console.log('✅ work_days convertidos a números:', data.work_days);
    console.log('🔁 per_day_config:', data.per_day_config);

    res.json(data);
  } catch (e) {
    console.error('❌ /api/public-config error:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
