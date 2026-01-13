// 📁 utils/sendCancellationNotification.js (actualizado)
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Helper para formatear hora a 12h con AM/PM
 */
function formatTimeTo12h(timeStr) {
  if (!timeStr || !timeStr.includes(':')) return timeStr; // Fallback si no es válido
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12; // Convierte 0 a 12
  return `${h12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Escapar HTML para seguridad
 */
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * HTML para notificar cancelación al dueño (sin cambios)
 */
const buildCancellationNotificationEmail = (cliente, fecha, hora, negocio) => {
  const formattedHour = formatTimeTo12h(hora); // ← Nueva línea: formatea aquí
  return `
    <!DOCTYPE html>
    <html lang="es" style="margin: 0; padding: 0;">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cita Cancelada</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 0 0 20px 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #e11d48 0%, #dc3545 100%); padding: 40px 20px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 2.5em; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">🗑️ Cancelada</h1>
          <p style="margin: 10px 0 0; font-size: 1.1em; opacity: 0.9;">Cita en <strong>${escapeHtml(negocio)}</strong></p>
        </div>

        <!-- Contenido Principal -->
        <div style="padding: 40px 30px; background: rgba(255,255,255,0.95);">
          <p style="font-size: 1.1em; margin-bottom: 20px;">¡Hola, dueño de <strong style="color: #e11d48;">${escapeHtml(negocio)}</strong>!</p>
          
          <p style="margin-bottom: 20px; color: #555;">Lamentamos informarte que un cliente ha cancelado su cita. Revisa los detalles y ajusta tu agenda si es necesario. 😔</p>
          
          <div style="background: #f8d7da; padding: 20px; border-radius: 12px; border-left: 4px solid #dc3545; margin-bottom: 30px;">
            <p style="margin: 0 0 15px; font-weight: 600; color: #721c24;">Detalles de la cita cancelada:</p>
            <ul style="margin: 0; padding-left: 20px; color: #721c24;">
              <li><strong>Cliente:</strong> ${escapeHtml(cliente)}</li>
              <li><strong>Fecha:</strong> ${escapeHtml(fecha)}</li>
              <li><strong>Hora:</strong> ${escapeHtml(formattedHour)}</li> <!-- ← Usa el formateado -->
              <li><strong>Negocio:</strong> ${escapeHtml(negocio)}</li>
            </ul>
          </div>
          
          <p style="text-align: center; margin: 20px 0 0; font-style: italic; color: #e11d48;">¡No te preocupes, hay más citas por venir! Programa nuevas desde tu panel. 💪</p>
        </div>

        <!-- Footer -->
        <div style="padding: 20px 30px; background: rgba(0,0,0,0.05); text-align: center; color: #666; font-size: 0.9em; border-top: 1px solid rgba(255,255,255,0.2);">
          <p style="margin: 0 0 10px;">— El equipo de <strong>AgendaConnect</strong></p>
          <p style="margin: 0;"><a href="mailto:agendaconnectinfo@gmail.com" style="color: #667eea; text-decoration: none;">support@agenda-connect.com</a> | <a href="https://agenda-connect.com" style="color: #667eea; text-decoration: none;">Visita nuestro sitio</a></p>
          <p style="margin: 10px 0 0; font-size: 0.8em;">Notificación automática. <a href="#" style="color: #999;">Darte de baja</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export async function sendCancellationNotification({ to, cliente, fecha, hora, negocio }) {
  try {
    await resend.emails.send({
      from: 'Agenda Connect <notificaciones@agenda-connect.com>',
      to,
      subject: `🗑️ Cita cancelada por el cliente en ${negocio}`,
      html: buildCancellationNotificationEmail(cliente, fecha, hora, negocio),
    });
    console.log(`📧 Notificación de cancelación enviada exitosamente a ${to}`);
  } catch (error) {
    console.error('❌ Error al enviar notificación de cancelación:', error.message);
  }
}