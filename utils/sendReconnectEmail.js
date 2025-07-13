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
export async function sendReconnectEmail({ to, nombre, slug }) {
  try {
    await transporter.sendMail({
      from: `"Agenda Connect" <${process.env.SMTP_USER}>`,
      to,
      subject: '⚠️ Conexión con Google Calendar expirada',
      html: `
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Tu integración con Google Calendar ha expirado.</p>
        <p>Por favor, haz clic en el siguiente botón para volver a conectar tu cuenta:</p>
        <p><a href="https://agenda-connect.com/oauth/start?slug=${slug}" style="display:inline-block;padding:10px 20px;background:#0066ff;color:white;text-decoration:none;border-radius:5px;">🔗 Reconectar Google Calendar</a></p>
        <p>Gracias,<br/>Agenda Connect</p>
      `
    });

    console.log(`📧 Correo de reconexión enviado a ${to}`);
  } catch (err) {
    console.error("❌ Error real al enviar el correo:", err.message || err);
    throw new Error("Error al enviar el correo");
  }
}
