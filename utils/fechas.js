// 📁 utils/fechas.js
import { DateTime } from 'luxon';

/**
 * Convierte date y time strings en un DateTime válido, lanzando error si no es válido.
 * @param {string} date - Formato 'YYYY-MM-DD'
 * @param {string} time - Formato 'HH:mm'
 * @param {string} timezone - Ej. 'America/Santo_Domingo'
 * @returns {DateTime}
 */
export function getDateTimeFromStrings(date, time, timezone = 'UTC') {
  if (!date || !time) {
    throw new Error('Faltan parámetros de fecha u hora');
  }

  const [hour, minute] = time.split(':').map(Number);
  const dt = DateTime.fromISO(date, { zone: timezone }).set({ hour, minute });

  if (!dt.isValid) {
    throw new Error('Fecha/hora inválida');
  }

  return dt;
}
