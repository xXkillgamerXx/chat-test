const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

// Configurar Socket.IO con CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Almacenar usuarios conectados
const usuarios = new Map();

// Cuando un cliente se conecta
io.on('connection', (socket) => {
  console.log('✅ Usuario conectado:', socket.id);

  // Cuando un usuario se une al chat
  socket.on('usuario:unirse', (nombreUsuario) => {
    usuarios.set(socket.id, nombreUsuario);
    socket.broadcast.emit('usuario:conectado', {
      id: socket.id,
      nombre: nombreUsuario,
      mensaje: `${nombreUsuario} se unió al chat`
    });
    
    // Enviar lista de usuarios al nuevo usuario
    const listaUsuarios = Array.from(usuarios.values());
    socket.emit('usuarios:lista', listaUsuarios);
    
    console.log(`${nombreUsuario} se unió al chat`);
  });

  // Cuando se envía un mensaje
  socket.on('mensaje:enviar', (data) => {
    const nombreUsuario = usuarios.get(socket.id) || 'Anónimo';
    
    // Enviar mensaje a todos
    io.emit('mensaje:recibir', {
      id: socket.id,
      nombre: nombreUsuario,
      mensaje: data.mensaje,
      timestamp: new Date().toISOString()
    });
    
    console.log(`${nombreUsuario}: ${data.mensaje}`);
  });

  // Cuando un usuario está escribiendo
  socket.on('usuario:escribiendo', (nombreUsuario) => {
    socket.broadcast.emit('usuario:escribiendo', nombreUsuario);
  });

  // Cuando un usuario deja de escribir
  socket.on('usuario:dejo_escribir', () => {
    socket.broadcast.emit('usuario:dejo_escribir', socket.id);
  });

  // Cuando un usuario se desconecta
  socket.on('disconnect', () => {
    const nombreUsuario = usuarios.get(socket.id);
    if (nombreUsuario) {
      usuarios.delete(socket.id);
      socket.broadcast.emit('usuario:desconectado', {
        id: socket.id,
        nombre: nombreUsuario,
        mensaje: `${nombreUsuario} abandonó el chat`
      });
      console.log(`${nombreUsuario} se desconectó`);
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 Socket.IO listo para conexiones`);
});
