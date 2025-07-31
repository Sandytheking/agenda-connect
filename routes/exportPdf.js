// routes/exportPdf.js
import express from 'express';
import { verifyAuth } from '../middleware/verifyAuth.js';
import { checkPlan } from '../middleware/checkPlan.js';
import { supabase } from '../supabaseClient.js'; // ajusta según tu estructura
import PDFDocument from 'pdfkit';
import getStream from 'get-stream';

const router = express.Router();

router.post('/export-pdf/:slug', verifyAuth, checkPlan(['pro', 'business']), async (req, res) => {
  const { slug } = req.params;
  const { fecha } = req.body;

  // 1. Obtener citas del día
  const { data: citas, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('slug', slug)
    .eq('fecha', fecha)
    .eq('cancelada', false);

  if (error || !Array.isArray(citas)) {
    console.error(error);
    return res.status(500).json({ error: 'Error consultando citas' });
  }

  if (citas.length === 0) {
    return res.status(404).json({ error: 'No hay citas para exportar' });
  }

  // 2. Crear PDF con PDFKit
  const doc = new PDFDocument();
  doc.fontSize(18).text('Citas del día', { align: 'center' });
  doc.moveDown();

  citas.forEach((cita, i) => {
    doc
      .fontSize(12)
      .text(`#${i + 1}`)
      .text(`Nombre: ${cita.nombre}`)
      .text(`Email: ${cita.email}`)
      .text(`Teléfono: ${cita.telefono}`)
      .text(`Fecha: ${cita.fecha}`)
      .text(`Hora: ${cita.hora}`)
      .moveDown();
  });

  // 3. Convertir el PDF en stream
  const pdfBuffer = await getStream.buffer(doc);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=citas.pdf');
  res.send(pdfBuffer);
});

export default router;
