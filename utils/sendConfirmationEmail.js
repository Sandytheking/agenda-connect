// utils/sendConfirmationEmail.js
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

// Para obtener email del dueño
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function sendConfirmationEmail({ to, nombre, fecha, hora, negocio, slug, cancelToken }) {
  try {
    // 1️⃣ Enviar confirmación al cliente
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

    // 2️⃣ Obtener email del dueño desde Supabase
    const { data: owner, error } = await supabase
      .from('clients')
      .select('email')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('❌ Error obteniendo email del dueño:', error);
    } else if (owner?.email) {
      // 3️⃣ Enviar notificación al dueño
      await resend.emails.send({
        from: 'Agenda Connect <no-reply@agenda-connect.com>',
        to: owner.email,
        subject: `📅 Nueva cita agendada en ${negocio}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; padding: 20px;">
            <h2 style="color: #4c2882;">Nueva cita agendada</h2>
            <ul>
              <li><strong>👤 Cliente:</strong> ${nombre}</li>
              <li><strong>📅 Fecha:</strong> ${fecha}</li>
              <li><strong>⏰ Hora:</strong> ${hora}</li>
            </ul>
            <p style="margin-top: 20px; font-size: 0.9em; color: #777;">Puedes revisar más detalles en tu panel de Agenda Connect</p>
          </div>
        `,
      });
      console.log(`📧 Notificación enviada al dueño (${owner.email})`);
    } else {
      console.warn(`⚠️ No se encontró email del dueño para el negocio con slug: ${slug}`);
    }

  } catch (error) {
    console.error("❌ Error al enviar confirmación:", error);
  }
}
