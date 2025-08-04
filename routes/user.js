// 📁 routes/user.js
import express from 'express';
import { supabase } from '../lib/supabaseClient.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

router.get('/api/user', verifyAuth, async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('❌ Error al recuperar usuario:', error);
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json({
    user: {
      id: userId,
      email: req.user.email,
      ...data,
    },
  });
});

export default router;
