// 📁 routes/restablecerContrasena.js

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post('/', async (req, res) => {
  const { token, nuevaContrasena } = req.body;

  if (!token || !nuevaContrasena) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    // 1. Buscar el token
    const { data: tokenRow, error: tokenError } = await supabase
      .from('password_resets')
      .select('id, expires_at, user_id')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRow) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    // 2. Verificar expiración
    const ahora = new Date();
    const expira = new Date(tokenRow.expires_at);
    if (expira < ahora) {
      return res.status(400).json({ error: 'El token ha expirado' });
    }

    // 3. Cambiar contraseña usando Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenRow.user_id,
      { password: nuevaContrasena }
    );

    if (updateError) {
      console.error('❌ Error al actualizar contraseña:', updateError.message);
      return res.status(500).json({ error: 'No se pudo actualizar la contraseña' });
    }

    // 4. Eliminar el token usado correctamente
    await supabase
      .from('password_resets')
      .delete()
      .eq('id', tokenRow.id); // ✅ aquí el fix

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('❌ Error general en restablecer contraseña:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
