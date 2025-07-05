// routes/disponibilidad.js
const express = require('express');
const { getConfigBySlug } = require('../supabaseClient.js');
const { getAccessToken, getEventsForDay } = require('../utils/google.js');

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

  // ✅ Ruta pública GET (para iframe/formulario externo)
router.get('/api/availability/:slug', async (req, res) => {
  const { slug }       = req.params;
  const { date, time } = req.query;

  if (!slug || !date || !time) {
    return res.status(400).json({ available: false, message: 'Faltan parámetros' });
  }

  try {
    const config = await getConfigBySlug(slug);
    if (!config || !config.refresh_token) {
      return res.status(404).json({ available: false, message: 'Negocio no encontrado' });
    }

    const { refresh_token, max_per_day, max_per_hour, duration_minutes } = config;

    const accessToken = await getAccessToken(refresh_token);
    const eventos     = await getEventsForDay(accessToken, date);

    // límite por día
    if (eventos.length >= (max_per_day || 5)) {
      return res.json({ available: false, message: 'Día completo' });
    }

    // verificar colisiones en esa hora
    const [h, m] = time.split(':').map(Number);
    const start = new Date(date); start.setHours(h, m, 0, 0);
    const end   = new Date(start.getTime() + (duration_minutes || 30) * 60000);

    const solapados = eventos.filter(e => {
      const evStart = new Date(e.start);
      const evEnd   = new Date(e.end);
      return evStart < end && start < evEnd;
    });

    if (solapados.length >= (max_per_hour || 1)) {
      return res.json({ available: false, message: 'Hora ocupada' });
    }

    return res.json({ available: true });

  } catch (err) {
    console.error("❌ Error en GET availability:", err);
    res.status(500).json({ available: false, message: 'Error al verificar' });
  }
});

export default router;
