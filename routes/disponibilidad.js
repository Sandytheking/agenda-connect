// 📁 routes/disponibilidad.js   (ES‑modules)
import express from 'express';
import { getConfigBySlug }   from '../supabaseClient.js';
import { getAccessToken,
         getEventsForDay }   from '../utils/google.js';
import { toLocalDateTime } from '../utils/helpers.js';

const router = express.Router();

/* ---------- GET  /api/availability/:slug  (uso público) ---------- */
router.get('/api/availability/:slug', async (req, res) => {
  try {
    const { slug }        = req.params;
    const { date, time }  = req.query;          // YYYY‑MM‑DD  y  HH:mm

    if (!slug || !date || !time) {
      return res.status(400).json({ available:false,
                                    message:'Faltan parámetros' });
    }

    /* ①  Configuración del negocio */
    const cfg = await getConfigBySlug(slug);
    if (!cfg || !cfg.refresh_token) {
      return res.status(404).json({ available:false,
                                    message:'Negocio no encontrado' });
    }

    /* ②  Obtener eventos del día en Google Calendar */
    const token   = await getAccessToken(cfg.refresh_token);
    const eventos = await getEventsForDay(token, date);   // [{start,end}, …]

    /* ③  Límite de citas por DÍA */
    if (eventos.length >= (cfg.max_per_day ?? 5)) {
      return res.json({ available:false, message:'Día completo' });
    }

    /* ④  Construir el rango horario del slot solicitado */
    const [year, month, day]   = date.split('-').map(Number);   // YYYY‑MM‑DD
    const [hh,   mm   ]        = time.split(':').map(Number);   // HH:mm

    const slotStart = new Date(year, month - 1, day, hh, mm, 0, 0);
    const slotEnd   = new Date(slotStart.getTime() +
                 (cfg.duration_minutes ?? 30) * 60_000);

// 2️⃣  ¿Colisiona?
const solapados = events.filter(ev => {
  const s = new Date(ev.start);
  const e = new Date(ev.end);
  return s < slotEnd && slotStart < e;
});

if (solapados.length >= (cfg.max_per_hour ?? 1)) {
  return res.json({ available:false, message:'Hora ocupada' });
}

return res.json({ available:true });

  } catch (err) {
    console.error('❌ disponibilidad GET:', err);
    res.status(500).json({ available:false, message:'Error interno' });
  }
});

export default router;
