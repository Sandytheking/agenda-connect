import express from 'express';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const router = express.Router();

// Configura Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configura el transporte SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

router.post('/api/restablecer-password', async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: 'El correo es obligatorio' });

  // Buscar cliente
  const { data: client, error } = await supabase
    .from('clients')
    .select('id, name')
    .eq('email', email)
    .single();

  // No revelamos si el correo existe o no
  if (error || !client) {
    return res.json({
      success: true,
      message: 'Si el correo está registrado, se ha enviado un enlace',
    });
  }

  // Generar token y fecha de expiración (1 hora)
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();

  // Insertar en tabla password_reset
  await supabase.from('password_reset').insert({
    token,
    user_id: client.id,
    expires_at: expiresAt,
  });

  const resetLink = `https://agenda-connect.com/restablecer-password?token=${token}`;

  // Enviar correo
  try {
    await transporter.sendMail({
      from: `"Agenda Connect" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🔐 Restablece tu contraseña',
      html: `
        <p>Hola ${client.name || ''},</p>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p><b>Este enlace expirará en 1 hora.</b></p>
      `,
    });

    res.json({ success: true, message: 'Correo enviado' });
  } catch (err) {
    console.error('Error al enviar el correo:', err);
    res.status(500).json({ error: 'Error al enviar el correo' });
  }
});

export default router;
