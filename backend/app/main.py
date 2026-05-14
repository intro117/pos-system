from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, SessionLocal
from app.models import Base, Usuario
from app.routes import productos, ventas, inventario, clientes, proveedores, reportes, config
from app.routes import auth as auth_router
from app.routes import admin as admin_router
from app.auth import hash_password

# Crear todas las tablas
Base.metadata.create_all(bind=engine)

def init_users():
    """Crear usuarios por defecto si no existen"""
    db = SessionLocal()
    try:
        count = db.query(Usuario).count()
        if count == 0:
            print("→ Creando usuarios por defecto...")
            db.add_all([
                Usuario(username="admin",  nombre="Administrador",
                        password=hash_password("admin123"),  rol="admin",  activo=True),
                Usuario(username="cajero", nombre="Cajero",
                        password=hash_password("cajero123"), rol="cajero", activo=True),
            ])
            db.commit()
            print("✓ Usuarios creados: admin/admin123 y cajero/cajero123")
        else:
            print(f"→ Ya existen {count} usuario(s) en la DB")
    except Exception as e:
        print(f"✗ Error creando usuarios: {e}")
        db.rollback()
    finally:
        db.close()

init_users()

app = FastAPI(title="POS System API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Endpoint temporal para resetear usuarios (solo en emergencias)
@app.post("/api/reset-users-emergency")
def reset_users():
    db = SessionLocal()
    try:
        db.query(Usuario).delete()
        db.add_all([
            Usuario(username="admin",  nombre="Administrador",
                    password=hash_password("admin123"),  rol="admin",  activo=True),
            Usuario(username="cajero", nombre="Cajero",
                    password=hash_password("cajero123"), rol="cajero", activo=True),
        ])
        db.commit()
        return {"ok": True, "msg": "Usuarios recreados: admin/admin123 y cajero/cajero123"}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()
