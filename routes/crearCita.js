// 📁 routes/crearCita.js
import express            from 'express';
import { google }         from 'googleapis';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken,
         getEventsForDay } from '../utils/google.js';

const router = express.Router();

router.post('/:slug/crear-cita', async (req, res) => {
  try {
    const { slug }      = req.params;
    const { name, email, phone, date, time } = req.body;   // "YYYY‑MM‑DD", "HH:mm"

    if (!name || !email || !date || !time) {
      return res.status(400).json({ error:'Faltan campos obligatorios' });
    }

    /* ① Config del negocio */
    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ error:'Negocio no encontrado' });
    }

    /* ② Verificar que el slot siga libre */
    const token   = await getAccessToken(cfg.refresh_token);
    const events  = await getEventsForDay(token, date);

    const [hh, mm]       = time.split(':').map(Number);
    const [y, m, d]      = date.split('-').map(Number);
    const startLocal     = new Date(y, m - 1, d, hh, mm, 0, 0);          // ← local
    const endLocal       = new Date(startLocal.getTime() +
                           (cfg.duration_minutes ?? 30) * 60000);

    const haySolape = events.some(ev => {
      const s = new Date(ev.start), e = new Date(ev.end);
      return s < endLocal && startLocal < e;
    });
    if (haySolape) return res.status(409).json({ error:'Hora ocupada' });

    /* ③ Insertar en Google Calendar */
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ access_token: token });
    const calendar = google.calendar({ version:'v3', auth });

    // ⚠️  Construir cadenas SIN sufijo Z
    const pad = n => String(n).padStart(2,'0');
    const startISO = `${date}T${pad(hh)}:${pad(mm)}:00`;
    const endISO   = `${date}T${pad(endLocal.getHours())}:${pad(endLocal.getMinutes())}:00`;

    await calendar.events.insert({
      calendarId : 'primary',
      requestBody: {
        summary     : `Cita con ${name}`,
        description : `Cliente: ${name}\nEmail: ${email}\nTeléfono: ${phone}`,
        start       : { dateTime:startISO, timeZone: cfg.timezone || 'America/Santo_Domingo' },
        end         : { dateTime:endISO  , timeZone: cfg.timezone || 'America/Santo_Domingo' },
        attendees   : [{ email }],
        reminders   : { useDefault:true }
      }
    });

    res.json({ success:true });

  } catch (e) {
    console.error('❌ Error al crear cita:', e);
    res.status(500).json({ error:'No se pudo crear la cita' });
  }
});

export default router;
