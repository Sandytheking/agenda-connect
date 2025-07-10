// 📁 routes/crearCita.js
import express from 'express';
import { google } from 'googleapis';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';

const router = express.Router();

router.post('/:slug/crear-cita', async (req, res) => {
  const { slug } = req.params;
  const { name, email, phone, date, time } = req.body; // YYYY-MM-DD + HH:mm

  if (!name || !email || !date || !time) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    // ① Configuración
    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    // ② Validar disponibilidad
    const token = await getAccessToken(cfg.refresh_token);
    const eventos = await getEventsForDay(token, date);

    const [yy, mm, dd] = date.split('-').map(Number);
    const [hh, min]    = time.split(':').map(Number);

    const start = new Date(yy, mm - 1, dd); // ← base sin UTC
    start.setHours(hh, min, 0, 0);

    const end = new Date(start.getTime() + (cfg.duration_minutes || 30) * 60000);

    const choca = eventos.some(ev => {
      const evStart = new Date(ev.start);
      const evEnd   = new Date(ev.end);
      return evStart < end && start < evEnd;
    });

    if (choca) {
      return res.status(409).json({ error: 'Hora ocupada' });
    }

    // ③ Insertar en Google Calendar
    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth.setCredentials({ access_token: token });
    const calendar = google.calendar({ version: 'v3', auth: oauth });

    const startISO = start.toISOString().slice(0, 19); // sin Z
    const endISO   = end.toISOString().slice(0, 19);

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary    : `Cita con ${name}`,
        description: `Cliente: ${name}\nEmail: ${email}\nTeléfono: ${phone}`,
        start: {
          dateTime: startISO,
          timeZone: cfg.timezone || 'America/Santo_Domingo'
        },
        end: {
          dateTime: endISO,
          timeZone: cfg.timezone || 'America/Santo_Domingo'
        },
        attendees: [{ email }],
        reminders: { useDefault: true }
      }
    });

    // ④ Fin OK
    res.json({ success: true, eventId: event.data.id });
  } catch (err) {
    console.error('❌ Error al crear cita:', err);
    res.status(500).json({ error: 'No se pudo crear la cita' });
  }
});

export default router;
