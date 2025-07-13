// 📁 routes/testEmail.js
import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

// Transportador SMTP con Gmail
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // TLS (puerto 587)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Endpoint de prueba
router.get('/api/test-email', async (req, res) => {
  try {
    await transporter.sendMail({
      from: `"Agenda Connect" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // te lo envías a ti mismo
      subject: '🚀 Prueba de correo desde Agenda Connect',
      html: `
        <p>¡Hola!</p>
        <p>Este es un correo de prueba enviado desde el servidor de Agenda Connect.</p>
        <p>✅ Si recibes este mensaje, la configuración SMTP está funcionando.</p>
      `
    });

    res.json({ success: true, message: '📧 Correo de prueba enviado correctamente' });
  } catch (err) {
    console.error("❌ Error al enviar correo de prueba:", err.message);
    res.status(500).json({ success: false, error: 'Error al enviar el correo' });
  }
});

export default router;
