// 📁 routes/contact.js
import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: "Faltan campos" });
    }

    // Configuración del transporter con Gmail
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false, // true si usas 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // ✉️ Correo hacia ti (el dueño de la página)
    await transporter.sendMail({
      from: `"Agenda Connect" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL, // <-- receptor final
      subject: "📩 Nuevo mensaje de contacto",
      html: `
        <h2>Nuevo mensaje desde el formulario</h2>
        <p><b>Nombre:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Mensaje:</b></p>
        <p>${message}</p>
      `,
    });

    // (Opcional) ✉️ Auto-respuesta al usuario
    await transporter.sendMail({
      from: `"Agenda Connect" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "✅ Hemos recibido tu mensaje",
      html: `
        <p>Hola <b>${name}</b>,</p>
        <p>Gracias por contactarnos. Hemos recibido tu mensaje y te responderemos pronto.</p>
        <br/>
        <p>Saludos,<br/>Equipo Agenda Connect</p>
      `,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error al enviar correo:", error);
    res.status(500).json({ success: false, error: "Error al enviar mensaje" });
  }
});

export default router;
