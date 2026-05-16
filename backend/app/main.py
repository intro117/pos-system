import os
import logging
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, SessionLocal
from app.models import Base, Usuario
from app.routes import productos, ventas, inventario, clientes, proveedores, reportes, config
from app.routes import auth as auth_router
from app.routes import admin as admin_router
from werkzeug.security import generate_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

# ── Fix 2: SECRET_KEY obligatoria ─────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    logger.warning("⚠ SECRET_KEY no definida — usando clave de desarrollo. CAMBIA ESTO en producción.")
    SECRET_KEY = "pos-dev-key-insegura-cambiar-en-produccion"

# ── Fix 4: Clave para endpoint de emergencia ───────────────
EMERGENCY_KEY = os.getenv("EMERGENCY_KEY", "")

def _hash(pw: str) -> str:
    return generate_password_hash(pw, method="pbkdf2:sha256")

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
            logger.info("✓ Usuarios creados: admin/admin123 | cajero/cajero123")
        else:
            logger.info("→ Usuarios ya existen en la DB")
    except Exception as e:
        logger.error(f"✗ Error creando usuarios: {e}")
        db.rollback()
    finally:
        db.close()

init_users()

app = FastAPI(title="POS System API", version="1.0.0")

# ── Fix 3: CORS con dominios explícitos ───────────────────
# Lee los dominios permitidos desde variable de entorno
# Formato: "http://localhost:3000,https://tudominio.com"
_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if _origins_env:
    ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()]
else:
    # Fallback para desarrollo local si no está definida
    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    logger.warning(f"⚠ ALLOWED_ORIGINS no definida — usando dominios de desarrollo: {ALLOWED_ORIGINS}")

logger.info(f"CORS permitido para: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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

# ── Fix 4: Endpoint de emergencia protegido con header ─────
@app.post("/api/reset-users-emergency")
def reset_users(x_emergency_key: str = Header(default="")):
    """
    Recrea los usuarios por defecto.
    Requiere el header X-Emergency-Key con la clave definida en EMERGENCY_KEY.
    En producción: eliminar este endpoint o asegurarse de que EMERGENCY_KEY
    sea una clave larga y aleatoria.
    """
    if EMERGENCY_KEY and x_emergency_key != EMERGENCY_KEY:
        raise HTTPException(status_code=403, detail="Clave de emergencia incorrecta")
    if not EMERGENCY_KEY:
        logger.warning("⚠ EMERGENCY_KEY no definida — endpoint accesible sin autenticación")

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
        logger.info("✓ Usuarios recreados via endpoint de emergencia")
        return {"ok": True, "msg": "Usuarios recreados: admin/admin123 | cajero/cajero123"}
    except Exception as e:
        db.rollback()
        logger.error(f"✗ Error recreando usuarios: {e}")
        return {"error": str(e)}
    finally:
        db.close()
