// 📁 middleware/verifyAuth.js
import jwt from 'jsonwebtoken';

console.log("🛡️ Middleware verifyAuth ejecutado");

export function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: token faltante' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Agregamos el user al request para usarlo en rutas
    req.user = decoded; // { id, email }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
