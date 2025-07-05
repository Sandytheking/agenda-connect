
//✅ Ruta pública para crear citas
import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { google } from 'googleapis';

const router = express.Router();

router.post('/api/citas/:slug', async (req, res) => {
  const { slug } = req.params;
  const { name, email, phone, date, time } = req.body;

  if (!name || !email || !date || !time) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const config = await getConfigBySlug(slug);
    if (!config || !config.refresh_token) {
      return res.status(404).json({ error: 'Negocio no encontrado o no conectado a Google Calendar' });
    }

    const duration = config.duration_minutes || 30;
    const accessToken = await getAccessToken(config.refresh_token);

    // Validar disponibilidad
    const eventos = await getEventsForDay(accessToken, date);

    // Validar día completo
    if (eventos.length >= (config.max_per_day || 5)) {
      return res.status(409).json({ error: 'Límite de citas alcanzado para ese día' });
    }

    // Validar colisión por hora
    const [h, m] = time.split(":").map(Number);
    const start = new Date(date);
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + duration * 60000);

    const solapados = eventos.filter(ev => {
      const evStart = new Date(ev.start);
      const evEnd = new Date(ev.end);
      return evStart < end && start < evEnd;
    });

    if (solapados.length >= (config.max_per_hour || 1)) {
      return res.status(409).json({ error: 'Hora ocupada' });
    }

    // Crear evento en Google Calendar
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
          dateTime: start.toISOString(),
          timeZone: 'America/Santo_Domingo'
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: 'America/Santo_Domingo'
        },
        attendees: [{ email }],
        reminders: { useDefault: true }
      }
    });

    res.json({ success: true, eventId: evento.data.id });

  } catch (err) {
    console.error('❌ Error en creación de cita pública:', err);
    res.status(500).json({ error: 'Error al crear la cita. Intenta más tarde.' });
  }
});

export default router;
