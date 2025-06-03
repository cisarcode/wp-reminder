# WhatsApp Reminder Bot - Project Roadmap

## I. Core WhatsApp Client (✅ Completed)
- [x] Setup `whatsapp-web.js` with `LocalAuth` for session persistence.
- [x] Ensure QR code generation in the terminal for initial login.
- [x] Implement reliable sending of test messages to a specified group.
- [x] Resolve client initialization and message sending issues.

## II. Google Calendar Integration & Event Handling (🎯 In Progress)
- **Objective**: Receive Google Calendar updates in real-time, process them, and send reminders via WhatsApp using a robust, deployable architecture.

### Steps:
1.  **Google Calendar API Client Setup (✅ Completed):**
    *   [x] `googleapis` dependency verified and functional.
    *   [x] `src/googleCalendarClient.js` module created and operational.
    *   [x] Google API authentication using `GOOGLE_APPLICATION_CREDENTIALS` (service account) implemented and working.
    *   [x] Functions to fetch, create, and delete calendar events implemented and tested (core of `populate_calendar.js`).

2.  **Webhook Receiver (Cloud Function - Firebase) (📝 Pending Implementation):**
    *   [ ] Create a Firebase Function (e.g., `/calendarHook`) to act as an HTTPS endpoint for Google Calendar Push Notifications.
    *   [ ] Implement logic to handle Google's webhook validation (e.g., `x-goog-resource-state`, `x-goog-channel-id`).
    *   [ ] Upon receiving a valid notification, publish the relevant event data (or at least a trigger) to a Google Cloud Pub/Sub topic (e.g., `calendar-events`).
    *   [ ] Implement `/health` endpoint within the Cloud Function for status checks.

3.  **Event Processing & Reminder Logic (Cloud Run Bot - 📝 Pending Implementation):**
    *   [ ] The main WhatsApp bot application (using `whatsapp-web.js`) will run as a persistent service on Google Cloud Run.
    *   [x] **(Paso 10)** Crear una suscripción en Pub/Sub para que el bot reciba los mensajes del tema `calendar-events-mu`. (Suscripción: `calendar-events-mu-bot-subscription`)
    *   [x] **(Paso 11)** Modificar el bot de WhatsApp (`src/index.js`) para:
      *   [x] Conectarse a la suscripción de Pub/Sub.
      *   [x] Escuchar mensajes.
      *   [x] Cuando llegue un mensaje (que no sea 'sync'), llamar a `loadAll()` para refrescar eventos y reprogramar recordatorios.
      *   [x] Confirmar (ack) el mensaje a Pub/Sub.
    *   [x] **(Paso 12)** Probar el flujo completo localmente: cambio en Calendar -> Notificación a Cloud Function -> Mensaje a Pub/Sub -> Bot local recibe mensaje y actualiza eventos.

### Fase 3: Despliegue del Bot Persistente en Cloud Run

- [ ] **(Paso 13)** Preparar la aplicación para la contenedorización:
  *   [ ] **(Paso 13.a)** Crear un `Dockerfile` para empaquetar la aplicación Node.js.
  *   [ ] **(Paso 13.b)** Crear un archivo `.dockerignore` para excluir archivos innecesarios.
  *   [ ] **(Paso 13.c)** (Guiado por Cascade) Construir la imagen del contenedor usando Google Cloud Build.
  *   [ ] **(Paso 13.d)** (Guiado por Cascade) Subir la imagen a Google Artifact Registry.
- [ ] **(Paso 14)** Desplegar la imagen en Cloud Run:
  *   [ ] **(Paso 14.a)** (Guiado por Cascade) Configurar el servicio de Cloud Run (variables de entorno, cuenta de servicio, concurrencia, CPU, memoria).
  *   [ ] **(Paso 14.b)** (Guiado por Cascade) Asignar permisos necesarios a la cuenta de servicio de Cloud Run (para Pub/Sub, Google Calendar si se usa identidad del servicio).
  *   [ ] **(Paso 14.c)** Desplegar y verificar que el bot se inicie y funcione en Cloud Run.
- [ ] **(Paso 15)** Pruebas y Monitoreo Post-Despliegue:
  *   [ ] Verificar que los recordatorios se envíen correctamente desde Cloud Run.
  *   [ ] Monitorear logs en Cloud Logging.
  *   [ ] Considerar estrategias para persistir la sesión de WhatsApp Web (ej. GCS FUSE) si los reinicios y escaneos de QR son frecuentes.

## III. Bulk Event Loader/Manager (`populate_calendar.js`) (✅ Completed)
- **Objective**: Implement and refine functionality for bulk importing, managing, and clearing events in Google Calendar.
- **Status**: ✅ Completed
- **Details**:
    *   [x] Script `populate_calendar.js` created and significantly enhanced.
    *   [x] Reads event definitions from `event_definitions_template.json`.
    *   [x] Successfully creates, updates (by clearing and re-adding), and clears events, including recurring ones.
    *   [x] Handles event uniqueness and idempotency during population.
    *   [x] Timezone configurations (`America/New_York` for calendar, server time logic) and DST considerations addressed.
    *   [x] Resolved issues with event structure, start times, and durations.

## IV. Refinements & Deployment (🎯 In Progress)
- **Objective**: Prepare the bot (Cloud Run) and webhook (Cloud Function) for stable, long-term operation.

### Steps:
1.  **Configuration & Logging (📝 Pending):**
    *   [ ] Enhance logging in both the Cloud Function and Cloud Run application for monitoring and debugging (e.g., using Google Cloud Logging).
    *   [ ] Review and finalize all environment variable configurations for both services.
2.  **Error Handling & Resilience (📝 Pending):**
    *   [ ] Implement comprehensive error handling, retries, and recovery mechanisms for both services.
3.  **Deployment Pipeline (📝 Pending):**
    *   **Cloud Function (`/calendarHook`):
        *   [ ] Finalize Firebase project structure for the function.
        *   [ ] Create/Update `firebase.json` and `.firebaserc`.
        *   [ ] Define deployment scripts in `package.json` (e.g., `firebase deploy --only functions`).
    *   **Cloud Run (WhatsApp Bot):
        *   [ ] Create `Dockerfile` for the bot (Node.js, `whatsapp-web.js` dependencies including headless Chromium, and local auth path configuration).
        *   [ ] Configure Cloud Run service deployment:
            *   Set `minInstances=1` for persistence.
            *   Mount a persistent volume (e.g., Google File Store or alternative if simpler for small auth data) for `whatsapp-web.js` auth session (e.g., `/data/.wwebjs_auth`) to survive restarts.
            *   Set all required environment variables.
        *   [ ] Define deployment scripts in `package.json` (e.g., using `gcloud run deploy`).
4.  **README Update (📝 Pending):**
    *   [ ] Update `README.md` with the new architecture (Cloud Function, Pub/Sub, Cloud Run), detailed setup, deployment instructions for both services, and usage information.
    *   [x] Documented `populate_calendar.js` (as the bulk loader/manager).

---
