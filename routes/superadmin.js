// routes/superadmin.js
import express from 'express';
import jwt from 'jsonwebtoken';
const router = express.Router();

const { SUPERADMIN_USER, SUPERADMIN_PASS, JWT_SECRET } = process.env;

router.post('/superadmin/login', (req, res) => {
  const { user, password } = req.body;

  if (user === SUPERADMIN_USER && password === SUPERADMIN_PASS) {
    const token = jwt.sign({ role: 'superadmin' }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
  }

  res.status(401).json({ error: 'Credenciales incorrectas' });
});

export default router;
