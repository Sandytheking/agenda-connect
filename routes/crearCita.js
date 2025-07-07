// 📁 routes/crearCita.js
import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { google } from 'googleapis';
import { verifyAuth } from '../middleware/verifyAuth.js';

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

    const accessToken = await getAccessToken(config.refresh_token);

    // 🔁 Construir fecha localmente sin desfase de UTC
    const [year, month, day] = date.split('-').map(Number);       // "2025-07-12"
    const [h, m] = time.split(":").map(Number);       // "09:30"
    const start = new Date(year, month - 1, day, h, m, 0, 0);       // Local time
    const end   = new Date(start.getTime() + (config.duration_minutes || 30) * 60000);

    const eventos = await getEventsForDay(accessToken, date);

    const solapados = eventos.filter(ev => {
      const eStart = new Date(ev.start);
      const eEnd   = new Date(ev.end);
      return eStart < end && start < eEnd;
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
          dateTime: start.toISOString(),
          timeZone: config.timezone || 'America/Santo_Domingo'
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: config.timezone || 'America/Santo_Domingo'
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
  
  const start = new Date(`${startISO}:00-04:00`);  // fuerza offset

});

export default router;
