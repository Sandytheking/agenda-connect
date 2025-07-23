// 📁 routes/crearCita.js
import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { google } from 'googleapis';
import { getDateTimeFromStrings } from '../utils/fechas.js';
import { sendReconnectEmail } from '../utils/sendReconnectEmail.js'; // Asegúrate que el path sea correcto
import { verificarSuscripcionActiva } from '../utils/verificarSuscripcionActiva.js'; 
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
// Inicializa el cliente Supabase con claves seguras (usa SERVICE_ROLE_KEY porque no hay usuario logueado)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.post('/:slug/crear-cita', async (req, res) => {
  const slug = req.params.slug;
  
   // 👇 verificar suscripción antes de continuar
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

    // ⚠️ Si no hay refresh_token, dispara el correo de reconexión
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
      return res.status(401).json({ error: 'Cuenta de Google no conectada. Se ha enviado un correo para reconectar.' });
    }

   // ✅ Asegura que timezone esté limpio sin comillas extras
const timezone = (config.timezone || 'America/Santo_Domingo').replace(/^['"]|['"]$/g, '');

// 🔑 Obtener token de acceso válido desde el refresh_token
const accessToken = await getAccessToken(config.refresh_token, slug);

// 🕒 Construir fecha y hora con zona horaria limpia
const startDT = getDateTimeFromStrings(date, time, timezone);
const endDT = startDT.plus({ minutes: config.duration_minutes || 30 });

// 📆 Obtener eventos del día desde Google Calendar
const eventos = await getEventsForDay(accessToken, date);

// 🔁 Validar si hay conflictos en el horario
const solapados = eventos.filter(ev => {
  const eStart = new Date(ev.start.dateTime || ev.start.date);
  const eEnd   = new Date(ev.end.dateTime || ev.end.date);
  return eStart < endDT.toJSDate() && startDT.toJSDate() < eEnd;
});

if (solapados.length > 0) {
  return res.status(409).json({ error: 'Ya hay una cita en ese horario' });
}

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
        reminders: {
          useDefault: true
        }
      }
    });

    // 🗂️ Guardar la cita también en Supabase
try {

const eventoGoogleId = evento?.data?.id || null;

const { error } = await supabase.from('appointments').insert([{
  slug,
  nombre: name,
  email,
  telefono: phone,
  fecha: startDT.toISODate(),
  hora: startDT.toFormat('HH:mm'),
  inicio: startDT.toISO(),
  fin: endDT.toISO(),
  evento_id: eventoGoogleId,
  creado_en_google: !!eventoGoogleId
  
}]);


  if (error) {
    console.error("❌ Error al guardar cita en Supabase:", error.message);
  } else {
    console.log("✅ Cita guardada en Supabase correctamente");
  }
} catch (err) {
  console.error("❌ Error inesperado al guardar en Supabase:", err.message);
}


    res.json({ success: true, eventId: evento.data.id });

  } catch (err) {
    console.error('❌ Error al crear cita:', err);
    res.status(500).json({ error: 'No se pudo crear la cita' });
  }
});

export default router;
