from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Proveedor
from pydantic import BaseModel
router = APIRouter()
class ProveedorCreate(BaseModel):
    nombre:str; rfc:str=""; contacto:str=""; email:str=""
    telefono:str=""; direccion:str=""; notas:str=""
@router.get("/")
def listar(db:Session=Depends(get_db)):
    return db.query(Proveedor).filter(Proveedor.activo==True).all()
@router.post("/")
def crear(data:ProveedorCreate,db:Session=Depends(get_db)):
    p=Proveedor(**data.dict()); db.add(p); db.commit(); db.refresh(p); return p
@router.delete("/{pid}")
def borrar(pid:int,db:Session=Depends(get_db)):
    p=db.query(Proveedor).filter(Proveedor.id==pid).first()
    if not p: raise HTTPException(404,"Proveedor no encontrado")
    p.activo=False; db.commit(); return {"ok":True}
