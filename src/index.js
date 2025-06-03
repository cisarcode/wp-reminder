import http from 'http';
import url from 'url';
import './whatsappClient.js'; // Asegúrate que esto exporte 'whatsappClient' o se maneje adecuadamente
import { loadAll } from './bulkLoader.js';
import whatsappClient from './whatsappClient.js'; // Cliente de WhatsApp importado
import { getScheduledJobsDetails } from './jobStore.js';
import { PubSub } from '@google-cloud/pubsub'; // <--- AÑADIDO: Importar PubSub

const RELOAD_PORT = process.env.RELOAD_PORT || 3001;
const CALENDAR_PUBSUB_SUBSCRIPTION = 'calendar-events-mu-bot-subscription'; // Nombre de la suscripción por defecto

// Definir projectId y subscriptionName desde variables de entorno con fallbacks
const projectId = process.env.PUBSUB_PROJECT_ID || 'wp-reminder'; // Tu Project ID de GCP
const subscriptionName = process.env.PUBSUB_SUBSCRIPTION_ID || CALENDAR_PUBSUB_SUBSCRIPTION;

// Inicialización del cliente de WhatsApp y carga de eventos
whatsappClient.on('ready', async () => {
  console.log('WhatsApp listo – cargando eventos…');
  try {
    await loadAll(); // Carga inicial de eventos
    console.log('Carga inicial de eventos completada.');

    // <--- INICIO: Configuración del listener de Pub/Sub para eventos de calendario --->
    console.log('Configurando listener para eventos de calendario vía Pub/Sub...');
    try {
      const pubSubClient = new PubSub({ projectId }); // projectId se toma de la variable definida arriba
      const subscription = pubSubClient.subscription(subscriptionName); // subscriptionName se toma de la variable definida arriba

      const messageHandler = async message => {
        console.log(`[PubSub] Mensaje recibido ID: ${message.id}`);
        // console.log(`[PubSub] Datos (raw): ${message.data.toString()}`); // Descomentar para depuración si es necesario
        // console.log(`[PubSub] Atributos: ${JSON.stringify(message.attributes)}`); // Descomentar para depuración

        // Los encabezados de Google Calendar se envían como atributos.
        // 'x-goog-resource-state' indica el tipo de notificación (sync, exists, not_exists)
        const resourceState = message.attributes ? (message.attributes['X-Goog-Resource-State'] || message.attributes['x-goog-resource-state']) : 'unknown';
        console.log(`[PubSub] Estado del recurso (X-Goog-Resource-State): ${resourceState}`);

        if (resourceState === 'sync') {
          console.log('[PubSub] Mensaje de tipo "sync" recibido. Es una verificación de Google, no indica un cambio de evento. Confirmando mensaje.');
          message.ack(); // Confirmar el mensaje 'sync' para que no se reenvíe.
          console.log(`[PubSub] Mensaje "sync" ${message.id} confirmado (ack).`);
          return; // No es necesario recargar todo para un 'sync'
        }

        console.log('[PubSub] Notificación de cambio detectada. Actualizando eventos del calendario...');
        try {
          await loadAll(); // Reutilizar la lógica existente para recargar y reprogramar
          console.log('[PubSub] Eventos actualizados y recordatorios reprogramados exitosamente tras notificación.');
          message.ack(); // Confirmar el mensaje después de procesarlo exitosamente
          console.log(`[PubSub] Mensaje ${message.id} confirmado (ack).`);
        } catch (error) {
          console.error('[PubSub] Error al procesar el mensaje y recargar eventos:', error);
          message.nack(); // No confirmar el mensaje para que Pub/Sub intente reenviarlo
          console.error(`[PubSub] Mensaje ${message.id} no confirmado (nack). Se reintentará.`);
        }
      };

      subscription.on('message', messageHandler);

      subscription.on('error', error => {
        console.error('[PubSub] Error crítico recibido del listener de suscripción:', error);
        // Considerar estrategias de reconexión o alerta si esto ocurre frecuentemente
      });

      console.log(`[PubSub] Escuchando mensajes en la suscripción: ${CALENDAR_PUBSUB_SUBSCRIPTION}`);
    } catch (error) {
      console.error('[PubSub] Error fatal al configurar el listener de Pub/Sub:', error);
      // El bot seguirá funcionando para recargas periódicas/manuales, pero no para notificaciones push.
    }
    // <--- FIN: Configuración del listener de Pub/Sub --->

  } catch (error) {
    console.error('Error en la carga inicial de eventos o configuración de Pub/Sub tras WhatsApp ready:', error);
  }
});

// Recarga periódica de eventos (cada 6 horas)
setInterval(async () => {
  console.log('Iniciando recarga periódica de eventos (cada 6 horas)...');
  try {
    await loadAll();
  } catch (error) {
    console.error('Error en la recarga periódica de eventos:', error);
  }
}, 21600000); // 6 horas = 21,600,000 ms

console.log('Intentando iniciar servidor HTTP para recarga manual y estado de jobs...');
// Servidor HTTP para recarga manual y visualización de trabajos programados
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  res.setHeader('Content-Type', 'application/json'); // Establecer Content-Type para todas las respuestas

  if (req.method === 'GET' && parsedUrl.pathname === '/reload-events') {
    console.log('Solicitud de recarga manual de eventos recibida...');
    try {
      await loadAll();
      res.writeHead(200);
      res.end(JSON.stringify({ message: 'Recarga de eventos completada. Revisa los logs del bot.' }));
      console.log('Recarga manual de eventos finalizada exitosamente.');
    } catch (error) {
      console.error('Error durante la recarga manual de eventos:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ message: 'Error durante la recarga de eventos.', error: error.message }));
    }
  } else if (req.method === 'GET' && parsedUrl.pathname === '/scheduled-jobs') {
    console.log('Solicitud de lista de trabajos programados recibida...');
    try {
      const jobs = getScheduledJobsDetails(); // Asumiendo que esta función devuelve un array de detalles de trabajos
      res.writeHead(200);
      res.end(JSON.stringify({ count: jobs.length, jobs: jobs }));
      console.log('Lista de trabajos programados enviada exitosamente.');
    } catch (error) {
      console.error('Error al obtener la lista de trabajos programados:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ message: 'Error al obtener la lista de trabajos programados.', error: error.message }));
    }
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ message: 'Endpoint no encontrado.' }));
  }
});

server.listen(RELOAD_PORT, () => {
  console.log(`Servidor HTTP escuchando en http://localhost:${RELOAD_PORT}`);
  console.log(`  Endpoint para recarga manual: /reload-events`);
  console.log(`  Endpoint para ver trabajos: /scheduled-jobs`);
});

server.on('error', (error) => {
  console.error('Error en el servidor HTTP:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Puerto ${RELOAD_PORT} ya está en uso. Los endpoints HTTP no estarán disponibles.`);
    console.error('Si los necesitas, detén el proceso que usa ese puerto o cambia RELOAD_PORT en .env');
  }
});
