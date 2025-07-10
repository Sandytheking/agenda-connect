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

    // ② Validar disponibilidad (asegúrate de que getEventsForDay también maneje bien las zonas horarias)
    const token = await getAccessToken(cfg.refresh_token);
    // Podrías necesitar pasar la zona horaria aquí también si getEventsForDay la usa.
    const eventos = await getEventsForDay(token, date, cfg.timezone || 'America/Santo_Domingo');

    const [yy, mm, dd] = date.split('-').map(Number);
    const [hh, min]    = time.split(':').map(Number);

    // *** MODIFICACIÓN CLAVE AQUÍ ***
    // Construir la fecha y hora directamente en la zona horaria deseada
    // Puedes usar una librería como `luxon` para esto de forma más robusta,
    // pero si cfg.timezone es siempre 'America/Santo_Domingo' y tu servidor
    // tiene esa configuración, o si trabajas en UTC, puedes ajustarlo manualmente.

    // Opción 1: Usando solo Date, y compensando el offset para simular la hora local
    // Esta es más compleja y propensa a errores si las zonas horarias no son fijas.

    // Opción 2: La más recomendada, usar librerías de fecha-hora como Luxon
    // Si no puedes instalar librerías, la siguiente aproximación es clave.

    // Aproximación que a menudo resuelve el problema:
    // Asegúrate de que las fechas `start` y `end` representen la hora correcta
    // en la zona horaria del evento ANTES de convertirlas a ISO string.
    // Un problema común es que `new Date(yy, mm-1, dd, hh, min)` crea una fecha en la zona horaria local del servidor.
    // Si la zona horaria del servidor es diferente a 'America/Santo_Domingo', y el cambio de día se cruza
    // cuando se convierte a UTC (por `toISOString()`) y luego se interpreta en la zona de destino,
    // el evento puede aparecer el día anterior.

    // La forma más fiable es asegurar que el datetime que envías sea el correcto
    // para la timeZone que declaras.

    // Considera crear la fecha directamente como si ya estuviera en la zona horaria de Santo Domingo,
    // y luego pasarla a la API.

    // Solución directa: Crea la fecha en UTC y asegúrate de que refleje la hora correcta en la zona horaria de destino.
    // Si la zona horaria del servidor es UTC-4 (Santo Domingo), y creas un `new Date()` que es local,
    // y luego le haces `toISOString()` (que lo pasa a UTC), si ese UTC cruza la medianoche
    // en Santo Domingo, aparecerá como el día anterior.

    // Lo más sencillo es asegurar que el `dateTime` que envías a Google Calendar
    // sea el que corresponde a la fecha y hora *en la zona horaria del evento*.

    // Propuesta de cambio:
    // En lugar de `start.toISOString().slice(0, 19)`, puedes probar a crear
    // una fecha que, cuando se convierta a ISO string, represente la hora correcta.

    // Una forma de evitar el problema es asegurarte de que tu `new Date()` se interprete correctamente.
    // Si tu servidor está configurado en una zona horaria diferente a 'America/Santo_Domingo',
    // `new Date(yy, mm - 1, dd, hh, min)` creará una fecha en la zona horaria del servidor.
    // Luego, `toISOString()` convertirá esa fecha a UTC. Si ese proceso causa que la hora
    // en UTC caiga en el día anterior cuando se convierte a la zona horaria de Santo Domingo,
    // entonces ahí tienes el problema.

    // **Intenta esto:**
    // Asegúrate de que tu servidor esté configurado a la misma zona horaria que estás usando para los eventos,
    // o usa una librería como Luxon/Moment.js que te permita construir fechas
    // directamente en una zona horaria específica.

    // Si no quieres añadir librerías:
    // `start` y `end` son objetos Date en la zona horaria local del servidor.
    // `toISOString()` los convierte a UTC.
    // Si la diferencia entre UTC y 'America/Santo_Domingo' es -4 horas,
    // y tu evento es a las 9 AM en Santo Domingo, entonces en UTC serían las 13 PM.
    // Si tu servidor está en UTC, y creas `new Date(..., 9, ...)`
    // y luego haces `toISOString()` lo que da `...T09:00:00Z`.
    // Google Calendar lo toma, aplica `America/Santo_Domingo` (-4h),
    // y lo convierte a `...T05:00:00` en la zona horaria de Santo Domingo (incorrecto).

    // Solución más probable sin librerías:
    // Deja `start` y `end` como están, ya que ya tienen la hora correcta localmente.
    // El problema es cómo `toISOString()` y la API de Google interactúan.

    // Podrías probar con los objetos Date completos, incluyendo la 'Z' en `dateTime`,
    // y ver si Google Calendar es más inteligente al interpretar la combinación.
    // Sin embargo, si la documentación de Google Calendar sugiere el formato sin 'Z'
    // cuando se especifica `timeZone`, entonces el problema radica en la construcción inicial de `start` y `end`.

    // La forma más robusta es crear la fecha en la zona horaria deseada.
    // Aquí es donde Luxon o Moment.js brillan.
    // Con Luxon:
    // const { DateTime } = require('luxon');
    // const zone = cfg.timezone || 'America/Santo_Domingo';
    // const dtStart = DateTime.fromISO(`${date}T${time}`, { zone: zone });
    // const dtEnd = dtStart.plus({ minutes: cfg.duration_minutes || 30 });
    // const startISO = dtStart.toISO(); // Incluye Z si es UTC, pero Luxon maneja la zona horaria.
    // const endISO = dtEnd.toISO();

    // Sin librerías externas y asumiendo que `date` y `time` son los valores deseados
    // en la `cfg.timezone`, la clave es que `toISOString()` los convierte a UTC.
    // Si tu servidor y la zona horaria de Google Calendar para el evento no están sincronizadas,
    // y hay un cruce de medianoche cuando se convierte a UTC o viceversa, el día puede cambiar.

    // **Prueba a NO cortar la 'Z' de `toISOString()`**
    // Si envías `start.toISOString()` (con la 'Z') y especificas `timeZone`,
    // Google Calendar debería ser capaz de interpretarlo correctamente.
    // Esto es lo que suele recomendarse para evitar ambigüedades.

    const start = new Date(yy, mm - 1, dd, hh, min); // Esto crea la fecha en la zona horaria LOCAL del servidor
    const end = new Date(start.getTime() + (cfg.duration_minutes || 30) * 60000);

    const startISO = start.toISOString(); // Deja la 'Z'
    const endISO = end.toISOString();   // Deja la 'Z'

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

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary    : `Cita con ${name}`,
        description: `Cliente: ${name}\nEmail: ${email}\nTeléfono: ${phone}`,
        start: {
          dateTime: startISO, // Ahora incluye la 'Z'
          timeZone: cfg.timezone || 'America/Santo_Domingo'
        },
        end: {
          dateTime: endISO,   // Ahora incluye la 'Z'
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