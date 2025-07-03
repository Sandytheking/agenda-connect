// 📁 routes/registro.js
import express                 from 'express';
import { createClient }        from '@supabase/supabase-js';

const router   = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY   // ➜  Service‑Role
);

// 👉 POST /api/registro  ─────────────────────────────────────────
router.post('/api/registro', async (req, res) => {
  const {
    email,
    password,
    nombre,
    slug,
    accepted_terms          // ✅  nuevo campo
  } = req.body;

  /* ── Validaciones básicas ─────────────────────────────────── */
  if (!email || !password || !nombre || !slug)
    return res.status(400).json({ error:"Faltan campos obligatorios" });

  if (accepted_terms !== true)
    return res.status(400).json({ error:"Debes aceptar los términos" });

  try {
    /* 1️⃣  Verificar slug repetido -------------------------------- */
    const { data:exists } = await supabase
      .from('clients')
      .select('id')
      .eq('slug', slug)
      .single();

    if (exists)
      return res.status(409).json({ error:"El slug ya está en uso" });

    /* 2️⃣  Crear usuario en Supabase Auth ------------------------ */
    const { data:authUser, error:authErr } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

    if (authErr) {
      console.error('Auth error:', authErr);
      return res.status(400).json({ error:"No se pudo crear el usuario (¿email ya existe?)" });
    }

    /* 3️⃣  Insertar registro en tabla clients -------------------- */
    const { error:insErr } = await supabase
      .from('clients')
      .insert({
        user_id          : authUser.user.id,   // guarda referencia
        email,
        nombre,
        slug,
        accepted_terms   : true,               // 👍
        /* valores por defecto editables luego en el panel admin */
        max_per_day      : 5,
        max_per_hour     : 1,
        duration_minutes : 30,
        work_days        : [1,2,3,4,5],        // lunes‑viernes
        start_hour       : '09:00',
        end_hour         : '17:00'
      });

    if (insErr) {
      console.error('DB insert error:', insErr);
      return res.status(500).json({ error:"Usuario creado pero falló la configuración inicial" });
    }

    /* 4️⃣  OK */
    return res.json({ success:true, slug });

  } catch (e) {
    console.error('❌ /api/registro', e);
    return res.status(500).json({ error:"Error interno del servidor" });
  }
});

export default router;
