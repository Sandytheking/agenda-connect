
//✅ Ruta pública para crear citas
import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js'; // <- mover aquí

// ✅ Instanciar router y Supabase client
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ Ruta para crear citas
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

    if (eventos.length >= (config.max_per_day || 5)) {
      return res.status(409).json({ error: 'Límite de citas alcanzado para ese día' });
    }

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

    // 🚀 GUARDAR EN SUPABASE
    const { error: insertError } = await supabase.from('appointments').insert({
      slug,
      fecha: date,
      inicio: start.toISOString(),
      fin: end.toISOString(),
      nombre: name,
      email,
      telefono: phone,
      evento_id: evento.data.id
    });

    if (insertError) {
      console.error('⚠️ Error al guardar en Supabase:', insertError);
    }

    res.json({ success: true, eventId: evento.data.id });

  } catch (err) {
    console.error('❌ Error en creación de cita pública:', err);
    res.status(500).json({ error: 'Error al crear la cita. Intenta más tarde.' });
  }
});

// ✅ Ruta para listar citas por fecha
router.get('/api/citas', async (req, res) => {
  const { slug, fecha } = req.query;

  if (!slug || !fecha) {
    return res.status(400).json({ error: 'Faltan parámetros slug o fecha' });
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('slug', slug)
      .eq('fecha', fecha)
      .order('inicio', { ascending: true });

    if (error) throw error;

    res.json({ citas: data });
  } catch (err) {
    console.error('❌ Error al obtener citas desde Supabase:', err.message);
    res.status(500).json({ error: 'No se pudieron obtener las citas' });
  }
});

export default router;
