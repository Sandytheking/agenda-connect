// 📁 routes/crearCita.js
import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { google } from 'googleapis';
import { getDateTimeFromStrings } from '../utils/fechas.js';
import { sendReconnectEmail } from '../utils/sendReconnectEmail.js';
import { verificarSuscripcionActiva } from '../utils/verificarSuscripcionActiva.js';
import { createClient } from '@supabase/supabase-js';
import { sendConfirmationEmail } from '../utils/sendConfirmationEmail.js';



const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ✅ Función reutilizable para guardar la cita
const guardarCitaEnSupabase = async ({ slug, name, email, phone, startDT, endDT, evento_id = null }) => {
  const { error } = await supabase.from('appointments').insert([{
    slug,
    nombre: name,
    email,
    telefono: phone,
    fecha: startDT.toISODate(),
    hora: startDT.toFormat('HH:mm'),
    inicio: startDT.toISO(),
    fin: endDT.toISO(),
    evento_id,
    creado_en_google: !!evento_id
  }]);

  if (error) {
    console.error("❌ Error al guardar cita en Supabase:", error.message);
    return false;
  } else {
    console.log(`✅ Cita guardada en Supabase ${evento_id ? 'con' : 'sin'} Google`);
    return true;
  }
};

router.post('/:slug/crear-cita', async (req, res) => {
  const slug = req.params.slug;

  const { valido, mensaje } = await verificarSuscripcionActiva(slug);
  if (!valido) return res.status(403).json({ error: mensaje });

  const { name, email, phone, date, time } = req.body;
  if (!name || !email || !date || !time) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }



try {
  const config = await getConfigBySlug(slug);
  if (!config) {
    return res.status(404).json({ error: 'Negocio no encontrado' });
  }

  // ✅ Verificar disponibilidad ANTES de crear la cita
  const disponibilidad = await fetch(`https://api.agenda-connect.com/api/availability/${slug}?date=${date}&time=${time}`);
  const resultado = await disponibilidad.json();
  if (!resultado.available) {
    return res.status(409).json({ error: resultado.message || 'Horario no disponible' });
  }

  // 🕒 Construir zona horaria y tiempo
  const timezone = (config.timezone || 'America/Santo_Domingo').replace(/^['"]|['"]$/g, '');
  const startDT = getDateTimeFromStrings(date, time, timezone);
  const endDT = startDT.plus({ minutes: config.duration_minutes || 30 });


   // 📨 Si no hay refresh_token, guardar local y enviar correo
if (!config.refresh_token || config.refresh_token.trim() === '') {
  console.warn(`⚠️ No hay refresh_token para ${slug}. Enviando correo de reconexión...`);

  if (config.calendar_email) {
    try {
      await sendReconnectEmail({
        to: config.calendar_email,
        nombre: config.nombre || slug,
        slug
      });
      console.log(`📧 Correo de reconexión enviado a ${config.calendar_email}`);
    } catch (mailErr) {
      console.error("❌ Error al enviar correo de reconexión:", mailErr);
    }
  }

  await guardarCitaEnSupabase({ slug, name, email, phone, startDT, endDT });

  return res.status(200).json({ success: true, local: true });
}


    // 🔐 Intentar obtener access token
let accessToken;
try {
  accessToken = await getAccessToken(config.refresh_token, slug);
} catch (err) {
  console.error("❌ Token vencido o inválido:", err.message);

  if (config.calendar_email) {
    try {
      await sendReconnectEmail({
        to: config.calendar_email,
        nombre: config.nombre || slug,
        slug
      });
      console.log(`📧 Correo de reconexión enviado a ${config.calendar_email}`);
    } catch (mailErr) {
      console.error("❌ Error al enviar correo de reconexión:", mailErr);
    }
  }

  // Guardar la cita localmente
  const exito = await guardarCitaEnSupabase({ slug, name, email, phone, startDT, endDT });
  
  if (exito) {
    // Enviar correo de confirmación al cliente con botón de cancelación
    await sendConfirmationEmail({
      to: email,
      nombre: name,
      fecha: startDT.setZone('America/Santo_Domingo').toFormat('dd/MM/yyyy'),
      hora: startDT.setZone('America/Santo_Domingo').toFormat('hh:mm a'),
      negocio: config.nombre || slug,
      slug,
      cancelToken: generateCancelToken() // esto debe ser único por cita
    });
  }

  return res.status(200).json({ success: true, local: true });
}


    // 📆 Verificar si hay solapamiento en Google Calendar
    const eventos = await getEventsForDay(accessToken, date);
    const solapados = eventos.filter(ev => {
      const eStart = new Date(ev.start.dateTime || ev.start.date);
      const eEnd = new Date(ev.end.dateTime || ev.end.date);
      return eStart < endDT.toJSDate() && startDT.toJSDate() < eEnd;
    });

    if (solapados.length > 0) {
      return res.status(409).json({ error: 'Ya hay una cita en ese horario' });
    }

    // ✅ Crear evento en Google Calendar
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const evento = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Cita con ${name}`,
        description: `Cliente: ${name}\nEmail: ${email}\nTeléfono: ${phone}`,
        start: {
          dateTime: startDT.toISO({ suppressMilliseconds: true }),
          timeZone: timezone
        },
        end: {
          dateTime: endDT.toISO({ suppressMilliseconds: true }),
          timeZone: timezone
        },
        attendees: [{ email }],
        reminders: { useDefault: true }
      }
    });

    // 🗂️ Guardar cita en Supabase con ID de Google
    await guardarCitaEnSupabase({
      slug,
      name,
      email,
      phone,
      startDT,
      endDT,
      evento_id: evento?.data?.id || null
    });

// ✅ Enviar correo de confirmación
await sendConfirmationEmail({
  to: email, 
  nombre: name,
  fecha: startDT.setZone('America/Santo_Domingo').toFormat('dd/MM/yyyy'),
  hora: startDT.setZone('America/Santo_Domingo').toFormat('hh:mm a'),
  negocio: config.nombre || slug,
  slug
});

console.log(`📧 Enviando correo de confirmación a ${to}`);

res.json({ success: true, eventId: evento.data.id });


  } catch (err) {
    console.error('❌ Error al crear cita:', err);
    res.status(500).json({ error: 'No se pudo crear la cita' });
  }
});

export default router;
