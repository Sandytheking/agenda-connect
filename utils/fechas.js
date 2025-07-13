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
  console.log('🧩 Datos recibidos para crear fecha:', { date, time, timezone });

  if (!date || !time) {
    throw new Error('Faltan parámetros de fecha u hora');
  }

  const cleanTimezone = timezone.replace(/^['"]|['"]$/g, ''); // 🧽 limpia comillas

  const [hourStr, minuteStr] = time.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (isNaN(hour) || isNaN(minute)) {
    console.error('❌ Hora o minuto no numérico:', { hourStr, minuteStr });
    throw new Error('Hora no válida');
  }

  const dt = DateTime.fromISO(date, { zone: cleanTimezone }).set({ hour, minute });

  if (!dt.isValid) {
    console.error('❌ DateTime inválido:', dt.invalidExplanation || dt.invalidReason);
    throw new Error('Fecha/hora inválida');
  }

  console.log('✅ DateTime generado:', dt.toISO());
  return dt;
}
