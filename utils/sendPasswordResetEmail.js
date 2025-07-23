
//Password Reset

import nodemailer from 'nodemailer';

export async function sendPasswordResetEmail(to, token) {
  const resetUrl = `https://www.agenda-connect.com/restablecer-password/${token}`;


  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: `"Agenda Connect" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: 'Recuperar tu contraseña',
    html: `
      <p>Hola,</p>
      <p>Haz clic en el siguiente enlace para recuperar tu contraseña:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>Este enlace expirará en 1 hora.</p>
      <p>Agenda Connect.</p>
    `
  });
}
