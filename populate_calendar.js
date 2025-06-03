import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAuth, getCalendarClient } from './src/googleCalendarClient.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVENT_DEFINITIONS_PATH = path.join(__dirname, 'event_definitions_template.json');
const TARGET_TIMEZONE = 'America/New_York';

function cleanTitle(title) {
  let cleaned = title.replace(/@everyone\s*/gi, '');
  cleaned = cleaned.replace(/@here\s*/gi, '');
  return cleaned.trim();
}

async function createRecurringEvent(calendar, eventDefinition) {
  const originalTitle = eventDefinition.title;
  const cleanedSummary = cleanTitle(originalTitle);

  const {
    server_event_start_time, // HH:MM
    days_of_week, // Array of RRULE day strings e.g., ["MO", "TU"]
    duration_minutes, // total minutes
    colorId, // <--- AÑADIDO colorId
  } = eventDefinition;

  const [startHour, startMinute] = server_event_start_time.split(':').map(Number);

  // Días de la semana en formato RRULE a número de día de Date (0=Domingo, 1=Lunes, ...)
  const dayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

  let firstEventDate = new Date(); // Empezar con hoy
  firstEventDate.setHours(startHour, startMinute, 0, 0); // Establecer la hora del evento del JSON

  const targetDayNumbers = days_of_week.map(d => dayMap[d]).sort((a, b) => a - b);
  const currentDayNumber = firstEventDate.getDay();
  let daysToAdd = 0;
  let foundNextDay = false;

  for (let i = 0; i < 7; i++) {
    const potentialDayNumber = (currentDayNumber + i) % 7;
    if (targetDayNumbers.includes(potentialDayNumber)) {
      daysToAdd = i;
      foundNextDay = true;
      break;
    }
  }

  // Si no se encontró un día (ej. targetDayNumbers vacío, aunque validado en main), no debería ocurrir.
  // Si foundNextDay es true y daysToAdd es 0, significa que hoy es uno de los días del evento.
  if (foundNextDay && daysToAdd > 0) {
    firstEventDate.setDate(firstEventDate.getDate() + daysToAdd);
  }
  // Si no se encontró un día válido (foundNextDay es false), firstEventDate permanecerá como hoy,
  // lo cual es un fallback, pero la validación en main debería prevenir days_of_week vacíos/inválidos.

  const year = firstEventDate.getFullYear();
  const month = String(firstEventDate.getMonth() + 1).padStart(2, '0');
  const day = String(firstEventDate.getDate()).padStart(2, '0');
  
  const hourStr = String(startHour).padStart(2, '0');
  const minuteStr = String(startMinute).padStart(2, '0');
  const startTimeStr = `${year}-${month}-${day}T${hourStr}:${minuteStr}:00`;

  // startDateObj se usa para calcular endDateObj, así que debe reflejar la hora correcta
  const startDateObj = new Date(startTimeStr); 
  const endDateObj = new Date(startDateObj.getTime() + duration_minutes * 60000);

  const endYear = endDateObj.getFullYear();
  const endMonth = String(endDateObj.getMonth() + 1).padStart(2, '0');
  const endDayOfMonth = String(endDateObj.getDate()).padStart(2, '0'); // Renamed to avoid conflict with 'day' from now
  const endHourStr = String(endDateObj.getHours()).padStart(2, '0');
  const endMinuteStr = String(endDateObj.getMinutes()).padStart(2, '0');
  const endTimeStr = `${endYear}-${endMonth}-${endDayOfMonth}T${endHourStr}:${endMinuteStr}:00`;

  const event = {
    summary: cleanedSummary,
    description: eventDefinition.description, // Usa la descripción del JSON para preservar formato
    start: {
      dateTime: startTimeStr,
      timeZone: TARGET_TIMEZONE,
    },
    end: {
      dateTime: endTimeStr,
      timeZone: TARGET_TIMEZONE,
    },
    recurrence: [
      `RRULE:FREQ=WEEKLY;BYDAY=${days_of_week.join(',')}`,
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 10 },
      ],
    },
    guestsCanSeeOtherGuests: true,
    guestsCanInviteOthers: false,
    ...(colorId && { colorId: String(colorId) }) // <-- AÑADIDO: Incluir colorId si está definido
  };

  try {
    const createdEvent = await calendar.events.insert({
      calendarId: process.env.CALENDAR_ID,
      resource: event,
    });
    console.log(`Evento creado: ${createdEvent.data.summary} (ID: ${createdEvent.data.id}) (Original: ${originalTitle})`);
    await new Promise(resolve => setTimeout(resolve, 500)); 
  } catch (err) {
    console.error(`Error al crear evento "${cleanedSummary}" (Original: "${originalTitle}"):`, err.message);
    if (err.response && err.response.data && err.response.data.error && err.response.data.error.errors) {
        err.response.data.error.errors.forEach(e => console.error(`  - ${e.domain} - ${e.reason}: ${e.message}`));
    }
  }
}

