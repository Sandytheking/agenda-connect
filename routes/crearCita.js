import express from 'express';
import { google } from 'googleapis';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';

const router = express.Router();

function pad(n) {
  return n.toString().padStart(2, '0');
}

router.post('/:slug/crear-cita', async (req, res) => {
  const { slug } = req.params;
  const { name, email, phone, dateTime, duration } = req.body;

  if (!name || !email || !dateTime) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ error: 'Negocio no encontrado o sin token' });
    }

    const timezone = cfg.timezone || 'America/Santo_Domingo';
    const token = await getAccessToken(cfg.refresh_token);

    // Parsear dateTime (esperado: YYYY-MM-DDTHH:mm:ss-04:00)
    const dateTimeMatch = dateTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!dateTimeMatch) {
      return res.status(400).json({ error: 'Formato de dateTime inválido. Esperado: YYYY-MM-DDTHH:mm:ss-04:00' });
    }
    const [_, y, m, d, hh, mm] = dateTimeMatch.map(Number);

    // Obtener eventos para el día
    const date = `${y}-${pad(m)}-${pad(d)}`;
    const eventos = await getEventsForDay(token, date, timezone);

    // Formatear fechas en ISO 8601 con offset -04:00
    const startISO = `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00-04:00`;
    const dur = Number(duration || cfg.duration_minutes || 30);
    const endDate = new Date(Date.UTC(y, m - 1, d, hh + 4, mm + dur));
    const endISO = `${y}-${pad(m)}-${pad(d)}T${pad(endDate.getUTCHours())}:${pad(endDate.getUTCMinutes())}:00-04:00`;

    // Crear fechas para comparación de solapamientos (en UTC)
    const localStart = new Date(Date.UTC(y, m - 1, d, hh + 4, mm));
    const localEnd = new Date(localStart.getTime() + dur * 60000);

    // Depuración: Imprimir fechas
    console.log('Fecha de entrada (dateTime):', dateTime);
    console.log('Fecha parseada (date, time):', date, `${pad(hh)}:${pad(mm)}`);
    console.log('localStart (UTC):', localStart.toISOString());
    console.log('localEnd (UTC):', localEnd.toISOString());
    console.log('startISO:', startISO);
    console.log('endISO:', endISO);
    console.log('timezone:', timezone);

    // Verificar solapamientos
    const solapados = eventos.filter(ev => {
      const s = new Date(ev.start);
      const e = new Date(ev.end);
      console.log('Evento existente:', { start: ev.start, end: ev.end });
      return s < localEnd && localStart < e;
    });

    if (solapados.length > 0) {
      console.log('Solapamientos encontrados:', solapados);
      return res.status(409).json({ error: 'Ya hay una cita en ese horario' });
    }

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ access_token: token });
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

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

    // Depuración: Imprimir evento creado
    console.log('Evento creado:', JSON.stringify(evento.data, null, 2));

    res.json({ success: true, eventId: evento.data.id });

  } catch (err) {
    console.error('❌ Error al crear cita:', err);
    res.status(500).json({ error: 'No se pudo crear la cita' });
  }
});

export default router;