import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Cargar variables de entorno
dotenv.config();

async function main() {
  // Verificar variable de entorno
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath || !fs.existsSync(credentialsPath)) {
    console.error('No se encontró el archivo de credenciales definido en GOOGLE_APPLICATION_CREDENTIALS:', credentialsPath);
    process.exit(1);
  }

  // Autenticación con Google
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });

  const calendar = google.calendar({ version: 'v3', auth });

  // Definir el rango de tiempo (ahora hasta 7 días después)
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Permitir calendarId desde .env, por defecto 'primary'
  const calendarId = process.env.CALENDAR_ID || 'primary';
  console.log('Usando calendarId:', calendarId);
  if (calendarId === 'primary') {
    console.log('AVISO: "primary" es el calendario principal de la CUENTA DE SERVICIO, probablemente vacío. Para acceder a tu calendario personal, comparte tu calendario con el email de la cuenta de servicio (lo ves en el JSON) y usa el ID de tu calendario personal en .env como CALENDAR_ID.');
    console.log('Cómo obtener el ID de tu calendario: en Google Calendar > Configuración del calendario > "Integrar calendario" > "ID del calendario".');
  }
  try {
    const res = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    const events = res.data.items;
    if (!events || events.length === 0) {
      console.log('No hay eventos próximos encontrados.');
    } else {
      console.log('Próximos eventos:');
      events.forEach((event, i) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${i + 1}. ${event.summary} (${start})`);
      });
    }
  } catch (err) {
    console.error('Error al obtener eventos del calendario:', err);
    process.exit(1);
  }
}

main();
