// utils/validateClient.ts

import { supabase } from './supabaseClient';

export async function validateClient(slug: string): Promise<{ ok: boolean, error?: string }> {
  const { data, error } = await supabase
    .from('clients')
    .select('subscription_valid_until')
    .eq('slug', slug)
    .single();

  if (error || !data) return { ok: false, error: 'Cliente no encontrado' };

  const vencimiento = new Date(data.subscription_valid_until);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (vencimiento < hoy) return { ok: false, error: 'Suscripción vencida' };

  return { ok: true };
}
