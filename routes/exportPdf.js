// routes/exportPdf.js
import express from 'express';
import { verifyAuth } from '../middleware/verifyAuth.js';
import { checkPlan } from '../middleware/checkPlan.js';

const router = express.Router();

router.post('/export-pdf/:slug', verifyAuth, checkPlan(['pro', 'business']), async (req, res) => {
  const { slug } = req.params;

  // 🔒 Aquí iría tu lógica para generar el PDF
  return res.json({ message: `PDF generado para el cliente con slug ${slug}` });
});

export default router;

