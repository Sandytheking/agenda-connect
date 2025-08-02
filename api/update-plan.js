//update-plan.js

import express from 'express';
import { supabase } from '/lib/supabaseClient.js'; // Ajusta la ruta

const router = express.Router();

router.post('/api/update-plan', async (req, res) => {
  const { userId, nuevoPlan } = req.body;

  if (!userId || !nuevoPlan) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const { error } = await supabase
    .from('clients')
    .update({ plan: nuevoPlan })
    .eq('id', userId);

  if (error) {
    console.error('Error al actualizar plan:', error.message);
    return res.status(500).json({ error: 'Error al actualizar el plan' });
  }

  res.json({ success: true });
});

export default router;
