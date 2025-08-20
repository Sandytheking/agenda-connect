//routes/contact.js

import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

router.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  // Validación de campos
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    // Configuración del transporte
    const transporter = nodemailer.createTransport({
      service: "gmail", // Puedes cambiar a otro SMTP si usas un proveedor diferente
      auth: {
        user: process.env.EMAIL_USER, // tu correo en variable de entorno
        pass: process.env.EMAIL_PASS, // tu App Password
      },
    });

    // Opciones del correo
    const mailOptions = {
      from: `"Agenda Connect" <${process.env.EMAIL_USER}>`,
      to: "tu-correo@ejemplo.com", // aquí recibes el mensaje
      subject: "📩 Nuevo mensaje desde la página de Agenda Connect",
      html: `
        <h2>Nuevo mensaje de contacto</h2>
        <p><b>Nombre:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Mensaje:</b></p>
        <p>${message}</p>
      `,
    };

    // Enviar correo
    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: "Mensaje enviado correctamente 🚀" });
  } catch (error) {
    console.error("Error enviando correo:", error);
    res.status(500).json({ error: "Error al enviar el mensaje" });
  }
});

export default router;
