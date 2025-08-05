// middleware/verifyAuth.js
import { supabase } from '../lib/supabaseClient.js'; // cliente server-side (SERVICE_ROLE_KEY)
import jwt from 'jsonwebtoken';

export async function verifyAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      console.log('verifyAuth: token faltante');
      return res.status(401).json({ error: 'No autorizado: token faltante' });
    }

    // 1) Intentar validar con Supabase (para access_tokens de Supabase)
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        req.user = data.user;
        // console.log('verifyAuth: validado por Supabase. user id:', data.user.id);
        return next();
      }
    } catch (err) {
      // no hacemos nada aquí, seguimos al intento con jwt
      console.log('verifyAuth: supabase.auth.getUser fallo (continuando):', err?.message || err);
    }

    // 2) Intentar validar token JWT propio firmado por JWT_SECRET
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // decoded debería contener por lo menos { id, email, ... }
      req.user = {
        id: decoded.id,
        email: decoded.email,
        // añade lo que necesites del decoded
      };
      // console.log('verifyAuth: validado por JWT propio. user id:', decoded.id);
      return next();
    } catch (err) {
      console.log('verifyAuth: jwt.verify fallo:', err?.message || err);
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  } catch (err) {
    console.error('verifyAuth: excepción inesperada', err);
    return res.status(500).json({ error: 'Error verificando token' });
  }
}
