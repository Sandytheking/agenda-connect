//update-plan.js

import express from 'express';
import { supabase } from '../lib/supabaseClient.js';

const router = express.Router();

router.post('/api/update-plan', async (req, res) => {
  const { slug, nuevoPlan } = req.body;

  if (!slug || !nuevoPlan) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const { error } = await supabase
    .from('clients')
    .update({ plan: nuevoPlan })
    .eq('slug', slug); // <-- usamos slug ahora

  if (error) {
    console.error('Error al actualizar plan:', error.message);
    return res.status(500).json({ error: 'Error al actualizar el plan' });
  }

  res.json({ success: true });
});

export default router;
