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
        timezone
      `)
      .eq('slug', slug)
      .single();

    if (error || !data) {
      console.error('❌ Error Supabase:', error);
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    // ✅ Valores que van al frontend (sin convertir horas)
    data.duration_minutes = Number(data.duration_minutes || 30);
    data.max_per_day      = Number(data.max_per_day || 5);
    data.max_per_hour     = Number(data.max_per_hour || 1);
    data.start_hour       = data.start_hour || "08:00";
    data.end_hour         = data.end_hour   || "17:00";

    // ✅ Convertir work_days a [1,2,3,...]
    const dias = {
  Sunday: 0, Monday: 1, Tuesday: 2,
  Wednesday: 3, Thursday: 4,
  Friday: 5, Saturday: 6
};

// DEBUG: muestra los días antes de convertir
console.log('🟡 work_days original en texto:', data.work_days);

// Convierte solo días válidos
data.work_days = (data.work_days || [])
  .filter(d => dias[d] !== undefined)
  .map(d => dias[d]);

console.log('✅ work_days convertidos a números:', data.work_days);

    // Log para confirmar
    console.log("🔁 work_days enviados:", data.work_days);

    res.json(data);
  } catch (e) {
    console.error('❌ /api/public-config error:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
