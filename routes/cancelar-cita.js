// 📁 routes/cancelar-cita.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { getConfigBySlug } from '../supabaseClient.js';
import { sendCancellationNotification } from '../utils/sendCancellationNotification.js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.get('/:token', async (req, res) => {
  const cancelToken = req.params.token;

  // Buscar la cita por cancel_token
  const { data: cita, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('cancel_token', cancelToken)
    .single();

  if (error || !cita) {
    return res.status(404).send('Cita no encontrada o ya cancelada');
  }

  // Marcar cita como cancelada en Supabase
  const { error: updateError } = await supabase
  .from('appointments')
  .update({ cancelada: true })
  .eq('id', cita.id);

if (updateError) {
  console.error("❌ Error al marcar cita como cancelada:", updateError.message);
  return res.status(500).send('Error al cancelar la cita: ' + updateError.message);
}


  // Obtener configuración del negocio
  const config = await getConfigBySlug(cita.slug);

  // Eliminar de Google Calendar si tiene evento
  if (cita.evento_id && config?.refresh_token) {
    try {
      const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      const { access_token } = await fetch(`https://oauth2.googleapis.com/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: config.refresh_token,
        }),
      }).then(res => res.json());

      oAuth2Client.setCredentials({ access_token });
      const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: cita.evento_id,
      });

      console.log(`🗑️ Evento eliminado de Google Calendar: ${cita.evento_id}`);
    } catch (err) {
      console.error('❌ Error al eliminar evento de Google Calendar:', err.message);
    }
  }

  // Notificar al negocio por correo
  if (config?.calendar_email) {
    await sendCancellationNotification({
      to: config.calendar_email,
      cliente: cita.nombre,
      fecha: cita.fecha,
      hora: cita.hora,
      negocio: config.nombre || cita.slug,
    });
  }

  res.send(`<h2>Cita cancelada exitosamente</h2><p>Gracias por avisar.</p>`);
});

export default router;
