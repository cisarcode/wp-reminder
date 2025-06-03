# WhatsApp Reminder Service

## Propósito
Servicio residente que agenda alertas de Google Calendar a grupo de WhatsApp.

## Escaneo QR y despliegue
1. Instala dependencias: `npm install`
2. Configura `.env` y `credentials.json`
3. Inicia con PM2: `pm2 start ecosystem.config.js`
4. Escanea el QR que aparece en consola la primera vez.

## Endpoints
- `/health`: Estado del servicio
- `/calendarHook`: Webhook para notificaciones push (Google Calendar)

## Notas
- No requiere Docker ni instalaciones globales.
- Verifica que el grupo WhatsApp exista y la cuenta tenga permisos.

## Importación masiva de eventos
Próximamente: instrucciones para uso de bulkLoader.


## Información de estado de tareas programadas
http://localhost:3001/scheduled-jobs

## Recargar eventos del calendario local
http://localhost:3001/reload-events


## Gestión del Calendario de Google (populate_calendar.js)

Este script interactúa directamente con la API de Google Calendar para gestionar los eventos.

- **Poblar el calendario (acción por defecto):**
  ```bash
  node populate_calendar.js
  ```
  Lee las definiciones de `event_definitions_template.json` y crea los eventos correspondientes en Google Calendar. No borra eventos existentes por defecto, por lo que puede crear duplicados si los eventos ya existen.

- **Listar eventos del calendario:**
  ```bash
  node populate_calendar.js list
  ```
  Muestra los eventos existentes en Google Calendar que coinciden con los títulos definidos en `event_definitions_template.json`, buscando en un rango de fechas próximo (generalmente los siguientes 7-14 días).

- **Limpiar (borrar todos) los eventos del calendario:**
  ```bash
  node populate_calendar.js clear confirm
  ```
  Elimina **todos** los eventos del calendario de Google especificado en el archivo `.env`. El argumento `confirm` es obligatorio por seguridad para ejecutar la acción de borrado.