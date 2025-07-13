// 📁 utils/sendReconnectEmail.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,       // ej: smtp.gmail.com, smtp.resend.com
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Envía un correo al cliente para reconectar Google Calendar.
 * @param {Object} options
 * @param {string} options.to - Correo del cliente
 * @param {string} options.slug - Identificador del negocio
 * @param {string} options.nombre - Nombre del negocio
 */
export async function sendReconnectEmail({ to, slug, nombre }) {
  const url = `https://agenda-connect.onrender.com/api/oauth/start?slug=${slug}`;

  const html = `
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>Tu conexión con Google Calendar ha caducado o fue revocada.</p>
    <p>Haz clic en el siguiente botón para reconectarla:</p>
    <p>
      <a href="${url}" style="
        padding: 10px 20px;
        background-color: #4CAF50;
        color: white;
        text-decoration: none;
        border-radius: 5px;
        display: inline-block;">
        Reconectar Google Calendar
      </a>
    </p>
    <p>Gracias por usar Agenda Connect.</p>
  `;

  await transporter.sendMail({
    from: `"Agenda Connect" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reconecta tu cuenta de Google Calendar',
    html
  });
}
