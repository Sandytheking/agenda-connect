
// 📁 routes/update-plan.js
import express from 'express';
import { supabase } from '../lib/supabaseClient.js';
import { verifyAuth } from '../middlewares/verifyAuth.js';

const router = express.Router();

router.post('/api/update-plan', verifyAuth, async (req, res) => {
  const userId = req.user.id; // viene del token JWT
  const { nuevoPlan } = req.body;

  if (!nuevoPlan) {
    return res.status(400).json({ error: 'Plan no proporcionado' });
  }

  const { error } = await supabase
    .from('clients')
    .update({ plan: nuevoPlan })
    .eq('user_id', userId);

  if (error) {
    console.error('Error al actualizar plan:', error.message);
    return res.status(500).json({ error: 'Error al actualizar el plan' });
  }

  res.json({ success: true });
});

export default router;