async function listExistingEvents(calendar, eventDefinitions) {
  console.log('\nBuscando eventos existentes en el calendario...');
  let foundEventsCount = 0;

  const now = new Date();
  // Look for events starting from beginning of today up to N days in the future to catch recurring instances
  const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const timeMax = new Date(now.getTime() + 30 * 86400000).toISOString(); // Check next 30 days

  try {
    const { data } = await calendar.events.list({
      calendarId: process.env.CALENDAR_ID,
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true, // Important to expand recurring events
      orderBy: 'startTime',
      maxResults: 2500, // Max allowed by API
    });

    const existingCalendarEvents = data.items || [];
    if (existingCalendarEvents.length === 0) {
      console.log('No se encontraron eventos en el calendario en el rango de fechas actual.');
      return;
    }

    console.log(`Se encontraron ${existingCalendarEvents.length} instancias de eventos en el calendario en los próximos 30 días.`);

    for (const definition of eventDefinitions) {
      const cleanedDefinitionTitle = cleanTitle(definition.title);
      console.log(`\n--- Buscando coincidencias para: "${cleanedDefinitionTitle}" (Original: "${definition.title}") ---`);
      
      const matchingEvents = existingCalendarEvents.filter(event => {
        const calendarEventTitle = event.summary ? cleanTitle(event.summary) : '';
        // Also check description for original title if summary was cleaned differently
        const calendarEventDescription = event.description || '';
        return calendarEventTitle.includes(cleanedDefinitionTitle) || 
               calendarEventDescription.includes(definition.title); // Check original title in description
      });

      if (matchingEvents.length > 0) {
        matchingEvents.forEach(event => {
          foundEventsCount++;
          const startTime = event.start.dateTime || event.start.date;
          console.log(`  - Encontrado: "${event.summary}" (ID: ${event.id})`);
          console.log(`    Hora de inicio: ${new Date(startTime).toLocaleString()} (${event.start.timeZone || TARGET_TIMEZONE})`);
          if (event.recurringEventId) {
            console.log(`    Este es una instancia de un evento recurrente. ID de la serie: ${event.recurringEventId}`);
          }
        });
      } else {
        console.log(`  No se encontraron instancias para "${cleanedDefinitionTitle}".`);
      }
    }
    console.log(`\nTotal de instancias de eventos coincidentes encontradas: ${foundEventsCount}`);

  } catch (err) {
    console.error('Error al listar eventos:', err.message);
    if (err.response && err.response.data && err.response.data.error && err.response.data.error.errors) {
        err.response.data.error.errors.forEach(e => console.error(`  - ${e.domain} - ${e.reason}: ${e.message}`));
    }
  }
}

