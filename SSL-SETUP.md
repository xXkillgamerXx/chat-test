# Guía para Configurar SSL/HTTPS

## Opciones para SSL

### Opción 1: Usar un Dominio con Let's Encrypt (RECOMENDADO) ✅

**Ventajas:**
- Certificado gratuito y válido
- Renovación automática
- Aceptado por todos los navegadores

**Pasos:**

1. **Obtener un dominio:**
   - Gratis: Freenom, No-IP, DuckDNS
   - De pago: Namecheap, GoDaddy, Google Domains
   - Apunta el dominio a la IP pública de tu EC2

2. **En tu servidor AWS, instalar Certbot:**

```bash
# Instalar Certbot
sudo yum install -y certbot python3-certbot-nginx

# O si no está disponible:
sudo yum install -y epel-release
sudo yum install -y certbot python3-certbot-nginx
```

3. **Generar certificados SSL:**

```bash
# Detener nginx temporalmente
docker-compose stop nginx

# Generar certificado (reemplaza tu-dominio.com con tu dominio)
sudo certbot certonly --standalone -d tu-dominio.com

# Los certificados se guardarán en:
# /etc/letsencrypt/live/tu-dominio.com/fullchain.pem
# /etc/letsencrypt/live/tu-dominio.com/privkey.pem
```

4. **Actualizar nginx.conf:**

Edita `nginx/nginx.conf` y cambia:
```nginx
ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
```

5. **Montar certificados en docker-compose.yml:**

```yaml
nginx:
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro  # Montar certificados
```

6. **Actualizar nginx.conf con la ruta correcta:**

```nginx
ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
```

7. **Reiniciar servicios:**

```bash
docker-compose up -d
```

8. **Configurar renovación automática:**

```bash
# Agregar a crontab
sudo crontab -e

# Agregar esta línea (renueva cada 12 horas)
0 */12 * * * certbot renew --quiet && docker-compose restart nginx
```

---

### Opción 2: Cloudflare (SSL Gratis sin dominio propio)

**Ventajas:**
- SSL gratuito
- CDN incluido
- Protección DDoS

**Pasos:**

1. Crear cuenta en Cloudflare
2. Agregar tu sitio (puedes usar un subdominio de Cloudflare)
3. Configurar DNS para apuntar a tu IP
4. Activar SSL/TLS (modo Flexible o Full)
5. Cloudflare maneja el SSL automáticamente

---

### Opción 3: Certificado Autofirmado (Solo desarrollo/testing)

**⚠️ ADVERTENCIA:** Los navegadores mostrarán advertencias de seguridad.

**Pasos:**

1. **Generar certificado autofirmado:**

```bash
# Crear directorio para certificados
mkdir -p nginx/ssl

# Generar certificado (válido por 365 días)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=your-ip-or-domain"
```

2. **Actualizar nginx.conf para usar certificado autofirmado:**

```nginx
ssl_certificate /etc/nginx/ssl/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/privkey.pem;
```

3. **Actualizar docker-compose.yml:**

```yaml
nginx:
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    - ./nginx/ssl:/etc/nginx/ssl:ro
```

---

### Opción 4: AWS Certificate Manager (ACM) + Application Load Balancer

**Ventajas:**
- Integración nativa con AWS
- Certificados gestionados por AWS
- Sin costo adicional para certificados

**Requisitos:**
- Application Load Balancer (ALB)
- Dominio configurado en Route 53

**Pasos:**

1. Crear ALB en AWS
2. Solicitar certificado en ACM
3. Asociar certificado al ALB
4. Configurar listeners (80 → 443)
5. Apuntar ALB a tu EC2

---

## Configuración de Security Group en AWS

Asegúrate de abrir estos puertos:

- **80** (HTTP) - Para redirección a HTTPS
- **443** (HTTPS) - Para tráfico SSL
- **22** (SSH) - Para administración

---

## Actualizar App.vue para usar HTTPS

Si configuraste SSL, actualiza `client/src/App.vue`:

```javascript
const socketUrl = import.meta.env.VITE_SOCKET_URL || 
  `https://${window.location.hostname}`;
```

Y en `docker-compose.yml`:

```yaml
client:
  environment:
    - VITE_SOCKET_URL=https://tu-dominio.com
```

---

## Verificar SSL

```bash
# Verificar certificado
openssl s_client -connect tu-dominio.com:443 -servername tu-dominio.com

# O usar herramienta online
# https://www.ssllabs.com/ssltest/
```

---

## Recomendación

**Para producción:** Usa **Opción 1 (Let's Encrypt con dominio)** - Es gratis, válido y confiable.

**Para desarrollo rápido:** Usa **Opción 2 (Cloudflare)** - Configuración más simple.

