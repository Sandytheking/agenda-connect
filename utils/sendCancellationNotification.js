// 📁 utils/sendCancellationNotification.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendCancellationNotification({ to, cliente, fecha, hora, negocio }) {
  try {
    await resend.emails.send({
      from: 'Agenda Connect <notificaciones@tudominio.com>',
      to,
      subject: '🗑️ Cita cancelada por el cliente',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>❌ Cancelación de cita</h2>
          <p>El cliente <strong>${cliente}</strong> canceló su cita.</p>
          <ul>
            <li><strong>Fecha:</strong> ${fecha}</li>
            <li><strong>Hora:</strong> ${hora}</li>
            <li><strong>Negocio:</strong> ${negocio}</li>
          </ul>
        </div>
      `,
    });
    console.log(`📧 Notificación de cancelación enviada a ${to}`);
  } catch (error) {
    console.error('❌ Error al enviar notificación de cancelación:', error.message);
  }
}
