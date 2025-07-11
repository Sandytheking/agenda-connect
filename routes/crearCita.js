import express from 'express';
import { google } from 'googleapis';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { DateTime } from 'luxon'; // Importar luxon

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
    const eventos = await getEventsForDay(token, date);

    // Parsear la fecha y hora en la zona horaria correcta
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);

    // Crear DateTime en la zona horaria especificada
    const localStart = DateTime.fromObject(
      { year: y, month: m, day: d, hour: hh, minute: mm },
      { zone: timezone }
    );
    if (!localStart.isValid) {
      return res.status(400).json({ error: 'Fecha u hora inválida' });
    }

    const dur = Number(duration || cfg.duration_minutes || 30);
    const localEnd = localStart.plus({ minutes: dur });

    // Verificar solapamientos
    const solapados = eventos.filter(ev => {
      const s = DateTime.fromISO(ev.start.dateTime, { zone: timezone });
      const e = DateTime.fromISO(ev.end.dateTime, { zone: timezone });
      return s < localEnd && localStart < e;
    });

    if (solapados.length > 0) {
      return res.status(409).json({ error: 'Ya hay una cita en ese horario' });
    }

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ access_token: token });
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    // Formatear las fechas en ISO 8601 con la zona horaria
    const startISO = localStart.toISO(); // Incluye el offset, ej. 2025-07-10T14:00:00-04:00
    const endISO = localEnd.toISO();

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

    res.json({ success: true, eventId: evento.data.id });

  } catch (err) {
    console.error('❌ Error al crear cita:', err);
    res.status(500).json({ error: 'No se pudo crear la cita' });
  }
});

export default router;