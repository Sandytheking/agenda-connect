// 📁 routes/publicConfig.js  (ES‑modules)
import express        from 'express';
import { createClient } from '@supabase/supabase-js';

const router   = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 *  GET /api/public-config/:slug
 *  Sin autenticación – datos públicos para el formulario externo
 */
router.get('/api/public-config/:slug', async (req, res) => {
  const { slug } = req.params;
console.log('[public-config] slug recibido =', slug);

  try {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        nombre,
        work_days,          -- text[]
        start_hour,
        end_hour,
        duration_minutes,
        max_per_day,
        max_per_hour,
        timezone
      `)
      .eq('slug', slug)
      .single();

    if (error || !data)
      return res.status(404).json({ error: 'Negocio no encontrado' });

    // 💡 conviértelo a números donde convenga
    data.duration_minutes = Number(data.duration_minutes || 30);
    data.start_hour       = Number(data.start_hour);
    data.end_hour         = Number(data.end_hour);
    data.max_per_day      = Number(data.max_per_day || 5);
    data.max_per_hour     = Number(data.max_per_hour || 1);
    data.work_days        = (data.work_days || []).map(Number); // ["1","2"] → [1,2]

    res.json(data);

  } catch (e) {
    console.error('❌ /api/public-config error:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