async function clearCalendar(calendar) {
  console.log(`\nIntentando borrar TODOS los eventos del calendario: ${process.env.CALENDAR_ID}`);
  try {
    let pageToken = null;
    let deletedCount = 0;
    const processedRecurringEventIds = new Set(); // To avoid deleting the same master event multiple times

    // Define a very wide time window to catch all possible events
    const timeMin = new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString(); // 5 years ago
    const timeMax = new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString(); // 5 years from now
    console.log(`[clearCalendar Estrategia Alternativa] Usando timeMin: ${timeMin}, timeMax: ${timeMax} con singleEvents: true`);

    let totalInstancesListed = 0;

    do {
      const res = await calendar.events.list({
        calendarId: process.env.CALENDAR_ID,
        maxResults: 250,
        singleEvents: true, // List individual instances
        pageToken: pageToken,
        timeMin: timeMin,
        timeMax: timeMax,
        showDeleted: false, // Don't list already deleted events
      });

      const items = res.data.items;
      console.log(`[clearCalendar Estrategia Alternativa] Lote actual: ${items ? items.length : 'undefined/null'} instancias de eventos encontradas.`);

      if (!items || items.length === 0) {
        if (totalInstancesListed === 0 && !pageToken) {
            console.log('No se encontraron instancias de eventos para procesar para borrado.');
        } else if (totalInstancesListed > 0 && items.length === 0) {
            console.log('No hay más instancias de eventos en lotes subsiguientes.');
        }
        break;
      }
      
      totalInstancesListed += items.length;

      for (const eventInstance of items) {
        let eventIdToDelete = eventInstance.id;
        let isMasterRecurring = false;

        if (eventInstance.recurringEventId) {
          // This is an instance of a recurring event. We want to delete the master.
          if (!processedRecurringEventIds.has(eventInstance.recurringEventId)) {
            eventIdToDelete = eventInstance.recurringEventId;
            isMasterRecurring = true;
            processedRecurringEventIds.add(eventInstance.recurringEventId);
            console.log(`  Identificada serie recurrente (ID Maestro: ${eventIdToDelete}) desde instancia ${eventInstance.id} ("${eventInstance.summary}"). Se intentará borrar la serie completa.`);
          } else {
            // Master event for this series already processed for deletion
            console.log(`  Instancia ${eventInstance.id} ("${eventInstance.summary}") pertenece a serie recurrente ${eventInstance.recurringEventId} ya procesada para borrado. Saltando.`);
            continue; 
          }
        } else {
          // This is a single, non-recurring event
          console.log(`  Identificado evento único (ID: ${eventIdToDelete}) ("${eventInstance.summary}"). Se intentará borrar.`);
        }

        try {
          await calendar.events.delete({
            calendarId: process.env.CALENDAR_ID,
            eventId: eventIdToDelete, // This will be the master ID for recurring, or instance ID for single
          });
          console.log(`  ${isMasterRecurring ? 'Serie recurrente' : 'Evento único'} borrado: ID ${eventIdToDelete} ("${eventInstance.summary || 'Evento sin título original de instancia'}")`);
          deletedCount++;
        } catch (err) {
          // Handle cases where the event might have already been deleted (e.g., if deleting a master also deletes instances listed later in the same batch)
          if (err.code === 404 || err.code === 410) { // 404 Not Found, 410 Gone
            console.warn(`  Advertencia al borrar evento/serie ${eventIdToDelete}: Ya no existe (quizás borrado como parte de una serie). Error: ${err.message}`);
            // If we tried to delete a master, ensure it's still marked as processed
            if (isMasterRecurring) processedRecurringEventIds.add(eventIdToDelete);
          } else {
            console.error(`  Error al borrar evento/serie ${eventIdToDelete}:`, err.message);
          }
        }
      }
      pageToken = res.data.nextPageToken;
    } while (pageToken);
    
    let totalProcessedForDeletion = deletedCount;
    // This calculation was a bit off, simpler to rely on deletedCount for successful operations
    // and processedRecurringEventIds for unique series targeted.
    console.log(`Proceso de borrado (estrategia alternativa) completado. Total de ${totalInstancesListed} instancias listadas.`);
    console.log(`Total de series recurrentes únicas identificadas para borrado: ${processedRecurringEventIds.size}.`);
    console.log(`Total de operaciones de borrado (eventos únicos + series maestras) intentadas/exitosas: ${deletedCount}.`);

  } catch (err) {
    console.error('Error en clearCalendar (estrategia alternativa):', err.message);
    if (err.response && err.response.data && err.response.data.error && err.response.data.error.errors) {
        err.response.data.error.errors.forEach(e => console.error(`  - ${e.domain} - ${e.reason}: ${e.message}`));
    }
  }
}

