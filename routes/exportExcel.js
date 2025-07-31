// routes/exportExcel.js
// routes/exportExcel.js
import express from 'express';
import ExcelJS from 'exceljs';
import { checkPlan } from '../middleware/checkPlan.js';
import { supabase } from '../supabaseClient.js'; // ajusta a tu archivo

const router = express.Router();

router.post('/export-excel/:slug', checkPlan(['pro', 'business']), async (req, res) => {
  const { slug } = req.params;
  const { fecha } = req.body;

  // 1. Buscar citas de ese día y cliente
  const { data: citas, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('slug', slug)
    .eq('fecha', fecha)
    .eq('cancelada', false);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error consultando citas' });
  }

  if (!Array.isArray(citas) || citas.length === 0) {
    return res.status(404).json({ error: 'No hay citas para exportar' });
  }

  // 2. Crear el archivo Excel
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Citas');

  worksheet.columns = [
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Teléfono', key: 'telefono', width: 20 },
    { header: 'Fecha', key: 'fecha', width: 20 },
    { header: 'Hora', key: 'hora', width: 15 },
  ];

  citas.forEach(cita => {
    worksheet.addRow({
      nombre: cita.nombre,
      email: cita.email,
      telefono: cita.telefono,
      fecha: cita.fecha,
      hora: cita.hora,
    });
  });

  // 3. Enviar el archivo como respuesta
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=citas.xlsx');

  await workbook.xlsx.write(res);
  res.end();
});

export default router;
