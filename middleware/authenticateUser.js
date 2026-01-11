import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    req.user = data.user; // 🔑 user.id, email, etc.
    next();
  } catch (err) {
    console.error('authenticateUser error:', err);
    return res.status(500).json({ error: 'Error autenticando usuario' });
  }
}
