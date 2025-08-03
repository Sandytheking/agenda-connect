// update-plan.js
import express from 'express';
import { supabase } from '../lib/supabaseClient.js';
import { authenticateUser } from '../middleware/authenticateUser.js';

const router = express.Router();

router.post('/api/update-plan', authenticateUser, async (req, res) => {
  const { slug, nuevoPlan } = req.body;
  const userId = req.user?.id;

  if (!slug || !nuevoPlan || !userId) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  // Validar que el cliente con ese slug pertenece al usuario
  const { data: cliente, error } = await supabase
    .from('clients')
    .select('id')
    .eq('slug', slug)
    .eq('user_id', userId)
    .single();

  if (error || !cliente) {
    return res.status(403).json({ error: 'No tienes permiso para cambiar este plan' });
  }

  const { error: updateError } = await supabase
    .from('clients')
    .update({ plan: nuevoPlan })
    .eq('id', cliente.id);

  if (updateError) {
    console.error('Error al actualizar plan:', updateError.message);
    return res.status(500).json({ error: 'Error al actualizar el plan' });
  }

  res.json({ success: true });
});

export default router;