async function main() {
  if (!process.env.CALENDAR_ID) {
    console.error('Error: CALENDAR_ID no está configurado en el archivo .env o entorno.');
    return;
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Error: GOOGLE_APPLICATION_CREDENTIALS no está configurado en el archivo .env o entorno.');
    return;
  }

  const args = process.argv.slice(2);
  const operationMode = args[0]; // e.g., 'list'

  try {
    const auth = getAuth();
    const calendar = getCalendarClient(auth);
    
    const eventDefinitionsData = await fs.readFile(EVENT_DEFINITIONS_PATH, 'utf-8');
    const eventDefinitions = JSON.parse(eventDefinitionsData);

    if (operationMode === 'list') {
      await listExistingEvents(calendar, eventDefinitions);
    } else if (operationMode === 'clear') {
      console.warn('ADVERTENCIA: Estás a punto de borrar TODOS los eventos del calendario especificado.');
      // Simple confirmation mechanism via re-running with 'clear confirm'
      // This is a placeholder. For a real CLI tool, a prompt (e.g., using 'inquirer') would be better.
      if (args[1] !== 'confirm') {
        console.log("Para confirmar, ejecuta: node populate_calendar.js clear confirm");
        return;
      }
      await clearCalendar(calendar);
      return; // Terminar ejecución después de borrar
    } else {
      console.log(`Se van a procesar ${eventDefinitions.length} definiciones de eventos para CREACIÓN desde: ${EVENT_DEFINITIONS_PATH}`);
      console.log(`Usando CALENDAR_ID: ${process.env.CALENDAR_ID}`);
      console.log(`Usando Timezone para eventos: ${TARGET_TIMEZONE}`);
      console.log('ADVERTENCIA: Esto creará NUEVOS eventos recurrentes. Si ya existen, se duplicarán.');
      console.log('Si desea ver los eventos existentes, ejecute: node populate_calendar.js list');
      console.log('Si desea borrar TODOS los eventos del calendario, ejecute: node populate_calendar.js clear confirm\n');

      for (const definition of eventDefinitions) {
        // Validations from original script
        if (!definition.title || 
            !definition.server_event_start_time || 
            !definition.days_of_week || 
            typeof definition.duration_minutes !== 'number') {
          console.warn('Definición de evento incompleta, saltando:', definition.title || 'Evento sin título');
          continue;
        }
        if (!Array.isArray(definition.days_of_week) || definition.days_of_week.length === 0) {
          console.warn(`Evento "${cleanTitle(definition.title)}" no tiene 'days_of_week' válidos, saltando.`);
          continue;
        }
        // The check for event_duration_hours_minutes as an array is no longer needed as we use duration_minutes (number)
        // We could add a check here if duration_minutes must be positive, e.g.:
        // if (definition.duration_minutes <= 0) {
        //   console.warn(`Evento "${cleanTitle(definition.title)}" tiene 'duration_minutes' inválido (<=0), saltando.`);
        //   continue;
        // }
        console.log(`Procesando para creación: ${cleanTitle(definition.title)} (Original: ${definition.title})`);
        await createRecurringEvent(calendar, definition);
      }
      console.log('Proceso de creación de eventos completado.');
    }

  } catch (error) {
    console.error('Error en el script principal:', error);
  }
}

main();
