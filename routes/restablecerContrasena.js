// 📁 routes/restablecerContrasena.js

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Usa la clave de servicio (con privilegios administrativos)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post('/api/restablecer-contrasena', async (req, res) => {
  const { token, nuevaContrasena } = req.body;

  if (!token || !nuevaContrasena) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    // 1. Buscar el token
    const { data: tokenRow, error: tokenError } = await supabase
      .from('password_resets')
      .select('email, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRow) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    // 2. Validar expiración
    const ahora = new Date();
    const expira = new Date(tokenRow.expires_at);
    if (expira < ahora) {
      return res.status(400).json({ error: 'El token ha expirado' });
    }

    // 3. Cambiar contraseña del usuario en Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserByEmail(
      tokenRow.email,
      { password: nuevaContrasena }
    );

    if (updateError) {
      console.error('❌ Error al actualizar la contraseña:', updateError.message);
      return res.status(500).json({ error: 'Error al actualizar la contraseña del usuario' });
    }

    // 4. Eliminar el token
    await supabase.from('password_resets').delete().eq('token', token);

    return res.json({ success: true, message: '✅ Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('❌ Error general:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
