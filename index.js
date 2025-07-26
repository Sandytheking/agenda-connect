// index.js

import express from 'express';
import cors from 'cors'
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
import slugRoutes  from "./routes/slug.js"; 
import path from 'path';
import citasRoutes from './routes/citas.js';
import publicConfigRoutes from './routes/publicConfig.js';
import testEmailRoute from './routes/testEmail.js';
import debugReconnect from './routes/debugReconnect.js';
import adminRoutes from './routes/admin.js';
import clientesRoutes from'./routes/clientes.js';
import superadminRoutes from './routes/superadmin.js';
import restablecerContrasena from './routes/restablecerContrasena.js';
import validarResetRoute from './routes/validarReset.js';
import olvideContrasenaRoute from './routes/olvideContrasena.js';
import analyticsRouter from './routes/analytics.js';


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

app.use(cors({
  origin: [
    'https://api.agenda-connect.com',
    'https://agenda-connect.com',
    'https://www.agenda-connect.com',
    'agenda-connect.onrender.com',
    'https://www.agenda-connect.com',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(express.json());

// 👉 Obtener todas las citas de un cliente por slug (Mueve esto arriba)
app.get('/api/citas', async (req, res) => {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Falta el parámetro slug' });
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('slug', slug)
      .order('inicio', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Error al obtener citas' });
    }

    res.json(data);
  } catch (err) {
    console.error('❌ Error en /api/citas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// Montar rutas
app.use(express.static('public'));   // ← ya sirve archivos estáticos
app.use('/', disponibilidadRoutes);
app.use('/api/citas', crearCitaRoutes);
app.use('/api/config', configRoutes);
app.use('/', authRoutes);
app.use('/', registroRoutes);
app.use('/', oauthRoutes);   
app.use('/', slugRoutes); 
app.use('/', citasRoutes);
app.use('/', publicConfigRoutes);
app.use(testEmailRoute);
app.use(debugReconnect);
app.use('/api/admin', adminRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api', superadminRoutes);
app.use('/api/restablecer-contrasena', restablecerContrasena);
app.use(validarResetRoute);
app.use('/api/olvide-contrasena', olvideContrasenaRoute);
app.use(analyticsRouter);

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

// 👉 Obtener nombre del negocio por slug
app.get('/api/negocio/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('nombre')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    res.json({ nombre_negocio: data.nombre });

  } catch (err) {
    console.error('❌ Error en /api/negocio/:slug', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});



// 👉 Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor activo en http://localhost:${PORT}`);
  console.log('🕒 TZ en Node =', Intl.DateTimeFormat().resolvedOptions().timeZone);
});
