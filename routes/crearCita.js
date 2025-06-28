// 📁 routes/crearCita.js
import express from 'express';
import { getClientConfigBySlug } from '../supabase/client.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { google } from 'googleapis';

const router = express.Router();

router.post('/:slug/crear-cita', async (req, res) => {
  const slug = req.params.slug;
  const { name, email, phone, date, time } = req.body;

  if (!name || !email || !date || !time) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    // 1. Leer configuración del cliente (incluye refresh_token)
    const config = await getClientConfigBySlug(slug);
    if (!config || !config.refresh_token) {
      return res.status(404).json({ error: 'Negocio no encontrado o sin token' });
    }

    // 2. Obtener access_token desde refresh_token
    const accessToken = await getAccessToken(config.refresh_token);

    // 3. Verificar disponibilidad antes de agendar
    const eventos = await getEventsForDay(accessToken, date);
    const [h, m] = time.split(":").map(Number);
    const start = new Date(date);
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + (config.duration_minutes || 30) * 60000);

    const solapados = eventos.filter(ev => {
      const eStart = new Date(ev.start);
      const eEnd = new Date(ev.end);
      return eStart < end && start < eEnd;
    });

    if (solapados.length > 0) {
      return res.status(409).json({ error: 'Ya hay una cita en ese horario' });
    }

    // 4. Crear OAuth2Client para Google Calendar
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    // 5. Crear evento en Google Calendar
    const evento = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Cita con ${name}`,
        description: `Cliente: ${name}\nEmail: ${email}\nTeléfono: ${phone}`,
        start: {
          dateTime: start.toISOString(),
          timeZone: 'America/Santo_Domingo'
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: 'America/Santo_Domingo'
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
