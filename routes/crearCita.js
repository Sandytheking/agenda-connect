// 📁 routes/crearCita.js
import express               from 'express';
import { google }            from 'googleapis';
import { getConfigBySlug }   from '../supabaseClient.js';
import { getAccessToken,
         getEventsForDay }   from '../utils/google.js';
import { toLocalDateTime }   from '../utils/helpers.js';   // ← helper

const router = express.Router();

/*  POST /:slug/crear-cita  ---------------------------------------- */
router.post('/:slug/crear-cita', async (req, res) => {
  const { slug }             = req.params;
  const { name, email, phone,
          date, time }       = req.body;     // date = YYYY‑MM‑DD, time = HH:mm

  if (!name || !email || !date || !time) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    /* ①  Configuración del negocio */
    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    /* ②  Slot libre ? */
    const accessToken = await getAccessToken(cfg.refresh_token);
    const eventos     = await getEventsForDay(accessToken, date);

    // Construir fechas locales (¡sin zona UTC!)
    const { jsDate: startObj } = toLocalDateTime(date, time);
    const endObj = new Date(
      startObj.getTime() + (cfg.duration_minutes ?? 30) * 60_000
    );

    const choca = eventos.some(ev => {
      const s = new Date(ev.start), e = new Date(ev.end);
      return s < endObj && startObj < e;
    });
    if (choca)
      return res.status(409).json({ error: 'Hora ocupada' });

    /* ③  Insertar en Google Calendar */
    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth });

    // Formatos ISO *sin* “Z”
    const startISO = `${date}T${time}:00`;
    const endISO   = `${endObj.getFullYear()}-${String(endObj.getMonth()+1).padStart(2,'0')}-${String(endObj.getDate()).padStart(2,'0')}T${String(endObj.getHours()).padStart(2,'0')}:${String(endObj.getMinutes()).padStart(2,'0')}:00`;

    const evento = await calendar.events.insert({
      calendarId : 'primary',
      requestBody: {
        summary     : `Cita con ${name}`,
        description : `Cliente: ${name}\nEmail: ${email}\nTeléfono: ${phone}`,
        start       : { dateTime: startISO, timeZone: cfg.timezone || 'America/Santo_Domingo' },
        end         : { dateTime:  endISO,  timeZone: cfg.timezone || 'America/Santo_Domingo' },
        attendees   : [{ email }],
        reminders   : { useDefault: true }
      }
    });

    /* ④  OK */
    res.json({ success: true, eventId: evento.data.id });

  } catch (err) {
    console.error('❌ Error al crear cita:', err);
    res.status(500).json({ error: 'No se pudo crear la cita' });
  }
});

export default router;
