#!/bin/bash
# ─────────────────────────────────────────────────────────
#  Restaurar respaldo de PostgreSQL — POS System
#  Uso: bash restore_db.sh /ruta/al/respaldo.sql.gz
# ─────────────────────────────────────────────────────────

DB_URL_DEFAULT="postgresql://posuser:pospass123@localhost:5432/posdb"
DB_URL="${DATABASE_URL:-$DB_URL_DEFAULT}"
ARCHIVO="$1"

if [ -z "$ARCHIVO" ]; then
  echo "Uso: bash restore_db.sh <archivo.sql.gz>"
  echo ""
  echo "Respaldos disponibles:"
  ls -lh ${BACKUP_DIR:-$HOME/backups/pos-system}/pos_*.sql.gz 2>/dev/null || echo "  (ninguno encontrado)"
  exit 1
fi

if [ ! -f "$ARCHIVO" ]; then
  echo "✗ Archivo no encontrado: $ARCHIVO"
  exit 1
fi

echo "⚠ ADVERTENCIA: Esto sobreescribirá la base de datos actual."
echo "  Archivo: $ARCHIVO"
read -p "  ¿Continuar? (escribir 'SI' para confirmar): " CONFIRM

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
