import { google } from 'googleapis';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { sendReconnectEmail } from './sendReconnectEmail.js';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Obtiene un access_token desde el refresh_token. Si está vencido, envía un correo de reconexión.
 * @param {string} refresh_token
 * @param {string} slug - identificador del negocio
 * @returns {Promise<string>} access_token
 */
export async function getAccessToken(refresh_token, slug) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oAuth2Client.setCredentials({ refresh_token });

  try {
    const { token } = await oAuth2Client.getAccessToken();
    return token;
  } catch (err) {
    const errorCode = err?.response?.data?.error;
    console.error('❌ Error al obtener access_token:', errorCode);

    if (errorCode === 'invalid_grant' && slug) {
      console.warn(`⚠️ refresh_token inválido para ${slug}. Enviando correo...`);

      // Buscar email y nombre en Supabase
      const { data, error } = await supabase
        .from('clients')
        .select('calendar_email, nombre')
        .eq('slug', slug)
        .single();

      if (!error && data?.calendar_email) {
        try {
          await sendReconnectEmail({
            to: data.calendar_email,
            name: data.nombre || slug,
            slug
          });
        } catch (mailErr) {
          console.error("📧 Error al enviar correo de reconexión:", mailErr.message);
        }
      }
    }

    throw new Error('refresh_token_invalid');
  }
}

/**
 * Obtiene los eventos de un día específico desde Google Calendar
 * @param {string} accessToken
 * @param {string} date - formato YYYY-MM-DD
 * @returns {Array<{ start: string, end: string }>}
 */
export async function getEventsForDay(accessToken, date) {
  console.log("🔐 Usando access_token:", accessToken?.slice(0, 20), "...");

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oAuth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error("❌ Formato de fecha inválido:", date);
    throw new Error("Formato de fecha inválido. Esperado: YYYY-MM-DD");
  }

  const [y, m, d] = date.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0);
  const end   = new Date(y, m - 1, d, 23, 59, 59, 999);

  try {
    const res = await calendar.events.list({
      calendarId   : 'primary',
      timeMin      : start.toISOString(),
      timeMax      : end.toISOString(),
      singleEvents : true,
      orderBy      : 'startTime'
    });

    console.log("✅ Eventos recibidos:", res.data.items?.length || 0);

    return res.data.items.map(ev => ({
      start: ev.start?.dateTime || ev.start?.date,
      end  : ev.end?.dateTime || ev.end?.date
    }));
  } catch (error) {
    console.error("❌ Error al leer eventos:", error.response?.data || error.message);
    throw new Error("Fallo al leer eventos de Google Calendar");
  }
}
