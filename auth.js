const axios = require('axios');

function startAuth(req, res) {
  const redirect_uri = process.env.GOOGLE_REDIRECT_URI;
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar');
  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}&access_type=offline&prompt=consent`;

  res.redirect(url);
}

async function handleCallback(req, res) {
  const code = req.query.code;

  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      }
    });

    const { refresh_token, access_token } = response.data;

    // Aquí deberías guardar el refresh_token en Supabase (lo haremos más adelante)
    console.log("✅ Refreshtoken obtenido:", refresh_token);

    res.send("Autenticación completada. Puedes cerrar esta pestaña.");
  } catch (error) {
    console.error("❌ Error al obtener tokens:", error.response.data);
    res.send("Error al autenticar.");
  }
}

module.exports = { startAuth, handleCallback };
