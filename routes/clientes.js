// routes/clientes.js
import express from 'express';
import { verificarJWT } from '../middleware/verificarJWT.js';
import { supabase } from '../supabaseClient.js'; // Asegúrate que este archivo exporte bien

const router = express.Router();

// ✅ GET /api/clientes – Obtener todos los clientes (🔒 protegido)
router.get('/', verificarJWT, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id, nombre, slug, email, subscription_valid_until')
      .order('subscription_valid_until', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST /api/clientes/:slug/renovar – Renovar suscripción manual (🔒 protegido)
router.post('/:slug/renovar', verificarJWT, async (req, res) => {
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
      .update({
        subscription_valid_until: nuevaFecha.toISOString(),
        activo: true
      })
      .eq('slug', slug);

    if (updateError) throw updateError;

    res.json({ success: true, nuevaFecha });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
