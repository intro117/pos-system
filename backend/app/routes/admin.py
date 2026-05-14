from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.auth import require_admin

router = APIRouter()

@router.post("/reset")
def reset_tablas(confirmar: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    """
    Borra todos los datos de ventas, inventario y productos.
    Requiere confirmar='RESET_CONFIRMADO' para ejecutar.
    """
    if confirmar != "RESET_CONFIRMADO":
        return {"error": "Debes enviar confirmar=RESET_CONFIRMADO"}

    tablas = [
        "detalles_venta",
        "ventas",
        "cortes_caja",
        "movimientos_inventario",
        "productos",
        "categorias",
        "clientes",
        "proveedores",
        "configuracion",
    ]
    for tabla in tablas:
        db.execute(text(f"TRUNCATE TABLE {tabla} RESTART IDENTITY CASCADE"))
    db.commit()
    return {"ok": True, "mensaje": "Todas las tablas han sido reseteadas"}

@router.post("/reset/ventas")
def reset_solo_ventas(confirmar: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    """Reset solo de ventas y cortes — mantiene productos y clientes"""
    if confirmar != "RESET_CONFIRMADO":
        return {"error": "Debes enviar confirmar=RESET_CONFIRMADO"}
    for tabla in ["detalles_venta", "ventas", "cortes_caja"]:
        db.execute(text(f"TRUNCATE TABLE {tabla} RESTART IDENTITY CASCADE"))
    db.commit()
    return {"ok": True, "mensaje": "Ventas y cortes reseteados"}
