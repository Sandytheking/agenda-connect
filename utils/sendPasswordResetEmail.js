//Password Reset

import nodemailer from 'nodemailer';

export async function sendPasswordResetEmail(to, token) {
  const resetUrl = `https://www.agenda-connect.com/restablecer-password/${token}`;

console.log('📧 Configuración SMTP:');
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // true si usas puerto 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const html = `
    <div style="font-family: sans-serif; line-height: 1.5;">
      <h2>Recupera tu contraseña</h2>
      <p>Hola,</p>
      <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p><strong>Este enlace expirará en 1 hora.</strong></p>
      <br>
      <p>Agenda Connect</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: '"Agenda Connect" <no-reply@agenda-connect.com>',
      to,
      subject: '🔐 Recupera tu contraseña - Agenda Connect',
      html,
    });
    console.log('✅ Email de recuperación enviado a:', to);
  } catch (error) {
    console.error('❌ Error al enviar correo de recuperación:', error);
    throw error;
  }
}
