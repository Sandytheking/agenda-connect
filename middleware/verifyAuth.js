// middleware/verifyAuth.js
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL || !process.env.JWT_SECRET) {
  throw new Error('No estan definidas las variables SUPABASE_SERVICE_ROLE_KEY / SUPABASE_URL / JWT_SECRET');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function verifyAuth(req, res, next) {
  // 1) Si ya existe req.user (posible en algunos setups), dejamos pasar
  if (req.user && (req.user.id || req.user.user_id || req.user.sub)) {
    // Normalizamos shape
    const id = req.user.id || req.user.user_id || req.user.sub;
    req.user = { id, email: req.user.email || null };
    return next();
  }

  // 2) Si no, intentamos leer Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: token faltante' });
  }

  const token = authHeader.split(' ')[1];

  // 3) Intentamos validar como JWT propio
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.id || decoded.user_id || decoded.sub;
    req.user = { id, email: decoded.email || null };
    return next();
  } catch (err) {
    // no pasa, seguimos intentando con Supabase
    if (process.env.NODE_ENV !== 'production') {
      console.log('verifyAuth: JWT propio no válido, intentando validar token con Supabase...', err.message);
    }
  }

  // 4) Validar token con Supabase (si es access_token)
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('verifyAuth: supabase.auth.getUser error', error);
      }
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    req.user = { id: data.user.id, email: data.user.email || null };
    return next();
  } catch (err) {
    console.error('verifyAuth: excepción', err);
    return res.status(500).json({ error: 'Error interno autenticando token' });
  }
}
