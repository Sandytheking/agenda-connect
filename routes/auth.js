// 📁 routes/auth.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Cliente Supabase para autenticación
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 👉 Iniciar sesión con email y contraseña
router.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    // 🔐 Login vía Supabase Auth
    const authRes = await fetch(
      process.env.SUPABASE_URL + '/auth/v1/token?grant_type=password',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({ email, password })
      }
    );

    const authData = await authRes.json();

    if (!authRes.ok) {
      return res.status(401).json({
        error: authData.error_description || 'Credenciales incorrectas'
      });
    }

    // 🔍 Buscar el cliente y su slug + user_id
    const { data: clientData, error } = await supabase
      .from('clients')
      .select('slug, user_id')
      .eq('email', email)
      .single();

    if (error || !clientData) {
      return res.status(404).json({ error: 'No se encontró negocio para este email' });
    }

    // 🪙 Crear token JWT propio
    const token = jwt.sign(
      {
        id: clientData.user_id,
        email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      slug: clientData.slug
    });

  } catch (err) {
    console.error('❌ Error al iniciar sesión:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
console.log("✅ JWT generado:", token);


// 📁 Nuevo endpoint PUT para actualizar días y horas laborales
router.put('/api/config/:slug', async (req, res) => {
  const slug = req.params.slug;
  const {
    max_per_day,
    max_per_hour,
    duration_minutes,
    work_days,
    start_hour,
    end_hour
  } = req.body;

  if (!max_per_day || !max_per_hour || !Array.isArray(work_days) || !start_hour || !end_hour) {
    return res.status(400).json({ error: 'Faltan campos requeridos o están mal formateados' });
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .update({
        max_per_day: Number(max_per_day),
        max_per_hour: Number(max_per_hour),
        duration_minutes: duration_minutes ? Number(duration_minutes) : null,
        work_days,
        start_hour,
        end_hour
      })
      .eq('slug', slug);

    if (error) {
      console.error('❌ Error al actualizar configuración:', error);
      return res.status(500).json({ error: 'Error al actualizar configuración' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error interno en PUT /api/config/:slug', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
