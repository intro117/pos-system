#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  POS System — Setup de Respaldo Automático de PostgreSQL
#  Funciona en: localhost (Docker), VPS Ubuntu, WSL2
# ═══════════════════════════════════════════════════════════

set -e
cd ~/pos-system

echo "╔══════════════════════════════════════════════════╗"
echo "║   POS System — Configuración de Respaldos DB    ║"
echo "╚══════════════════════════════════════════════════╝"

# ── 1. Crear estructura de directorios ─────────────────────
echo ""
echo "▶ [1/5] Creando directorios..."
mkdir -p scripts/backup

# Detectar directorio de respaldos con permisos
if mkdir -p /var/backups/pos-system 2>/dev/null && [ -w /var/backups/pos-system ]; then
  BACKUP_DIR="/var/backups/pos-system"
else
  mkdir -p ~/backups/pos-system
  BACKUP_DIR="$HOME/backups/pos-system"
  echo "  ⚠ Sin permisos en /var/backups — usando $BACKUP_DIR"
fi

echo "  ✓ Directorio de respaldos: $BACKUP_DIR"

# ── 2. Crear el script de respaldo ─────────────────────────
echo ""
echo "▶ [2/5] Creando scripts/backup/backup_db.sh..."

cat > scripts/backup/backup_db.sh << BACKUP_SCRIPT
#!/bin/bash
# ─────────────────────────────────────────────────────────
#  Respaldo automático de PostgreSQL — POS System
#  Uso directo:  bash backup_db.sh
#  Con URL:      DATABASE_URL="postgresql://..." bash backup_db.sh
# ─────────────────────────────────────────────────────────

# ── Configuración — editar según entorno ──────────────────
# LOCALHOST (docker-compose por defecto):
DB_URL_DEFAULT="postgresql://posuser:pospass123@localhost:5432/posdb"

# PRODUCCIÓN (VPS) — descomentar y ajustar:
# DB_URL_DEFAULT="postgresql://usuario:password@localhost:5432/posdb"

DB_URL="\${DATABASE_URL:-\$DB_URL_DEFAULT}"
BACKUP_DIR="\${BACKUP_DIR:-$BACKUP_DIR}"
RETENTION_DAYS=30
FECHA=\$(date +%Y%m%d_%H%M%S)
ARCHIVO="\$BACKUP_DIR/pos_\$FECHA.sql.gz"
LOG="\$BACKUP_DIR/backup.log"

# ── Verificar dependencias ─────────────────────────────────
if ! command -v pg_dump &> /dev/null; then
  echo "ERROR: pg_dump no encontrado."
  echo "  Instala con: sudo apt install -y postgresql-client"
  exit 1
fi

mkdir -p "\$BACKUP_DIR"

# ── Ejecutar respaldo ──────────────────────────────────────
echo "[\$FECHA] Iniciando respaldo..." >> "\$LOG"

pg_dump "\$DB_URL" | gzip > "\$ARCHIVO"

if [ \$? -eq 0 ]; then
  TAMANIO=\$(du -sh "\$ARCHIVO" | cut -f1)
  echo "[\$FECHA] ✓ Respaldo exitoso: \$(basename \$ARCHIVO) (\$TAMANIO)" >> "\$LOG"
  echo "✓ Respaldo guardado: \$ARCHIVO (\$TAMANIO)"
else
  echo "[\$FECHA] ✗ ERROR en respaldo" >> "\$LOG"
  rm -f "\$ARCHIVO"
  echo "✗ Error al crear respaldo. Ver: \$LOG"
  exit 1
fi

# ── Borrar respaldos con más de 30 días ───────────────────
BORRADOS=\$(find "\$BACKUP_DIR" -name "pos_*.sql.gz" -mtime +\$RETENTION_DAYS -delete -print | wc -l)
[ "\$BORRADOS" -gt 0 ] && echo "[\$FECHA] 🗑 \$BORRADOS respaldo(s) antiguo(s) eliminados" >> "\$LOG"

