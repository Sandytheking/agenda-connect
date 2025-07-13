// 📁 routes/crearCita.js
import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { google } from 'googleapis';
import { verifyAuth } from '../middleware/verifyAuth.js';
import { getDateTimeFromStrings } from '../utils/fechas.js';

const router = express.Router();

router.post('/:slug/crear-cita', verifyAuth, async (req, res) => {
  const slug = req.params.slug;
  const { name, email, phone, date, time } = req.body;

  if (!name || !email || !date || !time) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const config = await getConfigBySlug(slug);
    if (!config || !config.refresh_token) {
      return res.status(404).json({ error: 'Negocio no encontrado o sin token' });
    }

    const timezone = config.timezone || 'America/Santo_Domingo';

    const accessToken = await getAccessToken(config.refresh_token, slug);

    // ✅ Usa luxon para construir hora con zona
    const startDT = getDateTimeFromStrings(date, time, timezone);
    const endDT = startDT.plus({ minutes: config.duration_minutes || 30 });

    // 🔁 Obtener eventos del día
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
