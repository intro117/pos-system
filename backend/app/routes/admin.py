from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.auth import require_admin
from app.models import (
    DetalleVenta, Venta, CorteCaja,
    MovimientoInventario, Producto, Categoria,
    Cliente, Proveedor, Configuracion
)

router = APIRouter()

@router.post("/reset/ventas")
def reset_ventas(admin=Depends(require_admin), db: Session = Depends(get_db)):
    """Reset solo ventas y cortes — productos y clientes se conservan"""
    try:
        db.query(DetalleVenta).delete(synchronize_session=False)
        db.query(Venta).delete(synchronize_session=False)
        db.query(CorteCaja).delete(synchronize_session=False)
        db.commit()
        # Resetear secuencias de IDs
        for tabla in ["detalles_venta","ventas","cortes_caja"]:
            try:
                db.execute(text(f"ALTER SEQUENCE {tabla}_id_seq RESTART WITH 1"))
            except: pass
        db.commit()
        return {"ok": True, "mensaje": "Ventas y cortes borrados correctamente"}
    except Exception as e:
        db.rollback()
        return {"ok": False, "error": str(e)}

@router.post("/reset/inventario")
def reset_inventario(admin=Depends(require_admin), db: Session = Depends(get_db)):
    """Reset inventario — borra productos y categorías"""
    try:
        # Primero los hijos
        db.query(DetalleVenta).delete(synchronize_session=False)
        db.query(MovimientoInventario).delete(synchronize_session=False)
        db.commit()
        # Luego los padres
        db.query(Producto).delete(synchronize_session=False)
        db.commit()
        db.query(Categoria).delete(synchronize_session=False)
        db.commit()
        # Resetear secuencias
        for tabla in ["detalles_venta","movimientos_inventario","productos","categorias"]:
            try:
                db.execute(text(f"ALTER SEQUENCE {tabla}_id_seq RESTART WITH 1"))
            except: pass
        db.commit()
        return {"ok": True, "mensaje": "Productos y categorías borrados correctamente"}
    except Exception as e:
        db.rollback()
        return {"ok": False, "error": str(e)}

@router.post("/reset")
def reset_todo(admin=Depends(require_admin), db: Session = Depends(get_db)):
    """Reset COMPLETO — borra absolutamente todo"""
    try:
        # Orden: hijos primero, padres después
        db.query(DetalleVenta).delete(synchronize_session=False)
        db.query(MovimientoInventario).delete(synchronize_session=False)
        db.commit()
        db.query(Venta).delete(synchronize_session=False)
        db.query(CorteCaja).delete(synchronize_session=False)
        db.commit()
        db.query(Producto).delete(synchronize_session=False)
        db.commit()
        db.query(Categoria).delete(synchronize_session=False)
        db.query(Cliente).delete(synchronize_session=False)
        db.query(Proveedor).delete(synchronize_session=False)
        db.query(Configuracion).delete(synchronize_session=False)
        db.commit()
        # Resetear todas las secuencias
        tablas = ["detalles_venta","ventas","cortes_caja","movimientos_inventario",
                  "productos","categorias","clientes","proveedores","configuracion"]
        for tabla in tablas:
            try:
                db.execute(text(f"ALTER SEQUENCE {tabla}_id_seq RESTART WITH 1"))
            except: pass
        db.commit()
        return {"ok": True, "mensaje": "Reset completo exitoso — sistema en cero"}
    except Exception as e:
        db.rollback()
        return {"ok": False, "error": str(e)}

@router.get("/stats")
def stats(admin=Depends(require_admin), db: Session = Depends(get_db)):
    """Ver conteo de registros en cada tabla"""
    from app.models import Usuario
    return {
        "productos":              db.query(Producto).count(),
        "categorias":             db.query(Categoria).count(),
        "ventas":                 db.query(Venta).count(),
        "detalles_venta":         db.query(DetalleVenta).count(),
        "clientes":               db.query(Cliente).count(),
        "proveedores":            db.query(Proveedor).count(),
        "movimientos_inventario": db.query(MovimientoInventario).count(),
        "cortes_caja":            db.query(CorteCaja).count(),
        "usuarios":               db.query(Usuario).count(),
    }
