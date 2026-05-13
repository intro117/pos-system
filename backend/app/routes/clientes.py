from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Cliente
from pydantic import BaseModel
from typing import Optional
router = APIRouter()
class ClienteCreate(BaseModel):
    nombre:str; rfc:str="XAXX010101000"; email:str=""
    telefono:str=""; direccion:str=""; notas:str=""; credito_max:float=0.0
@router.get("/")
def listar(busqueda:str="",db:Session=Depends(get_db)):
    q=db.query(Cliente).filter(Cliente.activo==True)
    if busqueda: q=q.filter(Cliente.nombre.ilike(f"%{busqueda}%"))
    return q.order_by(Cliente.nombre).all()
@router.post("/")
def crear(data:ClienteCreate,db:Session=Depends(get_db)):
    c=Cliente(**data.dict()); db.add(c); db.commit(); db.refresh(c); return c
@router.put("/{cid}")
def actualizar(cid:int,data:ClienteCreate,db:Session=Depends(get_db)):
    c=db.query(Cliente).filter(Cliente.id==cid).first()
    if not c: raise HTTPException(404,"Cliente no encontrado")
    for k,v in data.dict().items(): setattr(c,k,v)
    db.commit(); db.refresh(c); return c
@router.delete("/{cid}")
def borrar(cid:int,db:Session=Depends(get_db)):
    c=db.query(Cliente).filter(Cliente.id==cid).first()
    if not c: raise HTTPException(404,"Cliente no encontrado")
    c.activo=False; db.commit(); return {"ok":True}
