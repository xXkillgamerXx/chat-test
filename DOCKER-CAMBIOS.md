# Guía: Cambiar Código y Variables en Docker

## 📋 Resumen Rápido

| Tipo de Cambio                 | Requiere Rebuild? | Comando                        |
| ------------------------------ | ----------------- | ------------------------------ |
| **Variables de entorno**       | ❌ NO             | `docker-compose restart`       |
| **Código del servidor**        | ✅ SÍ             | `docker-compose up --build -d` |
| **Código del cliente**         | ✅ SÍ             | `docker-compose up --build -d` |
| **Con volúmenes (desarrollo)** | ❌ NO             | Solo `docker-compose restart`  |

---

## 🔄 Opción 1: Cambiar Variables de Entorno (SIN Rebuild)

Las variables de entorno se pueden cambiar **sin reconstruir** las imágenes.

### Pasos:

1. **Editar `docker-compose.yml`:**

```yaml
services:
  server:
    environment:
      - NODE_ENV=production
      - PORT=3000
      # Agrega tus variables aquí

  client:
    environment:
      - VITE_SOCKET_URL=http://52.91.54.129:3000
      # Agrega tus variables aquí
```

2. **Reiniciar los contenedores:**

```bash
docker-compose restart
# O si quieres reiniciar solo uno:
docker-compose restart server
docker-compose restart client
```

**✅ Ventaja:** Muy rápido, no requiere rebuild.

---

## 🔨 Opción 2: Cambiar Código (CON Rebuild)

Si cambias código fuente, necesitas reconstruir las imágenes.

### Pasos:

1. **Actualizar código:**

```bash
# Si usas Git
git pull

# O edita los archivos directamente
nano server/server.js
nano client/src/App.vue
```

2. **Reconstruir y reiniciar:**

```bash
# Reconstruir todo
docker-compose up --build -d

# O solo un servicio
docker-compose up --build -d server
docker-compose up --build -d client
```

**⏱️ Tiempo:** Depende del tamaño del proyecto (1-5 minutos).

---

## 🚀 Opción 3: Desarrollo con Volúmenes (SIN Rebuild)

Para desarrollo, puedes montar el código como volumen para cambios en tiempo real.

### Crear `docker-compose.dev.yml`:

```yaml
services:
  server:
    image: chat-test-server
    build: ./server
    container_name: chat-server
    ports:
      - "3000:3000"
    volumes:
      # Montar código para cambios en tiempo real
      - ./server:/app
      - /app/node_modules # Excluir node_modules
    environment:
      - NODE_ENV=development
    networks:
      - chat-network
    restart: unless-stopped
    # Hot reload con nodemon
    command: npm run dev

  client:
    image: chat-test-client
    build: ./client
    container_name: chat-client
    ports:
      - "5173:5173"
    volumes:
      # Montar código para cambios en tiempo real
      - ./client:/app
      - /app/node_modules # Excluir node_modules
    depends_on:
      - server
    networks:
      - chat-network
    restart: unless-stopped

networks:
  chat-network:
    driver: bridge
```

### Usar modo desarrollo:

```bash
# Usar docker-compose.dev.yml
docker-compose -f docker-compose.dev.yml up -d

# Los cambios se reflejan automáticamente (hot reload)
```

**✅ Ventaja:** Cambios instantáneos, sin rebuild.

---

## 📝 Ejemplos Prácticos

### Ejemplo 1: Cambiar URL del Socket

**Sin rebuild (solo variable de entorno):**

1. Editar `docker-compose.yml`:

```yaml
client:
  environment:
    - VITE_SOCKET_URL=http://nueva-ip:3000
```

2. Reiniciar:

```bash
docker-compose restart client
```

### Ejemplo 2: Cambiar Puerto del Servidor

**Con rebuild (cambio de código):**

1. Editar `server/server.js`:

```javascript
const PORT = process.env.PORT || 4000; // Cambiar de 3000 a 4000
```

2. Editar `docker-compose.yml`:

```yaml
server:
  ports:
    - "4000:4000" # Cambiar puerto
```

3. Reconstruir:

```bash
docker-compose up --build -d
```

### Ejemplo 3: Agregar Nueva Variable de Entorno

**Sin rebuild:**

1. Editar `docker-compose.yml`:

```yaml
server:
  environment:
    - NODE_ENV=production
    - API_KEY=tu-api-key # Nueva variable
```

2. Reiniciar:

```bash
docker-compose restart server
```

---

## 🔍 Verificar Cambios

### Ver logs en tiempo real:

```bash
# Todos los servicios
docker-compose logs -f

# Solo un servicio
docker-compose logs -f server
docker-compose logs -f client
```

### Ver variables de entorno activas:

```bash
# Ver variables del contenedor
docker exec chat-server env
docker exec chat-client env
```

### Verificar que el código cambió:

```bash
# Ver contenido del archivo en el contenedor
docker exec chat-server cat /app/server.js
```

---

## ⚡ Comandos Útiles

```bash
# Reiniciar sin rebuild (solo variables de entorno)
docker-compose restart

# Reconstruir y reiniciar (cambios de código)
docker-compose up --build -d

# Ver estado
docker-compose ps

# Detener todo
docker-compose down

# Ver logs
docker-compose logs -f

# Entrar al contenedor
docker exec -it chat-server sh
docker exec -it chat-client sh

# Limpiar imágenes viejas
docker system prune -a
```

---

## 🎯 Recomendaciones

1. **Para producción:** Usa rebuild completo para asegurar consistencia
2. **Para desarrollo:** Usa volúmenes con `docker-compose.dev.yml`
3. **Para cambios rápidos:** Variables de entorno + restart
4. **Siempre verifica:** Revisa logs después de cambios

---

## ❓ Preguntas Frecuentes

### ¿Puedo cambiar código sin rebuild?

Solo si usas volúmenes (modo desarrollo). En producción, siempre rebuild.

### ¿Los cambios en variables de entorno requieren rebuild?

No, solo `docker-compose restart`.

### ¿Cuánto tarda un rebuild?

Depende del proyecto: 1-5 minutos normalmente.

### ¿Puedo cambiar solo un servicio?

Sí: `docker-compose up --build -d nombre-servicio`

### ¿Cómo sé si necesito rebuild?

- **SÍ rebuild:** Cambios en código fuente (.js, .vue, .html, etc.)
- **NO rebuild:** Solo cambios en variables de entorno o docker-compose.yml
