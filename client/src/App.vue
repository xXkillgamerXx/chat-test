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
    // Si es IP privada de Docker o localhost, usar localhost
    // Si es IP pública, usar esa IP
    const hostname = window.location.hostname;
    const isPrivateIP = 
      hostname === 'localhost' || 
      hostname === '127.0.0.1' ||
      hostname.startsWith('172.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.');
    
    const serverHost = isPrivateIP ? 'localhost' : hostname;
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL || `http://${serverHost}:3000`;

    this.socket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
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
}

.chat-container {
  width: 90%;
  max-width: 800px;
  height: 90vh;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  text-align: center;
}

.chat-header h1 {
  font-size: 24px;
  margin-bottom: 10px;
}

.usuario-actual {
  font-size: 14px;
  opacity: 0.9;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 40px;
  align-items: center;
}

.input-nombre {
  width: 100%;
  max-width: 400px;
  padding: 15px;
  font-size: 16px;
  border: 2px solid #667eea;
  border-radius: 10px;
  outline: none;
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
}

.btn-unirse:hover {
  transform: scale(1.05);
}

.chat-area {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.mensajes-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f5f5;
}

.mensaje {
  background: white;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.mensaje-propio {
  background: #e3f2fd;
  margin-left: 20%;
}

.mensaje-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 14px;
}

.mensaje-header strong {
  color: #667eea;
}

.timestamp {
  color: #999;
  font-size: 12px;
}

.mensaje-texto {
  color: #333;
  line-height: 1.5;
}

.escribiendo {
  color: #999;
  font-style: italic;
  padding: 10px;
  font-size: 14px;
}

.input-container {
  display: flex;
  gap: 10px;
  padding: 20px;
  background: white;
  border-top: 1px solid #eee;
}

.input-mensaje {
  flex: 1;
  padding: 15px;
  font-size: 16px;
  border: 2px solid #ddd;
  border-radius: 10px;
  outline: none;
}

.input-mensaje:focus {
  border-color: #667eea;
}

.btn-enviar {
  padding: 15px 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  font-weight: bold;
  transition: transform 0.2s;
}

.btn-enviar:hover {
  transform: scale(1.05);
}

.mensajes-container::-webkit-scrollbar {
  width: 8px;
}

.mensajes-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.mensajes-container::-webkit-scrollbar-thumb {
  background: #667eea;
  border-radius: 4px;
}
</style>
