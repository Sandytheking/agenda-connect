// 📁 routes/crearCita.js
import express from 'express';
import { google } from 'googleapis';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { parseDateTime, toISODateTime, getSlotDates, toDateString } from '../utils/fechas.js';

const router = express.Router();

router.post('/:slug/crear-cita', async (req, res) => {
  const { slug } = req.params;
  const { name, email, phone, date, time, duration } = req.body;

  if (!name || !email || !date || !time) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ error: 'Negocio no encontrado o sin token' });
    }

    const timezone = cfg.timezone || 'America/Santo_Domingo';
    const token = await getAccessToken(cfg.refresh_token);

    // Parsear fecha y hora en America/Santo_Domingo
    const dateTime = parseDateTime(date, time);
    const dateStr = toDateString(dateTime);
    const eventos = await getEventsForDay(token, dateStr, timezone);

    // Formatear fechas para Google Calendar (ISO 8601 con offset -04:00)
    const startISO = toISODateTime(dateTime);
    const dur = Number(duration || cfg.duration_minutes || 30);
    const endISO = toISODateTime(dateTime.plus({ minutes: dur }));

    // Obtener fechas en UTC para comparación de solapamientos (servidor en UTC)
    const { start: localStart, end: localEnd } = getSlotDates(date, time, dur);

    // Depuración: Imprimir fechas
    console.log('Fecha de entrada (date, time):', date, time);
    console.log('Fecha parseada (dateTime):', dateTime.toISO());
    console.log('localStart (UTC):', localStart.toISO());
    console.log('localEnd (UTC):', localEnd.toISO());
    console.log('startISO:', startISO);
    console.log('endISO:', endISO);
    console.log('timezone:', timezone);

    // Verificar solapamientos
    const solapados = eventos.filter(ev => {
      const s = DateTime.fromISO(ev.start, { zone: 'utc' });
      const e = DateTime.fromISO(ev.end, { zone: 'utc' });
      console.log('Evento existente:', { start: ev.start, end: ev.end });
      return s < localEnd && localStart < e;
    });

    if (solapados.length > 0) {
      console.log('Solapamientos encontrados:', solapados);
      return res.status(409).json({ error: 'Ya hay una cita en ese horario' });
    }

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ access_token: token });
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const evento = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Cita con ${name}`,
        description: `Cliente: ${name}\nEmail: ${email}\nTeléfono: ${phone}`,
        start: {
          dateTime: startISO,
          timeZone: timezone
        },
        end: {
          dateTime: endISO,
          timeZone: timezone
        },
        attendees: [{ email }],
        reminders: {
          useDefault: true
        }
      }
    });

    // Depuración: Imprimir evento creado
    console.log('Evento creado:', JSON.stringify(evento.data, null, 2));

    res.json({ success: true, eventId: evento.data.id });

  } catch (err) {
    console.error('❌ Error al crear cita:', err);
    res.status(500).json({ error: 'No se pudo crear la cita' });
  }
});

export default router;