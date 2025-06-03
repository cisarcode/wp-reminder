/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
/**
 * Cloud Function HTTPS -> recibe notificaciones push de Google Calendar
 * Publica las cabeceras en Pub/Sub "calendar-events".
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {PubSub} = require('@google-cloud/pubsub');

admin.initializeApp();
const pubsub = new PubSub();
const TOPIC_NAME = 'calendar-events-mu'; // Asegúrate que este nombre coincida con el que crearás en Pub/Sub

exports.calendarHook = functions.https.onRequest(async (req, res) => {
  functions.logger.info('Push headers received:', JSON.stringify(req.headers));
  
  // Opcional: Validar que la notificación es de Google (más adelante se puede añadir verificación de token)
  // Por ahora, nos enfocamos en recibir y publicar.

  try {
    // Publicar solo las cabeceras relevantes o un mensaje simple
    // Google envía varias cabeceras, como:
    // 'x-goog-channel-id': ID del canal de notificación
    // 'x-goog-resource-id': ID del recurso que cambió
    // 'x-goog-resource-uri': URI del recurso
    // 'x-goog-resource-state': Estado del recurso (e.g., 'exists', 'not_exists', 'sync')
    // 'x-goog-message-number': Número de secuencia del mensaje
    // 'x-goog-channel-expiration': Fecha de expiración del canal
    // 'x-goog-channel-token': (Opcional) Token que configuraste al crear el watch

    const messageData = {
      attributes: { // Los atributos son útiles para filtrar en el lado del suscriptor
        channelId: req.headers['x-goog-channel-id'] || 'unknown',
        resourceId: req.headers['x-goog-resource-id'] || 'unknown',
        resourceState: req.headers['x-goog-resource-state'] || 'unknown',
      },
      data: Buffer.from(JSON.stringify(req.headers)) // El cuerpo completo de las cabeceras como datos
    };

    await pubsub.topic(TOPIC_NAME).publishMessage(messageData);
    functions.logger.info(`Message published to Pub/Sub topic: ${TOPIC_NAME}`);
    res.status(200).send('OK');
  } catch (e) {
    functions.logger.error('Error publishing to Pub/Sub:', e);
    res.status(500).send('Error processing notification.');
  }
});
