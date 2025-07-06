// 📁 routes/publicConfig.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const diasSemana = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
        timezone
      `)
      .eq('slug', slug)
      .single();

    if (error || !data) {
      console.error('❌ Error Supabase:', error);
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    // Formatear numéricos
    data.duration_minutes = Number(data.duration_minutes || 30);
    data.start_hour       = Number(data.start_hour?.split(':')[0] || 8);  // "08:00" → 8
    data.end_hour         = Number(data.end_hour?.split(':')[0] || 17);   // "17:00" → 17
    data.max_per_day      = Number(data.max_per_day || 5);
    data.max_per_hour     = Number(data.max_per_hour || 1);

    // Convertir días de texto ("Monday") a número (1=Lunes)
    data.work_days = (data.work_days || []).map(d => diasSemana.indexOf(d));

    res.json(data);

  } catch (e) {
    console.error('❌ /api/public-config error:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
