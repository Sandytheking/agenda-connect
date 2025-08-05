// 📁 middlewares/checkPlan.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export function checkPlan(allowedPlans = []) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const slug = req.params.slug || req.body.slug;

      if (!userId && !slug) {
        return res
          .status(401)
          .json({ error: "Usuario no autenticado o slug no proporcionado" });
      }

      let query = supabase.from("clients").select("plan").single();

      if (slug) {
        query = query.eq("slug", slug);
      } else {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error al obtener plan:", error.message);
        return res
          .status(500)
          .json({ error: "Error al obtener el plan del cliente" });
      }

      if (!data) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }

      if (!allowedPlans.includes(data.plan)) {
        return res.status(403).json({ error: "Acceso restringido para este plan" });
      }

      next();
    } catch (err) {
      console.error("Excepción en checkPlan:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  };
}
