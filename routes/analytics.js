// routes/analytics.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.get('/api/analytics/:slug', async (req, res) => {
  const { slug } = req.params;

  const { data: citas, error } = await supabase
    .from('appointments')
    .select('id, nombre, email, telefono, inicio, evento_id')
    .eq('slug', slug);  // ← Asegúrate de guardar `slug` en tu tabla appointments

  if (error) return res.status(500).json({ error: error.message });

  // Procesar estadísticas
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

  // Top 5 clientes frecuentes
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
