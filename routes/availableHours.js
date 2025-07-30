// /routes/availableHours.js

import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

const router = express.Router();

// Autenticación Supabase (usa tu clave secreta del backend, no la pública del frontend)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const { date } = req.query;

  if (!slug || !date) return res.status(400).json({ error: 'Faltan datos' });

  const fecha = DateTime.fromISO(date.toString(), { zone: 'America/Santo_Domingo' });

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !client) return res.status(404).json({ error: 'Negocio no encontrado' });

  const dayName = fecha.toFormat('EEEE'); // ej: "Wednesday"
  const config = client.per_day_config?.[dayName];

  if (!config || !config.enabled) {
    return res.json({ available_hours: [] });
  }

  const start = DateTime.fromFormat(config.start, 'HH:mm', { zone: client.timezone });
  const end = DateTime.fromFormat(config.end, 'HH:mm', { zone: client.timezone });
  const lunchStart = config.lunch?.start
    ? DateTime.fromFormat(config.lunch.start, 'HH:mm', { zone: client.timezone })
    : null;
  const lunchEnd = config.lunch?.end
    ? DateTime.fromFormat(config.lunch.end, 'HH:mm', { zone: client.timezone })
    : null;

  const duration = client.duration_minutes || 60;
  const maxPerHour = client.max_per_hour || 1;
  const maxPerDay = client.max_per_day || 999;

  const { data: citasRaw } = await supabase
    .from('appointments')
    .select('hora, cancelada')
    .eq('slug', slug)
    .eq('fecha', date)
    .not('cancelada', 'is', true);

  const horaCitas = (citasRaw || []).map(c =>
    DateTime.fromISO(`${date}T${c.hora}`, { zone: client.timezone }).toISO()
  );

  let hora = start.set({ year: fecha.year, month: fecha.month, day: fecha.day });
  const bloques = [];

  while (hora < end) {
    const fin = hora.plus({ minutes: duration });

    // Excluir si ya pasó (solo si es hoy)
    if (
      fecha.hasSame(DateTime.now().setZone(client.timezone), 'day') &&
      fin < DateTime.now().setZone(client.timezone)
    ) {
      hora = hora.plus({ minutes: duration });
      continue;
    }

    // Excluir si cae en almuerzo
    if (
      lunchStart &&
      lunchEnd &&
      (hora < lunchEnd && fin > lunchStart)
    ) {
      hora = hora.plus({ minutes: duration });
      continue;
    }

    // Excluir si supera el máximo por hora
    const countSameHour = horaCitas.filter(h =>
      DateTime.fromISO(h, { zone: client.timezone }).toFormat('HH:mm') === hora.toFormat('HH:mm')
    ).length;

    if (countSameHour >= maxPerHour) {
      hora = hora.plus({ minutes: duration });
      continue;
    }

    bloques.push(hora.toFormat('HH:mm'));
    hora = hora.plus({ minutes: duration });
  }

  if ((citasRaw || []).length >= maxPerDay) {
    return res.json({ available_hours: [] });
  }

  return res.json({ available_hours: bloques });
});

export default router;