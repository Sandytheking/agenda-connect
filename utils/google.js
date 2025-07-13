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
