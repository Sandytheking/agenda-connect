// middleware/verifyAuth.js
import { supabase } from '../lib/supabaseClient.js';
import jwt from 'jsonwebtoken';

function safeSlice(str) {
  try { return str?.slice(0, 12) + '...'; } catch(e){ return null; }
}

function promiseTimeout(p, ms) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
  ]);
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

    // 1) Intentar verificar JWT propio (rápido, sin red)
    const secret = process.env.JWT_SECRET;
    if (secret) {
      try {
        const decoded = jwt.verify(token, secret);
        req.user = {
          id: decoded.id,
          email: decoded.email,
          // añade lo que necesites del payload
        };
        console.log('verifyAuth: validado con JWT propio. user id:', decoded.id);
        return next();
      } catch (err) {
        // no hacemos return aquí — intentamos fallback con Supabase
        console.log('verifyAuth: jwt.verify fallo (continuando a Supabase):', err?.message || err);
      }
    } else {
      console.error('verifyAuth: JWT_SECRET no definido en env — saltando verificación local');
    }

    // 2) Fallback: intentar validar con Supabase (para access_tokens de Supabase)
    try {
      // Llamada protegida por timeout para evitar requests que queden colgadas
      const attempt = promiseTimeout(
        // Intentamos las dos firmas que dependen de la versión del SDK
        (async () => {
          // Forma A: getUser({ access_token })
          let r = null;
          try {
            r = await supabase.auth.getUser({ access_token: token });
          } catch (e) {
            // ignore
          }
          // Forma B: getUser(token) (algunas versiones usan esta firma)
          if ((!r || !r.data) && supabase.auth.getUser) {
            try {
              r = await supabase.auth.getUser(token);
            } catch (e) {
              // ignore
            }
          }
          return r;
        })(),
        8000 // 8s timeout
      );

      const result = await attempt;

      if (result && !result.error && result.data && result.data.user) {
        req.user = result.data.user;
        console.log('verifyAuth: validado por Supabase. user id:', req.user.id);
        return next();
      } else {
        // Si Supabase devolvió un error específico, loguearlo
        console.log('verifyAuth: supabase no devolvió user. result.error:', result?.error?.message || result?.error);
      }
    } catch (err) {
      console.log('verifyAuth: supabase attempt fallo o timeout:', err?.message || err);
    }

    // Si llegamos aquí, ninguna validación funcionó
    return res.status(401).json({ error: 'Token inválido o expirado' });
  } catch (err) {
    console.error('verifyAuth: excepción inesperada', err);
    return res.status(500).json({ error: 'Error verificando token' });
  }
}
