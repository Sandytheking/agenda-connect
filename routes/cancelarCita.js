// 📁 routes/cancelarCita.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.get('/cancelar-cita/:token', async (req, res) => {
  const { token } = req.params;

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('cancel_token', token)
    .single();

  if (error || !data) {
    return res.status(404).send("❌ Token inválido o cita no encontrada.");
  }

  // Aquí puedes eliminar la cita o marcarla como cancelada
  await supabase
    .from('appointments')
    .update({ cancelada: true })
    .eq('id', data.id);

  return res.send("✅ Cita cancelada exitosamente.");
});

export default router;
