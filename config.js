// 📁 config.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Obtiene configuración por slug (ej: /cliente-x)
export async function getClientConfig(slug) {
  const { data, error } = await supabase
    .from('appointment_config')
    .select('max_per_day, max_per_hour, duration_minutes')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('❌ Error al obtener configuración:', error);
    throw new Error('No se pudo obtener la configuración del cliente');
  }

  return data;
}