echo "[\$FECHA] ─────────────────────────────────────────────" >> "\$LOG"
BACKUP_SCRIPT

chmod +x scripts/backup/backup_db.sh
echo "  ✓ backup_db.sh creado"

# ── 3. Crear script de restauración ────────────────────────
echo ""
echo "▶ [3/5] Creando scripts/backup/restore_db.sh..."

cat > scripts/backup/restore_db.sh << 'RESTORE_SCRIPT'
#!/bin/bash
# ─────────────────────────────────────────────────────────
#  Restaurar respaldo de PostgreSQL — POS System
#  Uso: bash restore_db.sh /ruta/al/respaldo.sql.gz
# ─────────────────────────────────────────────────────────

DB_URL_DEFAULT="postgresql://posuser:pospass123@localhost:5432/posdb"
DB_URL="${DATABASE_URL:-$DB_URL_DEFAULT}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/pos-system}"
ARCHIVO="$1"

if [ -z "$ARCHIVO" ]; then
  echo "Uso: bash restore_db.sh <archivo.sql.gz>"
  echo ""
  echo "Respaldos disponibles:"
  ls -lh "$BACKUP_DIR"/pos_*.sql.gz 2>/dev/null || echo "  (ninguno encontrado en $BACKUP_DIR)"
  exit 1
fi

if [ ! -f "$ARCHIVO" ]; then
  echo "✗ Archivo no encontrado: $ARCHIVO"
  exit 1
fi

echo "⚠  ADVERTENCIA: Esto sobreescribirá la base de datos actual."
echo "   Archivo: $ARCHIVO"
read -p "   ¿Continuar? (escribe SI para confirmar): " CONFIRM

if [ "$CONFIRM" != "SI" ]; then
  echo "Cancelado."
  exit 0
fi

echo "Restaurando..."
gunzip -c "$ARCHIVO" | psql "$DB_URL"

if [ $? -eq 0 ]; then
  echo "✓ Restauración exitosa"
else
  echo "✗ Error en restauración"
  exit 1
fi
RESTORE_SCRIPT

chmod +x scripts/backup/restore_db.sh
echo "  ✓ restore_db.sh creado"

# ── 4. Instalar pg_dump si hace falta y configurar crontab ─
echo ""
echo "▶ [4/5] Configurando crontab..."

if ! command -v pg_dump &> /dev/null; then
  echo "  ⚠ pg_dump no encontrado. Instalando postgresql-client..."
  sudo apt-get install -y postgresql-client -qq
  echo "  ✓ postgresql-client instalado"
fi

SCRIPT_PATH="$HOME/pos-system/scripts/backup/backup_db.sh"
CRON_DAILY="0 2 * * * BACKUP_DIR=$BACKUP_DIR bash $SCRIPT_PATH >> $BACKUP_DIR/cron.log 2>&1"
CRON_CLEAN="0 0 1 * * truncate -s 0 $BACKUP_DIR/backup.log"

CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")

if echo "$CURRENT_CRON" | grep -q "backup_db.sh"; then
  echo "  ⚠ Crontab ya configurado, omitiendo"
else
  (
    echo "$CURRENT_CRON"
    echo ""
    echo "# POS System — Respaldo automático PostgreSQL"
    echo "$CRON_DAILY"
    echo "$CRON_CLEAN"
  ) | crontab -
  echo "  ✓ Crontab configurado (respaldo diario a las 2:00am)"
fi

# ── 5. Escribir README.md completo ─────────────────────────
echo ""
echo "▶ [5/5] Actualizando README.md..."

cat > README.md << 'README'
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

Después del primer deploy:

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

> **Limitación gratuita:** Los servicios se duermen tras 15 min sin uso. La primera carga tarda ~30 segundos.

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

El sistema incluye scripts de respaldo automático con `pg_dump`, comprimidos en `.gz`.
Funcionan igual en **localhost**, **VPS** y cualquier servidor Linux, sin dependencias externas.

---

### ¿Cómo funciona el sistema de respaldos?

