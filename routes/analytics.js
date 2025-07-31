// routes/analytics.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from '../middlewares/verifyAuth.js';
import { checkPlan } from '../middlewares/checkPlan.js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.get('/analytics/:slug', verifyAuth, checkPlan(['pro', 'business']), async (req, res) => {
  const { slug } = req.params;
  const { desde, hasta } = req.query;

  let query = supabase
    .from('appointments')
    .select('id, nombre, email, telefono, inicio, evento_id')
    .eq('slug', slug);

  // Si hay filtros de fechas, los aplicamos
  if (desde) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
      return res.status(400).json({ error: 'Formato inválido para "desde" (YYYY-MM-DD)' });
    }
    query = query.gte('inicio', `${desde}T00:00:00`);
  }

  if (hasta) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
      return res.status(400).json({ error: 'Formato inválido para "hasta" (YYYY-MM-DD)' });
    }
    query = query.lte('inicio', `${hasta}T23:59:59`);
  }

  const { data: citas, error } = await query;

  if (error) return res.status(500).json({ error: error.message });

  const stats = {
    total: citas.length,
    porMes: {},
    sincronizadas: citas.filter(c => c.evento_id).length,
    noSincronizadas: citas.filter(c => !c.evento_id).length,
    clientesFrecuentes: {},
  };

  for (const cita of citas) {
    const date = new Date(cita.inicio);
    const mes = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    stats.porMes[mes] = (stats.porMes[mes] || 0) + 1;
    stats.clientesFrecuentes[cita.email] = (stats.clientesFrecuentes[cita.email] || 0) + 1;
  }

  const topClientes = Object.entries(stats.clientesFrecuentes)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  res.json({
    totalCitas: stats.total,
    citasPorMes: stats.porMes,
    sincronizadas: stats.sincronizadas,
    noSincronizadas: stats.noSincronizadas,
    topClientes,
  });
});

export default router;
