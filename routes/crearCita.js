// 📁 routes/crearCita.js
import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { google } from 'googleapis';
import { verifyAuth } from '../middleware/verifyAuth.js';
import { getDateTimeFromStrings } from '../utils/fechas.js';
import { sendReconnectEmail } from '../utils/sendReconnectEmail.js'; // Ajusta path si es necesario

const router = express.Router();

router.post('/:slug/crear-cita', verifyAuth, async (req, res) => {
  const slug = req.params.slug;
  const { name, email, phone, date, time } = req.body;

  if (!name || !email || !date || !time) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const config = await getConfigBySlug(slug);
    if (!config) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    // Si no hay refresh_token, validar si calendar_email existe
    if (!config.refresh_token) {
      console.warn(`⚠️ No hay refresh_token para ${slug}.`);
      if (config.calendar_email) {
        try {
          await sendReconnectEmail({ 
            to: config.calendar_email, 
            nombre: config.nombre || slug, 
            slug 
          });
          console.log(`📧 Correo de reconexión enviado a ${config.calendar_email}`);
          return res.status(401).json({ error: 'Token no encontrado, correo de reconexión enviado' });
        } catch (mailErr) {
          console.error("❌ Error al enviar correo de reconexión:", mailErr);
          return res.status(500).json({ error: 'Error al enviar correo de reconexión' });
        }
      } else {
        // No hay email para enviar correo, mensaje claro
        console.error(`❌ No se pudo enviar correo: falta calendar_email para ${slug}`);
        return res.status(400).json({ 
          error: 'No hay correo registrado para reconectar Google Calendar. Por favor conecta la cuenta manualmente.' 
        });
      }
    }

    const timezone = config.timezone || 'America/Santo_Domingo';

    const accessToken = await getAccessToken(config.refresh_token, slug);

    // Construir fechas con Luxon
    const startDT = getDateTimeFromStrings(date, time, timezone);
    const endDT = startDT.plus({ minutes: config.duration_minutes || 30 });

    // Obtener eventos para el día
    const eventos = await getEventsForDay(accessToken, date);

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

    res.json({ success: true, eventId: evento.data.id });

  } catch (err) {
    console.error('❌ Error al crear cita:', err);
    res.status(500).json({ error: 'No se pudo crear la cita' });
  }
});

export default router;
