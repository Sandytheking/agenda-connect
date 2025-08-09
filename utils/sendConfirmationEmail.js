// utils/sendConfirmationEmail.js
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const buildConfirmationEmail = (nombre, negocio, fecha, hora, cancelUrl) => {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Confirmación de cita</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f5f7fa; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fa; padding: 30px 0;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color:#ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <tr>
              <td style="background-color: #4C2882; padding: 20px; text-align:center;">
                <h1 style="margin:0; color:#ffffff; font-size: 22px;">${negocio}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 25px; color:#333333;">
                <h2 style="margin-top:0; font-size:20px; color:#4C2882;">¡Hola ${nombre}!</h2>
                <p style="font-size:16px; line-height:1.5; margin-bottom:20px;">
                  Tu cita ha sido confirmada con <strong>${negocio}</strong>.
                </p>
                <p style="font-size:16px; line-height:1.5;">
                  📅 <strong>Fecha:</strong> ${fecha}<br/>
                  ⏰ <strong>Hora:</strong> ${hora}
                </p>
                <div style="margin-top: 30px; text-align:center;">
                  <a href="${cancelUrl}" 
                    style="display:inline-block; background-color:#e53935; color:#ffffff; text-decoration:none; padding: 12px 20px; border-radius:5px; font-size:16px;">
                    ❌ Cancelar cita
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f0f0f0; padding:15px; text-align:center; font-size:12px; color:#888888;">
                Este es un mensaje automático, por favor no respondas a este correo.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

export async function sendConfirmationEmail({ to, nombre, fecha, hora, negocio, slug, cancelToken }) {
  try {
    // 1️⃣ Email para el cliente
    await resend.emails.send({
      from: 'Agenda Connect <no-reply@agenda-connect.com>',
      to,
      subject: `✅ Cita confirmada en ${negocio}`,
      html: buildConfirmationEmail(
        nombre,
        negocio,
        fecha,
        hora,
        `https://api.agenda-connect.com/api/cancelar-cita/${cancelToken}`
      ),
    });
    console.log(`📧 Confirmación enviada a ${to}`);

    // 2️⃣ Email para el dueño
    const { data: owner, error } = await supabase
      .from('clients')
      .select('email')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('❌ Error obteniendo email del dueño:', error);
    } else if (owner?.email) {
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
            <p style="margin-top: 20px; font-size: 0.9em; color: #777;">
              Puedes revisar más detalles en tu panel de Agenda Connect
            </p>
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
