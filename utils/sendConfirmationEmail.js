// utils/sendConfirmationEmail.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendConfirmationEmail({ to, nombre, fecha, hora, negocio, slug }) {
  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to,
      subject: `✅ Cita confirmada en ${negocio}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; padding: 20px;">
          <h2 style="color: #4c2882;">Hola ${nombre},</h2>
          <p>Tu cita ha sido confirmada con éxito.</p>
          <ul>
            <li><strong>📅 Fecha:</strong> ${fecha}</li>
            <li><strong>⏰ Hora:</strong> ${hora}</li>
            <li><strong>🏢 Negocio:</strong> ${negocio}</li>
          </ul>
          <p>Si necesitas cancelar tu cita, haz clic en el botón siguiente:</p>
          <a href="https://agenda-connect.com/cancelar?slug=${slug}&email=${encodeURIComponent(to)}&fecha=${fecha}&hora=${hora}" 
             style="display: inline-block; margin-top: 12px; padding: 10px 20px; background-color: #e53935; color: white; border-radius: 5px; text-decoration: none;">
            ❌ Cancelar cita
          </a>
          <p style="margin-top: 20px; font-size: 0.9em; color: #777;">Gracias por usar Agenda Connect</p>
        </div>
      `,
    });

    console.log(`📧 Confirmación enviada a ${to}`);
  } catch (error) {
    console.error("❌ Error al enviar confirmación:", error);
  }
}
