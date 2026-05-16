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
| 📂 Categorías (ícono, color, soft-delete) | ✅ | ❌ |
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

> Cambia los passwords antes de usar en producción: Admin → selecciona usuario → Cambiar contraseña.

---

## Permisos por rol

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

## OPCIÓN 1 — Localhost (WSL2 + Docker)

### Requisitos

- Windows 10/11 con WSL2 (Ubuntu 22.04+)
- Docker Desktop con integración WSL habilitada
- Git

> **Importante:** trabaja siempre como tu usuario normal (no root). Configura WSL para arrancar con tu usuario:
> ```powershell
> # En PowerShell de Windows:
> ubuntu config --default-user tu_usuario
> ```

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
docker compose logs -f      # ver logs en tiempo real
docker compose down         # apagar
docker compose up -d        # encender
docker compose down -v      # reset completo (borra todos los datos)
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

1. **New → Web Service** → conecta el repo `pos-system`
2. Configurar:
```
Name:           pos-system-qa
Root Directory: backend
Runtime:        Docker
Plan:           Free
```
3. **Environment Variables:**
```
DATABASE_URL     = [Internal Database URL del paso 1]
MINIO_URL        = http://localhost:9000
MINIO_ACCESS_KEY = minioadmin
MINIO_SECRET_KEY = minioadmin123
SECRET_KEY       = una-clave-secreta-larga-aqui
```
4. Clic **Create Web Service**

> Si Render entrega la URL como `postgres://`, el sistema la convierte a `postgresql://` automáticamente.

### Paso 3 — Crear usuarios por defecto

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
4. Variables de entorno:
```
CI                 = false
GENERATE_SOURCEMAP = false
```

> Los servicios gratuitos se duermen tras 15 min sin uso. La primera carga tarda ~30 segundos.

---

## OPCIÓN 3 — Producción en VPS Ubuntu 22.04

### Proveedores recomendados

| Proveedor | Plan | Precio | RAM |
|---|---|---|---|
| **Hetzner** | CX22 | €3.29/mes | 4GB |
| **DigitalOcean** | Droplet | $6/mes | 1GB |
| **Contabo** | VPS S | €4.99/mes | 8GB |

### Instalación

```bash
# 1. Conectar al VPS
ssh root@IP_DEL_VPS

# 2. Instalar dependencias
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin git postgresql-client

# 3. Clonar y levantar
git clone https://github.com/intro117/pos-system.git
cd pos-system
docker compose up -d --build

# 4. Verificar
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

Sistema de respaldo automático con `pg_dump`, comprimido en `.gz`. Funciona en localhost, VPS y cualquier servidor Linux sin dependencias externas.

### Archivos del sistema

| Archivo | Descripción |
|---|---|
| `setup_backup.sh` | Configura todo (ejecutar una sola vez) |
| `scripts/backup/backup_db.sh` | Ejecuta el respaldo con pg_dump |
| `scripts/backup/restore_db.sh` | Restaura un respaldo con confirmación |
| `~/backups/pos-system/` | Carpeta donde se guardan los `.sql.gz` |
| `~/backups/pos-system/backup.log` | Log de cada respaldo ejecutado |

Los respaldos se nombran con fecha y hora (`pos_20260515_020001.sql.gz`) y se eliminan automáticamente después de **30 días**.

---

### Localhost — paso a paso

**Requisito previo**
```bash
sudo apt install -y postgresql-client
pg_dump --version   # verificar instalación
```

**Paso 1 — Configurar el sistema de respaldos**
```bash
cd ~/pos-system
chmod +x setup_backup.sh
bash setup_backup.sh
```

Esto hace automáticamente:
- Crea `scripts/backup/backup_db.sh` y `restore_db.sh`
- Detecta el directorio de respaldos con permisos adecuados
- Configura el crontab para respaldo diario a las 2:00am

**Paso 2 — Probar respaldo manual**
```bash
bash ~/pos-system/scripts/backup/backup_db.sh
```

Salida esperada:
```
✓ Respaldo guardado: /home/tu_usuario/backups/pos-system/pos_20260515_143022.sql.gz (24K)
```

**Paso 3 — Ver respaldos y log**
```bash
ls -lh ~/backups/pos-system/
cat ~/backups/pos-system/backup.log
```

**Paso 4 — Verificar crontab**
```bash
crontab -l
```

Debe mostrar:
```
# POS System — Respaldo automático PostgreSQL
0 2 * * * BACKUP_DIR=... bash .../backup_db.sh >> .../cron.log 2>&1
0 0 1 * * truncate -s 0 .../backup.log
```

**Paso 5 — Restaurar un respaldo**
```bash
# Interactivo — muestra los disponibles y pide confirmación
bash ~/pos-system/scripts/backup/restore_db.sh

