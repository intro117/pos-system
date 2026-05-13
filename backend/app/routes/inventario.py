from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import MovimientoInventario,Producto
router = APIRouter()
@router.get("/movimientos")
def movimientos(limit:int=100,db:Session=Depends(get_db)):
    movs=db.query(MovimientoInventario).order_by(MovimientoInventario.created_at.desc()).limit(limit).all()
    return [{"id":m.id,"producto":m.producto.nombre if m.producto else "—","tipo":m.tipo,
             "cantidad":m.cantidad,"stock_ant":m.stock_anterior,"stock_nuevo":m.stock_nuevo,
             "motivo":m.motivo,"created_at":m.created_at.isoformat() if m.created_at else None} for m in movs]
@router.get("/alertas")
def alertas(db:Session=Depends(get_db)):
    prods=db.query(Producto).filter(Producto.activo==True,Producto.es_servicio==False,
        Producto.stock_actual<=Producto.stock_minimo).all()
    return [{"id":p.id,"nombre":p.nombre,"stock_actual":p.stock_actual,"stock_minimo":p.stock_minimo} for p in prods]
