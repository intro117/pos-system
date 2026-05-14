from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import productos, ventas, inventario, clientes, proveedores, reportes, config

Base.metadata.create_all(bind=engine)

app = FastAPI(title="POS System API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Permite cualquier origen
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(config.router,      prefix="/api/config",      tags=["Config"])
app.include_router(productos.router,   prefix="/api/productos",   tags=["Productos"])
app.include_router(ventas.router,      prefix="/api/ventas",      tags=["Ventas"])
app.include_router(inventario.router,  prefix="/api/inventario",  tags=["Inventario"])
app.include_router(clientes.router,    prefix="/api/clientes",    tags=["Clientes"])
app.include_router(proveedores.router, prefix="/api/proveedores", tags=["Proveedores"])
app.include_router(reportes.router,    prefix="/api/reportes",    tags=["Reportes"])

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
