// index.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import querystring from 'querystring';
import { createClient } from '@supabase/supabase-js';

// Importar rutas externas
import disponibilidadRoutes from './routes/disponibilidad.js';

// Cargar variables de entorno
dotenv.config();

// Crear cliente de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // o SUPABASE_KEY si usas anon
);

// Configuración de Google OAuth
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
].join(' ');

// Inicializar servidor Express
const app = express();
app.use(cors());
app.use(express.json());

// 👉 Ruta para iniciar login con Google
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

// 👉 Ruta callback de Google (aquí llegará el "code")
app.get('/auth/callback', (req, res) => {
  const code = req.query.code;
  res.send(`✅ Código recibido: ${code}`);
});

// 👉 Ruta para obtener configuración del cliente por slug
app.get('/api/config/:slug', async (req, res) => {
  const slug = req.params.slug;

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('max_per_day, max_per_hour, duration_minutes')
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

// 👉 Montar rutas adicionales desde carpeta /routes
app.use('/', disponibilidadRoutes);

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor activo en http://localhost:${PORT}`);
});
