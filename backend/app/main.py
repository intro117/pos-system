from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, SessionLocal
from app.models import Base, Usuario
from app.routes import productos, ventas, inventario, clientes, proveedores, reportes, config
from app.routes import auth as auth_router
from app.routes import admin as admin_router
from passlib.context import CryptContext

Base.metadata.create_all(bind=engine)

# Hash directo sin importar auth para evitar problemas de carga
_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

def _hash(pw: str) -> str:
    return _pwd.hash(pw[:72])

def init_users():
    db = SessionLocal()
    try:
        if db.query(Usuario).count() == 0:
            db.add_all([
                Usuario(username="admin",  nombre="Administrador",
                        password=_hash("admin123"),  rol="admin",  activo=True),
                Usuario(username="cajero", nombre="Cajero",
                        password=_hash("cajero123"), rol="cajero", activo=True),
            ])
            db.commit()
            print("✓ Usuarios creados: admin/admin123 | cajero/cajero123")
    except Exception as e:
        print(f"✗ Error: {e}")
        db.rollback()
    finally:
        db.close()

init_users()

app = FastAPI(title="POS System API", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(auth_router.router,  prefix="/api/auth",       tags=["Auth"])
app.include_router(admin_router.router, prefix="/api/admin",      tags=["Admin"])
app.include_router(config.router,       prefix="/api/config",     tags=["Config"])
app.include_router(productos.router,    prefix="/api/productos",  tags=["Productos"])
app.include_router(ventas.router,       prefix="/api/ventas",     tags=["Ventas"])
app.include_router(inventario.router,   prefix="/api/inventario", tags=["Inventario"])
app.include_router(clientes.router,     prefix="/api/clientes",   tags=["Clientes"])
app.include_router(proveedores.router,  prefix="/api/proveedores",tags=["Proveedores"])
app.include_router(reportes.router,     prefix="/api/reportes",   tags=["Reportes"])

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}

@app.post("/api/reset-users-emergency")
def reset_users():
    db = SessionLocal()
    try:
        db.query(Usuario).delete()
        db.add_all([
            Usuario(username="admin",  nombre="Administrador",
                    password=_hash("admin123"),  rol="admin",  activo=True),
            Usuario(username="cajero", nombre="Cajero",
                    password=_hash("cajero123"), rol="cajero", activo=True),
        ])
        db.commit()
        return {"ok": True, "msg": "Usuarios recreados correctamente"}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()
