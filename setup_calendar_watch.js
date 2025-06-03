import { getCalendarClient } from './src/googleCalendarClient.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const CALENDAR_ID = process.env.CALENDAR_ID; // Asegúrate que CALENDAR_ID esté en tu .env
const WEBHOOK_URL = 'https://us-central1-wp-reminder.cloudfunctions.net/calendarHook'; // URL de tu función desplegada

async function setupWatch() {
  if (!CALENDAR_ID) {
    console.error('Error: CALENDAR_ID no está definido en tu archivo .env.');
    process.exit(1);
  }

  const calendar = getCalendarClient();
  const channelId = uuidv4(); // ID único para este canal de notificación

  console.log(`Intentando configurar watch para el calendario: ${CALENDAR_ID}`);
  console.log(`  ID del Canal: ${channelId}`);
  console.log(`  URL del Webhook: ${WEBHOOK_URL}`);

  try {
    const response = await calendar.events.watch({
      calendarId: CALENDAR_ID,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: WEBHOOK_URL,
        // params: { ttl: '3600' } // Opcional: tiempo de vida del canal en segundos (1 hora por defecto si no se especifica, max es ~1 mes)
      },
    });
    console.log('Respuesta de la API de Google Calendar watch:', response.data);
    console.log(`¡Éxito! El canal de notificación se configuró correctamente.`);
    console.log(`ID del Recurso (Resource ID): ${response.data.resourceId}`);
    console.log(`Expiración del Canal: ${new Date(Number(response.data.expiration)).toLocaleString()}`);
  } catch (error) {
    console.error('Error al configurar el watch en Google Calendar:');
    if (error.response && error.response.data) {
      console.error('Detalles del error de la API:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    console.error('\nAsegúrate de que la cuenta de servicio tenga los permisos adecuados en el calendario y que la URL del webhook sea accesible públicamente.');
  }
}

setupWatch();
