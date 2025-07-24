// 📁 routes/olvideContrasena.js

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/sendPasswordResetEmail.js';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post('/', async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();

  if (!email) {
    console.log('❌ Email no proporcionado en el body');
    return res.status(400).json({ error: 'Email es requerido' });
  }

  console.log('📩 Solicitud de reset recibida para:', email);

  try {
    const { data: user, error: userError } = await supabase
      .from('clients')
      .select('id, email, nombre, user_id') // 👈 aseguramos tener el user_id
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.log('⚠️ No se encontró el usuario:', email);
      return res.status(200).json({ message: 'Correo enviado si existe' });
    }

    console.log('✅ Usuario encontrado:', user.nombre);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

    // 👇 Aquí ahora también guardamos user_id en password_resets
    const { error: insertError } = await supabase
     await supabase
  .from('password_resets') 
  .insert([
    {
      token,
      email: user.email, 
      user_id: user.id, // ✅ ← esto es lo que faltaba
      expires_at: expiresAt.toISOString(),
    },
  ]);


    if (insertError) {
      console.error('❌ Error al insertar token:', insertError);
      return res.status(500).json({ error: 'No se pudo generar token' });
    }

    console.log('🔐 Token generado y guardado');

    await sendPasswordResetEmail(email, token);
    console.log('✅ Email de recuperación enviado a:', email);

    res.status(200).json({ message: 'Correo enviado correctamente' });
  } catch (err) {
    console.error('❌ Error general al procesar solicitud de recuperación:', err);
    res.status(500).json({ error: 'Error al enviar correo' });
  }
});

export default router;
