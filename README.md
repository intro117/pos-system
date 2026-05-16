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

# Copiar el archivo de variables de entorno
cp .env.example .env
# Editar .env con tus valores (opcional para localhost, los defaults funcionan)

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

Render permite desplegar el backend y el frontend de forma gratuita. El proceso toma unos 10-15 minutos la primera vez.

> **Cuenta necesaria:** Entra a https://render.com y regístrate con tu cuenta de GitHub. No requiere tarjeta de crédito para el plan gratuito.

---

### Paso 1 — Crear la base de datos PostgreSQL

1. Una vez dentro de Render, haz clic en el botón **New +** (esquina superior derecha)
2. Selecciona **PostgreSQL**
3. Llena los campos así:

| Campo | Valor |
|---|---|
| Name | `pos-system-db` |
| Region | `Oregon (US West)` |
| PostgreSQL Version | `15` |
| Plan | `Free` |

4. Haz clic en **Create Database** y espera ~1 minuto
5. Una vez creada, busca la sección **Connections** en la página de la DB
6. Copia el valor de **Internal Database URL** — se verá así:
   ```
   postgresql://posuser:AbCdEf123@dpg-xxxxx-a/posdb
   ```
   > Guarda esta URL, la necesitarás en el siguiente paso.

---

### Paso 2 — Desplegar el backend (API)

1. Haz clic en **New +** → **Web Service**
2. En la pantalla de selección de repo, elige **intro117/pos-system**
3. Llena la configuración:

| Campo | Valor |
|---|---|
| Name | `pos-system-qa` |
| Region | `Oregon (US West)` |
| Root Directory | `backend` |
| Runtime | `Docker` |
| Plan | `Free` |

4. Baja hasta la sección **Environment Variables** y agrega estas variables una por una:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La Internal Database URL del Paso 1 |
| `MINIO_URL` | `http://localhost:9000` |
| `MINIO_ACCESS_KEY` | `minioadmin` |
| `MINIO_SECRET_KEY` | `minioadmin123` |
| `SECRET_KEY` | Genera con: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `ALLOWED_ORIGINS` | La URL de tu frontend en Render (la obtienes en el Paso 5) |
| `EMERGENCY_KEY` | Genera con: `python3 -c "import secrets; print(secrets.token_hex(16))"` |

5. Haz clic en **Create Web Service**
6. Render comenzará a construir el contenedor. Verás los logs en tiempo real — espera hasta ver:
   ```
   Your service is live 🎉
   ```
7. Copia la URL de tu servicio — se verá así:
   ```
   https://pos-system-qa.onrender.com
   ```

> Si la URL de la DB empieza con `postgres://` (sin `ql`), no te preocupes — el sistema lo corrige automáticamente.

---

### Paso 3 — Crear los usuarios por defecto

El primer deploy no crea los usuarios automáticamente. Ejecuta este comando **una sola vez** (reemplaza la URL y la clave):

```bash
curl -X POST https://pos-system-qa.onrender.com/api/reset-users-emergency \
     -H "X-Emergency-Key: tu-emergency-key-aqui"
```

Si responde con un mensaje de éxito, ya puedes iniciar sesión con `admin / admin123`.

> Si el servicio está dormido, la primera petición puede tardar 30-60 segundos. Espera y vuelve a intentarlo.

---

### Paso 4 — Conectar el frontend con el backend

Antes de desplegar el frontend, actualiza la URL del backend en el código:

1. Abre el archivo `frontend/src/utils/api.js` en tu editor
2. Busca la línea que dice `baseURL` y cámbiala:

```javascript
// ANTES:
baseURL: 'http://localhost:8000/api',

// DESPUÉS (pon tu URL real de Render):
baseURL: 'https://pos-system-qa.onrender.com/api',
```

3. Guarda el archivo y haz commit:

```bash
git add frontend/src/utils/api.js
git commit -m "config: apuntar frontend a backend de Render QA"
git push origin main
```

---

### Paso 5 — Desplegar el frontend

1. En Render, haz clic en **New +** → **Static Site**
2. Selecciona el repo **intro117/pos-system**
3. Llena la configuración:

| Campo | Valor |
|---|---|
| Name | `pos-system-frontend` |
| Root Directory | `frontend` |
| Build Command | `npm install --legacy-peer-deps && npm install ajv@^8.12.0 ajv-keywords@^5.1.0 --legacy-peer-deps && npm run build` |
| Publish Directory | `build` |

4. Agrega estas variables de entorno:

| Variable | Valor |
|---|---|
| `CI` | `false` |
| `GENERATE_SOURCEMAP` | `false` |

5. Haz clic en **Create Static Site**
6. El build tarda ~3-5 minutos. Al terminar verás la URL del frontend:
   ```
   https://pos-system-frontend.onrender.com
   ```

---

### Paso 6 — Actualizar ALLOWED_ORIGINS con la URL del frontend

Una vez que tengas la URL real del frontend, regresa al backend en Render y actualiza la variable:

