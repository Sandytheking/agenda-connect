// 📁 util/sendNearLimitEmail.js
import nodemailer from "nodemailer";
import { supabase } from "../supabaseClient.js";

export async function sendNearLimitEmail({ slug, total, limit = 10 }) {
  if (total < 8) return; // Solo enviamos si tiene 8 o más

  const { data: cliente, error } = await supabase
    .from("clients")
    .select("email, nombre_negocio")
    .eq("slug", slug)
    .single();

  if (error || !cliente?.email) {
    console.warn("No se pudo obtener el email del negocio para alerta de citas:", error);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const html = `
    <div style="font-family: sans-serif; line-height: 1.5;">
      <h2 style="color: #C0392B;">⚠️ ¡Estás alcanzando el límite de tu plan!</h2>
      <p>Hola <strong>${cliente.nombre_negocio || "usuario"}</strong>,</p>
      <p>Tu negocio ya ha registrado <strong>${total}</strong> citas este mes.</p>
      <p>Recuerda que tu plan actual tiene un límite de <strong>${limit}</strong> citas mensuales.</p>
      <p>Una vez alcanzado, no podrás recibir más reservas hasta el próximo mes.</p>
      <p>Si deseas seguir recibiendo citas, considera cambiarte a un plan superior desde tu panel de administración.</p>
      <br>
      <p>— El equipo de AgendaConnect</p>
    </div>
  `;

  await transporter.sendMail({
    from: '"AgendaConnect" <no-reply@agenda-connect.com>',
    to: cliente.email,
    subject: `⏳ Estás por alcanzar el límite de citas de tu plan`,
    html,
  });

  console.log(`Correo de advertencia enviado a ${cliente.email}`);
}
