// routes/availableHours.js

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

    const dayOfWeek = DateTime.fromISO(date, { zone: timezone }).toFormat('EEEE');
    const perDay = config.per_day_config?.[dayOfWeek];

    if (!perDay || !perDay.enabled) {
      return res.json({ available_hours: [] }); // Día no habilitado
    }

    const startStr = perDay.start || '08:00';
    const endStr = perDay.end || '17:00';
    const lunchStartStr = perDay.lunch?.start;
    const lunchEndStr = perDay.lunch?.end;

    const startOfDay = DateTime.fromISO(date, { zone: timezone }).startOf('day');
    const workStart = DateTime.fromFormat(`${date} ${startStr}`, 'yyyy-MM-dd HH:mm', { zone: timezone });
    const workEnd = DateTime.fromFormat(`${date} ${endStr}`, 'yyyy-MM-dd HH:mm', { zone: timezone });

    const lunchStart = lunchStartStr
      ? DateTime.fromFormat(`${date} ${lunchStartStr}`, 'yyyy-MM-dd HH:mm', { zone: timezone })
      : null;
    const lunchEnd = lunchEndStr
      ? DateTime.fromFormat(`${date} ${lunchEndStr}`, 'yyyy-MM-dd HH:mm', { zone: timezone })
      : null;

    // Obtener citas desde Supabase
    const { data: citas, error } = await supabase
      .from('appointments')
      .select('inicio, fin')
      .eq('slug', slug)
      .gte('inicio', workStart.toISO())
      .lt('inicio', workEnd.toISO());

    if (error) {
      console.error("❌ Supabase error:", error.message);
      return res.status(500).json({ error: 'Error al consultar citas' });
    }

    if (citas.length >= maxPerDay) {
      return res.json({ available_hours: [] }); // Día completo
    }

    // Generar slots disponibles
    const horasDisponibles = [];
    let current = workStart;

    while (current.plus({ minutes: duracion }) <= workEnd) {
      const slotStart = current;
      const slotEnd = current.plus({ minutes: duracion });

      // Verificar si el slot está dentro del horario de almuerzo
      const enAlmuerzo =
        lunchStart && lunchEnd &&
        slotStart < lunchEnd && slotEnd > lunchStart;

      if (enAlmuerzo) {
        current = current.plus({ minutes: duracion });
        continue;
      }

      // Verificar si hay solapamiento con citas
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
