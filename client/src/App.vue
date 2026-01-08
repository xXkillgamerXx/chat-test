<template>
  <div class="chat-container">
    <div class="chat-header">
      <h1>💬 Chat Simple</h1>
      <div v-if="nombreUsuario" class="usuario-actual">
        Conectado como: <strong>{{ nombreUsuario }}</strong>
      </div>
    </div>

    <!-- Formulario de nombre de usuario -->
    <div v-if="!nombreUsuario" class="login-form">
      <input
        v-model="nombreInput"
        @keyup.enter="unirseAlChat"
        type="text"
        placeholder="Ingresa tu nombre"
        class="input-nombre"
      />
      <button @click="unirseAlChat" class="btn-unirse">Unirse al Chat</button>
    </div>

    <!-- Área de chat -->
    <div v-else class="chat-area">
      <!-- Lista de mensajes -->
      <div class="mensajes-container" ref="mensajesContainer">
        <div
          v-for="(mensaje, index) in mensajes"
          :key="index"
          :class="['mensaje', { 'mensaje-propio': mensaje.id === socketId }]"
        >
          <div class="mensaje-header">
            <strong>{{ mensaje.nombre }}</strong>
            <span class="timestamp">{{
              formatearFecha(mensaje.timestamp)
            }}</span>
          </div>
          <div class="mensaje-texto">{{ mensaje.mensaje }}</div>
        </div>

        <!-- Indicador de usuario escribiendo -->
        <div v-if="usuarioEscribiendo" class="escribiendo">
          {{ usuarioEscribiendo }} está escribiendo...
        </div>
      </div>

      <!-- Formulario de envío -->
      <div class="input-container">
        <input
          v-model="nuevoMensaje"
          @keyup.enter="enviarMensaje"
          @input="usuarioEstaEscribiendo"
          type="text"
          placeholder="Escribe un mensaje..."
          class="input-mensaje"
        />
        <button @click="enviarMensaje" class="btn-enviar">Enviar</button>
      </div>
    </div>
  </div>
</template>

<script>
import { io } from "socket.io-client";

export default {
  name: "App",
  data() {
    return {
      socket: null,
      nombreUsuario: "",
      nombreInput: "",
      nuevoMensaje: "",
      mensajes: [],
      socketId: null,
      usuarioEscribiendo: "",
      timeoutEscribiendo: null,
    };
  },
  mounted() {
    // Conectar al servidor - detectar automáticamente la URL
    // Usar siempre el mismo hostname desde donde se accede
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // Determinar la URL del servidor
    let socketUrl = import.meta.env.VITE_SOCKET_URL;
    
    // Si VITE_SOCKET_URL está definida pero es localhost, ignorarla en producción
    if (socketUrl && socketUrl.includes('localhost')) {
      const isLocal = 
        hostname === 'localhost' || 
        hostname === '127.0.0.1' ||
        hostname.startsWith('172.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.');
      
      // Solo usar localhost si realmente estamos en localhost
      if (!isLocal) {
        socketUrl = null; // Forzar detección automática
      }
    }
    
    if (!socketUrl) {
      // Si estamos en localhost o IP privada, usar localhost para el servidor
      const isLocal = 
        hostname === 'localhost' || 
        hostname === '127.0.0.1' ||
        hostname.startsWith('172.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.');
      
      if (isLocal) {
        socketUrl = 'http://localhost:3000';
      } else {
        // En producción/AWS, usar el mismo protocolo y hostname
        // Si la página es HTTPS, el socket también debe ser HTTPS para móviles
        // Si la página es HTTP, usar HTTP (pero puede fallar en móviles)
        const useHttps = protocol === 'https:' || 
                        window.location.port === '443' ||
                        (!window.location.port && protocol === 'https:');
        
        const socketProtocol = useHttps ? 'https:' : 'http:';
        socketUrl = `${socketProtocol}//${hostname}:3000`;
      }
    }
    
    console.log('🔌 Conectando a:', socketUrl);
    
    this.socket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      // Opciones para móviles - intentar polling primero, luego upgrade a websocket
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: false,
      // Timeouts más largos para conexiones móviles
      timeout: 20000,
      forceNew: false,
    });

    // Eventos del socket
    this.socket.on("connect", () => {
      console.log("✅ Conectado al servidor");
      this.socketId = this.socket.id;
    });

    this.socket.on("mensaje:recibir", (data) => {
      this.mensajes.push(data);
      this.scrollToBottom();
    });

    this.socket.on("usuario:conectado", (data) => {
      this.mensajes.push({
        id: "sistema",
        nombre: "Sistema",
        mensaje: data.mensaje,
        timestamp: new Date().toISOString(),
      });
      this.scrollToBottom();
    });

    this.socket.on("usuario:desconectado", (data) => {
      this.mensajes.push({
        id: "sistema",
        nombre: "Sistema",
        mensaje: data.mensaje,
        timestamp: new Date().toISOString(),
      });
      this.scrollToBottom();
    });

    this.socket.on("usuario:escribiendo", (nombre) => {
      this.usuarioEscribiendo = nombre;
      clearTimeout(this.timeoutEscribiendo);
      this.timeoutEscribiendo = setTimeout(() => {
        this.usuarioEscribiendo = "";
      }, 3000);
    });

    this.socket.on("usuario:dejo_escribir", () => {
      this.usuarioEscribiendo = "";
    });

    this.socket.on("disconnect", () => {
      console.log("❌ Desconectado del servidor");
    });
  },
  methods: {
    unirseAlChat() {
      if (this.nombreInput.trim()) {
        this.nombreUsuario = this.nombreInput.trim();
        this.socket.emit("usuario:unirse", this.nombreUsuario);
      }
    },
    enviarMensaje() {
      if (this.nuevoMensaje.trim() && this.nombreUsuario) {
        this.socket.emit("mensaje:enviar", {
          mensaje: this.nuevoMensaje.trim(),
        });
        this.nuevoMensaje = "";
        this.socket.emit("usuario:dejo_escribir");
      }
    },
    usuarioEstaEscribiendo() {
      if (this.nombreUsuario) {
        this.socket.emit("usuario:escribiendo", this.nombreUsuario);
      }
    },
    formatearFecha(timestamp) {
      const fecha = new Date(timestamp);
      return fecha.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.mensajesContainer;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    },
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  },
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  margin: 0;
}

