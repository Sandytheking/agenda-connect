// 📁 routes/crearCita.js
import express from 'express';
import { google } from 'googleapis';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';

const router = express.Router();

router.post('/:slug/crear-cita', async (req, res) => {
  const { slug } = req.params;
  const { name, email, phone, date, time } = req.body; // date: "YYYY-MM-DD", time: "HH:mm"

  if (!name || !email || !date || !time) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const accessToken = await getAccessToken(cfg.refresh_token);
    const eventos = await getEventsForDay(accessToken, date);

    const [hh, mm] = time.split(':').map(Number);
    const startDate = new Date(`${date}T${time}:00`);
    const endDate = new Date(startDate.getTime() + (cfg.duration_minutes || 30) * 60000);

    // Validar solapamientos
    const solapados = eventos.filter(ev => {
      const s = new Date(ev.start), e = new Date(ev.end);
      return s < endDate && startDate < e;
    });

    if (solapados.length > 0) {
      return res.status(409).json({ error: 'Hora ocupada' });
    }

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    // Construir strings ISO SIN 'Z'
    const startISO = `${date}T${time}:00`;
    const endISO = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}T${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`;

    const evento = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Cita con ${name}`,
        description: `Cliente: ${name}\nEmail: ${email}\nTeléfono: ${phone}`,
        start: {
          dateTime: startISO,
          timeZone: 'America/Santo_Domingo'
        },
        end: {
          dateTime: endISO,
          timeZone: 'America/Santo_Domingo'
        },
        attendees: [{ email }],
        reminders: { useDefault: true }
      }
    });

    res.json({ success: true, eventId: evento.data.id });

  } catch (err) {
    console.error('❌ Error al crear cita:', err);
    res.status(500).json({ error: 'No se pudo crear la cita' });
  }
});

export default router;
