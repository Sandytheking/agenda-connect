// 📁 routes/olvideContrasena.js

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/sendPasswordResetEmail.js'; // ajusta la ruta según tu estructura

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.post('/', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email es requerido' });
  }

  try {
    const { data: user, error: userError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('email', email)
      .single();

    // Aunque no exista el email, respondemos igual para evitar revelar usuarios
    if (userError || !user) {
      return res.status(200).json({ message: 'Correo enviado si existe' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

    await supabase.from('password_reset').insert([
      {
        token,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
      },
    ]);

    // ✅ Usamos tu función modular para enviar el email
    await sendPasswordResetEmail(email, token);

    res.status(200).json({ message: 'Correo enviado correctamente' });
  } catch (err) {
    console.error('❌ Error al enviar el correo:', err);
    res.status(500).json({ error: 'Error al enviar correo' });
  }
});

export default router;
