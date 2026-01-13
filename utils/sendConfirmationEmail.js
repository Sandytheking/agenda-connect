// 📁 utils/sendConfirmationEmail.js
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * HTML email para el cliente (versión mejorada: responsive, gradientes, botón interactivo)
 */
const buildConfirmationEmail = (clientName, businessName, appointmentDate, appointmentTime, cancelUrl) => {
  return `
    <!DOCTYPE html>
    <html lang="es" style="margin: 0; padding: 0;">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cita Confirmada en ${businessName}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 0 0 20px 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px 20px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 2.5em; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">✅ Confirmado</h1>
          <p style="margin: 10px 0 0; font-size: 1.1em; opacity: 0.9;">Tu cita en <strong>${escapeHtml(businessName)}</strong></p>
        </div>

        <!-- Contenido Principal -->
        <div style="padding: 40px 30px; background: rgba(255,255,255,0.95);">
          <p style="font-size: 1.1em; margin-bottom: 20px;">¡Hola <strong style="color: #667eea;">${escapeHtml(clientName)}</strong>!</p>
          
          <p style="margin-bottom: 20px; color: #555;">Tu cita ha sido confirmada exitosamente. Estamos emocionados de verte. 📅</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; border-left: 4px solid #4facfe; margin-bottom: 30px;">
            <p style="margin: 0 0 15px; font-weight: 600; color: #333;">Detalles de tu cita:</p>
            <ul style="margin: 0; padding-left: 20px; color: #666;">
              <li><strong>Fecha:</strong> ${escapeHtml(appointmentDate)}</li>
              <li><strong>Hora:</strong> ${escapeHtml(appointmentTime)}</li>
              <li><strong>Negocio:</strong> ${escapeHtml(businessName)}</li>
            </ul>
          </div>
          
          <a href="${cancelUrl}" 
             style="display: inline-block; background: linear-gradient(135deg, #e11d48 0%, #dc3545 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 1em; box-shadow: 0 4px 15px rgba(225, 29, 72, 0.3); transition: transform 0.2s; text-align: center; width: 100%; box-sizing: border-box;"
             onmouseover="this.style.transform='scale(1.02)'"
             onmouseout="this.style.transform='scale(1)'">
            ❌ Cancelar Cita
          </a>
          
          <p style="text-align: center; margin: 20px 0 0; font-style: italic; color: #4facfe; font-size: 0.95em;">
            Si no puedes ver el botón, copia y pega este enlace en tu navegador:<br/>
            <span style="word-break: break-all; color: #e11d48; font-size: 0.85em;">${cancelUrl}</span>
          </p>
          
          <p style="text-align: center; margin: 20px 0 0; font-style: italic; color: #4facfe;">¡Prepárate para una experiencia genial! 🌟</p>
        </div>

        <!-- Footer -->
        <div style="padding: 20px 30px; background: rgba(0,0,0,0.05); text-align: center; color: #666; font-size: 0.9em; border-top: 1px solid rgba(255,255,255,0.2);">
          <p style="margin: 0 0 10px;">— El equipo de <strong>AgendaConnect</strong></p>
          <p style="margin: 0;"><a href="mailto:agendaconnectinfo@gmail.com" style="color: #667eea; text-decoration: none;">support@agenda-connect.com</a> | <a href="https://agenda-connect.com" style="color: #667eea; text-decoration: none;">Visita nuestro sitio</a></p>
          <p style="margin: 10px 0 0; font-size: 0.8em;">Si no solicitaste esta cita, ignóralo. <a href="#" style="color: #999;">Darte de baja</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * HTML para notificar al dueño del negocio (versión mejorada: gradientes, botón, responsive)
 */
const buildOwnerNotificationEmail = (businessName, clientName, appointmentDate, appointmentTime, adminUrl) => {
  return `
    <!DOCTYPE html>
    <html lang="es" style="margin: 0; padding: 0;">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nueva Cita Agendada</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 0 0 20px 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px 20px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 2.5em; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">📅 Nueva Cita</h1>
          <p style="margin: 10px 0 0; font-size: 1.1em; opacity: 0.9;">¡Alguien reservó en <strong>${escapeHtml(businessName)}</strong>!</p>
        </div>

        <!-- Contenido Principal -->
        <div style="padding: 40px 30px; background: rgba(255,255,255,0.95);">
          <p style="font-size: 1.1em; margin-bottom: 20px;">¡Hola, dueño de <strong style="color: #28a745;">${escapeHtml(businessName)}</strong>!</p>
          
          <p style="margin-bottom: 20px; color: #555;">Se ha registrado una nueva cita. Revisa los detalles y prepárate. 🚀</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; border-left: 4px solid #28a745; margin-bottom: 30px;">
            <p style="margin: 0 0 15px; font-weight: 600; color: #333;">Detalles de la nueva cita:</p>
            <ul style="margin: 0; padding-left: 20px; color: #666;">
              <li><strong>Cliente:</strong> ${escapeHtml(clientName)}</li>
              <li><strong>Fecha:</strong> ${escapeHtml(appointmentDate)}</li>
              <li><strong>Hora:</strong> ${escapeHtml(appointmentTime)}</li>
            </ul>
          </div>
          
          <a href="${adminUrl}" 
             style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 1em; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3); transition: transform 0.2s; text-align: center; width: 100%; box-sizing: border-box;"
             onmouseover="this.style.transform='scale(1.02)'"
             onmouseout="this.style.transform='scale(1)'">
            👨‍💼 Ver en el Panel de Administración
          </a>
          
          <p style="text-align: center; margin: 20px 0 0; font-style: italic; color: #28a745;">¡Gracias por usar AgendaConnect! 🌟</p>
        </div>

        <!-- Footer -->
        <div style="padding: 20px 30px; background: rgba(0,0,0,0.05); text-align: center; color: #666; font-size: 0.9em; border-top: 1px solid rgba(255,255,255,0.2);">
          <p style="margin: 0 0 10px;">— El equipo de <strong>AgendaConnect</strong></p>
          <p style="margin: 0;"><a href="mailto:support@agenda-connect.com" style="color: #667eea; text-decoration: none;">support@agenda-connect.com</a> | <a href="https://agenda-connect.com" style="color: #667eea; text-decoration: none;">Visita nuestro sitio</a></p>
          <p style="margin: 10px 0 0; font-size: 0.8em;">Notificación automática. <a href="#" style="color: #999;">Darte de baja</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Escapar HTML (sin cambios, ya está bien)
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
 * Enviar confirmación (lógica sin cambios mayores, solo logs mejorados)
 */
export async function sendConfirmationEmail({
  to,
  nombre, // cliente
  nombreCliente,
  negocio, // opcional
  nombreEmpresa, // preferido, viene del public-config
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
    console.log(`📧 Confirmación enviada exitosamente a cliente: ${to}`);
    
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
      console.log(`📧 Notificación enviada exitosamente al dueño: ${owner.email}`);
    } else {
      console.warn(`⚠️ No se encontró email del dueño para slug: ${slug}`);
    }
  } catch (err) {
    console.error('❌ Error al enviar confirmaciones:', err);
  }
}