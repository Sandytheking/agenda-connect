// middlewares/checkPlan.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export function checkPlan(allowedPlans = []) {
  return async (req, res, next) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { data, error } = await supabase
      .from('clients')
      .select('plan')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return res.status(403).json({ error: 'Cliente no encontrado o error al obtener el plan' });
    }

    if (!allowedPlans.includes(data.plan)) {
      return res.status(403).json({ error: 'Acceso restringido para este plan' });
    }

    next();
  };
}