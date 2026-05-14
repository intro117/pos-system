from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Usuario
import os

SECRET_KEY = os.getenv("SECRET_KEY", "pos-system-secret-key-cambiar-en-produccion")
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 horas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(Usuario).filter(Usuario.username == username, Usuario.activo == True).first()
    if user is None:
        raise credentials_exception
    return user

def require_admin(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Se requiere rol de administrador")
    return current_user

def create_default_users(db: Session):
    """Crea usuarios por defecto si no existen"""
    if not db.query(Usuario).first():
        users = [
            Usuario(username="admin",  nombre="Administrador", password=hash_password("admin123"),  rol="admin"),
            Usuario(username="cajero", nombre="Cajero",        password=hash_password("cajero123"), rol="cajero"),
        ]
        db.add_all(users)
        db.commit()
        print("✓ Usuarios por defecto creados: admin/admin123 y cajero/cajero123")
