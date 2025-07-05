// index.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import querystring from 'querystring';
import { createClient } from '@supabase/supabase-js';
import disponibilidadRoutes from './routes/disponibilidad.js';
import fetch from 'node-fetch'; // asegúrate de tener esto instalado si usas Node <18
import crearCitaRoutes from './routes/crearCita.js';
import configRoutes from './routes/config.js';
import authRoutes from './routes/auth.js';
import registroRoutes from './routes/registro.js';
import oauthRoutes from './routes/oauth.js'; 
import slugRoutes       from "./routes/slug.js"; 


// Cargar variables de entorno
dotenv.config();

// Crear cliente de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuración de Google OAuth
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
].join(' ');

// Inicializar servidor
const app = express();
app.use(cors());
app.use(express.json());


// Montar rutas
app.use('/', disponibilidadRoutes);
app.use('/', crearCitaRoutes);  // ← asegúrate de tener esta línea
app.use('/', configRoutes);
app.use('/', authRoutes);
app.use('/', registroRoutes);
app.use('/', oauthRoutes);   
app.use("/", slugRoutes); 
app.use(express.static('public'));   // ← ya sirve archivos estáticos


// 👉 Iniciar login con Google
app.get('/auth/google', (req, res) => {
  const params = querystring.stringify({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent'
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// 👉 Callback que recibe el code
app.get('/auth/callback', (req, res) => {
  const code = req.query.code;
  res.send(`✅ Código recibido: ${code}`);
});

// 👉 Ruta para intercambiar el code por un refresh_token
app.post('/auth/token', async (req, res) => {
  try {
    const code = req.body.code;

    if (!code) {
      return res.status(400).json({ error: 'Falta el código de autorización' });
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Error al intercambiar code:", data);
      return res.status(400).json({ error: 'Error al intercambiar el código', details: data });
    }

    console.log("✅ refresh_token recibido:", data.refresh_token);
    res.json(data); // Devuelve access_token y refresh_token
  } catch (err) {
    console.error("❌ Error en /auth/token:", err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 👉 Ruta para obtener configuración del cliente por slug
app.get('/api/config/:slug', async (req, res) => {
  const slug = req.params.slug;

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('max_per_day, max_per_hour, duration_minutes, refresh_token')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'No se encontró la configuración del cliente' });
    }

    res.json(data);
  } catch (err) {
    console.error('❌ Error en /api/config/:slug', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 👉 Conectar otras rutas
app.use('/', disponibilidadRoutes);

// 👉 Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor activo en http://localhost:${PORT}`);
});