1. Render → **pos-system-qa** → **Environment**
2. Edita `ALLOWED_ORIGINS` con la URL exacta de tu frontend (sin `/` al final):
   ```
   https://pos-system-frontend-xxxx.onrender.com,http://localhost:3000
   ```
3. Haz clic en **Save Changes** → Render redesplegará automáticamente

---

### Verificar que todo funciona

Abre la URL del frontend en el navegador e inicia sesión con `admin / admin123`. Si ves el dashboard, el despliegue fue exitoso ✅

> **Limitación del plan gratuito:** Los servicios se "duermen" si no reciben tráfico por 15 minutos. La primera carga después de inactividad tarda ~30 segundos. Esto es normal en el plan gratuito.

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

# 3. Clonar el proyecto
git clone https://github.com/intro117/pos-system.git
cd pos-system

# 4. Configurar variables de entorno
cp .env.example .env
nano .env   # editar con tus valores reales de producción

# 5. Levantar
docker compose up -d --build

# 6. Verificar
curl http://localhost:8000/api/health
```

### Variables de entorno para producción

Edita el archivo `.env` con valores seguros:

```bash
# Generar claves seguras
python3 -c "import secrets; print(secrets.token_hex(32))"   # para SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(16))"   # para EMERGENCY_KEY
```

Las variables más importantes a cambiar en `.env`:

```
POSTGRES_PASSWORD=password-seguro-aqui
MINIO_ROOT_PASSWORD=password-seguro-aqui
MINIO_SECRET_KEY=password-seguro-aqui
MINIO_PUBLIC_URL=http://tudominio.com:9000
SECRET_KEY=clave-larga-y-aleatoria-de-64-caracteres
ALLOWED_ORIGINS=https://tudominio.com,https://www.tudominio.com
EMERGENCY_KEY=clave-aleatoria-para-emergencias
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

## 🔐 Variables de entorno

El sistema usa un archivo `.env` para todas las configuraciones sensibles. Este archivo **nunca sube a GitHub** (está en `.gitignore`).

### Configuración inicial

```bash
cp .env.example .env
```

### Variables por entorno

| Variable | Localhost | Render QA | VPS Producción |
|---|---|---|---|
| `DATABASE_URL` | automática (docker-compose) | Internal URL de Render | `postgresql://user:pass@localhost:5432/db` |
| `SECRET_KEY` | cualquier valor | generar aleatoria | generar aleatoria |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | URL del frontend en Render | `https://tudominio.com` |
| `EMERGENCY_KEY` | cualquier valor | generar aleatoria | generar aleatoria |
| `MINIO_PUBLIC_URL` | `http://localhost:9000` | no aplica | `http://tudominio.com:9000` |

### Generar claves seguras

```bash
# SECRET_KEY (64 caracteres)
python3 -c "import secrets; print(secrets.token_hex(32))"

# EMERGENCY_KEY (32 caracteres)
python3 -c "import secrets; print(secrets.token_hex(16))"
```

### Usar el endpoint de emergencia

El endpoint `/api/reset-users-emergency` ahora requiere un header de autenticación:

```bash
# Localhost
curl -X POST http://localhost:8000/api/reset-users-emergency \
     -H "X-Emergency-Key: $(grep EMERGENCY_KEY .env | cut -d= -f2)"

# Render QA
curl -X POST https://pos-system-qa.onrender.com/api/reset-users-emergency \
     -H "X-Emergency-Key: tu-emergency-key"
```

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

> Las credenciales están en tu archivo `.env` bajo `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

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

---

### ❌ El frontend no carga o muestra pantalla en blanco

**Síntoma:** Abres la URL del frontend y ves una pantalla blanca o error de red en el navegador.

**Causa:** El frontend no puede conectarse al backend porque `baseURL` en `api.js` apunta a `localhost`.

**Solución:**
1. Abre `frontend/src/utils/api.js`
2. Cambia `baseURL`:
   ```javascript
   baseURL: 'https://pos-system-qa.onrender.com/api',
   ```
3. Guarda, haz commit y push:
   ```bash
   git add frontend/src/utils/api.js
   git commit -m "fix: corregir baseURL del frontend"
   git push origin main
   ```

---

### ❌ Login da error 401 tras el primer deploy

**Síntoma:** Intentas entrar con `admin / admin123` y dice credenciales incorrectas.

**Causa:** Los usuarios por defecto no se crearon al iniciar el servidor.

**Solución:**
```bash
curl -X POST https://pos-system-qa.onrender.com/api/reset-users-emergency \
     -H "X-Emergency-Key: tu-emergency-key"
