// /routes/availableHours.js

import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.get('/available-hours/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { date } = req.query;

    if (!slug || !date) {
      return res.status(400).json({ error: 'Faltan parámetros' });
    }

    const config = await getConfigBySlug(slug);
    if (!config) return res.status(404).json({ error: 'Negocio no encontrado' });

    const timezone = config.timezone || 'America/Santo_Domingo';
    const duracion = config.duration_minutes || 30;
    const maxPerHour = config.max_per_hour ?? 1;
    const maxPerDay = config.max_per_day ?? 5;

    const parsedDate = DateTime.fromISO(date, { zone: timezone });
    const dayOfWeek = parsedDate.toFormat('cccc').toLowerCase(); // "monday"

    const dayConfig = config.per_day_config?.[dayOfWeek];
    if (!dayConfig || !dayConfig.habilitado) {
      return res.json({ available_hours: [] }); // Día deshabilitado
    }

    // Construir rango del día
    const startOfDay = parsedDate.startOf('day');
    const endOfDay = startOfDay.plus({ days: 1 });

    // Obtener citas locales desde Supabase
    const { data: citas, error } = await supabase
      .from('appointments')
      .select('inicio, fin')
      .eq('slug', slug)
      .gte('inicio', startOfDay.toISO())
      .lt('inicio', endOfDay.toISO());

    if (error) {
      console.error("❌ Supabase error:", error.message);
      return res.status(500).json({ error: 'Error al consultar citas' });
    }

    if (citas.length >= maxPerDay) {
      return res.json({ available_hours: [] }); // Día completo
    }

    // Convertir horas de trabajo y almuerzo a DateTime
    const [startHour, startMin] = dayConfig.inicio.split(':').map(Number);
    const [endHour, endMin] = dayConfig.fin.split(':').map(Number);
    const [lunchStartHour, lunchStartMin] = dayConfig.almuerzo_inicio.split(':').map(Number);
    const [lunchEndHour, lunchEndMin] = dayConfig.almuerzo_fin.split(':').map(Number);

    const workStart = parsedDate.set({ hour: startHour, minute: startMin });
    const workEnd = parsedDate.set({ hour: endHour, minute: endMin });
    const lunchStart = parsedDate.set({ hour: lunchStartHour, minute: lunchStartMin });
    const lunchEnd = parsedDate.set({ hour: lunchEndHour, minute: lunchEndMin });

    // Generar slots posibles
    const horasDisponibles = [];
    let current = workStart;

    while (current < workEnd) {
      const slotStart = current;
      const slotEnd = current.plus({ minutes: duracion });

      // ❌ Excluir si cae dentro del almuerzo
      if (slotStart < lunchEnd && slotEnd > lunchStart) {
        current = current.plus({ minutes: duracion });
        continue;
      }

      // Verificar solapamiento
      const solapados = citas.filter((cita) => {
        const cStart = DateTime.fromISO(cita.inicio);
        const cEnd = DateTime.fromISO(cita.fin);
        return cStart < slotEnd && slotStart < cEnd;
      });

      if (solapados.length < maxPerHour) {
        horasDisponibles.push(slotStart.toFormat('HH:mm'));
      }

      current = current.plus({ minutes: duracion });
    }

    res.json({ available_hours: horasDisponibles });

  } catch (err) {
    console.error("❌ Error en /available-hours:", err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
