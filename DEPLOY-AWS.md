# Guía para Desplegar Chat en AWS

## Opción 1: EC2 con Docker (Más Simple)

### Paso 1: Comprimir el proyecto

**Desde Windows:**

```powershell
# En la carpeta chat-app
Compress-Archive -Path . -DestinationPath ..\chat-app.zip
```

**O desde Git (si tienes Git instalado):**

```bash
# Crear archivo .tar.gz
tar -czf chat-app.tar.gz .
```

### Paso 2: Subir a AWS EC2

**Opción A: Usar SCP desde Windows PowerShell:**

```powershell
# Subir archivo comprimido
scp -i tu-clave.pem chat-app.zip ec2-user@tu-ip-aws:/home/ec2-user/
```

**Opción B: Usar WinSCP (interfaz gráfica)**

- Descarga WinSCP
- Conecta a tu servidor AWS
- Arrastra la carpeta chat-app

**Opción C: Usar Git (si subiste a GitHub)**

```bash
# En tu servidor AWS
git clone https://github.com/tu-usuario/chat-app.git
cd chat-app
```

### Paso 3: En tu servidor AWS

```bash
# Conectarse a AWS
ssh -i tu-clave.pem ec2-user@tu-ip-aws

# Si subiste .zip, descomprimir:
unzip chat-app.zip
cd chat-app

# Si subiste .tar.gz:
tar -xzf chat-app.tar.gz
cd chat-app

# Instalar Docker (si no está instalado)
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# CERRAR SESIÓN Y RECONECTAR (importante)
exit

# Reconectar
ssh -i tu-clave.pem ec2-user@tu-ip-aws
cd chat-app

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Ejecutar el proyecto
docker-compose up --build -d
```

### Paso 4: Configurar Security Group en AWS

1. Ve a EC2 → Security Groups
2. Selecciona el Security Group de tu instancia
3. Agrega reglas de entrada:
   - Puerto 3000 (TCP) - Para el servidor
   - Puerto 5173 (TCP) - Para el cliente
   - Puerto 22 (SSH) - Si no está ya

### Paso 5: Acceder

- Cliente: `http://tu-ip-publica-aws:5173`
- Servidor: `http://tu-ip-publica-aws:3000`

---

## Opción 2: AWS ECS (Elastic Container Service)

### Requisitos:

- AWS CLI configurado
- Cuenta de AWS con permisos ECS

### Pasos:

1. **Crear repositorio en ECR (Elastic Container Registry):**

```bash
aws ecr create-repository --repository-name chat-server --region us-east-1
aws ecr create-repository --repository-name chat-client --region us-east-1
```

2. **Construir y subir imágenes:**

```bash
# Login a ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin tu-cuenta.dkr.ecr.us-east-1.amazonaws.com

# Construir y etiquetar
docker build -t chat-server ./server
docker build -t chat-client ./client

# Etiquetar para ECR
docker tag chat-server:latest tu-cuenta.dkr.ecr.us-east-1.amazonaws.com/chat-server:latest
docker tag chat-client:latest tu-cuenta.dkr.ecr.us-east-1.amazonaws.com/chat-client:latest

# Subir
docker push tu-cuenta.dkr.ecr.us-east-1.amazonaws.com/chat-server:latest
docker push tu-cuenta.dkr.ecr.us-east-1.amazonaws.com/chat-client:latest
```

3. **Crear cluster y servicio en ECS** (desde la consola AWS o CLI)

---

## Opción 3: AWS App Runner (Más Simple, pero con costo)

1. Sube tu código a GitHub
2. Ve a AWS App Runner
3. Conecta tu repositorio
4. Configura el build y deploy automático

---

## Recomendación

**Para empezar rápido:** Usa la Opción 1 (EC2 con Docker)

- Es la más simple
- Tienes control total
- Funciona igual que en tu PC local

---

## Comandos útiles en AWS

```bash
# Ver logs
docker-compose logs -f

# Detener
docker-compose down

# Reiniciar
docker-compose restart

# Ver contenedores
docker ps

# Ver uso de recursos
docker stats
```

---

## Configurar dominio (Opcional)

Si quieres usar un dominio:

1. Configura un dominio en Route 53 o cualquier proveedor
2. Apunta el dominio a la IP de tu EC2
3. Usa Nginx como reverse proxy:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Monitoreo y Mantenimiento

```bash
# Ver logs del servidor
docker logs chat-server -f

# Ver logs del cliente
docker logs chat-client -f

# Reiniciar si hay problemas
docker-compose restart

# Actualizar código
git pull  # Si usas Git
docker-compose up --build -d
```
