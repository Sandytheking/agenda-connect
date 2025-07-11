// 📁 utils/fechas.js
import { DateTime } from 'luxon';

/**
 * Devuelve un DateTime válido a partir de fecha y hora tipo string.
 * @param {string} date - En formato YYYY-MM-DD
 * @param {string} time - En formato HH:mm
 * @param {string} timezone - Ej: "America/Santo_Domingo"
 * @returns {DateTime}
 */
export function getDateTimeFromStrings(date, time, timezone = 'UTC') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Formato de fecha inválido (esperado: YYYY-MM-DD)');
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error('Formato de hora inválido (esperado: HH:mm)');
  }

  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  const dt = DateTime.fromObject({ year, month, day, hour, minute }, { zone: timezone });

  if (!dt.isValid) {
    throw new Error('Fecha/hora inválida');
  }

  return dt;
}
