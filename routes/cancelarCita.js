// 📁 routes/cancelarCita.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.get('/api/cancelar-cita/:token', async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).send('Token inválido');
  }

  // Buscar la cita con ese token
  const { data, error } = await supabase
    .from('appointments')
    .select('id')
    .eq('cancel_token', token)
    .single();

  if (error || !data) {
    return res.status(404).send('No se encontró la cita o ya fue cancelada.');
  }

  // Marcar la cita como cancelada (o eliminarla si prefieres)
  const { error: updateError } = await supabase
    .from('appointments')
    .update({ cancelado: true })
    .eq('id', data.id);

  if (updateError) {
    return res.status(500).send('Error al cancelar la cita');
  }

  res.send(`
    <div style="font-family: sans-serif; text-align: center; margin-top: 80px;">
      <h2 style="color: #e53e3e;">🗑️ Cita cancelada exitosamente</h2>
      <p>Gracias por informarnos. Puedes volver a reservar cuando gustes.</p>
    </div>
  `);
});

export default router;

