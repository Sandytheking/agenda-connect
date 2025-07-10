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

const [hh, mm] = time.split(':').map(Number);
const [y, m, d] = date.split('-').map(Number);

const startObj = new Date(y, m - 1, d, hh, mm, 0); // ✅ en hora local
const endObj   = new Date(startObj.getTime() + (cfg.duration_minutes || 30) * 60000);

// ✅ Construcción manual (sin .toISOString())
const pad = n => String(n).padStart(2, '0');
const startISO = `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00`;
const endISO   = `${endObj.getFullYear()}-${pad(endObj.getMonth() + 1)}-${pad(endObj.getDate())}T${pad(endObj.getHours())}:${pad(endObj.getMinutes())}:00`;

const evento = await calendar.events.insert({
  calendarId: 'primary',
  requestBody: {
    summary     : `Cita con ${name}`,
    description : `Cliente: ${name}\nEmail: ${email}\nTeléfono: ${phone}`,
    start       : {
      dateTime : startISO,
      timeZone: 'America/Santo_Domingo' // ✅ explícito
    },
    end         : {
      dateTime : endISO,
      timeZone: 'America/Santo_Domingo'
    },
    attendees   : [{ email }],
    reminders   : { useDefault: true }
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
