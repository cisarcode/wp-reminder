import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

// Function to get an authenticated JWT client
export function getAuth() {
  return new JWT({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    // This scope allows reading events, event details, and creating/modifying events.
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
}

// Function to get a calendar API client instance
export function getCalendarClient(authInstance) {
  if (!authInstance) {
    authInstance = getAuth(); // Get default auth if none provided
  }
  return google.calendar({ version: 'v3', auth: authInstance });
}

export async function listWindow() {
  const calendar = getCalendarClient(); // Uses default auth with full calendar scope
  const now = new Date();
  const max = new Date(now.getTime() + Number(process.env.WINDOW_DAYS) * 86400000);
  const { data } = await calendar.events.list({
    calendarId: process.env.CALENDAR_ID,
    timeMin: now.toISOString(),
    timeMax: max.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 2500
  });
  return data.items || [];
}
