from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.models import Base as ModelsBase
from app.routes import productos, ventas, inventario, clientes, proveedores, reportes, config
from app.routes import auth as auth_router
from app.routes import admin as admin_router
from app.auth import create_default_users

ModelsBase.metadata.create_all(bind=engine)

# Crear usuarios por defecto
db = SessionLocal()
try:
    create_default_users(db)
finally:
    db.close()

app = FastAPI(title="POS System API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router,     prefix="/api/auth",       tags=["Auth"])
app.include_router(admin_router.router,    prefix="/api/admin",      tags=["Admin"])
app.include_router(config.router,          prefix="/api/config",     tags=["Config"])
app.include_router(productos.router,       prefix="/api/productos",  tags=["Productos"])
app.include_router(ventas.router,          prefix="/api/ventas",     tags=["Ventas"])
app.include_router(inventario.router,      prefix="/api/inventario", tags=["Inventario"])
app.include_router(clientes.router,        prefix="/api/clientes",   tags=["Clientes"])
app.include_router(proveedores.router,     prefix="/api/proveedores",tags=["Proveedores"])
app.include_router(reportes.router,        prefix="/api/reportes",   tags=["Reportes"])

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
