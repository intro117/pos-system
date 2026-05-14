# 🏪 POS System

> Sistema de punto de venta completo, modular y personalizable.  
> Funciona en localhost, QA gratuito en la nube y producción con dominio propio.

![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL%2015-336791?logo=postgresql)
![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker)

---

## 📋 Módulos

| Módulo | Descripción |
|---|---|
| 🛒 **POS** | Punto de venta — carrito, cobro, cambio, ticket imprimible |
| 📦 **Inventario** | Entradas, salidas, ajustes y alertas de stock mínimo |
| 💰 **Corte de caja** | Resumen del día, cuadre de efectivo y cierre |
| 🏷️ **Productos** | Catálogo con imágenes, categorías e IVA configurable |
| 👥 **Clientes** | Base de datos con historial de compras y crédito |
| 🚚 **Proveedores** | Contactos y órdenes de compra |
| 📊 **Reportes** | Dashboard con gráficas de ventas y productos |
| ⚙️ **Config** | Logo, colores, IVA, nombre y tipo de negocio |

---

## 🖥️ OPCIÓN 1 — Localhost (desarrollo y demo local)

### Requisitos
- Windows 10/11 con WSL2 (Ubuntu 22.04+)
- Docker Desktop con integración WSL habilitada
- Git

### Instalación en un comando

```bash
git clone https://github.com/TU_USUARIO/pos-system.git
cd pos-system
chmod +x setup_all.sh
bash setup_all.sh
```

### Acceso
| Servicio | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| API REST | http://localhost:8000/api |
| API Docs | http://localhost:8000/docs |
| MinIO | http://localhost:9001 |

### Comandos útiles
```bash
docker compose ps           # ver estado
docker compose logs -f      # ver logs
docker compose down         # apagar
docker compose up -d        # encender
docker compose down -v      # reset completo (borra datos)
```

---

## ☁️ OPCIÓN 2 — QA Gratuito en la nube (Render.com)

Para mostrar demos a clientes sin costo. Servicios usados:
- **Render.com** — backend FastAPI + frontend React (gratis)
- **Render PostgreSQL** — base de datos gratuita

### Paso 1 — Preparar el código

```bash
# Clonar el repo
git clone https://github.com/TU_USUARIO/pos-system.git
cd pos-system
```

### Paso 2 — Crear base de datos en Render

1. Ve a **https://render.com** → Sign up con GitHub
2. **New → PostgreSQL**
   - Name: `pos-system-db`
   - Region: Oregon (US West)
   - Plan: **Free**
3. Clic **Create Database**
4. Copia la **Internal Database URL** (la necesitas en el paso 3)

### Paso 3 — Desplegar el backend

1. **New → Web Service**
2. Connect repo: `pos-system`
3. Configurar:
   ```
   Name:           pos-system-qa
   Root Directory: backend
   Runtime:        Docker
   Plan:           Free
   ```
4. **Environment Variables:**
   ```
   DATABASE_URL    = [Internal Database URL del paso 2]
   MINIO_URL       = http://localhost:9000
   MINIO_ACCESS_KEY = minioadmin
   MINIO_SECRET_KEY = minioadmin123
   ```
5. Clic **Create Web Service**
6. Espera ~3 minutos — anota la URL: `https://pos-system-qa.onrender.com`

### Paso 4 — Actualizar el frontend con la URL del backend

```bash
# En tu terminal WSL, edita frontend/src/utils/api.js
# Cambia la baseURL por tu URL de Render:
# baseURL: 'https://TU-SERVICIO.onrender.com/api'

git add frontend/src/utils/api.js
git commit -m "feat: apuntar frontend a backend de Render"
git push origin main
```

### Paso 5 — Desplegar el frontend