# Con archivo específico
bash ~/pos-system/scripts/backup/restore_db.sh ~/backups/pos-system/pos_20260515_143022.sql.gz
```

> ⚠️ La restauración sobreescribe la base de datos actual. El script pide escribir `SI` para confirmar.

---

### VPS Ubuntu — paso a paso

**Requisito previo**
```bash
sudo apt install -y postgresql-client
pg_dump --version
```

**Paso 1 — Configurar respaldos**
```bash
cd ~/pos-system
chmod +x setup_backup.sh
bash setup_backup.sh
```

**Paso 2 — Cambiar DATABASE_URL a producción**
```bash
nano ~/pos-system/scripts/backup/backup_db.sh
```

Edita esta línea:
```bash
# ANTES (localhost docker-compose):
DB_URL_DEFAULT="postgresql://posuser:pospass123@localhost:5432/posdb"

# DESPUÉS (tus credenciales reales del VPS):
DB_URL_DEFAULT="postgresql://tu_usuario:tu_password@localhost:5432/tu_db"
```

> Las credenciales están en `docker-compose.yml` bajo `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

**Paso 3 — Probar conexión**
```bash
bash ~/pos-system/scripts/backup/backup_db.sh
```

Si da error, verifica que PostgreSQL esté corriendo:
```bash
docker compose ps
```

**Paso 4 — (Opcional) DATABASE_URL como variable global**
```bash
echo 'export DATABASE_URL="postgresql://usuario:password@localhost:5432/posdb"' >> /etc/environment
source /etc/environment
```

**Paso 5 — Verificar respaldos automáticos**
```bash
crontab -l
bash ~/pos-system/scripts/backup/backup_db.sh
cat ~/backups/pos-system/backup.log
```

---

### DATABASE_URL por entorno

| Entorno | DATABASE_URL |
|---|---|
| **Localhost** (docker-compose) | `postgresql://posuser:pospass123@localhost:5432/posdb` |
| **VPS / Producción** | `postgresql://tu_usuario:tu_password@localhost:5432/tu_db` |
| **Render QA** | URL interna del dashboard de Render |

### Comandos rápidos

```bash
# Respaldo manual
bash ~/pos-system/scripts/backup/backup_db.sh

# Respaldo con URL distinta (sin editar el script)
DATABASE_URL="postgresql://usuario:pass@host:5432/db" bash ~/pos-system/scripts/backup/backup_db.sh

# Ver respaldos guardados
ls -lh ~/backups/pos-system/pos_*.sql.gz

# Ver log
cat ~/backups/pos-system/backup.log

# Restaurar
bash ~/pos-system/scripts/backup/restore_db.sh ~/backups/pos-system/pos_YYYYMMDD_HHMMSS.sql.gz
```

---

## 🗑️ Reset de datos (solo Admin)

Disponible en la pestaña **Admin**. Tres opciones con confirmación obligatoria:

| Opción | Qué borra | Qué conserva |
|---|---|---|
| Reset ventas | Ventas, cortes, detalles | Productos, clientes, proveedores |
| Reset inventario | Productos, categorías, movimientos | Ventas, clientes, proveedores |
| Reset total | Todo | Solo usuarios del sistema |

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

## 🛠️ Problemas conocidos y soluciones

### `ajv/dist/compile/codegen` en build de React
```
Causa: Incompatibilidad react-scripts 5 + Node 20
Solución: Usar node:18-alpine en Dockerfile del frontend
          Agregar ajv@^8 en package.json
```

### `307 Temporary Redirect` en rutas de FastAPI
```
Causa: FastAPI redirige /api/config → /api/config/
Solución: Usar / al final en todas las URLs del api.js del frontend
```

### Reset no borra datos en Render (TRUNCATE falla)
```
Causa: TRUNCATE requiere permisos de superusuario (no disponibles en Render free)
Solución: El sistema usa DELETE con SQLAlchemy en orden correcto de foreign keys
          Funciona igual en localhost, Render QA y VPS
```

### Login da 401 después del primer deploy
```
Causa: Usuarios por defecto no se crearon correctamente
Solución: curl -X POST https://TU-SERVICIO.onrender.com/api/reset-users-emergency
```

### `postgres://` no reconocido por SQLAlchemy
```
Causa: Render entrega URLs con postgres:// en vez de postgresql://
Solución: El database.py convierte automáticamente al iniciar
```

### `password cannot be longer than 72 bytes` (bcrypt)
```
Causa: Incompatibilidad de versión de bcrypt en algunos entornos
Solución: El sistema usa werkzeug (pbkdf2:sha256) en lugar de bcrypt
```

### `pg_dump: command not found`
```
Solución: sudo apt install -y postgresql-client
```

### Respaldo da error de conexión en VPS
```
Causa: Credenciales incorrectas o PostgreSQL no está corriendo
Solución: Verificar docker compose ps y revisar DB_URL_DEFAULT en backup_db.sh
```

### Permission denied al hacer git commit
```
Causa: El repo fue clonado o modificado como root
Solución: sudo chown -R tu_usuario:tu_usuario ~/pos-system
```

### WSL abre sesión como root en vez de tu usuario
```
Solución (PowerShell en Windows):
ubuntu config --default-user tu_usuario
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
