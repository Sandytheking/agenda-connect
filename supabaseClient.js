// supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export async function getConfigBySlug(slug) {
  const { data, error } = await supabase
    .from('appointment_configs')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('❌ Error al obtener config:', error);
    return null;
  }

  return data;
}
