// 📁 routes/config.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Crear cliente de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 👉 Obtener configuración del cliente por slug
router.get('/api/config/:slug', async (req, res) => {
  const slug = req.params.slug;

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('max_per_day, max_per_hour, duration_minutes')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    res.json(data);
  } catch (err) {
    console.error("❌ Error interno en GET /api/config/:slug", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 👉 Actualizar configuración del cliente por slug
router.put('/api/config/:slug', async (req, res) => {
  const slug = req.params.slug;
  const { max_per_day, max_per_hour, duration_minutes } = req.body;

  if (!max_per_day || !max_per_hour) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .update({
        max_per_day: Number(max_per_day),
        max_per_hour: Number(max_per_hour),
        duration_minutes: duration_minutes ? Number(duration_minutes) : null
      })
      .eq('slug', slug);

    if (error) {
      console.error("❌ Error al actualizar configuración:", error);
      return res.status(500).json({ error: "Error al actualizar configuración" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error interno en PUT /api/config/:slug", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
