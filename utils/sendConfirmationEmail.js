// utils/sendConfirmationEmail.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendConfirmationEmail({ to, nombre, fecha, hora, negocio, slug, cancelToken }) {
  try {
    await resend.emails.send({
      from: 'Agenda Connect <no-reply@agenda-connect.com>',
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
  <a href="https://api.agenda-connect.com/api/cancelar-cita/${cancelToken}"
   target="_blank"
   style="display:inline-block;padding:12px 20px;background:#dc2626;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">
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
