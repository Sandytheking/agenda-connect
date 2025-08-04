// 📁api/update-plan.js
import express from 'express';
import { supabase } from '../lib/supabaseClient.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

router.post('/api/update-plan', verifyAuth, async (req, res) => {
  const { slug, nuevoPlan } = req.body;

  if (!slug || !nuevoPlan) {
    return res.status(400).json({ error: 'Faltan datos (slug o plan)' });
  }

  // Asegúrate de que el slug pertenezca al user_id autenticado
  const { data: cliente, error: fetchError } = await supabase
    .from('clients')
    .select('id, user_id')
    .eq('slug', slug)
    .single();

  if (fetchError || !cliente) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  if (cliente.user_id !== req.user.id) {
    return res.status(403).json({ error: 'No autorizado para modificar este cliente' });
  }

  const { error: updateError } = await supabase
    .from('clients')
    .update({ plan: nuevoPlan })
    .eq('slug', slug);

  if (updateError) {
    console.error('Error al actualizar plan:', updateError.message);
    return res.status(500).json({ error: 'Error al actualizar el plan' });
  }

  res.json({ success: true });
});

export default router;
