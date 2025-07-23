// 📁 routes/olvideContrasena.js

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { sendPasswordResetEmail } = require('../utils/sendPasswordResetEmail');
const crypto = require('crypto');

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.post('/api/restablecer-password', async (req, res) => {
  const { email } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('clients')
      .select('id, business_name')
      .eq('email', email)
      .single();

    if (!user) {
      return res.status(200).json({ success: true }); // No revelar si el email existe
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hora

    await supabase.from('password_rese').insert({
      client_id: user.id,
      token,
      expires_at: expiresAt,
    });

    await sendPasswordResetEmail(email, token);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error al enviar correo de recuperación:', error);
    res.status(500).json({ error: 'Error al enviar correo' });
  }
});

module.exports = router;
