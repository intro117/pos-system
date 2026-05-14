from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Usuario
from app.auth import verify_password, create_token, hash_password, get_current_user, require_admin
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class LoginResponse(BaseModel):
    access_token: str
    token_type:   str
    username:     str
    nombre:       str
    rol:          str

class UsuarioCreate(BaseModel):
    username: str
    nombre:   str
    password: str
    rol:      str = "cajero"

class PasswordChange(BaseModel):
    password_actual: str
    password_nuevo:  str

@router.post("/login", response_model=LoginResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(
        Usuario.username == form.username,
        Usuario.activo == True
    ).first()
    if not user or not verify_password(form.password, user.password):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    token = create_token({"sub": user.username, "rol": user.rol})
    return LoginResponse(
        access_token=token, token_type="bearer",
        username=user.username, nombre=user.nombre, rol=user.rol
    )

@router.get("/me")
def me(current_user: Usuario = Depends(get_current_user)):
    return {"username": current_user.username, "nombre": current_user.nombre, "rol": current_user.rol}

@router.get("/usuarios")
def listar_usuarios(admin=Depends(require_admin), db: Session = Depends(get_db)):
    return [{"id":u.id,"username":u.username,"nombre":u.nombre,"rol":u.rol,"activo":u.activo}
            for u in db.query(Usuario).all()]

@router.post("/usuarios")
def crear_usuario(data: UsuarioCreate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.username == data.username).first():
        raise HTTPException(400, "El usuario ya existe")
    u = Usuario(username=data.username, nombre=data.nombre,
                password=hash_password(data.password), rol=data.rol)
    db.add(u); db.commit(); db.refresh(u)
    return {"id":u.id,"username":u.username,"nombre":u.nombre,"rol":u.rol}

@router.delete("/usuarios/{uid}")
def borrar_usuario(uid: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    u = db.query(Usuario).filter(Usuario.id == uid).first()
    if not u: raise HTTPException(404, "Usuario no encontrado")
    if u.username == "admin": raise HTTPException(400, "No puedes eliminar al admin principal")
    u.activo = False; db.commit()
    return {"ok": True}

@router.post("/usuarios/{uid}/password")
def cambiar_password(uid: int, data: PasswordChange,
                     current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    u = db.query(Usuario).filter(Usuario.id == uid).first()
    if not u: raise HTTPException(404, "Usuario no encontrado")
    if current_user.rol != "admin" and current_user.id != uid:
        raise HTTPException(403, "Sin permisos")
    if not verify_password(data.password_actual, u.password):
        raise HTTPException(400, "Contraseña actual incorrecta")
    u.password = hash_password(data.password_nuevo)
    db.commit()
    return {"ok": True}
