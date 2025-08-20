// 📁 routes/contact.js
import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

router.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // 🔍 Validación de campos
    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ success: false, message: "Todos los campos son obligatorios ❌" });
    }

    // 📧 Configuración del transporte SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com", // 👈 cambia según tu proveedor
      port: process.env.SMTP_PORT || 465,
      secure: process.env.SMTP_SECURE === "true" || true, // true para 465, false para 587
      auth: {
        user: process.env.EMAIL_USER, // tu correo desde .env
        pass: process.env.EMAIL_PASS, // tu contraseña de app / clave SMTP
      },
    });

    // ✉️ Opciones del correo
    const mailOptions = {
      from: `"Agenda Connect" <${process.env.EMAIL_USER}>`,
      to: process.env.RECEIVER_EMAIL || process.env.EMAIL_USER, // lo recibes aquí
      subject: "📩 Nuevo mensaje desde Agenda Connect",
      html: `
        <h2>Nuevo mensaje de contacto</h2>
        <p><b>Nombre:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Mensaje:</b><br/>${message}</p>
      `,
    };

    // 🚀 Enviar correo
    await transporter.sendMail(mailOptions);

    return res
      .status(200)
      .json({ success: true, message: "Correo enviado con éxito ✅" });
  } catch (error) {
    console.error("❌ Error enviando correo:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error al enviar el mensaje ❌" });
  }
});

export default router;