.chat-container {
  width: 100%;
  max-width: 800px;
  height: 100vh;
  background: white;
  border-radius: 0;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (min-width: 768px) {
  .chat-container {
    width: 90%;
    height: 90vh;
    border-radius: 20px;
    margin: 20px;
  }
}

.chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 15px;
  text-align: center;
  flex-shrink: 0;
  position: relative;
  /* Safe area para iOS */
  padding-top: max(12px, env(safe-area-inset-top));
}

.chat-header h1 {
  font-size: 18px;
  margin-bottom: 4px;
  line-height: 1.2;
}

.usuario-actual {
  font-size: 11px;
  opacity: 0.9;
  word-break: break-word;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 768px) {
  .chat-header {
    padding: 20px;
  }
  
  .chat-header h1 {
    font-size: 24px;
    margin-bottom: 10px;
  }
  
  .usuario-actual {
    font-size: 14px;
  }
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 30px 20px;
  align-items: center;
  flex: 1;
  justify-content: center;
}

.input-nombre {
  width: 100%;
  max-width: 400px;
  padding: 15px;
  font-size: 16px; /* Evitar zoom en iOS */
  border: 2px solid #667eea;
  border-radius: 10px;
  outline: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  min-height: 48px; /* Tamaño mínimo táctil */
  box-sizing: border-box;
}

.btn-unirse {
  padding: 15px 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  font-weight: bold;
  transition: transform 0.2s;
  min-height: 48px;
  touch-action: manipulation;
}

.btn-unirse:hover {
  transform: scale(1.05);
}

.btn-unirse:active {
  transform: scale(0.98);
}

@media (min-width: 768px) {
  .login-form {
    padding: 40px;
  }
}

.chat-area {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.mensajes-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px 8px;
  background: #f5f5f5;
  -webkit-overflow-scrolling: touch;
  /* Mejorar scroll en móviles */
  overscroll-behavior: contain;
}

.mensaje {
  background: white;
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}

.mensaje-propio {
  background: #e3f2fd;
  margin-left: 5%;
  margin-right: 0;
}

@media (min-width: 768px) {
  .mensajes-container {
    padding: 20px;
  }
  
  .mensaje {
    padding: 15px;
    margin-bottom: 15px;
  }
  
  .mensaje-propio {
    margin-left: 20%;
  }
}

.mensaje-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
  font-size: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.mensaje-header strong {
  color: #667eea;
}

.timestamp {
  color: #999;
  font-size: 11px;
  white-space: nowrap;
}

.mensaje-texto {
  color: #333;
  line-height: 1.4;
  font-size: 14px;
  word-break: break-word;
}

