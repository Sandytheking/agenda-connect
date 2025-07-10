// 📁 routes/crearCita.js
import express from 'express';
import { google } from 'googleapis';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';

const router = express.Router();

function pad(n) {
  return n.toString().padStart(2, '0');
}

function toIsoWithoutZ(dateObj) {
  return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
}

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

    const [hh, mm] = time.split(":" ).map(Number);
    const [y, m, d] = date.split('-').map(Number);

    const localStart = new Date(y, m - 1, d, hh, mm);
    const dur = Number(duration || cfg.duration_minutes || 30);
    const localEnd = new Date(localStart.getTime() + dur * 60000);

    const solapados = eventos.filter(ev => {
      const s = new Date(ev.start), e = new Date(ev.end);
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

    const startISO = toIsoWithoutZ(localStart);
    const endISO = toIsoWithoutZ(localEnd);

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
