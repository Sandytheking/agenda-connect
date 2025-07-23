// 📁 routes/olvideContrasena.js

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Configura tu transportador de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail', // o smtp
  auth: {
    user: process.env.EMAIL_USER, // tu correo
    pass: process.env.EMAIL_PASS, // tu contraseña o app password
  },
});

router.post('/', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email es requerido' });
  }

  try {
    // Buscar usuario
    const { data: user, error: userError } = await supabase
      .from('clients')
      .select('id, business_name')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(200).json({ message: 'Correo enviado si existe' }); // no revelamos si existe
    }

    // Generar token seguro
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

    // Guardar token
    await supabase.from('password_reset').insert([
      {
        token,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
      },
    ]);

    // Construir enlace
    const link = `https://agenda-connect.com/restablecer-contrasena?token=${token}`;

    // Enviar correo
    await transporter.sendMail({
      from: `"Agenda Connect" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Restablecer contraseña',
      html: `
        <p>Hola <b>${user.business_name}</b>,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva:</p>
        <p><a href="${link}">Restablecer contraseña</a></p>
        <p>Este enlace expirará en 1 hora.</p>
        <br>
        <p>Si no solicitaste este cambio, ignora este mensaje.</p>
      `,
    });

    res.json({ success: true, message: 'Correo enviado' });
  } catch (error) {
    console.error('❌ Error al procesar olvideContrasena:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
