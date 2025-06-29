// 📁 routes/auth.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';

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
    const authRes = await fetch('https://'+process.env.SUPABASE_PROJECT_ID+'.supabase.co/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ email, password })
    });

    const authData = await authRes.json();

    if (!authRes.ok) {
      return res.status(401).json({ error: authData.error_description || 'Credenciales incorrectas' });
    }

    // Obtener el slug del negocio desde Supabase
    const { data, error } = await supabase
      .from('clients')
      .select('slug')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'No se encontró negocio para este email' });
    }

    res.json({
      access_token: authData.access_token,
      slug: data.slug
    });
  } catch (err) {
    console.error('❌ Error al iniciar sesión:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
