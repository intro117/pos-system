#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  POS System — Setup completo
#  Uso: bash setup_all.sh
#  No sobreescribe archivos existentes del repo
# ═══════════════════════════════════════════════════════════

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${BLUE}→${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✗ ERROR:${NC} $1"; exit 1; }
hdr()  { echo -e "\n${BOLD}${BLUE}[$1/5]${NC} $2"; }

echo -e "${BOLD}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║           POS System — Setup completo             ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

PROJECT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT"

# ── 1. Verificar requisitos ────────────────────────────────
hdr 1 "Verificando requisitos"

command -v docker &>/dev/null   || err "Docker no encontrado. Instala Docker Desktop primero."
docker info &>/dev/null          || err "Docker no está corriendo. Abre Docker Desktop primero."
command -v git &>/dev/null       || err "Git no encontrado: sudo apt install git"
command -v python3 &>/dev/null   || err "Python3 no encontrado: sudo apt install python3"

ok "Docker corriendo"
ok "Git disponible"
ok "Python3 disponible"

# Verificar que el usuario no sea root
if [ "$(whoami)" = "root" ]; then
  warn "Estás corriendo como root. Se recomienda usar tu usuario normal."
  warn "Configura WSL: ubuntu config --default-user tu_usuario"
  echo ""
fi

# ── 2. Configurar variables de entorno ─────────────────────
hdr 2 "Configurando variables de entorno"

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    ok ".env creado desde .env.example"
    warn "Revisa y edita .env con tus valores antes de producción"
  else
    err ".env.example no encontrado. Verifica que el repo esté completo."
  fi
else
  ok ".env ya existe — respetando configuración actual"
fi

# Verificar que .env está en .gitignore
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
  echo ".env" >> .gitignore
  ok ".env agregado a .gitignore"
fi

# ── 3. Verificar estructura del repo ──────────────────────
hdr 3 "Verificando estructura del proyecto"

ARCHIVOS_REQUERIDOS=(
  "backend/app/main.py"
  "backend/app/models.py"
  "backend/app/database.py"
  "backend/app/auth.py"
  "backend/app/routes/productos.py"
  "backend/app/routes/ventas.py"
  "backend/app/routes/auth.py"
  "backend/app/routes/clientes.py"
  "backend/app/routes/proveedores.py"
  "backend/app/routes/inventario.py"
  "backend/app/routes/reportes.py"
  "backend/app/routes/config.py"
  "backend/app/routes/admin.py"
  "backend/Dockerfile"
  "backend/requirements.txt"
  "frontend/src/App.jsx"
  "frontend/src/utils/api.js"
  "frontend/src/utils/auth.js"
  "frontend/Dockerfile"
  "docker-compose.yml"
)

FALTANTES=0
for archivo in "${ARCHIVOS_REQUERIDOS[@]}"; do
  if [ ! -f "$archivo" ]; then
    warn "Falta: $archivo"
    FALTANTES=$((FALTANTES + 1))
  fi
done

if [ "$FALTANTES" -gt 0 ]; then
  err "$FALTANTES archivo(s) faltante(s). Verifica que el repo esté completo con: git status"
fi

ok "Todos los archivos del proyecto presentes"

# ── 4. Construir y levantar contenedores ──────────────────
hdr 4 "Construyendo y levantando contenedores"

info "Apagando contenedores anteriores si existen..."
docker compose down 2>/dev/null || true

info "Construyendo imágenes (primera vez tarda 4-6 minutos)..."
docker compose up -d --build

info "Esperando que el backend esté listo..."
INTENTOS=0
until curl -sf http://localhost:8000/api/health >/dev/null 2>&1; do
  INTENTOS=$((INTENTOS + 1))
  if [ "$INTENTOS" -ge 40 ]; then
    echo ""
    err "El backend no respondió después de 2 minutos. Revisa los logs con: docker compose logs backend"
  fi
  echo -n "."
  sleep 3
done
echo ""
ok "Backend listo en http://localhost:8000"

info "Esperando que el frontend esté listo..."
INTENTOS=0
until curl -sf http://localhost:3000 >/dev/null 2>&1; do
  INTENTOS=$((INTENTOS + 1))
  if [ "$INTENTOS" -ge 20 ]; then
    echo ""
    warn "El frontend tardó más de lo esperado. Revisa: docker compose logs frontend"
    break
  fi
  echo -n "."
  sleep 3
done
echo ""
ok "Frontend listo en http://localhost:3000"

# ── 5. Cargar datos iniciales ─────────────────────────────
hdr 5 "Cargando datos iniciales"

# Obtener token de admin para llamadas autenticadas
TOKEN=$(curl -sf -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  warn "No se pudo obtener token — los datos iniciales no se cargarán"
  warn "Puedes cargarlos manualmente desde la interfaz después del login"
else
  # Categorías de ejemplo
  for cat_data in \
    '{"nombre":"Electrónica","icono":"💻","color":"#3b82f6"}' \
    '{"nombre":"Ropa","icono":"👕","color":"#8b5cf6"}' \
    '{"nombre":"Alimentos","icono":"🍔","color":"#f59e0b"}' \
    '{"nombre":"Servicios","icono":"🔧","color":"#10b981"}'; do
    curl -sf -X POST http://localhost:8000/api/productos/categorias \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$cat_data" >/dev/null 2>&1 || true
  done
  ok "Categorías de ejemplo creadas"

  # Configuración inicial
  curl -sf -X PUT http://localhost:8000/api/config/ \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"nombre_negocio":"Mi Negocio","iva_porcentaje":16,"simbolo_moneda":"$","tipo_negocio":"retail","ticket_footer":"¡Gracias por su compra!"}' \
    >/dev/null 2>&1 || true
  ok "Configuración inicial cargada"
fi

# ── Estado final ───────────────────────────────────────────
echo ""
docker compose ps
echo ""
echo -e "${GREEN}${BOLD}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║      ✓  POS System desplegado exitosamente           ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  🌐 Dashboard:  http://localhost:3000                ║"
echo "║  📡 API:        http://localhost:8000/api            ║"
echo "║  📚 API Docs:   http://localhost:8000/docs           ║"
echo "║  🗄️  MinIO:      http://localhost:9001                ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  USUARIOS POR DEFECTO:                               ║"
echo "║  Admin:  admin / admin123                            ║"
echo "║  Cajero: cajero / cajero123                          ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  PRIMEROS PASOS:                                     ║"
echo "║  1. Abre http://localhost:3000                       ║"
echo "║  2. Inicia sesión con admin / admin123               ║"
echo "║  3. Ve a ⚙️ Config → personaliza tu negocio          ║"
echo "║  4. Agrega productos en 🏷️ Productos                  ║"
echo "║  5. ¡Vende en 🛒 POS!                                ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  COMANDOS ÚTILES:                                    ║"
echo "║  docker compose ps          → ver estado            ║"
echo "║  docker compose logs -f     → ver logs              ║"
echo "║  docker compose down        → apagar                ║"
echo "║  docker compose up -d       → encender              ║"
echo "║  docker compose down -v     → reset completo        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
