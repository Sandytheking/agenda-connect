// utils/checkPlanLimit.js
import { startOfMonth, endOfMonth } from 'date-fns';

/**
 * Comprueba si el cliente puede crear una cita según su plan y slug.
 * @param {object} supabase - cliente supabase server-side (SERVICE_ROLE_KEY)
 * @param {string} slug - slug del cliente
 * @param {string} plan - 'free'|'pro'|'business'
 * @param {number} freeLimit - límite para plan free (default: 10)
 */
export async function canCreateAppointmentBySlug({ supabase, slug, plan, freeLimit = 10 }) {
  // Solo aplicamos restricción al plan "free"
  if (!plan || plan.toLowerCase() !== 'free') {
    return { allowed: true, totalThisMonth: 0, limit: null };
  }

  const now = new Date();
  const start = startOfMonth(now).toISOString();
  const end = endOfMonth(now).toISOString();

  const { count, error } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug)
    .gte('inicio', start)
    .lte('inicio', end)
    .eq('cancelada', false);

  if (error) {
    console.error('Error al contar citas:', error);
    // Fallback permisivo si falla el conteo
    return { allowed: true, totalThisMonth: 0, limit: freeLimit };
  }

  const total = Number(count || 0);
  const allowed = total < freeLimit;

  return { allowed, totalThisMonth: total, limit: freeLimit };
}