@media (min-width: 768px) {
  .mensaje-header {
    font-size: 14px;
  }
  
  .timestamp {
    font-size: 12px;
  }
  
  .mensaje-texto {
    font-size: 16px;
  }
}

.escribiendo {
  color: #999;
  font-style: italic;
  padding: 10px;
  font-size: 13px;
}

@media (min-width: 768px) {
  .escribiendo {
    font-size: 14px;
  }
}

.input-container {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: white;
  border-top: 1px solid #eee;
  flex-shrink: 0;
  /* Safe area para iOS */
  padding-bottom: max(10px, env(safe-area-inset-bottom));
  /* Evitar que el teclado cubra el input */
  position: relative;
  z-index: 10;
}

.input-mensaje {
  flex: 1;
  padding: 12px 16px;
  font-size: 16px; /* Evitar zoom en iOS */
  border: 2px solid #ddd;
  border-radius: 25px;
  outline: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  /* Mejorar en móviles */
  min-height: 44px; /* Tamaño mínimo táctil */
  box-sizing: border-box;
}

.input-mensaje:focus {
  border-color: #667eea;
}

.btn-enviar {
  padding: 12px 18px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 14px;
  cursor: pointer;
  font-weight: bold;
  transition: transform 0.2s;
  min-width: 70px;
  min-height: 44px; /* Tamaño mínimo táctil */
  touch-action: manipulation;
  white-space: nowrap;
  flex-shrink: 0;
  box-sizing: border-box;
}

.btn-enviar:hover {
  transform: scale(1.05);
}

.btn-enviar:active {
  transform: scale(0.98);
}

@media (min-width: 768px) {
  .input-container {
    gap: 10px;
    padding: 20px;
  }
  
  .input-mensaje {
    padding: 15px;
    border-radius: 10px;
  }
  
  .btn-enviar {
    padding: 15px 30px;
    font-size: 16px;
    border-radius: 10px;
    min-width: auto;
  }
}

.mensajes-container::-webkit-scrollbar {
  width: 6px;
}

.mensajes-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.mensajes-container::-webkit-scrollbar-thumb {
  background: #667eea;
  border-radius: 4px;
}

@media (min-width: 768px) {
  .mensajes-container::-webkit-scrollbar {
    width: 8px;
  }
}

/* Mejoras para móviles */
@media (max-width: 767px) {
  html, body {
    overflow: hidden;
    height: 100%;
    position: fixed;
    width: 100%;
    /* Prevenir scroll horizontal */
    max-width: 100vw;
  }
  
  #app {
    height: 100vh;
    height: 100dvh; /* Dynamic viewport height para móviles */
    overflow: hidden;
    max-width: 100vw;
  }
  
  .chat-container {
    /* Usar viewport completo en móviles */
    height: 100vh;
    height: 100dvh;
    max-height: 100vh;
    max-height: 100dvh;
  }
  
  .chat-header {
    padding: 10px 12px;
  }
  
  .chat-header h1 {
    font-size: 16px;
    margin-bottom: 3px;
  }
  
  .usuario-actual {
    font-size: 10px;
    line-height: 1.3;
  }
  
  .mensajes-container {
    padding: 10px 6px;
  }
  
  .mensaje {
    padding: 8px 10px;
    margin-bottom: 8px;
    border-radius: 6px;
  }
  
  .mensaje-propio {
    margin-left: 8%;
  }
  
  .mensaje-header {
    font-size: 11px;
    margin-bottom: 3px;
  }
  
  .mensaje-texto {
    font-size: 13px;
    line-height: 1.3;
  }
  
  .input-container {
    padding: 8px 10px;
  }
  
  .input-mensaje {
    padding: 10px 14px;
    font-size: 16px; /* Mantener 16px para evitar zoom en iOS */
  }
  
  .btn-enviar {
    padding: 10px 16px;
    font-size: 13px;
    min-width: 65px;
  }
  
  .login-form {
    padding: 20px 15px;
  }
  
  .input-nombre {
    padding: 12px 15px;
    font-size: 16px; /* Mantener 16px para evitar zoom en iOS */
  }
  
  .btn-unirse {
    padding: 12px 30px;
    font-size: 15px;
  }
}

/* Ajustes para pantallas muy pequeñas */
@media (max-width: 360px) {
  .chat-header h1 {
    font-size: 15px;
  }
  
  .usuario-actual {
    font-size: 9px;
  }
  
  .mensaje-texto {
    font-size: 12px;
  }
  
  .btn-enviar {
    min-width: 60px;
    padding: 10px 12px;
    font-size: 12px;
  }
}
</style>
