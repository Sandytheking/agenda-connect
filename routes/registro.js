// 📁 routes/registro.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '../utils/sendWelcomeEmail.js';
import { addDays } from 'date-fns';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post('/api/registro', async (req, res) => {
  const {
    email,
    password,
    nombre,
    slug,
    plan,
    accepted_terms = false
  } = req.body;

  const finalPlan = (plan === "pro" || plan === "business") ? plan : "free";

  console.log('🟢 Plan recibido desde frontend:', plan);
  console.log('🟢 Plan que se insertará en DB:', finalPlan);

  if (!email || !password || !nombre || !slug) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  // Validar formato de slug (solo minúsculas, números y guiones)
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: 'El slug solo puede contener minúsculas, números y guiones' });
  }

  try {
    // 0. Validar slug único
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'El slug ya está en uso. Elige otro.' });
    }

    // 1. Crear usuario Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      console.error('Auth error:', authError);
      return res.status(400).json({ error: 'No se pudo crear el usuario (¿correo ya existe?)' });
    }

    const userId = authData.user.id;

    // 🆕 2. Definir configuración inicial por día
    const defaultPerDayConfig = {
      Monday:    { activo: true,  entrada: '08:00', salida: '17:00', almuerzoInicio: null, almuerzoFin: null },
      Tuesday:   { activo: true,  entrada: '08:00', salida: '17:00', almuerzoInicio: null, almuerzoFin: null },
      Wednesday: { activo: true,  entrada: '08:00', salida: '17:00', almuerzoInicio: null, almuerzoFin: null },
      Thursday:  { activo: true,  entrada: '08:00', salida: '17:00', almuerzoInicio: null, almuerzoFin: null },
      Friday:    { activo: true,  entrada: '08:00', salida: '17:00', almuerzoInicio: null, almuerzoFin: null },
      Saturday:  { activo: false, entrada: '08:00', salida: '12:00', almuerzoInicio: null, almuerzoFin: null },
      Sunday:    { activo: false, entrada: '00:00', salida: '00:00', almuerzoInicio: null, almuerzoFin: null },
    };

    // 3. Calcular fecha de vencimiento (+30 días desde registro)
    const fechaVencimiento = addDays(new Date(), 30);

    // 4. Insertar fila en `clients` con suscripción activa
    const { error: insertError } = await supabase.from('clients').insert({
      user_id: userId,
      email,
      nombre,
      slug,
      plan: finalPlan,
      accepted_terms: !!accepted_terms,
      terms_accepted_at: accepted_terms ? new Date().toISOString() : null,
      max_per_day: 5,
      max_per_hour: 1,
      duration_minutes: 30,
      start_hour: 8,
      end_hour: 17,
      work_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      per_day_config: defaultPerDayConfig,
      subscription_valid_until: fechaVencimiento.toISOString(),
      activo: true,
      timezone: req.body.timezone || "America/Santo_Domingo"
    });

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: 'Usuario creado pero error al guardar configuración' });
    }

    // 5. Enviar correo de bienvenida
    await sendWelcomeEmail({ to: email, name: nombre, slug });

    res.json({ success: true, mensaje: 'Cliente registrado con 30 días de prueba' });
  } catch (err) {
    console.error('❌ Error inesperado en /api/registro:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
