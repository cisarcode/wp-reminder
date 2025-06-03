import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer';

dotenv.config();

const SESSION_FILE_PATH = './.wwebjs_auth';
const CLIENT_ID = 'reminder-bot';

// Function to safely delete a file or directory
const removeFileOrDir = (itemPath) => {
  try {
    if (fs.existsSync(itemPath)) {
      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        // fs.rmSync(itemPath, { recursive: true, force: true }); // Requires Node 14.14+
        // Using older method for broader compatibility for now, though rmSync is better
        fs.rmdirSync(itemPath, { recursive: true }); 
        console.log(`Directorio de sesión eliminado: ${itemPath}`);
      } else {
        fs.unlinkSync(itemPath);
        console.log(`Archivo eliminado: ${itemPath}`);
      }
    }
  } catch (err) {
    console.error(`Error al eliminar ${itemPath}:`, err);
  }
};

const client = new Client({
  authStrategy: new LocalAuth({ 
    clientId: CLIENT_ID,
    dataPath: '/tmp/wwebjs_auth'
  }),
  puppeteer: {
      headless: true, // Set to false to see the browser window
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        // '--single-process', // Single-process mode (not recommended for stability)
        '--disable-gpu'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
      dumpio: true,
    },
    // Increase timeout for WhatsApp Web to load, especially on slower connections or first run
    // Default is 60000 (60 seconds)
    qrTimeout: 0, // 0 means no timeout for QR scan
    // Default is 120000 (2 minutes)
    // puppeteerLaunchTimeout: 120000, 
    // puppeteerPageLoadTimeout: 120000, 
  });

  client.on('qr', (qr) => {
    console.log('Código QR recibido, escanéalo con tu teléfono:');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => {
    console.log('¡Autenticado exitosamente!');
  });

  client.on('ready', async () => {
    console.log('Cliente de WhatsApp está listo.');
    const groupName = process.env.WH_GROUP_NAME;
    // Enviar un mensaje de prueba al grupo especificado una vez que el cliente esté listo
    if (groupName) {
      try {
        console.log(`Intentando encontrar el grupo: ${groupName} usando getContacts()`);
        const contacts = await client.getContacts();
        const groupContact = contacts.find(contact => contact.isGroup && contact.name === groupName);

        if (groupContact) {
          console.log(`Grupo "${groupName}" encontrado con ID: ${groupContact.id._serialized}`);
          // const message = ':::Bot Reiniciado:::';
          // await client.sendMessage(groupContact.id._serialized, message);
          // console.log(`Mensaje de prueba enviado exitosamente a ${groupName}`);
        } else {
          console.error(`Error: Grupo "${groupName}" no encontrado usando getContacts(). Asegúrate de que el nombre sea exacto y el bot sea miembro del grupo.`);
        }
      } catch (err) {
        console.error('Error al procesar contactos o enviar mensaje de prueba:', err);
      }
    } else {
      console.warn('La variable de entorno WH_GROUP_NAME no está configurada. No se enviará mensaje de prueba.');
    }
  });

  client.on('auth_failure', (msg) => {
    console.error('Fallo de autenticación:', msg);
    // Consider stopping the process or attempting re-authentication if this happens
  });

  client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
    // Consider attempting to re-initialize or exit
    // client.initialize(); // Potentially dangerous loop if not handled carefully
  });

  client.on('error', (error) => {
    console.error('Error del cliente de WhatsApp:', error);
  });

  try {
    await client.initialize();
  console.log('Cliente inicializado.');
} catch (error) {
  console.error('Error durante la inicialización del cliente:', error);
  process.exit(1); // Exit if initialization fails critically
}

/**
 * Envía un mensaje al grupo especificado por WH_GROUP_NAME
 * @param {string} message El mensaje a enviar
 */
export async function sendMessageToGroup(message) {
  const groupName = process.env.WH_GROUP_NAME;
  if (!groupName) throw new Error('WH_GROUP_NAME no está definido en .env');
  const contacts = await client.getContacts();
  const groupContact = contacts.find(contact => contact.isGroup && contact.name === groupName);
  if (!groupContact) throw new Error(`Grupo "${groupName}" no encontrado (sendMessageToGroup)`);
  return client.sendMessage(groupContact.id._serialized, message);
}

export default client;
