// 📁 routes/olvideContrasena.js

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 📧 Transportador usando tus variables SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false, // true solo si usas puerto 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

router.post('/', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email es requerido' });
  }

  try {
    const { data: user, error: userError } = await supabase
      .from('clients')
      .select('id, business_name')
      .eq('email', email)
      .single();

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

export default router;
