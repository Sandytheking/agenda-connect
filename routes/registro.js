// 📁 routes/registro.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 👉 Crear nuevo usuario y registro en la tabla clients
router.post('/api/registro', async (req, res) => {
  const { email, password, nombre, slug } = req.body;

  if (!email || !password || !nombre || !slug) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    // Verificar si el slug ya existe
    const { data: existing, error: queryError } = await supabase
      .from('clients')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'El slug ya está en uso. Elige otro.' });
    }

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      console.error('❌ Error al crear usuario Auth:', authError);
      return res.status(400).json({ error: 'No se pudo crear el usuario. ¿Ya existe ese correo?' });
    }

    // 2. Insertar en tabla clients con slug y valores iniciales
    const { error: insertError } = await supabase.from('clients').insert({
      email,
      slug,
      nombre,
      max_per_day: 5,
      max_per_hour: 1,
      duration_minutes: 30
    });

    if (insertError) {
      console.error('❌ Error al insertar en clients:', insertError);
      return res.status(500).json({ error: 'Usuario creado pero error al guardar configuración' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error inesperado en /api/registro:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
