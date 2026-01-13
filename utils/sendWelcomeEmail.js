// 📁 emails/sendWelcomeEmail.js
import nodemailer from "nodemailer";

export async function sendWelcomeEmail({ to, name, slug }) {
  const link = `https://api.agenda-connect.com/form.html?slug=${slug}`;
  
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
    <!DOCTYPE html>
    <html lang="es" style="margin: 0; padding: 0;">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bienvenido a AgendaConnect</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 0 0 20px 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px 20px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 2.5em; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">🎉 ¡Bienvenido!</h1>
          <p style="margin: 10px 0 0; font-size: 1.1em; opacity: 0.9;">A <strong>AgendaConnect</strong> – Tu agenda en línea lista para brillar</p>
        </div>

        <!-- Contenido Principal -->
        <div style="padding: 40px 30px; background: rgba(255,255,255,0.95);">
          <p style="font-size: 1.1em; margin-bottom: 20px;">¡Hola <strong style="color: #667eea;">${name}</strong>!</p>
          
          <p style="margin-bottom: 20px; color: #555;">Gracias por unirte a <strong>AgendaConnect</strong>. Ya puedes empezar a recibir citas de tus clientes de forma fácil y profesional. 🚀</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; border-left: 4px solid #4facfe; margin-bottom: 30px;">
            <p style="margin: 0 0 15px; font-weight: 600; color: #333;">Tu enlace personalizado:</p>
            <p style="margin: 0 0 20px; font-size: 0.95em; color: #666;">Comparte esto con tus clientes para que agenden citas directamente.</p>
            <a href="${link}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 1em; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); transition: transform 0.2s; text-align: center; width: 100%; box-sizing: border-box;"
               onmouseover="this.style.transform='scale(1.02)'"
               onmouseout="this.style.transform='scale(1)'">
              👉 Reservar Cita: ${slug}
            </a>
          </div>
          
          <p style="margin-bottom: 20px; color: #555;">Personaliza tu horario, duración de citas y más desde tu <strong>panel de administración</strong>. Si necesitas ayuda, ¡estamos aquí!</p>
          
          <p style="text-align: center; margin-bottom: 0; font-style: italic; color: #4facfe;">¡Estamos emocionados de verte crecer con nosotros! 🌟</p>
        </div>

        <!-- Footer -->
        <div style="padding: 20px 30px; background: rgba(0,0,0,0.05); text-align: center; color: #666; font-size: 0.9em; border-top: 1px solid rgba(255,255,255,0.2);">
          <p style="margin: 0 0 10px;">— El equipo de <strong>AgendaConnect</strong></p>
          <p style="margin: 0;"><a href="mailto:agendaconnectinfo@gmail.com" style="color: #667eea; text-decoration: none;">support@agenda-connect.com</a> | <a href="https://agenda-connect.com" style="color: #667eea; text-decoration: none;">Visita nuestro sitio</a></p>
          <p style="margin: 10px 0 0; font-size: 0.8em;">Si no solicitaste este email, ignóralo. <a href="#" style="color: #999;">Darte de baja</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: '"AgendaConnect" <no-reply@agenda-connect.com>',
    to,
    subject: "🎉 ¡Bienvenido a AgendaConnect – Tu primera cita espera!",
    html,
  });
}