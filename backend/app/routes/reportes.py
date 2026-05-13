from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from sqlalchemy import func,cast,Date
from datetime import date,timedelta
from app.database import get_db
from app.models import Venta,DetalleVenta,Producto
router = APIRouter()
@router.get("/dashboard")
def dashboard(db:Session=Depends(get_db)):
    hoy=date.today(); semana=hoy-timedelta(days=7)
    vh=db.query(Venta).filter(cast(Venta.created_at,Date)==hoy,Venta.estado=="completada").all()
    vs=db.query(Venta).filter(Venta.created_at>=semana,Venta.estado=="completada").all()
    top=db.query(Producto.nombre,func.sum(DetalleVenta.cantidad).label("total_vendido"),
        func.sum(DetalleVenta.subtotal).label("total_importe"))\
        .join(DetalleVenta,Producto.id==DetalleVenta.producto_id)\
        .join(Venta,DetalleVenta.venta_id==Venta.id)\
        .filter(Venta.estado=="completada").group_by(Producto.nombre)\
        .order_by(func.sum(DetalleVenta.subtotal).desc()).limit(10).all()
    return {"hoy":{"ventas":len(vh),"total":round(sum(v.total for v in vh),2),
        "iva":round(sum(v.iva for v in vh),2),
        "ticket_promedio":round(sum(v.total for v in vh)/max(len(vh),1),2)},
        "semana":{"ventas":len(vs),"total":round(sum(v.total for v in vs),2)},
        "top_productos":[{"nombre":t.nombre,"cantidad":float(t.total_vendido),"importe":float(t.total_importe)} for t in top]}
