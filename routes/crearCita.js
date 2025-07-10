// 📁 routes/crearCita.js
import express from 'express';
import { google } from 'googleapis';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';

const router = express.Router();

// ✅ Auxiliar para construir fecha local ISO en zona horaria
function toLocalISO(dateObj, tz) {
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const parts = fmt.formatToParts(dateObj).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
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

    // ✅ Crear hora local directamente sin UTC ni sumar días
    const localStart = new Date(y, m - 1, d, hh, mm);

    // ✅ Duración dinámica
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

    const startISO = toLocalISO(localStart, timezone);
    const endISO = toLocalISO(localEnd, timezone);

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
