// 📁 routes/registro.js
import express           from 'express';
import { createClient }  from '@supabase/supabase-js';
import { sendWelcomeEmail } from '../emails/sendWelcomeEmail.js';


const router = express.Router();

// Cliente Supabase (service‑role)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 👉 Alta de un nuevo negocio + usuario Auth + fila en clients
router.post('/api/registro', async (req, res) => {
  const {
    email,
    password,
    nombre,
    slug,
    accepted_terms = false      // ← lo recibimos del frontend
  } = req.body;

  if (!email || !password || !nombre || !slug) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    /* 0.  Slug único ---------------------------------------------------- */
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'El slug ya está en uso. Elige otro.' });
    }

    /* 1.  Crear usuario Auth ------------------------------------------- */
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true       // envía link de confirmación
      });

    if (authError) {
      console.error('Auth error:', authError);
      return res
        .status(400)
        .json({ error: 'No se pudo crear el usuario (¿correo ya existe?)' });
    }

    const userId = authData.user.id;   // UUID de auth.users

    /* 2.  Insertar fila en `clients` ----------------------------------- */
    const { error: insertError } = await supabase.from('clients').insert({
      user_id          : userId,       // ← NUEVO
      email,
      nombre,
      slug,
      accepted_terms   : !!accepted_terms,
      terms_accepted_at: accepted_terms ? new Date().toISOString() : null,
      max_per_day      : 5,
      max_per_hour     : 1,
      duration_minutes : 30,
      start_hour       : 8,
      end_hour         : 17,
      work_days        : [1,2,3,4,5]   // lunes‑viernes por defecto
    });

    if (insertError) {
      console.error('Insert error:', insertError);
      return res
        .status(500)
        .json({ error: 'Usuario creado pero error al guardar configuración' });
    }

// ✉️ Enviar correo de bienvenida
await sendWelcomeEmail({
  to: email,
  name: nombre,
  slug
});

    /* 3.  Todo OK ------------------------------------------------------- */
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error inesperado en /api/registro:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
