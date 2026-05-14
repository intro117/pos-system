from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.auth import require_admin

router = APIRouter()

# Orden correcto respetando foreign keys:
# Primero hijos, luego padres
RESET_ORDEN_TODO = [
    "detalles_venta",          # hijo de ventas y productos
    "ventas",                  # hijo de clientes
    "cortes_caja",
    "movimientos_inventario",  # hijo de productos y proveedores
    "productos",               # hijo de categorias
    "categorias",
    "clientes",
    "proveedores",
    "configuracion",
]

RESET_ORDEN_VENTAS = [
    "detalles_venta",
    "ventas",
    "cortes_caja",
]

RESET_ORDEN_INVENTARIO = [
    "movimientos_inventario",
    "productos",
    "categorias",
]

def truncar_tablas(db: Session, tablas: list):
    """Trunca tablas en orden correcto deshabilitando checks temporalmente"""
    try:
        # Deshabilitar verificación de foreign keys temporalmente
        db.execute(text("SET session_replication_role = replica"))
        for tabla in tablas:
            db.execute(text(f"TRUNCATE TABLE {tabla} RESTART IDENTITY CASCADE"))
        # Rehabilitar
        db.execute(text("SET session_replication_role = DEFAULT"))
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise e

@router.post("/reset")
def reset_todo(admin=Depends(require_admin), db: Session = Depends(get_db)):
    """
    Reset COMPLETO — borra productos, ventas, clientes, proveedores y config.
    Solo Admin. Irreversible.
    """
    try:
        truncar_tablas(db, RESET_ORDEN_TODO)
        return {
            "ok": True,
            "mensaje": "Reset completo exitoso — todas las tablas están en 0",
            "tablas": RESET_ORDEN_TODO
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.post("/reset/ventas")
def reset_ventas(admin=Depends(require_admin), db: Session = Depends(get_db)):
    """
    Reset solo ventas y cortes — mantiene productos, clientes y proveedores.
    """
    try:
        truncar_tablas(db, RESET_ORDEN_VENTAS)
        return {
            "ok": True,
            "mensaje": "Ventas y cortes reseteados — productos y clientes conservados",
            "tablas": RESET_ORDEN_VENTAS
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.post("/reset/inventario")
def reset_inventario(admin=Depends(require_admin), db: Session = Depends(get_db)):
    """
    Reset de inventario — borra productos, categorías y movimientos.
    Mantiene ventas históricas, clientes y proveedores.
    """
    try:
        truncar_tablas(db, RESET_ORDEN_INVENTARIO)
        return {
            "ok": True,
            "mensaje": "Inventario reseteado — ventas y clientes conservados",
            "tablas": RESET_ORDEN_INVENTARIO
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.get("/stats")
def stats(admin=Depends(require_admin), db: Session = Depends(get_db)):
    """Ver conteo de registros en cada tabla"""
    tablas = [
        "productos", "categorias", "ventas", "detalles_venta",
        "clientes", "proveedores", "movimientos_inventario",
        "cortes_caja", "usuarios"
    ]
    resultado = {}
    for tabla in tablas:
        try:
            count = db.execute(text(f"SELECT COUNT(*) FROM {tabla}")).scalar()
            resultado[tabla] = count
        except Exception:
            resultado[tabla] = "error"
    return resultado
