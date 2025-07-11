import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

export async function getAccessToken(refresh_token) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oAuth2Client.setCredentials({ refresh_token });

  const { token } = await oAuth2Client.getAccessToken();
  return token;
}

export async function getEventsForDay(accessToken, date) {
  console.log("🔐 Usando access_token:", accessToken?.slice(0, 20), "...");

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oAuth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error("❌ Formato de fecha inválido:", date);
    throw new Error("Formato de fecha inválido. Esperado: YYYY-MM-DD");
  }

  const [y, m, d] = date.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0);
  const end   = new Date(y, m - 1, d, 23, 59, 59, 999);

  const toIsoLocal = (dt) => dt.toISOString().replace(/Z$/, '');

  try {
    const res = await calendar.events.list({
  calendarId   : 'primary',
  timeMin      : start.toISOString(), // ✅ con Z al final
  timeMax      : end.toISOString(),   // ✅ con Z al final
  singleEvents : true,
  orderBy      : 'startTime'
  // ⛔ No incluyas timeZone aquí en events.list, Google lo ignora y puede causar error
    });


    console.log("✅ Eventos recibidos:", res.data.items?.length || 0);
    return res.data.items.map(ev => ({
      start: ev.start.dateTime,
      end: ev.end.dateTime
    }));
  } catch (error) {
    console.error("❌ Error Google Calendar:", error.response?.data || error.message);
    throw new Error("Fallo al leer eventos de Google Calendar");
  }
}
