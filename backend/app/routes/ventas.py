from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import cast,Date
from datetime import datetime,date
from typing import Optional,List
import random,string
from app.database import get_db
from app.models import Venta,DetalleVenta,Producto,CorteCaja,MovimientoInventario,TipoMovimiento
from pydantic import BaseModel

router=APIRouter()

class Item(BaseModel):
    producto_id:int; cantidad:float; precio_unitario:float; descuento:float=0.0; iva_porcentaje:float=0.0

class NuevaVenta(BaseModel):
    cliente_id:Optional[int]=None; items:List[Item]; metodo_pago:str="efectivo"
    monto_recibido:float=0.0; descuento:float=0.0; notas:str=""; cajero:str="Admin"

class NuevoCorte(BaseModel):
    cajero:str="Admin"; fondo_inicial:float=0.0; efectivo_contado:float=0.0; notas:str=""

def gen_folio():
    ts=datetime.now().strftime("%y%m%d%H%M")
    rnd=''.join(random.choices(string.ascii_uppercase+string.digits,k=4))
    return f"V-{ts}-{rnd}"

@router.post("/")
def crear_venta(data:NuevaVenta,db:Session=Depends(get_db)):
    if not data.items:raise HTTPException(400,"La venta debe tener al menos un producto")
    subtotal=iva_total=0.0;detalles=[]
    for item in data.items:
        prod=db.query(Producto).filter(Producto.id==item.producto_id).first()
        if not prod:raise HTTPException(404,f"Producto {item.producto_id} no encontrado")
        if not prod.es_servicio and prod.stock_actual<item.cantidad:
            raise HTTPException(400,f"Stock insuficiente para {prod.nombre}")
        precio_neto=item.precio_unitario*(1-item.descuento/100)
        sub_item=round(precio_neto*item.cantidad,2)
        iva_item=round(sub_item*item.iva_porcentaje/100,2)
        subtotal+=sub_item;iva_total+=iva_item
        detalles.append(DetalleVenta(producto_id=item.producto_id,cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,descuento=item.descuento,
            iva_porcentaje=item.iva_porcentaje,subtotal=sub_item))
        if not prod.es_servicio:
            ant=prod.stock_actual;prod.stock_actual-=int(item.cantidad)
            db.add(MovimientoInventario(producto_id=prod.id,tipo=TipoMovimiento.venta,
                cantidad=item.cantidad,stock_anterior=ant,stock_nuevo=prod.stock_actual,motivo=f"Venta",usuario=data.cajero))
    desc_amt=round(subtotal*data.descuento/100,2)
    total=round(subtotal-desc_amt+iva_total,2)
    cambio=round(max(0,data.monto_recibido-total),2)
    v=Venta(folio=gen_folio(),cliente_id=data.cliente_id,subtotal=subtotal,descuento=desc_amt,
        iva=iva_total,total=total,metodo_pago=data.metodo_pago,monto_recibido=data.monto_recibido,
        cambio=cambio,estado="completada",notas=data.notas,cajero=data.cajero)
    db.add(v);db.flush()
    for d in detalles:d.venta_id=v.id;db.add(d)
    db.commit();db.refresh(v)
    return{"folio":v.folio,"total":v.total,"cambio":v.cambio,"iva":v.iva,"subtotal":v.subtotal,"id":v.id}

@router.get("/corte/hoy")
def resumen_hoy(db:Session=Depends(get_db)):
    hoy=date.today()
    vs=db.query(Venta).filter(cast(Venta.created_at,Date)==hoy,Venta.estado=="completada").all()
    return{"fecha":hoy.isoformat(),"num_ventas":len(vs),
        "total_ventas":round(sum(v.total for v in vs),2),"total_iva":round(sum(v.iva for v in vs),2),
        "efectivo":round(sum(v.total for v in vs if v.metodo_pago=="efectivo"),2),
        "tarjeta":round(sum(v.total for v in vs if v.metodo_pago=="tarjeta"),2),
        "transferencia":round(sum(v.total for v in vs if v.metodo_pago=="transferencia"),2)}

@router.post("/corte/nuevo")
def hacer_corte(data:NuevoCorte,db:Session=Depends(get_db)):
    hoy=date.today()
    vs=db.query(Venta).filter(cast(Venta.created_at,Date)==hoy,Venta.estado=="completada").all()
    canc=db.query(Venta).filter(cast(Venta.created_at,Date)==hoy,Venta.estado=="cancelada").all()
    tefect=sum(v.total for v in vs if v.metodo_pago=="efectivo")
    ttarj=sum(v.total for v in vs if v.metodo_pago=="tarjeta")
    ttrans=sum(v.total for v in vs if v.metodo_pago=="transferencia")
    total=sum(v.total for v in vs)
    dif=round(data.efectivo_contado-(tefect+data.fondo_inicial),2)
    c=CorteCaja(cajero=data.cajero,fondo_inicial=data.fondo_inicial,total_efectivo=tefect,
        total_tarjeta=ttarj,total_transferencia=ttrans,total_ventas=total,num_ventas=len(vs),
        num_cancelaciones=len(canc),total_cancelaciones=sum(v.total for v in canc),
        efectivo_contado=data.efectivo_contado,diferencia=dif,notas=data.notas,cerrado=True)
    db.add(c);db.commit();db.refresh(c)
    return{"id":c.id,"fecha":c.fecha.isoformat(),"total_ventas":c.total_ventas,
        "num_ventas":c.num_ventas,"total_efectivo":c.total_efectivo,"total_tarjeta":c.total_tarjeta,
        "total_transferencia":c.total_transferencia,"efectivo_contado":c.efectivo_contado,"diferencia":c.diferencia}

@router.get("/")
def listar(fecha_inicio:Optional[str]=None,fecha_fin:Optional[str]=None,limit:int=50,db:Session=Depends(get_db)):
    q=db.query(Venta)
    if fecha_inicio:q=q.filter(Venta.created_at>=fecha_inicio)
    if fecha_fin:q=q.filter(Venta.created_at<=fecha_fin+" 23:59:59")
    return[{"id":v.id,"folio":v.folio,"total":v.total,"subtotal":v.subtotal,"iva":v.iva,
        "descuento":v.descuento,"metodo_pago":v.metodo_pago,"estado":v.estado,"cajero":v.cajero,
        "created_at":v.created_at.isoformat() if v.created_at else None,"num_items":len(v.detalles)}
        for v in q.order_by(Venta.created_at.desc()).limit(limit).all()]

@router.delete("/{vid}")
def cancelar(vid:int,db:Session=Depends(get_db)):
    v=db.query(Venta).filter(Venta.id==vid).first()
    if not v:raise HTTPException(404,"Venta no encontrada")
    if v.estado=="cancelada":raise HTTPException(400,"Ya cancelada")
    for d in v.detalles:
        p=db.query(Producto).filter(Producto.id==d.producto_id).first()
        if p and not p.es_servicio:
            ant=p.stock_actual;p.stock_actual+=int(d.cantidad)
            db.add(MovimientoInventario(producto_id=p.id,tipo=TipoMovimiento.ajuste,
                cantidad=d.cantidad,stock_anterior=ant,stock_nuevo=p.stock_actual,motivo=f"Cancelación {v.folio}"))
    v.estado="cancelada";db.commit();return{"ok":True,"folio":v.folio}
