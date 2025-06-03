# Usa una imagen base de Node.js 20 (versión slim para un tamaño menor)
FROM node:20-slim

# Instala dependencias necesarias para Puppeteer (usado por whatsapp-web.js)
# Referencia: https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker
RUN apt-get update \
    && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Establece el directorio de trabajo en el contenedor
WORKDIR /usr/src/app

# Copia los archivos package.json y package-lock.json 
# (package-lock.json es importante para builds reproducibles)
COPY package*.json ./

# Instala las dependencias de producción
RUN npm install --only=production

# Copia el resto del código de la aplicación
COPY . .

# Establece la ruta al ejecutable de Chromium para Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Asegúrate de que el archivo de credenciales sea accesible
# El nombre exacto del archivo JSON de credenciales debe estar en GOOGLE_APPLICATION_CREDENTIALS
# Ejemplo: ENV GOOGLE_APPLICATION_CREDENTIALS=./wp-reminder-xxxxxxxxxxxx.json
# Esta variable se configurará en Cloud Run, pero el archivo debe estar presente.

# El bot se ejecuta con node src/index.js
# Puppeteer (whatsapp-web.js) se ejecutará en modo headless por defecto
# Los argumentos para puppeteer ya están en tu whatsappClient.js

# Expone el puerto que la aplicación usará (informativo, Cloud Run usa el PORT env var)
EXPOSE 8080

# Comando para correr la aplicación
CMD ["node", "src/index.js"]
