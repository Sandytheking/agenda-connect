// middlewares/checkPlan.js
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY o SUPABASE_URL no definidas');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * allowedPlans: array de strings, por ejemplo ['pro','business']
 * options: { allowSlugFallback: boolean }  -> si true, permitimos comprobar por slug query/body
 */
export function checkPlan(allowedPlans = [], options = { allowSlugFallback: true }) {
  return async (req, res, next) => {
    try {
      // necesita req.user (verifyAuth debe haberse ejecutado antes)
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const userId = req.user.id;

      // 1) intentamos buscar cliente por user_id
      const { data: clientByUser, error: errByUser } = await supabase
        .from('clients')
        .select('id, slug, plan, user_id')
        .eq('user_id', userId)
        .single();

      if (errByUser && process.env.NODE_ENV !== 'production') {
        console.log('checkPlan: error buscando por user_id', errByUser);
      }

      // 2) Si no encontramos y permitimos fallback por slug, intentamos buscar por slug enviado
      let client = clientByUser || null;
      if (!client && options.allowSlugFallback) {
        // slug puede venir en body, query o headers según tu diseño
        const slugFromReq = req.body?.slug || req.query?.slug || req.headers['x-client-slug'];
        if (slugFromReq) {
          const { data: clientBySlug, error: errSlug } = await supabase
            .from('clients')
            .select('id, slug, plan, user_id')
            .eq('slug', slugFromReq)
            .single();

          if (errSlug && process.env.NODE_ENV !== 'production') {
            console.log('checkPlan: error buscando por slug', errSlug);
          }

          if (clientBySlug) {
            client = clientBySlug;

            // seguridad: si ese slug no pertenece al userId autenticado, rechazamos
            if (client.user_id !== userId) {
              return res.status(403).json({ error: 'No autorizado para acceder a este cliente' });
            }
          }
        }
      }

      if (!client) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      // Attach client info to request
      req.client = {
        clientId: client.id,
        slug: client.slug,
        plan: client.plan,
        user_id: client.user_id,
      };

      // Comprobar el plan
      if (!allowedPlans.includes(client.plan)) {
        return res.status(403).json({ error: 'Acceso restringido para este plan' });
      }

      return next();
    } catch (err) {
      console.error('checkPlan: excepción', err);
      return res.status(500).json({ error: 'Error interno en checkPlan' });
    }
  };
}