| Archivo | Descripción |
|---|---|
| `setup_backup.sh` | Configura todo por primera vez (ejecutar una sola vez) |
| `scripts/backup/backup_db.sh` | Hace el respaldo real con pg_dump |
| `scripts/backup/restore_db.sh` | Restaura un respaldo con confirmación |
| `~/backups/pos-system/` | Carpeta donde se guardan los `.sql.gz` |
| `~/backups/pos-system/backup.log` | Log de cada respaldo ejecutado |

Los respaldos se nombran automáticamente con fecha y hora:
```
pos_20260515_020001.sql.gz
pos_20260516_020001.sql.gz
...
```
Y se eliminan solos después de **30 días**.

---

### PASO A PASO — Localhost (WSL2 + Docker)

#### Requisito previo

```bash
# Verificar que pg_dump esté instalado
pg_dump --version

# Si no está:
sudo apt install -y postgresql-client
```

#### Paso 1 — Ejecutar el script de configuración

```bash
cd ~/pos-system
chmod +x setup_backup.sh
bash setup_backup.sh
```

Esto hace automáticamente:
- Crea `scripts/backup/backup_db.sh` y `restore_db.sh`
- Detecta el directorio de respaldos con permisos adecuados
- Configura el crontab para respaldo diario a las 2:00am
- Actualiza el README en GitHub

#### Paso 2 — Hacer un respaldo manual para probar

```bash
bash ~/pos-system/scripts/backup/backup_db.sh
```

Salida esperada:
```
✓ Respaldo guardado: /home/tu_usuario/backups/pos-system/pos_20260515_143022.sql.gz (24K)
```

#### Paso 3 — Ver los respaldos generados

```bash
# Listar respaldos
ls -lh ~/backups/pos-system/

# Ver el log de actividad
cat ~/backups/pos-system/backup.log
```

#### Paso 4 — Verificar que el crontab quedó configurado

```bash
crontab -l
```

Debes ver algo como:
```
# POS System — Respaldo automático PostgreSQL
0 2 * * * BACKUP_DIR=/home/usuario/backups/pos-system bash /root/pos-system/scripts/backup/backup_db.sh >> ...
0 0 1 * * truncate -s 0 /home/usuario/backups/pos-system/backup.log
```

#### Paso 5 — Restaurar un respaldo (si lo necesitas)

```bash
# Muestra los respaldos disponibles y pide confirmación
bash ~/pos-system/scripts/backup/restore_db.sh

# O directo con un archivo específico
bash ~/pos-system/scripts/backup/restore_db.sh ~/backups/pos-system/pos_20260515_143022.sql.gz
```

> ⚠️ La restauración sobreescribe la base de datos actual. El script pide escribir `SI` para confirmar.

---

### PASO A PASO — VPS Ubuntu (producción)

#### Requisito previo

```bash
# En el VPS, instalar postgresql-client
sudo apt install -y postgresql-client

# Verificar
pg_dump --version
```

#### Paso 1 — Clonar y configurar

```bash
cd ~/pos-system
chmod +x setup_backup.sh
bash setup_backup.sh
```

#### Paso 2 — Editar la DATABASE_URL de producción

```bash
nano ~/pos-system/scripts/backup/backup_db.sh
```

Cambia esta línea:
```bash
# ANTES (localhost docker-compose):
DB_URL_DEFAULT="postgresql://posuser:pospass123@localhost:5432/posdb"

# DESPUÉS (tu VPS con los datos reales):
DB_URL_DEFAULT="postgresql://tu_usuario:tu_password@localhost:5432/tu_base_de_datos"
```

> Puedes ver tus credenciales en `docker-compose.yml` → sección `postgres` → variables `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

#### Paso 3 — Probar que conecta correctamente

```bash
bash ~/pos-system/scripts/backup/backup_db.sh
```

Si da error de conexión, verifica que PostgreSQL esté corriendo:
```bash
docker compose ps
# o
systemctl status postgresql
```

#### Paso 4 — Opción: configurar DATABASE_URL global (recomendado en producción)

Para no hardcodear credenciales en el script:

```bash
# Agregar al entorno del sistema
echo 'export DATABASE_URL="postgresql://usuario:password@localhost:5432/posdb"' >> /etc/environment
source /etc/environment

