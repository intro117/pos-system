# POS System

> Sistema de punto de venta completo, modular y personalizable.
> Funciona en localhost, QA gratuito en la nube y producción con dominio propio.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL%2015-336791?logo=postgresql)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker)](https://www.docker.com)

---

## 📋 Módulos

| Módulo | Admin | Cajero |
|---|---|---|
| 🛒 POS — punto de venta | ✅ | ✅ |
| 💰 Corte de caja | ✅ | ✅ |
| 📦 Inventario | ✅ | ❌ |
| 🏷️ Productos + imágenes | ✅ | ❌ |
| 📂 Categorías (con ícono y color) | ✅ | ❌ |
| 👥 Clientes | ✅ | ❌ |
| 🚚 Proveedores | ✅ | ❌ |
| 📊 Reportes y gráficas | ✅ | ❌ |
| ⚙️ Configuración del negocio | ✅ | ❌ |
| 🔐 Panel de administración | ✅ | ❌ |

---

## Usuarios por defecto

Al iniciar el sistema por primera vez se crean automáticamente:

| Usuario | Password | Rol | Acceso |
|---|---|---|---|
| `admin` | `admin123` | Administrador | Todo el sistema |
| `cajero` | `cajero123` | Cajero | Solo POS y Corte |

> Cambia los passwords por defecto antes de usar en producción.
> Ve a Admin → selecciona el usuario → Cambiar contraseña.

---

## OPCIÓN 1 — Localhost (desarrollo y demo local)

### Requisitos

- Windows 10/11 con WSL2 (Ubuntu 22.04+)
- Docker Desktop con integración WSL habilitada
- Git

### Instalación

```bash
git clone https://github.com/intro117/pos-system.git
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
| MinIO (imágenes) | http://localhost:9001 |

### Comandos útiles

```bash
docker compose ps           # ver estado
docker compose logs -f      # ver logs
docker compose down         # apagar
docker compose up -d        # encender
docker compose down -v      # reset completo (borra datos)
```

---

## OPCIÓN 2 — QA Gratuito en Render.com

### Paso 1 — Crear base de datos PostgreSQL

1. Ve a **https://render.com** → Sign up con GitHub
2. **New → PostgreSQL**
   - Name: `pos-system-db`
   - Region: Oregon
   - Plan: **Free**
3. Copia la **Internal Database URL**

### Paso 2 — Desplegar el backend

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
DATABASE_URL     = [Internal Database URL del paso 1]
MINIO_URL        = http://localhost:9000
MINIO_ACCESS_KEY = minioadmin
MINIO_SECRET_KEY = minioadmin123
SECRET_KEY       = una-clave-secreta-larga-aqui
```
5. Clic **Create Web Service**

> **Nota:** La URL de la DB debe empezar con `postgresql://`. Si Render la entrega como `postgres://`, el sistema la convierte automáticamente.

### Paso 3 — Verificar usuarios

Después del primer deploy, ejecuta:
```bash
curl -X POST https://TU-SERVICIO.onrender.com/api/reset-users-emergency
```

### Paso 4 — Desplegar el frontend

1. Edita `frontend/src/utils/api.js` — cambia `baseURL` a la URL de tu backend
2. **New → Static Site** en Render
3. Configurar:
```
Root Directory:    frontend
Build Command:     npm install --legacy-peer-deps && npm install ajv@^8.12.0 ajv-keywords@^5.1.0 --legacy-peer-deps && npm run build
Publish Directory: build
```
4. Variables:
```
CI                 = false
GENERATE_SOURCEMAP = false
```

> **Limitación del plan gratuito:** Los servicios se duermen tras 15 min sin uso. La primera carga tarda ~30 segundos.

---

## OPCIÓN 3 — Producción con dominio propio (VPS)

### Proveedores recomendados

| Proveedor | Plan | Precio | RAM |
|---|---|---|---|
| **Hetzner** | CX22 | €3.29/mes | 4GB |
| **DigitalOcean** | Droplet | $6/mes | 1GB |
| **Contabo** | VPS S | €4.99/mes | 8GB |

### Setup en VPS Ubuntu 22.04

```bash
# Conectar al VPS
ssh root@IP_DEL_VPS

# Instalar Docker
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin git postgresql-client

# Clonar proyecto
git clone https://github.com/intro117/pos-system.git
cd pos-system

# Levantar
docker compose up -d --build

# Verificar
curl http://localhost:8000/api/health
```

### Nginx + SSL gratuito

```bash
apt install -y nginx certbot python3-certbot-nginx

cat > /etc/nginx/sites-available/pos << 'NGINX'
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        client_max_body_size 10M;
    }
}
NGINX

ln -s /etc/nginx/sites-available/pos /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d tudominio.com -d www.tudominio.com
```

**Resultado:** `https://tudominio.com` con SSL ✓

---

## 🗄️ Respaldo automático de base de datos

El sistema incluye scripts de respaldo automático con `pg_dump`. Funcionan en localhost, VPS y cualquier servidor Linux.

### Configuración rápida (una sola vez)

```bash
bash setup_backup.sh
```

Esto crea los scripts y configura el crontab automáticamente.

### DATABASE_URL según entorno

| Entorno | DATABASE_URL |
|---|---|
| **Localhost** (docker-compose) | `postgresql://posuser:pospass123@localhost:5432/posdb` |
| **VPS / Producción** | `postgresql://usuario:password@localhost:5432/posdb` |
| **Render QA** | URL interna de Render (ver dashboard) |

> En producción, configura `DATABASE_URL` como variable de entorno del sistema o en `/etc/environment` para que el crontab la tome automáticamente.

### Hacer un respaldo manual

```bash
# Localhost
bash ~/pos-system/scripts/backup/backup_db.sh

# Con URL personalizada (producción)
DATABASE_URL="postgresql://usuario:pass@host:5432/db" bash ~/pos-system/scripts/backup/backup_db.sh
```

### Respaldo automático (crontab)

El script `setup_backup.sh` configura automáticamente:

```
# Respaldo diario a las 2:00am
0 2 * * * bash ~/pos-system/scripts/backup/backup_db.sh

# Limpieza de log mensual
0 0 1 * * truncate -s 0 ~/backups/pos-system/backup.log
```

Los respaldos se guardan en `~/backups/pos-system/` (o `/var/backups/pos-system/` si hay permisos) y se eliminan automáticamente después de **30 días**.

### Ver log de respaldos

```bash
cat ~/backups/pos-system/backup.log
ls -lh ~/backups/pos-system/
```

### Restaurar un respaldo

```bash
# Interactivo (te muestra los respaldos disponibles)
bash ~/pos-system/scripts/backup/restore_db.sh

# Con archivo específico
bash ~/pos-system/scripts/backup/restore_db.sh ~/backups/pos-system/pos_20260515_020000.sql.gz
```

> ⚠️ La restauración sobreescribe la base de datos actual. El script pide confirmación antes de proceder.

### Cambiar a producción

Cuando migres de QA a producción, solo cambia la variable `DB_URL_DEFAULT` en `scripts/backup/backup_db.sh`:

```bash
# Línea a editar dentro del script:
DB_URL_DEFAULT="postgresql://tu_usuario:tu_password@localhost:5432/tu_db"
```

---

## 🔧 Stack tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| Backend | FastAPI 0.110 | API REST async |
| Auth | JWT + Werkzeug | Tokens 8h, hashing seguro |
| ORM | SQLAlchemy 2.0 | Migraciones automáticas |
| Base de datos | PostgreSQL 15 | |
| Imágenes | MinIO | S3-compatible, self-hosted |
| Frontend | React 18 | |
| HTTP Client | Axios | Con interceptor JWT |
| Gráficas | Recharts | |
| Servidor web | Nginx Alpine | |
| Contenedores | Docker Compose | |

---

## Login y roles

### Permisos por rol

| Módulo | Admin | Cajero |
|---|---|---|
| 🛒 POS | ✅ | ✅ |
| 💰 Corte de caja | ✅ | ✅ |
| 📦 Inventario | ✅ | ❌ |
| 🏷️ Productos | ✅ | ❌ |
| 📂 Categorías | ✅ | ❌ |
| 👥 Clientes | ✅ | ❌ |
| 🚚 Proveedores | ✅ | ❌ |
| 📊 Reportes | ✅ | ❌ |
| ⚙️ Config | ✅ | ❌ |
| 🔐 Admin | ✅ | ❌ |

---

## 🗑️ Reset de datos (solo Admin)

Disponible en la pestaña **Admin**. Tres opciones con confirmación obligatoria:

| Opción | Qué borra | Qué conserva |
|---|---|---|
| Reset ventas | Ventas, cortes, detalles | Productos, clientes, proveedores |
| Reset inventario | Productos, categorías, movimientos | Ventas, clientes, proveedores |
| Reset total | Todo | Solo usuarios del sistema |

El reset usa `DELETE` con SQLAlchemy en el orden correcto de foreign keys — funciona igual en localhost, QA y producción.

---

## 🛠️ Problemas conocidos y soluciones

### Error: `ajv/dist/compile/codegen` en build de React
```
Causa: Incompatibilidad react-scripts 5 + Node 20
Solución: Usar node:18-alpine en Dockerfile del frontend
          Agregar ajv@^8 en package.json
```

### Error: `307 Temporary Redirect` en rutas de FastAPI
```
Causa: FastAPI redirige /api/config → /api/config/
Solución: Usar / al final en todas las URLs del api.js del frontend
```

### Reset no borra datos en Render (TRUNCATE falla)
```
Causa: TRUNCATE con session_replication_role requiere permisos de superusuario
       que Render no otorga en el plan gratuito
Solución: El sistema usa DELETE con SQLAlchemy en orden correcto de foreign keys
          Funciona en localhost, Render QA y VPS sin cambiar nada
```

### Login da 401 después del primer deploy
```
Causa: Los usuarios por defecto no se crearon correctamente
Solución: Ejecutar el endpoint de emergencia (solo una vez):
curl -X POST https://TU-SERVICIO.onrender.com/api/reset-users-emergency
```

### Error: `postgres://` no reconocido por SQLAlchemy
```
Causa: Render entrega URLs con postgres:// en lugar de postgresql://
Solución: El database.py convierte automáticamente al iniciar
```

### Error: `password cannot be longer than 72 bytes` (bcrypt)
```
Causa: Incompatibilidad de versión de bcrypt en algunos entornos
Solución: El sistema usa werkzeug (pbkdf2:sha256) en lugar de bcrypt
```

### pg_dump: command not found
```
Causa: postgresql-client no está instalado
Solución: sudo apt install -y postgresql-client
```

---

## Costos estimados

| Escenario | Costo | Para qué |
|---|---|---|
| Desarrollo local | **$0** | Desarrollo y pruebas |
| QA en Render | **$0** | Demos a clientes |
| VPS básico + dominio | **~$7-10 USD/mes** | 1 cliente pequeño |
| VPS medio + dominio | **~$15-20 USD/mes** | 2-5 clientes |

---

## Licencia

MIT — libre para uso personal y comercial.

---

*Stack: FastAPI · React 18 · PostgreSQL · Werkzeug · Docker · Nginx*
