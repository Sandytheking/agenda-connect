// scripts/enviar-campana.js
import { sendPromotionalCampaign } from '../src/utils/sendPromotionalCampaign.js'; // Ajusta la ruta según tu estructura

// Lista de potenciales clientes (puedes importarla de un CSV, Excel, Supabase, etc.)
const leads = [
  { email: 'sandytheking@hotmail.com', name: 'Juan Pérez' },
  { email: 'inventopluscaseros@gmail.com', name: 'María López' },
  { email: 'agendaconnectinfo@gmail.com', name: 'Carlos' },
  // ... más leads
];

async function enviarCampana() {
  console.log('🚀 Iniciando envío de campaña promocional...');

  for (const lead of leads) {
    try {
      await sendPromotionalCampaign({
        to: lead.email,
        name: lead.name, // Opcional: si no lo tienes, dejará "Emprendedor"
      });
      console.log(`✅ Enviado a ${lead.email}`);

      // Importante: delay para no saturar Resend (recomendado 1 segundo entre emails)
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Falló envío a ${lead.email}:`, error.message);
    }
  }

  console.log('🎉 Campaña completada');
}

enviarCampana();