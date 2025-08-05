// middleware/verifyAuth.js
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const hasSupabase = !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.SUPABASE_URL;
const supabase = hasSupabase
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export async function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: token faltante' });
  }
  const token = authHeader.split(' ')[1];

  // 1) Intentar verificación con Supabase (si hay service role)
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        // Asegúrate de establecer la forma que tu código espera
        req.user = { id: data.user.id, email: data.user.email };
        console.log('verifyAuth: verificado via Supabase:', req.user.id);
        return next();
      }
      // si hubo error o no user, seguimos al fallback
      console.log('verifyAuth: supabase.getUser no devolvió user, fallback a JWT', error?.message);
    } catch (err) {
      console.warn('verifyAuth: supabase.getUser fallo, fallback a JWT', err.message);
    }
  }

  // 2) Fallback: verificar con JWT propio
  if (!process.env.JWT_SECRET) {
    console.error('verifyAuth: JWT_SECRET no definido en env');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded debe contener { id, email, ... }
    req.user = { id: decoded.id, email: decoded.email };
    console.log('verifyAuth: verificado via JWT:', req.user.id);
    return next();
  } catch (err) {
    console.warn('verifyAuth: JWT invalid/expired', err.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
export default verifyAuth;
