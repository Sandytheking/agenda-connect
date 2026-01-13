// 📁 utils/sendPromotionalCampaign.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const buildPromotionalEmail = (recipientName = 'Emprendedor') => {
  const registerLink = 'https://agenda-connect.com/registro'; // Cambia si tienes un link con UTM: ?utm_source=email&utm_campaign=promo_ene2026

  return `
    <!DOCTYPE html>
    <html lang="es" style="margin: 0; padding: 0;">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>¡Digitaliza tu negocio con AgendaConnect!</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 0 0 20px 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 50px 20px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 2.8em; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">📅 AgendaConnect</h1>
          <p style="margin: 15px 0 0; font-size: 1.4em; opacity: 0.95;">El sistema de citas que tu negocio necesita</p>
        </div>

        <!-- Contenido Principal -->
        <div style="padding: 40px 30px; background: rgba(255,255,255,0.95);">
          <p style="font-size: 1.2em; margin-bottom: 20px;">¡Hola <strong style="color: #667eea;">${recipientName}</strong>!</p>
          
          <p style="margin-bottom: 25px; color: #444; font-size: 1.1em;">
            ¿Cansado de perder citas por WhatsApp, llamadas perdidas o agendas en papel?<br/>
            <strong>AgendaConnect</strong> te ayuda a recibir reservas en línea 24/7, sin esfuerzo.
          </p>
          
          <div style="background: #f0f7ff; padding: 25px; border-radius: 12px; border-left: 5px solid #4facfe; margin: 30px 0;">
            <h3 style="margin: 0 0 15px; color: #1e40af; text-align: center;">✨ Lo que obtienes gratis:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #333; line-height: 1.8;">
              <li>Enlace personalizado para compartir (Instagram, Facebook, WhatsApp)</li>
              <li>Agenda automática con recordatorios</li>
              <li>Panel para gestionar horarios y duración de citas</li>
              <li>Notificaciones por email al instante</li>
              <li>Sin tarjetas ni contratos complicados</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${registerLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 1.2em; box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4); transition: transform 0.2s;"
               onmouseover="this.style.transform='scale(1.05)'"
               onmouseout="this.style.transform='scale(1)'">
              🚀 Crear mi agenda gratis ahora
            </a>
          </div>
          
          <p style="text-align: center; margin: 30px 0 0; font-style: italic; color: #667eea; font-size: 1.1em;">
            Miles de negocios en República Dominicana ya confían en nosotros.<br/>
            <strong>¡Es tu turno de crecer!</strong> 🌟
          </p>
        </div>

        <!-- Footer -->
        <div style="padding: 25px 30px; background: rgba(0,0,0,0.05); text-align: center; color: #666; font-size: 0.9em; border-top: 1px solid rgba(255,255,255,0.2);">
          <p style="margin: 0 0 10px;">— El equipo de <strong>AgendaConnect</strong></p>
          <p style="margin: 0;">
            <a href="mailto:support@agenda-connect.com" style="color: #667eea; text-decoration: none;">support@agenda-connect.com</a> | 
            <a href="https://agenda-connect.com" style="color: #667eea; text-decoration: none;">agenda-connect.com</a>
          </p>
          <p style="margin: 15px 0 0; font-size: 0.8em;">
            ¿No te interesa? <a href="#" style="color: #999; text-decoration: underline;">Darte de baja aquí</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export async function sendPromotionalCampaign({ to, name }) {
  const recipientName = name ? name.trim().split(' ')[0] : 'Emprendedor'; // Usa solo el primer nombre si viene

  try {
    await resend.emails.send({
      from: 'AgendaConnect <hola@agenda-connect.com>',
      to,
      subject: '🚀 Digitaliza tus citas gratis con AgendaConnect – ¡En minutos!',
      html: buildPromotionalEmail(recipientName),
    });
    console.log(`📧 Email promocional enviado a ${to}`);
  } catch (error) {
    console.error('❌ Error al enviar email promocional:', error.message);
  }
}