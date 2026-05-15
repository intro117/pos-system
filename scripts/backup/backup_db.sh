#!/bin/bash
# ─────────────────────────────────────────────────────────
#  Respaldo automático de PostgreSQL — POS System
#  Uso: bash backup_db.sh
#  Con variable: DATABASE_URL="postgresql://..." bash backup_db.sh
# ─────────────────────────────────────────────────────────

# ── Configuración (editar según entorno) ──────────────────
# LOCALHOST (docker-compose):
DB_URL_DEFAULT="postgresql://posuser:pospass123@localhost:5432/posdb"

# PRODUCCIÓN (VPS): descomentar y ajustar
# DB_URL_DEFAULT="postgresql://usuario:password@localhost:5432/posdb"

DB_URL="${DATABASE_URL:-$DB_URL_DEFAULT}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/pos-system}"
RETENTION_DAYS=30
FECHA=$(date +%Y%m%d_%H%M%S)
ARCHIVO="$BACKUP_DIR/pos_$FECHA.sql.gz"
LOG="$BACKUP_DIR/backup.log"

# ── Verificar dependencias ─────────────────────────────────
if ! command -v pg_dump &> /dev/null; then
  echo "ERROR: pg_dump no encontrado. Instala con:"
  echo "  sudo apt install -y postgresql-client"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# ── Ejecutar respaldo ──────────────────────────────────────
echo "[$FECHA] Iniciando respaldo..." >> "$LOG"
echo "[$FECHA] DB: $DB_URL" >> "$LOG"

pg_dump "$DB_URL" | gzip > "$ARCHIVO"

if [ $? -eq 0 ]; then
  TAMANIO=$(du -sh "$ARCHIVO" | cut -f1)
  echo "[$FECHA] ✓ Respaldo exitoso: $(basename $ARCHIVO) ($TAMANIO)" >> "$LOG"
  echo "✓ Respaldo guardado: $ARCHIVO ($TAMANIO)"
else
  echo "[$FECHA] ✗ ERROR en respaldo" >> "$LOG"
  rm -f "$ARCHIVO"
  echo "✗ Error al crear respaldo. Ver log: $LOG"
  exit 1
fi

# ── Limpiar respaldos antiguos (>30 días) ──────────────────
BORRADOS=$(find "$BACKUP_DIR" -name "pos_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$BORRADOS" -gt 0 ]; then
  echo "[$FECHA] 🗑 $BORRADOS respaldo(s) antiguo(s) eliminados" >> "$LOG"
fi

echo "[$FECHA] ─────────────────────────────────────────────" >> "$LOG"
