// 📁 routes/appointmentsCount.js
import express from 'express';
import { supabase } from '../supabaseClient.js';
import dayjs from 'dayjs';

const router = express.Router();

/**
 * GET /api/appointments/count?slug=negocio-slug
 * Devuelve el total de citas creadas este mes para ese slug
 */
router.get('/count', async (req, res) => {
  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'Falta el parámetro slug' });
  }

  try {
    const inicioMes = dayjs().startOf('month').toISOString();
    const finMes = dayjs().endOf('month').toISOString();

    const { count, error } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug)
      .gte('inicio', inicioMes)
      .lte('inicio', finMes)
      .is('cancelada', false);

    if (error) {
      console.error('Error contando citas:', error);
      return res.status(500).json({ error: 'Error interno contando citas' });
    }

    res.json({
      slug,
      totalThisMonth: count
    });
  } catch (err) {
    console.error('Error en /count:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
