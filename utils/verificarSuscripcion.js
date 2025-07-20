// utils/verificarSuscripcion.js
import { supabase } from '../supabaseClient.js';

export async function verificarSuscripcionActiva(slug) {
  const { data, error } = await supabase
    .from('clients')
    .select('subscription_valid_until, activo')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return { valido: false, mensaje: 'Cliente no encontrado' };
  }

  const hoy = new Date();
  const fechaVencimiento = new Date(data.subscription_valid_until);

  const suscripcionActiva = data.activo && fechaVencimiento >= hoy;

  if (!suscripcionActiva) {
    return {
      valido: false,
      mensaje: 'Tu suscripción ha vencido o está desactivada.',
    };
  }

  return { valido: true };
}
