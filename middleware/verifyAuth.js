// middleware/verifyAuth.js
import { supabase } from '../lib/supabaseClient.js';
import jwt from 'jsonwebtoken';

function safeSlice(str) {
  try { return str?.slice(0, 12) + '...'; } catch(e){ return null; }
}

export async function verifyAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      console.log('verifyAuth: token faltante');
      return res.status(401).json({ error: 'No autorizado: token faltante' });
    }

    console.log('verifyAuth: token recibo (preview):', safeSlice(token));
    // 1) Intentar validar con Supabase (dos formas según versión del SDK)
    try {
      // Forma A: getUser({ access_token })
      let result = await supabase.auth.getUser({ access_token: token }).catch(() => null);

      // Forma B (fallback): getUser(token) -- algunas versiones usan este signature
      if ((!result || !result.data) && supabase.auth.getUser) {
        result = await supabase.auth.getUser(token).catch(() => null);
      }

      if (result && !result.error && result.data && result.data.user) {
        req.user = result.data.user;
        // console.log('verifyAuth: validado por Supabase. user id:', req.user.id);
        return next();
      } else {
        console.log('verifyAuth: supabase no devolvió user. result.error:', result?.error?.message || result?.error);
      }
    } catch (err) {
      console.log('verifyAuth: supabase.auth.getUser fallo (continuando):', err?.message || err);
    }

    // 2) Intentar validar token JWT propio firmado por JWT_SECRET
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('verifyAuth: JWT_SECRET no definido en env');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
      const decoded = jwt.verify(token, secret);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        // añade más si lo necesitas
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
