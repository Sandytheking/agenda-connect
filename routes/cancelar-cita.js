// 📁 routes/cancelar-cita.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { getConfigBySlug } from '../supabaseClient.js';
import { sendCancellationNotification } from '../utils/sendCancellationNotification.js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.get('/:token', async (req, res) => {
  const cancelToken = req.params.token?.trim();

  try {
    // 🔍 Buscar la cita por token
    const { data: cita, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('cancel_token', cancelToken)
      .single();

    if (error || !cita) {
      console.error('❌ Cita no encontrada:', error?.message || 'No data');
      return res.status(404).send('Cita no encontrada o ya cancelada');
    }

    console.log('📌 Cita encontrada:', cita);

    // ✅ Marcar como cancelada
    const { error: cancelError } = await supabase
      .from('appointments')
      .update({ cancelada: true })
      .eq('id', cita.id);

    if (cancelError) {
      console.error('❌ Error al marcar como cancelada:', cancelError.message);
      return res.status(500).send('Error al cancelar la cita');
    }

    // ✅ Eliminar de Google Calendar si aplica
    if (cita.evento_id && cita.slug) {
      try {
        const config = await getConfigBySlug(cita.slug);
        const refresh_token = config?.refresh_token;

        if (refresh_token) {
          const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
          );

          const tokenResp = await fetch(`https://oauth2.googleapis.com/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID,
              client_secret: process.env.GOOGLE_CLIENT_SECRET,
              grant_type: 'refresh_token',
              refresh_token
            })
          });

          const tokenData = await tokenResp.json();
          if (!tokenData.access_token) throw new Error('No access_token');

          oAuth2Client.setCredentials({ access_token: tokenData.access_token });
          const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

          await calendar.events.delete({
            calendarId: 'primary',
            eventId: cita.evento_id
          });

          console.log(`🗑️ Evento eliminado: ${cita.evento_id}`);
        }
      } catch (err) {
        console.error('❌ Error al eliminar en Google Calendar:', err.message);
        // No cortamos aquí. Se puede seguir.
      }
    }

    // ✅ Notificar al negocio si hay correo
    const config = await getConfigBySlug(cita.slug);
    if (config?.calendar_email) {
      await sendCancellationNotification({
        to: config.calendar_email,
        cliente: cita.nombre,
        fecha: cita.fecha,
        hora: cita.hora,
        negocio: config.nombre || cita.slug,
      });
    }

    return res.send(`
      <div style="text-align:center; padding: 60px; font-family: sans-serif;">
        <h2 style="color: #e53e3e;">❌ Cita cancelada exitosamente</h2>
        <p>Puedes volver a reservar cuando gustes.</p>
      </div>
    `);

  } catch (err) {
    console.error('🔥 Error general al cancelar cita:', err);
    return res.status(500).send('Error al cancelar la cita');
  }
});


export default router;
