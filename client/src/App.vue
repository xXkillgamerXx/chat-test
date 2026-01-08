<template>
  <!-- Wrapper principal con fondo gradiente -->
  <div class="min-h-screen h-screen md:h-auto bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center p-0 md:p-4">
    <!-- Contenedor principal del chat -->
    <div class="w-full h-full md:h-[90vh] md:max-w-2xl md:rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
      
      <!-- Header -->
      <header class="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 md:py-4 flex-shrink-0">
        <h1 class="text-lg md:text-2xl font-bold text-center mb-1">💬 Chat Simple</h1>
        <div v-if="nombreUsuario" class="text-xs md:text-sm text-center opacity-90">
          Conectado como: <span class="font-semibold">{{ nombreUsuario }}</span>
        </div>
      </header>

      <!-- Formulario de login -->
      <div v-if="!nombreUsuario" class="flex-1 flex items-center justify-center px-4 py-8">
        <div class="w-full max-w-md space-y-4">
          <input
            v-model="nombreInput"
            @keyup.enter="unirseAlChat"
            type="text"
            placeholder="Ingresa tu nombre"
            class="w-full px-4 py-3 md:py-4 text-base md:text-lg border-2 border-purple-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
          <button
            @click="unirseAlChat"
            class="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 md:py-4 px-6 rounded-xl text-base md:text-lg hover:from-purple-700 hover:to-pink-700 active:scale-95 transition-all shadow-lg"
          >
            Unirse al Chat
          </button>
        </div>
      </div>

      <!-- Área de chat -->
      <div v-else class="flex-1 flex flex-col overflow-hidden min-h-0">
        <!-- Contenedor de mensajes -->
        <div
          ref="mensajesContainer"
          class="flex-1 overflow-y-auto px-3 md:px-4 py-4 bg-gray-50"
          style="-webkit-overflow-scrolling: touch; overscroll-behavior: contain;"
        >
          <!-- Mensajes -->
          <div
            v-for="(mensaje, index) in mensajes"
            :key="index"
            :class="[
              'mb-3 flex',
              mensaje.id === socketId ? 'justify-end' : 'justify-start'
            ]"
          >
            <div
              :class="[
                'max-w-[75%] md:max-w-[60%] rounded-2xl px-3 py-2 shadow-sm',
                mensaje.id === socketId
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'
              ]"
            >
              <!-- Header del mensaje -->
              <div class="flex items-center justify-between gap-2 mb-1">
                <span
                  :class="[
                    'text-xs font-semibold',
                    mensaje.id === socketId ? 'text-white' : 'text-purple-600'
                  ]"
                >
                  {{ mensaje.nombre }}
                </span>
                <span
                  :class="[
                    'text-[10px] md:text-xs opacity-70 whitespace-nowrap',
                    mensaje.id === socketId ? 'text-white' : 'text-gray-500'
                  ]"
                >
                  {{ formatearFecha(mensaje.timestamp) }}
                </span>
              </div>
              
              <!-- Texto del mensaje -->
              <div
                :class="[
                  'text-sm md:text-base break-words',
                  mensaje.id === socketId ? 'text-white' : 'text-gray-800'
                ]"
              >
                {{ mensaje.mensaje }}
              </div>
            </div>
          </div>

          <!-- Indicador de usuario escribiendo -->
          <div
            v-if="usuarioEscribiendo"
            class="mb-3 flex justify-start"
          >
            <div class="bg-white rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm border border-gray-200">
              <p class="text-sm text-gray-500 italic">
                {{ usuarioEscribiendo }} está escribiendo...
              </p>
            </div>
          </div>
        </div>

        <!-- Input de mensaje - SIEMPRE VISIBLE -->
        <div class="bg-white border-t border-gray-200 px-3 md:px-4 py-2 md:py-3 flex-shrink-0">
          <div class="flex gap-2 items-end">
            <input
              v-model="nuevoMensaje"
              @keyup.enter="enviarMensaje"
              @input="usuarioEstaEscribiendo"
              type="text"
              placeholder="Escribe un mensaje..."
              class="flex-1 px-4 py-2 md:py-3 text-base border-2 border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
            <button
              @click="enviarMensaje"
              :disabled="!nuevoMensaje.trim()"
              class="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2 md:py-3 px-4 md:px-6 rounded-full min-w-[70px] md:min-w-[80px] hover:from-purple-700 hover:to-pink-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm md:text-base flex-shrink-0"
            >
              Enviar
            </button>
          </div>
        </div>
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
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Determinar la URL del servidor
    let socketUrl = import.meta.env.VITE_SOCKET_URL;

    // Si VITE_SOCKET_URL está definida pero es localhost, ignorarla en producción
    if (socketUrl && socketUrl.includes("localhost")) {
      const isLocal =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.startsWith("172.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("192.168.");

      // Solo usar localhost si realmente estamos en localhost
      if (!isLocal) {
        socketUrl = null; // Forzar detección automática
      }
    }

    if (!socketUrl) {
      // Si estamos en localhost o IP privada, usar localhost para el servidor
      const isLocal =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.startsWith("172.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("192.168.");

      if (isLocal) {
        socketUrl = "http://localhost:3000";
      } else {
        // En producción/AWS, usar el mismo protocolo y hostname
        const useHttps =
          protocol === "https:" ||
          window.location.port === "443" ||
          (!window.location.port && protocol === "https:");

        const socketProtocol = useHttps ? "https:" : "http:";
        socketUrl = `${socketProtocol}//${hostname}:3000`;
      }
    }

    console.log("🔌 Conectando a:", socketUrl);

    this.socket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      // Opciones para móviles - intentar polling primero, luego upgrade a websocket
      transports: ["polling", "websocket"],
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
