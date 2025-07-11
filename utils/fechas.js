import { DateTime } from 'luxon';

const TIMEZONE = 'America/Santo_Domingo';

// Pad numbers to two digits
function pad(n) {
  return n.toString().padStart(2, '0');
}

// Parse date (YYYY-MM-DD) and time (HH:mm) to DateTime in America/Santo_Domingo
function parseDateTime(date, time) {
  if (!date || !time) {
    throw new Error('Faltan date o time');
  }
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = time.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) {
    throw new Error('Formato de date o time inválido');
  }
  const [_, y, m, d] = dateMatch.map(Number);
  const [__, hh, mm] = timeMatch.map(Number);
  return DateTime.fromObject(
    { year: y, month: m, day: d, hour: hh, minute: mm },
    { zone: TIMEZONE }
  );
}

// Generate time slots for a given date based on config (start_hour, end_hour, duration_minutes)
function generarSlots(date, cfg) {
  const paso = Number(cfg.duration_minutes || 30);
  const [sh, sm] = cfg.start_hour.split(':').map(Number);
  const [eh, em] = cfg.end_hour.split(':').map(Number);
  const [y, m, d] = date.split('-').map(Number);

  const start = DateTime.fromObject(
    { year: y, month: m, day: d, hour: sh, minute: sm },
    { zone: TIMEZONE }
  );
  const end = DateTime.fromObject(
    { year: y, month: m, day: d, hour: eh, minute: em },
    { zone: TIMEZONE }
  );

  const lista = [];
  let cur = start;
  while (cur < end) {
    lista.push(cur.toFormat('HH:mm'));
    cur = cur.plus({ minutes: paso });
  }
  return lista;
}

// Format dateTime to ISO 8601 with -04:00 offset for Google Calendar
function toISODateTime(dateTime) {
  return dateTime.toISO({ includeOffset: true });
}

// Create start and end DateTime objects for a slot, return in UTC for overlap checks
function getSlotDates(date, time, duration) {
  const dateTime = parseDateTime(date, time);
  const start = dateTime.toUTC();
  const end = dateTime.plus({ minutes: Number(duration) }).toUTC();
  return { start, end };
}

// Format date to YYYY-MM-DD for getEventsForDay
function toDateString(dateTime) {
  return dateTime.toFormat('yyyy-MM-dd');
}

// Validate if a date is a working day based on cfg.work_days
function isWorkingDay(date, cfg) {
  const dateTime = DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: TIMEZONE });
  const dia = dateTime.weekday; // 1 = Monday, 7 = Sunday
  const diasLaborables = cfg.work_days || [];
  return diasLaborables.includes(dia);
}

// Get minimum date for <input type="date"> (today in America/Santo_Domingo)
function getMinDate() {
  return DateTime.now().setZone(TIMEZONE).startOf('day').toFormat('yyyy-MM-dd');
}

export {
  parseDateTime,
  generarSlots,
  toISODateTime,
  getSlotDates,
  toDateString,
  isWorkingDay,
  getMinDate,
};