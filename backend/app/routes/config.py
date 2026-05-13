from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Configuracion
from pydantic import BaseModel
from typing import Optional
router = APIRouter()
class ConfigUpdate(BaseModel):
    nombre_negocio:Optional[str]=None; rfc:Optional[str]=None
    direccion:Optional[str]=None; telefono:Optional[str]=None
    email:Optional[str]=None; logo_url:Optional[str]=None
    moneda:Optional[str]=None; simbolo_moneda:Optional[str]=None
    iva_porcentaje:Optional[float]=None; color_primario:Optional[str]=None
    ticket_footer:Optional[str]=None; tipo_negocio:Optional[str]=None
@router.get("/")
def get_config(db:Session=Depends(get_db)):
    cfg=db.query(Configuracion).first()
    if not cfg:
        cfg=Configuracion(); db.add(cfg); db.commit(); db.refresh(cfg)
    return cfg
@router.put("/")
def update_config(data:ConfigUpdate,db:Session=Depends(get_db)):
    cfg=db.query(Configuracion).first()
    if not cfg: cfg=Configuracion(); db.add(cfg)
    for k,v in data.dict(exclude_none=True).items(): setattr(cfg,k,v)
    db.commit(); db.refresh(cfg); return cfg
