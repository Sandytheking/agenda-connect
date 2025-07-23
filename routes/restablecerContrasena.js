// 📁 routes/restablecerContrasena.js

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.post('/', async (req, res) => {
  const { token, nuevaContrasena } = req.body;

  if (!token || !nuevaContrasena) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    // 1. Buscar el token en la tabla password_reset_tokens
    const { data: tokenRow, error: tokenError } = await supabase
      .from('password_reset')
      .select('id, user_id, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRow) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    // 2. Verificar si ya expiró
    const ahora = new Date();
    const expira = new Date(tokenRow.expires_at);

    if (expira < ahora) {
      return res.status(400).json({ error: 'El token ha expirado' });
    }

    // 3. Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);

    // 4. Actualizar contraseña del usuario
    const { error: updateError } = await supabase
      .from('clients')
      .update({ password: hashedPassword })
      .eq('id', tokenRow.user_id);

    if (updateError) {
      console.error('❌ Error al actualizar contraseña:', updateError.message);
      return res.status(500).json({ error: 'No se pudo actualizar la contraseña' });
    }

    // 5. Eliminar el token usado
    await supabase.from('password_reset_tokens').delete().eq('id', tokenRow.id);

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('❌ Error general en restablecer contraseña:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
