// scripts/enviar-campana.js
import { sendPromotionalCampaign } from '../utils/sendPromotionalCampaign.js'; // ← Ruta corregida (sin src/)

// Lista de leads de prueba (agrega los tuyos reales aquí)
const leads = [
  { email: 'tu-email-de-prueba@gmail.com', name: 'Sandy' }, // Cambia por uno real para probar
  // { email: 'otro@ejemplo.com', name: 'Otro Lead' },
  // ... agrega más
];

async function enviarCampana() {
  console.log('🚀 Iniciando envío de campaña...');
  
  // Verifica que la función se importó bien
  if (typeof sendPromotionalCampaign !== 'function') {
    console.error('❌ Error: sendPromotionalCampaign no se importó correctamente. Verifica que el archivo exista en utils/.');
    return;
  }

  for (const lead of leads) {
    try {
      await sendPromotionalCampaign({
        to: lead.email,
        name: lead.name,
      });
      console.log(`✅ Enviado a ${lead.email}`);

      // Delay de 1s para no saturar Resend
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Falló envío a ${lead.email}:`, error.message);
    }
  }

  console.log('🎉 Campaña completada!');
}

enviarCampana().catch(console.error);