FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar cÃ³digo fuente
COPY . .

# Exponer puerto
EXPOSE 3000

# Comando para iniciar
CMD ["node", "server.js"]
