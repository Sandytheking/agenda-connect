// google-oauth.js
import express from 'express';
import axios from 'axios';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

/**
 * INICIO DE AUTORIZACIÓN
 * Recibe el user_id del cliente y redirige a Google OAuth
 */
router.get('/api/oauth/start', (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).send("❌ Falta el parámetro user_id.");
  }

  const redirect_uri = 'https://api.agenda-connect.com/api/oauth/callback';
  const client_id = process.env.GOOGLE_CLIENT_ID;

  const scope = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'email',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ].join(' ');

  const url = `https://accounts.google.com/o/oauth2/v2/auth` +
    `?response_type=code` +
    `&client_id=${client_id}` +
    `&redirect_uri=${redirect_uri}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${user_id}`;

  res.redirect(url);
});

/**
 * CALLBACK DE GOOGLE
 * Recibe el código de Google y el user_id como state
 */
router.get('/api/oauth/callback', async (req, res) => {
  const { code, state: user_id } = req.query;
  const redirect_uri = 'https://api.agenda-connect.com/api/oauth/callback';

  if (!user_id) {
    return res.status(400).send("❌ Falta el parámetro user_id en el state.");
  }

  try {
    // 1️⃣ Verificar que el cliente exista en la BD
    const { data: existingClient, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (clientError || !existingClient) {
      return res.status(400).send("❌ Cliente no encontrado.");
    }

    // 2️⃣ Intercambiar el code por tokens de Google
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri,
        grant_type: 'authorization_code'
      }
    });

    const { access_token, refresh_token } = tokenResponse.data;

    // 3️⃣ Obtener el email y demás datos del usuario desde Google
    const userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    // 4️⃣ Guardar en Supabase
    const updateData = {
      google_email: userInfo.data.email,
      access_token,
      refresh_token,
      google_connected: true
    };

    const { error: updateError } = await supabase
      .from('clients')
      .update(updateData)
      .eq('user_id', user_id);

    if (updateError) {
      console.error("Error actualizando cliente en Supabase:", updateError);
      return res.status(500).send("Error al guardar tokens.");
    }

    res.send("✅ Integración con Google Calendar completada.");
  } catch (error) {
    console.error("Error en OAuth Callback:", error.response?.data || error.message);
    res.status(500).send("❌ Error al conectar con Google Calendar.");
  }
});

export default router;
