
// 📁 emails/sendWelcomeEmail.js
import nodemailer from "nodemailer";

export async function sendWelcomeEmail({ to, name, slug }) {
  const link = `https://agenda-connect.com/cliente/${slug}`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const html = `
    <div style="font-family: sans-serif; line-height: 1.5;">
      <h1 style="color: #0C1A1A;">¡Bienvenido a Agenda-Connect!</h1>
      <p>Hola <strong>${name}</strong>,</p>
      <p>Gracias por registrarte en <strong>AgendaConnect</strong>. Ya puedes comenzar a recibir citas en línea.</p>
      <p>Este es tu enlace personalizado para compartir con tus clientes:</p>
      <p><a href="${link}" style="font-size: 1.2em;">👉 ${link}</a></p>
      <p>Puedes configurar tu horario, duración de citas y otros detalles desde tu panel de administración.</p>
      <p>¡Estamos felices de tenerte con nosotros!</p>
      <br>
      <p>— El equipo de AgendaConnect</p>
    </div>
  `;

  await transporter.sendMail({
    from: '"AgendaConnect" <no-reply@agenda-connect.com>',
    to,
    subject: "🎉 Bienvenido a AgendaConnect",
    html,
  });
}
