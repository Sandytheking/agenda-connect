import express from 'express';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 👉 1. Redirige al flujo de autorización
router.get('/api/oauth/start', (req, res) => {
  const { slug } = req.query;
  const redirect_uri = 'https://api.agenda-connect.com/api/oauth/callback';
  const client_id = process.env.GOOGLE_CLIENT_ID;

  const scope = [
    'https://www.googleapis.com/auth/calendar.events',
    'email',
    'https://www.googleapis.com/auth/userinfo.email'
  ].join(' ');

  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${slug}`;

  res.redirect(url);
});

// 👉 2. Callback después del login
router.get('/api/oauth/callback', async (req, res) => {
  const { code, state: slug } = req.query;
  const redirect_uri = 'https://api.agenda-connect.com/api/oauth/callback';

  try {
    // 🧪 Validar que el slug existe
    const { data: existingClient, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('slug', slug)
      .single();

    if (clientError || !existingClient) {
      return res.status(400).send("❌ Cliente no encontrado.");
    }

    // 🛫 Solicitar tokens a Google
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri,
        grant_type: "authorization_code"
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("❌ Error en token exchange:", data);
      return res.status(400).send("Error al intercambiar código por token.");
    }

    const refreshToken = data.refresh_token;
    const accessToken = data.access_token;

    // 📩 Obtener email del usuario autenticado
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const userInfo = await userInfoRes.json();
    const email = userInfo.email;

    // 🧠 Construir objeto de actualización
    const updateData = { calendar_email: email };
    if (refreshToken) {
      updateData.refresh_token = refreshToken;
    }

    // 💾 Guardar en Supabase
    const { error: updateError } = await supabase
      .from('clients')
      .update(updateData)
      .eq('slug', slug);

    if (updateError) {
      console.error("❌ Error actualizando Supabase:", updateError);
      return res.status(500).send("Error al guardar los tokens.");
    }

    res.redirect("https://www.agenda-connect.com/admin-avanzado");
  } catch (err) {
    console.error("❌ Error en OAuth callback:", err);
    res.status(500).send("Error al conectar cuenta de Google");
  }
});

export default router;