1. **New → Static Site**
2. Connect repo: `pos-system`
3. Configurar:
   ```
   Name:              pos-system-frontend
   Root Directory:    frontend
   Build Command:     npm install --legacy-peer-deps && npm install ajv@^8.12.0 ajv-keywords@^5.1.0 --legacy-peer-deps && npm run build
   Publish Directory: build
   ```
4. **Environment Variables:**
   ```
   CI                  = false
   GENERATE_SOURCEMAP  = false
   ```
5. Clic **Create Static Site**
6. Espera ~5 minutos → tu URL pública estará lista

### Resultado QA
```
Frontend: https://pos-system-frontend-XXXX.onrender.com
Backend:  https://pos-system-qa.onrender.com/api
```

> ⚠️ **Limitación del plan gratuito:** Los servicios se "duermen" después de 15 minutos sin uso. La primera carga tarda ~30 segundos en despertar. Para demos en vivo, abre el link 1 minuto antes.

---

## 🚀 OPCIÓN 3 — Producción con dominio propio (VPS)

Para clientes reales con dominio propio y alta disponibilidad.

### Requisitos
- VPS Ubuntu 22.04 (Hetzner €3.29/mes, DigitalOcean $6/mes, Contabo €4.99/mes)
- Dominio propio (~$10/año en Namecheap o GoDaddy)
- SSL gratuito con Let's Encrypt (Certbot)

### Paso 1 — Configurar el VPS

```bash
# Conectar al VPS por SSH
ssh root@IP_DEL_VPS

# Actualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Instalar Docker Compose
apt install -y docker-compose-plugin git

# Clonar el proyecto
git clone https://github.com/TU_USUARIO/pos-system.git
cd pos-system
```

### Paso 2 — Configurar variables de producción

```bash
# Crear archivo de variables
cat > .env.prod << 'EOF'
POSTGRES_PASSWORD=PASSWORD_MUY_SEGURO_AQUI
MINIO_ROOT_PASSWORD=MINIO_PASSWORD_SEGURO
SECRET_KEY=clave-secreta-larga-aleatoria
EOF

# Levantar sistema
docker compose up -d --build

# Verificar
docker compose ps
curl http://localhost:8000/api/health
```

### Paso 3 — Configurar dominio

En tu proveedor de dominio, agrega un registro DNS:
```
Tipo: A
Nombre: @ (o tu subdominio)
Valor: IP_DE_TU_VPS
TTL: 3600
```

### Paso 4 — Configurar Nginx + SSL

```bash
# Instalar Nginx
apt install -y nginx

# Crear configuración
cat > /etc/nginx/sites-available/pos << 'EOF'
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 10M;
    }
}
EOF

ln -s /etc/nginx/sites-available/pos /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Instalar SSL gratuito
apt install -y certbot python3-certbot-nginx
certbot --nginx -d tudominio.com -d www.tudominio.com
```

### Resultado producción
```
https://tudominio.com       → Dashboard completo
https://tudominio.com/api   → API REST
https://tudominio.com/api/docs → Documentación
```

### Actualizar en producción
```bash
cd pos-system
git pull
docker compose up -d --build
```

---

## 🏗️ Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Backend | FastAPI | 0.110 |
| Base de datos | PostgreSQL | 15 |
| ORM | SQLAlchemy | 2.0 |
| Imágenes | MinIO | Latest |
| Frontend | React | 18.2 |
| Gráficas | Recharts | 2.12 |
| HTTP Client | Axios | 1.6 |
| Servidor web | Nginx | Alpine |
| Contenedores | Docker Compose | 3.8 |

---

## 💰 Costos estimados

| Escenario | Costo | Para qué |
|---|---|---|
| Desarrollo local | **$0** | Desarrollo y pruebas |
| QA en Render | **$0** | Demos a clientes |
| VPS básico + dominio | **~$7-10 USD/mes** | 1 cliente pequeño |
| VPS medio + dominio | **~$15-20 USD/mes** | 2-5 clientes |

---

## 📄 Licencia

MIT — libre para uso personal y comercial.
