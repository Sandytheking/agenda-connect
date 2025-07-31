// routes/exportExcel.js
import express from 'express';
import { checkPlan } from '../middleware/checkPlan.js';

const router = express.Router();

router.post('/export-excel/:slug', checkPlan(['pro', 'business']), async (req, res) => {
  // tu lógica de exportación a Excel
  res.send('Excel exportado correctamente');
});

export default router;
