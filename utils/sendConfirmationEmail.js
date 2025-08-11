// 📁 utils/sendConfirmationEmail.js
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * HTML email para el cliente
 */
const buildConfirmationEmail = (clientName, businessName, appointmentDate, appointmentTime, cancelUrl) => {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Confirmación de cita</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:#4C2882;padding:20px;text-align:center;color:#fff;">
                <h1 style="margin:0;font-size:20px;">${escapeHtml(businessName)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;color:#333;">
                <p style="margin:0 0 12px;">Hola <strong>${escapeHtml(clientName)}</strong>,</p>
                <p style="margin:0 0 16px;">Tu cita ha sido confirmada con <strong>${escapeHtml(businessName)}</strong>.</p>
                <div style="background:#f3f4f6;padding:12px;border-radius:6px;margin-bottom:18px;">
                  <p style="margin:0;font-size:15px;"><strong>📅 Fecha:</strong> ${escapeHtml(appointmentDate)}</p>
                  <p style="margin:6px 0 0;font-size:15px;"><strong>⏰ Hora:</strong> ${escapeHtml(appointmentTime)}</p>
                </div>
                <div style="text-align:center;margin:18px 0;">
                  <a href="${cancelUrl}" style="display:inline-block;background:#e11d48;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
                    ❌ Cancelar cita
                  </a>
                </div>
                <p style="margin:10px 0 0;color:#666;font-size:13px;">
                  Si no puedes ver el botón, copia y pega este enlace en tu navegador:<br/>
                  <span style="word-break:break-all;color:#4C2882;">${cancelUrl}</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#fbfbfb;padding:12px;text-align:center;font-size:12px;color:#888;">
                Este es un mensaje automático — Agenda Connect
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

/**
 * HTML para notificar al dueño del negocio
 */
const buildOwnerNotificationEmail = (businessName, clientName, appointmentDate, appointmentTime, adminUrl) => {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
  <body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,0.06);">
            <tr>
              <td style="background:#4C2882;padding:16px;color:#fff;text-align:center;">
                <strong>${escapeHtml(businessName)}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:20px;color:#333;">
                <h3 style="margin:0 0 12px;color:#4C2882;">Nueva cita agendada</h3>
                <p style="margin:0 0 10px;">Se ha registrado una nueva cita:</p>
                <ul style="margin:0 0 10px;padding-left:18px;color:#333;">
                  <li><strong>Cliente:</strong> ${escapeHtml(clientName)}</li>
                  <li><strong>Fecha:</strong> ${escapeHtml(appointmentDate)}</li>
                  <li><strong>Hora:</strong> ${escapeHtml(appointmentTime)}</li>
                </ul>
                <div style="text-align:center;margin-top:16px;">
                  <a href="${adminUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600;">
                    Ver en el panel
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#fbfbfb;padding:12px;text-align:center;color:#888;font-size:12px;">
                Agenda Connect — notificación automática
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

/**
 * Escapar HTML
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
 * Enviar confirmación
 */
export async function sendConfirmationEmail({
  to,
  nombre,            // cliente
  nombreCliente,
  negocio,           // opcional
  nombreEmpresa,     // preferido, viene del public-config
  fecha,
  hora,
  slug,
  cancelToken,
}) {
  const clientName = nombreCliente || nombre || 'Cliente';
  let businessName = null;

  // 1️⃣ Prioridad 1: nombreEmpresa explícito
  if (nombreEmpresa) {
    businessName = nombreEmpresa;
  }

  // 2️⃣ Prioridad 2: valor de "negocio" (aunque coincida con slug, por si viene correcto)
  if (!businessName && negocio) {
    businessName = negocio;
  }

  // 3️⃣ Prioridad 3: Buscar siempre en BD por slug
  if (slug) {
    const { data: biz, error: bizError } = await supabase
      .from('clients')
      .select('nombre')
      .eq('slug', slug)
      .maybeSingle();

    if (!bizError && biz?.nombre) {
      businessName = biz.nombre;
    }
  }

  // 4️⃣ Fallback final: si sigue vacío, poner texto genérico
  if (!businessName) {
    businessName = 'Negocio';
  }

  try {
    const cancelUrl = `https://api.agenda-connect.com/api/cancelar-cita/${encodeURIComponent(cancelToken || '')}`;

    // 1) Email al cliente
    await resend.emails.send({
      from: 'Agenda Connect <no-reply@agenda-connect.com>',
      to,
      subject: `✅ Cita confirmada en ${businessName}`,
      html: buildConfirmationEmail(clientName, businessName, fecha, hora, cancelUrl),
    });
    console.log(`📧 Confirmación enviada a cliente: ${to}`);

    // 2) Email al dueño
    if (!slug) {
      console.warn('⚠️ No se envió email al dueño: falta slug.');
      return;
    }

    const { data: owner, error } = await supabase
      .from('clients')
      .select('email')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('❌ Error obteniendo email del dueño:', error);
    } else if (owner?.email) {
      const adminUrl = `https://www.agenda-connect.com/admin-avanzado`;
      await resend.emails.send({
        from: 'Agenda Connect <no-reply@agenda-connect.com>',
        to: owner.email,
        subject: `📅 Nueva cita agendada en ${businessName}`,
        html: buildOwnerNotificationEmail(businessName, clientName, fecha, hora, adminUrl),
      });
      console.log(`📧 Notificación enviada al dueño: ${owner.email}`);
    } else {
      console.warn(`⚠️ No se encontró email del dueño para slug: ${slug}`);
    }
  } catch (err) {
    console.error('❌ Error al enviar confirmaciones:', err);
  }
}
