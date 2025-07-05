// routes/slug.js
import express            from "express";
import { createClient }   from "@supabase/supabase-js";

const router    = express.Router();
const supabase  = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/slug-exists/:slug
 * Devuelve { exists: true } si ya hay un negocio con ese slug.
 * No requiere autenticación (consulta de solo lectura).
 */
router.get("/api/slug-exists/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const { data, error } = await supabase
      .from("clients")
      .select("id")      // solo necesitamos saber si hay registro
      .eq("slug", slug)
      .maybeSingle();    // devuelve null si no hay coincidencia

    if (error) throw error;

    const exists = !!data;      // true si hay registro
    res.json({ exists });

  } catch (err) {
    console.error("❌ Error /api/slug-exists:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
