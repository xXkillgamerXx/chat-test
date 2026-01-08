# Chat Simple con Docker

AplicaciÃ³n de chat en tiempo real usando Node.js, Socket.IO, Vue 3 y Docker.

## CaracterÃ­sticas

- Chat en tiempo real con Socket.IO
- ReconexiÃ³n automÃ¡tica
- Notificaciones de usuarios conectados/desconectados
- Indicador de usuario escribiendo
- Interfaz moderna y responsive

## Requisitos

- Docker
- Docker Compose

## InstalaciÃ³n

`ash
# Clonar repositorio
git clone https://github.com/xXkillgamerXx/chat-test.git
cd chat-test

# Ejecutar con Docker
docker-compose up --build
`

## Acceso

- Cliente Vue: http://localhost:5173
- Servidor: http://localhost:3000

## Estructura

`
chat-app/
â”œâ”€â”€ server/          # Servidor Node.js con Socket.IO
â”œâ”€â”€ client/          # Cliente Vue 3
â””â”€â”€ docker-compose.yml
`

## Comandos Docker

`ash
# Iniciar
docker-compose up --build

# Detener
docker-compose down

# Ver logs
docker-compose logs -f

# Reiniciar
docker-compose restart
`

## TecnologÃ­as

- Backend: Node.js, Express, Socket.IO
- Frontend: Vue 3, Vite
- ContainerizaciÃ³n: Docker, Docker Compose
