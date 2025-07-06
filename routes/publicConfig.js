// 📁 routes/publicConfig.js  (ES‑modules)
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

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
  console.log('[public-config] slug recibido =>', slug);  // 🪵 LOG 1

  try {
    // TEMPORAL: seleccionar todo para debug
    const { data, error } = await supabase
      .from('clients')
      .select('*')            // 👈 selecciona todos los campos temporalmente
      .eq('slug', slug)
      .single();

    console.log('[public-config] resultado =>', { data, error });  // 🪵 LOG 2

    if (error || !data) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    // 💡 puedes devolverlo sin procesar por ahora
    return res.json(data);

  } catch (e) {
    console.error('❌ /api/public-config ERROR:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
