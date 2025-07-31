// routes/plan.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/plan/:slug
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  const { data, error } = await supabase
    .from('clients')
    .select('plan')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  return res.json({ plan: data.plan });
});

export default router;
