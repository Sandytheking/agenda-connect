// routes/disponibilidad.js
import express from 'express';
import { getConfigBySlug } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';

const router = express.Router();

router.post('/:slug/disponibilidad', async (req, res) => {
  try {
    const { slug } = req.params;
    const { date, time } = req.body;

    const config = await getConfigBySlug(slug);
    if (!config) return res.status(404).json({ available: false, message: "Negocio no encontrado" });

    const { refresh_token, max_per_day, max_per_hour } = config;

    // Obtener access_token de Google usando refresh_token
    const accessToken = await getAccessToken(refresh_token);

    // Obtener todos los eventos del día
    const eventos = await getEventsForDay(accessToken, date);

    // Revisar límite diario
    if (eventos.length >= (max_per_day || 5)) {
      return res.json({ available: false, message: "Límite de citas alcanzado para ese día." });
    }

    // Calcular rango de la hora solicitada
    const [h, m] = time.split(':').map(Number);
    const inicio = new Date(date);
    inicio.setHours(h, m, 0, 0);
    const fin = new Date(inicio.getTime() + 30 * 60000);

    const eventosSolapados = eventos.filter(e => {
      const start = new Date(e.start);
      const end = new Date(e.end);
      return start < fin && inicio < end;
    });

    if (eventosSolapados.length >= (max_per_hour || 1)) {
      return res.json({ available: false, message: "Hora ya ocupada." });
    }

    return res.json({ available: true });
  } catch (err) {
    console.error("Error en disponibilidad:", err);
    res.status(500).json({ available: false, message: "Error al verificar disponibilidad." });
  }
});

export default router;
