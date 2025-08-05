// middleware/verifyAuth.js
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_URL)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export async function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('verifyAuth -> no auth header');
    return res.status(401).json({ error: 'No autorizado: token faltante' });
  }
  const token = authHeader.split(' ')[1];
  console.log('verifyAuth -> token preview:', token ? token.slice(0,10) + '...' : null);

  // 1) Intentar Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        req.user = { id: data.user.id, email: data.user.email };
        console.log('verifyAuth -> verificado via Supabase user.id=', req.user.id);
        return next();
      } else {
        console.log('verifyAuth -> supabase.getUser no devolvió user, error:', error?.message || 'no-user');
      }
    } catch (err) {
      console.log('verifyAuth -> supabase.getUser threw:', err.message);
    }
  }

  // 2) Fallback JWT
  if (!process.env.JWT_SECRET) {
    console.error('verifyAuth -> JWT_SECRET faltante');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('verifyAuth -> jwt.verify success, decoded id=', decoded.id);
    req.user = { id: decoded.id, email: decoded.email };
    return next();
  } catch (err) {
    console.warn('verifyAuth -> jwt.verify failed:', err.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
export default verifyAuth;
