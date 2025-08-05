// 📁api/update-plan.js
import express from 'express';
import { supabase } from '../lib/supabaseClient.js'; // tu singleton que usa SERVICE_ROLE_KEY
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

router.post('/api/update-plan', verifyAuth, async (req, res) => {
  const { slug, nuevoPlan } = req.body;
  if (!nuevoPlan) return res.status(400).json({ error: 'Falta nuevoPlan' });

  try {
    let cliente;
    if (slug) {
      const { data, error } = await supabase
        .from('clients')
        .select('id, user_id, slug')
        .eq('slug', slug)
        .single();
      if (error || !data) return res.status(404).json({ error: 'Cliente no encontrado por slug' });
      cliente = data;
    } else {
      const { data, error } = await supabase
        .from('clients')
        .select('id, user_id, slug')
        .eq('user_id', req.user.id)
        .single();
      if (error || !data) return res.status(404).json({ error: 'Cliente no encontrado por user_id' });
      cliente = data;
    }

    if (cliente.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado para modificar este cliente' });
    }

    const { error: updateError } = await supabase
      .from('clients')
      .update({ plan: nuevoPlan })
      .eq('id', cliente.id);

    if (updateError) {
      console.error('Error actualizando plan', updateError);
      return res.status(500).json({ error: 'Error actualizando plan' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('update-plan exception', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