# Verificar
echo $DATABASE_URL
```

El script la toma automáticamente si está definida.

#### Paso 5 — Verificar respaldos automáticos

```bash
# Ver crontab activo
crontab -l

# Simular ejecución manual (para probar antes de esperar las 2am)
bash ~/pos-system/scripts/backup/backup_db.sh

# Ver log
cat ~/backups/pos-system/backup.log
ls -lh ~/backups/pos-system/
```

---

### DATABASE_URL de referencia por entorno

| Entorno | DATABASE_URL |
|---|---|
| **Localhost** (docker-compose) | `postgresql://posuser:pospass123@localhost:5432/posdb` |
| **VPS / Producción** | `postgresql://tu_usuario:tu_password@localhost:5432/tu_db` |
| **Render QA** | URL interna del dashboard de Render |

---

### Comandos de respaldo rápidos

```bash
# Respaldo manual
bash ~/pos-system/scripts/backup/backup_db.sh

# Respaldo con URL distinta (sin editar el script)
DATABASE_URL="postgresql://usuario:pass@host:5432/db" bash ~/pos-system/scripts/backup/backup_db.sh

# Ver todos los respaldos
ls -lh ~/backups/pos-system/pos_*.sql.gz

# Ver log completo
cat ~/backups/pos-system/backup.log

# Restaurar
bash ~/pos-system/scripts/backup/restore_db.sh ~/backups/pos-system/pos_YYYYMMDD_HHMMSS.sql.gz
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

| Opción | Qué borra | Qué conserva |
|---|---|---|
| Reset ventas | Ventas, cortes, detalles | Productos, clientes, proveedores |
| Reset inventario | Productos, categorías, movimientos | Ventas, clientes, proveedores |
| Reset total | Todo | Solo usuarios del sistema |

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
Causa: TRUNCATE requiere permisos de superusuario (no disponibles en Render free)
Solución: El sistema usa DELETE con SQLAlchemy en orden correcto de foreign keys
```

### Login da 401 después del primer deploy
```
Solución: curl -X POST https://TU-SERVICIO.onrender.com/api/reset-users-emergency
```

### Error: postgres:// no reconocido por SQLAlchemy
```
Causa: Render entrega URLs con postgres:// en vez de postgresql://
Solución: El database.py convierte automáticamente al iniciar
```

### pg_dump: command not found
```
Solución: sudo apt install -y postgresql-client
```

### Respaldo da error de conexión en VPS
```
Causa: PostgreSQL no acepta conexiones externas o credenciales incorrectas
Solución: Verificar docker compose ps y revisar DB_URL_DEFAULT en backup_db.sh
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
README

echo "  ✓ README.md actualizado"

# ── Commit y push ───────────────────────────────────────────
echo ""
echo "▶ Subiendo todo a GitHub..."

git add setup_backup.sh scripts/backup/backup_db.sh scripts/backup/restore_db.sh README.md
git commit -m "feat: sistema de respaldo automático PostgreSQL + README detallado paso a paso"

git pull origin main --rebase 2>/dev/null || true
git push origin main

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║   ✓ Todo listo y subido a GitHub                  ║"
echo "╠════════════════════════════════════════════════════╣"
echo "║  Scripts:   scripts/backup/                        ║"
echo "║  Respaldos: $BACKUP_DIR"
echo "║  Crontab:   diario 2:00am                          ║"
echo "║  README:    actualizado en GitHub                  ║"
echo "╠════════════════════════════════════════════════════╣"
echo "║  Prueba ahora:                                     ║"
echo "║  bash ~/pos-system/scripts/backup/backup_db.sh    ║"
echo "╚════════════════════════════════════════════════════╝"
