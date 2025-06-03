import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { google } from 'googleapis';

// 1. Verifica los requisitos de autenticación
dotenv.config();
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.trim() !== ''
  ? path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : path.resolve(process.cwd(), 'credentials.json');
if (!fs.existsSync(credentialsPath)) {
  console.error(`❌ credenciales ausentes: No se encontró el archivo de credenciales (${credentialsPath}).`);
  process.exit(1);
}

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: SCOPES,
});

const calendar = google.calendar({ version: 'v3', auth });

async function detectCalendarId() {
  if (process.env.CALENDAR_ID && process.env.CALENDAR_ID.trim() !== '') {
    return process.env.CALENDAR_ID;
  }
  // 2.2a: Listar calendarios
  const res = await calendar.calendarList.list();
  const items = res.data.items || [];
  const found = items.find(
    (cal) => cal.accessRole === 'owner' || cal.accessRole === 'writer'
  );
  if (!found) {
    console.error('La service account no tiene acceso a ningún calendario.');
    console.error('Comparte tu calendario con el email de la service account (lo ves en credentials.json) con permiso “Hacer cambios en los eventos”.');
    process.exit(1);
  }
  // 4.1 Persistir en .env si no existe
  if (!process.env.CALENDAR_ID) {
    try {
      fs.appendFileSync(path.resolve(process.cwd(), '.env'), `\nCALENDAR_ID=${found.id}\n`);
      console.log(`✓ CALENDAR_ID detectado y guardado en .env: ${found.id}`);
    } catch (err) {
      console.warn('No se pudo escribir CALENDAR_ID en .env:', err);
    }
  }
  process.env.CALENDAR_ID = found.id;
  return found.id;
}

async function testCalendarAccess(calendarId) {
  try {
    const res = await calendar.events.list({
      calendarId,
      maxResults: 1,
      timeMin: new Date().toISOString(),
    });
    if (res.status === 200) {
      console.log(`✓ Google Calendar conectado — ID: ${calendarId}`);
      return true;
    }
    console.error(`Error inesperado al acceder al calendario:`, res.statusText);
    process.exit(1);
  } catch (err) {
    if (err.code === 403 || err.code === 404) {
      console.error(`Error de acceso (${err.code}):`, err.message);
      process.exit(1);
    }
    console.error('Error inesperado:', err);
    process.exit(1);
  }
}

async function main() {
  const calendarId = await detectCalendarId();
  await testCalendarAccess(calendarId);

  // 5.1 Lógica bulkLoader.listWindow()
  let eventos = [];
  let bulkLoader;
  try {
    bulkLoader = await import('./bulkLoader.js');
  } catch (e) {
    console.warn('bulkLoader.js no existe. Continuando solo con la prueba de Calendar.');
  }
  if (bulkLoader && bulkLoader.listWindow) {
    eventos = await bulkLoader.listWindow(calendar, calendarId);
    console.log(`Eventos cargados: ${eventos.length}`);
    if (eventos.length > 0) {
      const proximo = eventos[0];
      console.log(`Próximo evento: ${proximo.summary} ${proximo.start && (proximo.start.dateTime || proximo.start.date)}`);
      // 5.3: Aquí deberías enviar mensaje WhatsApp, pero eso requiere integración directa.
    }
  } else {
    console.log('No se ejecutó bulkLoader.listWindow().');
  }
}

main();
