import express from 'express';
import { google } from 'googleapis';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { DateTime } from 'luxon';

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

    // Parsear fecha y hora
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

    // Depuración: Imprimir fechas
    console.log('Fecha de entrada (date, time):', date, time);
    console.log('localStart (DateTime):', localStart.toString());
    console.log('localEnd (DateTime):', localEnd.toString());

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

    // Formatear fechas en ISO 8601 con desplazamiento explícito
    const startISO = localStart.toISO({ suppressMilliseconds: true });
    const endISO = localEnd.toISO({ suppressMilliseconds: true });

    // Depuración: Imprimir cadenas ISO
    console.log('startISO:', startISO);
    console.log('endISO:', endISO);
    console.log('timezone:', timezone);

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