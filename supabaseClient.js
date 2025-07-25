// supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function getConfigBySlug(slug) {
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !client) {
    console.error('❌ Error al obtener client:', error?.message);
    return null;
  }

  return {
    ...client,
    duration_minutes: client.duration_minutes || 30,
    max_per_day: client.max_per_day || 5,
    max_per_hour: client.max_per_hour || 1,
    timezone: (client.timezone || 'America/Santo_Domingo').replace(/^['"]|['"]$/g, ''),
    per_day_config: client.per_day_config || {},
    refresh_token: client.refresh_token || '',
    calendar_email: client.calendar_email || '',
  };
}

