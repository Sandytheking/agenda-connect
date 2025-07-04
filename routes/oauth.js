import express from 'express';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 👉 1. Redirige al flujo de autorización
router.get('/api/oauth/start', (req, res) => {
  const { slug } = req.query;
  const redirect_uri = 'https://agenda-connect.onrender.com/api/oauth/callback';
  const client_id = process.env.GOOGLE_CLIENT_ID;

  const scope = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'email', 
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ].join(' ');

  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${slug}`;

  res.redirect(url);
});

// 👉 2. Google redirige aquí con el code
router.get('/api/oauth/callback', async (req, res) => {
  const { code, state: slug } = req.query;
  const redirect_uri = 'https://agenda-connect.onrender.com/api/oauth/callback';

  try {
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
    const refreshToken = data.refresh_token;
    const accessToken  = data.access_token;

    // Obtener email del usuario
    console.log("🔑 accessToken:", accessToken);
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
     headers: { Authorization: `Bearer ${accessToken}` }
    });

    const userInfo = await userInfoRes.json();
    console.log("👤 userInfo:", userInfo);
    const email = userInfo.email;


    // Guardar refresh_token en Supabase
    const { error } = await supabase
      .from('clients')
      .update({ refresh_token: refreshToken, calendar_email: email })
      .eq('slug', slug);

    if (error) throw error;

    res.send("✅ ¡Cuenta conectada correctamente! Puedes cerrar esta ventana.");
  } catch (err) {
    console.error("❌ Error en OAuth callback:", err);
    res.status(500).send("Error al conectar cuenta de Google");
  }
});

export default router;
