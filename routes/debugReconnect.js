import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { sendReconnectEmail } from '../utils/sendReconnectEmail.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.get('/api/debug/reconnect-test/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('calendar_email, nombre')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      console.error('❌ Cliente no encontrado:', error?.message || 'No data');
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    if (!data.calendar_email) {
      return res.status(400).json({ success: false, error: 'Cliente no tiene email configurado' });
    }

    await sendReconnectEmail({
      to: data.calendar_email,
      nombre: data.nombre || slug,
      slug
    });

    console.log(`✅ Correo de reconexión enviado a ${data.calendar_email}`);

    return res.json({ success: true, message: `Correo enviado a ${data.calendar_email}` });

  } catch (err) {
    console.error('❌ Error al enviar correo de prueba:', err.message);
    return res.status(500).json({ success: false, error: 'Error al enviar el correo' });
  }
});

export default router;
