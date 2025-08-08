// routes/analytics.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { checkPlan } from '../middleware/checkPlan.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

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

    const clienteID = cita.email || cita.telefono || cita.nombre;
    if (clienteID) {
      stats.clientesFrecuentes[clienteID] = (stats.clientesFrecuentes[clienteID] || 0) + 1;
    }
  }

  // Clasificación de clientes
  const clientesRecurrentes = Object.entries(stats.clientesFrecuentes).filter(
    ([_, count]) => count > 1
  );
  const clientesNuevos = Object.entries(stats.clientesFrecuentes).filter(
    ([_, count]) => count === 1
  );

 

// Obtenemos la fecha de la primera cita para cada cliente nuevo y el nombre
const primerCitaPorCliente = {};
const nombrePorCliente = {};

for (const cita of citas) {
  const clienteID = cita.email;
  if (!clienteID) continue;

  const fechaCita = new Date(cita.inicio);

  // Guardar la primera cita de cada cliente
  if (!primerCitaPorCliente[clienteID] || fechaCita < new Date(primerCitaPorCliente[clienteID])) {
    primerCitaPorCliente[clienteID] = cita.inicio;
  }

  // Guardar nombre si no está ya
  if (!nombrePorCliente[clienteID] && cita.nombre) {
    nombrePorCliente[clienteID] = cita.nombre;
  }
}


// Inicializar conteo de citas por día de la semana
const citasPorDia = {
  Lunes: 0,
  Martes: 0,
  Miércoles: 0,
  Jueves: 0,
  Viernes: 0,
  Sábado: 0,
  Domingo: 0,
};

// Contar citas por día
for (const cita of citas) {
  const date = new Date(cita.inicio);
  const diaSemana = date.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
  switch (diaSemana) {
    case 0: citasPorDia.Domingo++; break;
    case 1: citasPorDia.Lunes++; break;
    case 2: citasPorDia.Martes++; break;
    case 3: citasPorDia.Miércoles++; break;
    case 4: citasPorDia.Jueves++; break;
    case 5: citasPorDia.Viernes++; break;
    case 6: citasPorDia.Sábado++; break;
  }
}


// Formateamos clientes nuevos con first_appointment y nombre
const clientesNuevosFormatted = clientesNuevos.map(([email, count]) => ({
  email,
  count,
  first_appointment: primerCitaPorCliente[email]?.slice(0, 10) || null,
  nombre: nombrePorCliente[email] || '',
}));

// Formateamos clientes recurrentes para frontend
const clientesRecurrentesFormatted = clientesRecurrentes.map(([email, count]) => ({
  email,
  count,
  nombre: nombrePorCliente[email] || '',
}));


// Top 5 recurrentes
const topClientes = [...clientesRecurrentes]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

// Totales y porcentajes
const totalClientesRecurrentes = clientesRecurrentes.length;
const totalClientesNuevos = clientesNuevos.length;

const porcentajeClientesRecurrentes = stats.total > 0
  ? Number(((totalClientesRecurrentes / Object.keys(stats.clientesFrecuentes).length) * 100).toFixed(2))
  : 0;

const porcentajeClientesNuevos = stats.total > 0
  ? Number(((totalClientesNuevos / Object.keys(stats.clientesFrecuentes).length) * 100).toFixed(2))
  : 0;

res.json({
  totalCitas: stats.total,
  citasPorMes: stats.porMes,
  sincronizadas: stats.sincronizadas,
  noSincronizadas: stats.noSincronizadas,
  topClientes,
  totalClientesRecurrentes,
  porcentajeClientesRecurrentes,
  totalClientesNuevos,
  porcentajeClientesNuevos,
  clientesRecurrentes: clientesRecurrentesFormatted,
  clientesNuevos: clientesNuevosFormatted,
  citasPorDia

});

});

export default router;
