// 📁 middlewares/checkPlan.js
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY o SUPABASE_URL no definidas');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export function checkPlan(allowedPlans = []) {
  return async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('plan')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('checkPlan supabase error:', error);
        return res.status(500).json({ error: 'Error verificando plan' });
      }
      if (!data) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      if (!allowedPlans.includes(data.plan)) {
        return res.status(403).json({ error: 'Acceso restringido para este plan' });
      }

      // ok
      next();
    } catch (err) {
      console.error('checkPlan exception', err);
      return res.status(500).json({ error: 'Server error' });
    }
  };
}
export default checkPlan;