```
Espera la respuesta (puede tardar 30-60 seg si el servicio está dormido) e intenta iniciar sesión nuevamente.

---

### ❌ Error de CORS — el frontend no puede llamar al backend

**Síntoma:** En la consola del navegador (F12) ves errores como:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Causa:** La URL del frontend no está en la lista `ALLOWED_ORIGINS` del backend.

**Solución:**
1. Ve a Render → tu backend → **Environment**
2. Edita o agrega `ALLOWED_ORIGINS` con la URL exacta de tu frontend (sin `/` al final):
   ```
   https://tu-frontend.onrender.com,http://localhost:3000
   ```
3. Haz **Save Changes** — Render redesplegará automáticamente
4. Espera ~2 minutos y recarga el frontend

> El preflight OPTIONS debe incluir el header `Access-Control-Request-Headers`. Si el problema persiste, verifica que el frontend esté enviando `authorization` y `content-type` en las peticiones.

---

### ❌ Build de React falla con error `ajv/dist/compile/codegen`

**Síntoma:** En los logs de Render ves:
```
Cannot find module 'ajv/dist/compile/codegen'
```

**Causa:** Incompatibilidad entre `react-scripts 5` y Node.js 20+.

**Solución:**
1. Verifica que el Dockerfile del frontend use `node:18-alpine`
2. Verifica que el Build Command en Render sea:
   ```
   npm install --legacy-peer-deps && npm install ajv@^8.12.0 ajv-keywords@^5.1.0 --legacy-peer-deps && npm run build
   ```
3. Guarda y haz push para que Render redespliege

---

### ❌ Las rutas de la API dan `307 Temporary Redirect`

**Síntoma:** Algunas llamadas al backend redirigen en lugar de responder. Ves errores en la consola del navegador.

**Causa:** FastAPI redirige rutas sin `/` al final. Ejemplo: `/api/config` → `/api/config/`.

**Solución:**
1. Abre `frontend/src/utils/api.js`
2. Asegúrate de que todas las rutas terminen con `/`:
   ```javascript
   api.get('/config/')   // ✅ correcto
   api.get('/config')    // ❌ incorrecto
   ```
3. Haz commit y push

---

### ❌ El reset de datos no borra nada en Render

**Síntoma:** Haces reset desde Admin pero los datos siguen apareciendo.

**Causa:** `TRUNCATE` requiere permisos de superusuario que Render no otorga en plan gratuito.

**Solución:** El sistema ya usa `DELETE` con SQLAlchemy. Si el problema persiste, asegúrate de tener la versión más reciente:
```bash
git pull origin main
```
Y en Render haz un **Manual Deploy** desde el dashboard del servicio.

---

### ❌ `pg_dump: command not found`

**Síntoma:**
```
ERROR: pg_dump no encontrado.
```

**Solución:**
```bash
sudo apt install -y postgresql-client
pg_dump --version   # verificar que quedó instalado
```

---

### ❌ El respaldo da error de conexión en VPS

**Síntoma:** El script corre pero termina con error y no genera el archivo `.sql.gz`.

**Causa:** Credenciales incorrectas o PostgreSQL no está corriendo.

**Solución:**
1. Verifica que los contenedores estén corriendo:
   ```bash
   docker compose ps
   ```
2. Si PostgreSQL no está activo, levántalo:
   ```bash
   docker compose up -d
   ```
3. Verifica las credenciales en tu `.env`:
   ```bash
   cat ~/pos-system/.env | grep POSTGRES
   ```
4. Edita el script con las credenciales correctas:
   ```bash
   nano ~/pos-system/scripts/backup/backup_db.sh
   ```

---

### ❌ `Permission denied` al hacer `git commit` o editar archivos

**Síntoma:**
```
fatal: could not open '.git/COMMIT_EDITMSG': Permission denied
```

**Causa:** El repo fue clonado o modificado como `root`.

**Solución:**
```bash
# Reemplaza "tu_usuario" con tu usuario real (ej: osiris)
sudo chown -R tu_usuario:tu_usuario ~/pos-system
```

---

### ❌ WSL siempre abre sesión como root

**Síntoma:** Cada vez que abres WSL entras como `root`.

**Solución:** En PowerShell de Windows ejecuta:
```powershell
ubuntu config --default-user tu_usuario
```
Cierra y vuelve a abrir WSL.

---

### ❌ Git pide usuario y contraseña en cada push

**Síntoma:** Cada `git push` pide credenciales.

**Solución:**
```bash
git config --global user.email "tu-email@gmail.com"
git config --global user.name "tu-usuario-github"
git config --global credential.helper store
```
La próxima vez que ingreses usuario y token quedará guardado permanentemente.

> GitHub ya no acepta passwords. Usa un **Personal Access Token**:
> GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate → scope: `repo`

---

### ❌ La sección de Reportes carga y desaparece

**Síntoma:** Entras a Reportes, aparece un segundo y la pantalla queda en blanco.

**Causa:** El componente llama a `ventasAPI.listar()` que ahora retorna un objeto paginado `{ total, items }` en lugar de un array, y `ventas.filter()` explota.

**Solución:** Asegúrate de tener la versión más reciente del frontend:
```bash
git pull origin main
docker compose up -d --build frontend
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
