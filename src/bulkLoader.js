import { listWindow } from './googleCalendarClient.js';
import { add } from './jobStore.js';
import { sendMessageToGroup } from './whatsappClient.js';

export async function loadAll() {
  let events = []; // Declarar events en el scope superior
  try {
    console.log('BulkLoader: iniciando carga de eventos desde Google Calendar...');
    try {
      events = await listWindow(); // Asignar valor a events
      console.log(`BulkLoader: eventos encontrados en ventana = ${events.length}`);
    } catch (err) {
      console.error('BulkLoader: ERROR al obtener eventos desde Google Calendar', err);
      // No relanzar el error aquí para que el resto del logging pueda continuar si es posible,
      // o para que el programa no se caiga si es un error transitorio de red.
      // Considerar una estrategia de reintento o notificación más robusta en producción.
      console.log('BulkLoader: continuando con 0 eventos debido a error previo.');
      // Asegurarse de que events sea un array vacío para el bucle posterior
      events = []; 
    }
    let programmed = 0;
    let skipped = 0;
    const now = Date.now();
    // Asegurarse de que events es un array antes de iterar
    if (!Array.isArray(events)) {
        console.error('BulkLoader: La lista de eventos no es un array. Abortando procesamiento de eventos.');
        events = []; // Prevenir error en el bucle
    }
    for (const ev of events) {
      try {
        console.log(`BulkLoader: procesando evento ${ev.summary || ev.id}...`);
        const start = new Date(ev.start.dateTime || ev.start.date);
        const trigger = new Date(start.getTime() - Number(process.env.LEAD_TIME_MIN) * 60000);
        if (trigger > now) {
          try {
            add(ev.id, trigger, ev.summary, async () => {
              console.log(`[JOB_EXEC] Job for event: ${ev.summary || ev.id} (ID: ${ev.id}) is executing at ${new Date().toLocaleString()}`);
              const hourStr = start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
              const eventTitle = ev.summary || '(sin título)';
              const originalDescription = ev.description || '';
              let cleanDescription = originalDescription;
              let titleToSend = eventTitle;

              // Determinar formato del título y limpiar descripción
              if (originalDescription.includes('[MONO]')) {
                titleToSend = "```" + eventTitle + "```";
                cleanDescription = originalDescription.replace('[MONO]', '').trim();
              } else {
                titleToSend = `*${eventTitle}*`; // Negrita por defecto
                // Limpiar otras etiquetas por si acaso, aunque el JSON se actualizará
                cleanDescription = originalDescription.replace('[BOLD]', '').replace('[NORMAL]', '').trim();
              }

              const titleMsg = `${titleToSend} (${hourStr}Hs)`;

              try {
                await sendMessageToGroup(titleMsg);
                console.log(`[OK] Recordatorio (título) enviado para evento: ${eventTitle} (ID: ${ev.id})`);

                if (cleanDescription) {
                  await sendMessageToGroup(cleanDescription);
                  console.log(`[OK] Recordatorio (descripción) enviado para evento: ${eventTitle} (ID: ${ev.id})`);
                }
              } catch (err) {
                console.error(`[ERR] Al enviar recordatorio para evento: ${eventTitle} (ID: ${ev.id})`, err);
              }
            });
            programmed++;
            console.log(`[PROG] Evento programado: ${ev.summary || ev.id} | Trigger: ${trigger.toLocaleString()}`);
          } catch (err) {
            console.error(`[ERR] Al agregar evento a la cola: ${ev.summary || ev.id}`, err);
          }
        } else {
          skipped++;
          console.log(`[SKIP] Evento pasado o fuera de ventana: ${ev.summary || ev.id}`);
        }
      } catch (err) {
        skipped++;
        console.error(`[ERR] Al procesar evento: ${ev.summary || ev.id}`, err);
      }
    }
    console.log(`BulkLoader: eventos programados = ${programmed}, descartados = ${skipped}`);
  } catch (err) {
    console.error('BulkLoader: ERROR FATAL en loadAll()', err);
    throw err;
  }
}
