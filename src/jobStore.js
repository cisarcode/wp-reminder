import schedule from 'node-schedule';
const map = new Map(); // Stores eventId -> { job: Job, summary: String }

export function add(eventId, triggerDate, eventSummary, callback) {
  if (map.has(eventId)) {
    const existingEntry = map.get(eventId);
    if (existingEntry && existingEntry.job) {
      existingEntry.job.cancel();
    }
  }
  const job = schedule.scheduleJob(triggerDate, callback);
  map.set(eventId, { job: job, summary: eventSummary });
  console.log(`[JobStore] Job programado/actualizado para eventId: ${eventId} (${eventSummary || 'Sin título'}) a las ${triggerDate.toLocaleString()}`);
}

export function cancel(eventId) {
  if (map.has(eventId)) {
    const entry = map.get(eventId);
    if (entry && entry.job) {
      entry.job.cancel();
      console.log(`[JobStore] Job cancelado para eventId: ${eventId}`);
    } else {
      console.warn(`[JobStore] Intento de cancelar job para eventId ${eventId} pero no se encontró objeto job.`);
    }
    // Considerar si eliminar de map o no. Por ahora, solo cancela.
  } else {
    console.warn(`[JobStore] Intento de cancelar job para eventId ${eventId} pero no se encontró en el map.`);
  }
}
export function count() { return map.size; }

export function getScheduledJobsDetails() {
  const jobDetails = [];
  if (map && map.size > 0) {
    map.forEach((entry, eventId) => {
      if (entry && entry.job) {
        jobDetails.push({
          eventId: eventId,
          summary: entry.summary || '(Sin título)',
          nextInvocation: entry.job.nextInvocation()?.toLocaleString() || 'N/A',
        });
      } else {
        // Esto no debería ocurrir si la lógica de 'add' es correcta
        console.warn(`[JobStore] Entrada inválida o sin job para eventId ${eventId} en getScheduledJobsDetails`);
        jobDetails.push({
          eventId: eventId,
          summary: entry?.summary || '(Error: Sin título)',
          nextInvocation: 'N/A (Error: Job no encontrado)',
        });
      }
    });
  }
  return jobDetails;
}
