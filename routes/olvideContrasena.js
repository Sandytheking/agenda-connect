// 📁 routes/olvideContrasena.js

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/sendPasswordResetEmail.js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('📦 SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('🔑 SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 10) + '...');


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
      .select('id, nombre')
      .ilike('email', email)
      .single();

console.log('🔎 Resultado Supabase:', user, userError);


    if (userError || !user) {
      console.log('⚠️ No se encontró el usuario:', email);
      return res.status(200).json({ message: 'Correo enviado si existe' });
    }

    console.log('✅ Usuario encontrado:', user.name);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

    const { error: insertError } = await supabase.from('password_reset').insert([
      {
        token,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
      },
    ]);

    if (insertError) {
      console.error('❌ Error al insertar token:', JSON.stringify(insertError, null, 2));
      return res.status(500).json({ error: 'No se pudo generar token' });
    }

    console.log('🔐 Token generado y guardado');

    // ✅ Aquí se llama la función que está fallando silenciosamente
    await sendPasswordResetEmail(email, token);

    console.log('✅ Email de recuperación enviado a:', email);

    res.status(200).json({ message: 'Correo enviado correctamente' });
  } catch (err) {
    console.error('❌ Error general al procesar solicitud de recuperación:', err);
    res.status(500).json({ error: 'Error al enviar correo' });
  }
});

export default router;
