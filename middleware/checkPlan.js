// middlewares/checkPlan.js
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
  throw new Error('❌ SUPABASE_SERVICE_ROLE_KEY o SUPABASE_URL no están definidas');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export function checkPlan(allowedPlans = []) {
  return async (req, res, next) => {
    try {
      // 1) Si verifyAuth ya puso req.user (JWT propio) lo usamos
      if (req.user && (req.user.id || req.user.user_id || req.user.sub)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('🔐 checkPlan: user obtenido desde req.user (JWT propio)', req.user);
        }
      } else {
        // 2) Si no hay req.user, intentamos extraer token y obtener user desde Supabase
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

        if (!token) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('🚫 checkPlan: no hay req.user ni token Bearer en headers');
          }
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log('🔁 checkPlan: intentando obtener usuario desde Supabase con access_token');
        }

        // getUser acepta el token de acceso y devuelve el usuario
        const { data: supaData, error: supaErr } = await supabase.auth.getUser(token);

        if (supaErr || !supaData?.user) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('❌ checkPlan: error al obtener usuario desde Supabase', supaErr);
          }
          return res.status(401).json({ error: 'Token inválido o usuario no encontrado' });
        }

        // Normalizamos para que req.user tenga { id, email, ... } como verifyAuth
        req.user = {
          id: supaData.user.id,
          email: supaData.user.email,
          // otros campos si quisieras...
        };

        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ checkPlan: user obtenido desde Supabase', req.user);
        }
      }

      // A estas alturas req.user.id debería existir
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Consultar el plan del cliente (tabla clients) por user_id
      const { data, error } = await supabase
        .from('clients')
        .select('plan')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('❌ checkPlan: error al consultar clients:', error);
        }
        return res.status(403).json({ error: 'Cliente no encontrado o error al obtener el plan' });
      }

      const plan = data?.plan;
      if (process.env.NODE_ENV !== 'production') {
        console.log('ℹ️ checkPlan: plan del usuario:', plan, 'allowed:', allowedPlans);
      }

      if (!allowedPlans.includes(plan)) {
        return res.status(403).json({ error: 'Acceso restringido para este plan' });
      }

      // todo ok
      next();
    } catch (err) {
      console.error('❌ checkPlan: excepción interna', err);
      return res.status(500).json({ error: 'Error interno en checkPlan' });
    }
  };
}
