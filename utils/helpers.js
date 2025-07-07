// utils/helpers.js  (pequeño helper reutilizable)
export function toLocalDateTime(dateStr, timeStr) {
  // dateStr = 'YYYY-MM-DD'   |   timeStr = 'HH:mm'
  const [y, m, d]   = dateStr.split('-').map(Number);
  const [hh, mm]    = timeStr.split(':').map(Number);
  const jsDate      = new Date(y, m - 1, d, hh, mm, 0, 0); // ← *local* en el server
  const isoNoZ      = `${dateStr}T${timeStr}:00`;          // para Google
  return { jsDate, isoNoZ };
}
