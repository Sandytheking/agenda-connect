// utils/google.js
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

export async function getAccessToken(refresh_token) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET
  );

  oAuth2Client.setCredentials({ refresh_token });

  const { token } = await oAuth2Client.getAccessToken();
  return token;
}

export async function getEventsForDay(accessToken, date) {
  const calendar = google.calendar({ version: 'v3', auth: accessToken });

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: 'startTime'
  });

  return res.data.items.map(ev => ({
    start: ev.start.dateTime,
    end: ev.end.dateTime
  }));
}
