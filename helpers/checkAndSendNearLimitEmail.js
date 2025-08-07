// 📁 helpers/checkAndSendNearLimitEmail.js
import { sendNearLimitEmail } from "../emails/sendNearLimitEmail.js";
import { supabase } from "../lib/supabaseClient.js";
import dayjs from "dayjs";

export async function checkAndSendNearLimitEmail({ slug, total, limit }) {
  const mesActual = dayjs().format("YYYY-MM");

  // Solo si total == 8
  if (total !== 8) return;

  const { data: yaEnviado, error: queryError } = await supabase
    .from("notificaciones_citas")
    .select("id")
    .eq("slug", slug)
    .eq("mes", mesActual)
    .maybeSingle();

  if (queryError) {
    console.error("Error al consultar notificación previa:", queryError);
    return;
  }

  if (yaEnviado) {
    console.log(`Ya se notificó al cliente ${slug} en ${mesActual}`);
    return;
  }

  // Enviar correo
  await sendNearLimitEmail({ slug, total, limit });

  // Registrar envío
  const { error: insertError } = await supabase.from("notificaciones_citas").insert([
    {
      slug,
      mes: mesActual,
      enviado: true,
    },
  ]);

  if (insertError) {
    console.error("Error al registrar notificación enviada:", insertError);
  }
}
