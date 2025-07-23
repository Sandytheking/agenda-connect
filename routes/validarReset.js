// 📁 routes/validarReset.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.get('/api/validar-reset/:token', async (req, res) => {
  const { token } = req.params;

  const { data: tokenRow, error } = await supabase
    .from('password_reset')
    .select('expires_at')
    .eq('token', token)
    .single();

  if (error || !tokenRow) {
    return res.json({ valid: false });
  }

  const ahora = new Date();
  const expira = new Date(tokenRow.expires_at);

  if (expira < ahora) {
    return res.json({ valid: false });
  }

  res.json({ valid: true });
});

export default router;
