// utils/google.js
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

  const calendar = google.calendar({
    version: 'v3',
    auth: accessToken
  });

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  try {
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
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

