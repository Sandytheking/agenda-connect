import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Envía un correo para que el cliente reconecte su Google Calendar.
 * @param {Object} params
 * @param {string} params.to - Email destino
 * @param {string} params.nombre - Nombre del negocio o cliente
 * @param {string} params.slug - Identificador del negocio
 */
export async function sendReconnectEmail({ to, nombre, slug }) {
  console.log('📧 Preparando correo para:', to);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // true si usas 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const reconnectUrl = `https://agenda-connect.com/api/oauth/start?slug=${slug}`;

  const mailOptions = {
    from: `"Agenda Connect" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reconecta tu Google Calendar en Agenda Connect',
    html: `
      <p>Hola ${nombre},</p>
      <p>Detectamos que tu conexión con Google Calendar ha expirado o se revocó.</p>
      <p>Para seguir recibiendo tus citas automáticamente, por favor haz clic en el siguiente botón para reconectar:</p>
      <p style="text-align:center; margin: 20px 0;">
        <a href="${reconnectUrl}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reconectar Google Calendar</a>
      </p>
      <p>Si no reconoces este correo, ignóralo.</p>
      <p>Gracias por usar Agenda Connect.</p>
    `
  };

  try {
    console.log('🚀 Intentando enviar correo...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo enviado:', info.messageId);
  } catch (error) {
    console.error('❌ Error enviando correo:', error);
    throw error;
  }
}
