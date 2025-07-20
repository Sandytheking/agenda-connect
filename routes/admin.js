// routes/admin.js

import express from 'express';
import { supabase } from '../supabaseClient.js'; // Asegúrate que este también use `export`

const router = express.Router();

// ✅ Obtener todos los clientes
router.get('/clients', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id, nombre, slug, email, subscription_valid_until')
      .order('subscription_valid_until', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Renovar suscripción manual (+30 días)
router.post('/clients/:slug/renovar', async (req, res) => {
  try {
    const { slug } = req.params;

    const { data, error } = await supabase
      .from('clients')
      .select('subscription_valid_until')
      .eq('slug', slug)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Cliente no encontrado' });

    const fechaActual = data.subscription_valid_until
      ? new Date(data.subscription_valid_until)
      : new Date();

    if (isNaN(fechaActual)) return res.status(400).json({ error: 'Fecha inválida' });

    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setDate(nuevaFecha.getDate() + 30);

    const { error: updateError } = await supabase
      .from('clients')
      .update({ subscription_valid_until: nuevaFecha.toISOString() })
      .eq('slug', slug);

    if (updateError) return res.status(500).json({ error: updateError.message });

    res.json({ success: true, nuevaFecha });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
