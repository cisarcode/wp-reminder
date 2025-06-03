import express from 'express';
import client from './whatsappClient.js'; // Asumiendo que whatsappClient.js exporta el cliente

const app = express();

app.get('/health', (_req, res) => {
  // Comprueba si el cliente de WhatsApp tiene información (un indicador de que está inicializado o listo)
  // Puedes ajustar esta lógica según cómo determines que tu bot está "saludable"
  const isWhatsappReady = client && client.info && client.info.wid;
  if (isWhatsappReady) {
    res.status(200).send('ok');
  } else {
    // Si el cliente no está listo, podría indicar que aún está iniciando o hay un problema
    res.status(503).send('starting_or_error'); 
  }
});

export function startHealthServer() {
  const port = process.env.PORT || 8080; // Cloud Run establece PORT
  app.listen(port, () => {
    console.log(`[healthServer.js] Health server escuchando en el puerto ${port}`);
  });
}
