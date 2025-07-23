// 📁 routes/solicitarReset.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/sendPasswordResetEmail.js'; // crearás esto

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.post('/', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  // Verificar si el email existe en clients
  const { data: cliente } = await supabase.from('clients').select().eq('email', email).single();
  if (!cliente) return res.status(404).json({ error: 'Email no encontrado' });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

  await supabase.from('password_reset').insert({
  email,
  token,
  expires_at: expires.toISOString()
});


  // Enviar correo
  await sendPasswordResetEmail(email, token);

  res.json({ message: 'Correo de recuperación enviado' });
});

export default router;
