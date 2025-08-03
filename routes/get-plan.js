//routes/get-plan.js

import express from 'express';
import { supabase } from '../lib/supabaseClient.js';
import { verifyAuth } from '../middlewares/verifyAuth.js';

const router = express.Router();

router.get('/api/get-plan', verifyAuth, async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('clients')
    .select('plan')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('❌ Error obteniendo plan:', error.message);
    return res.status(500).json({ error: 'No se pudo obtener el plan' });
  }

  res.json(data); // { plan: 'pro' }
});

export default router;
