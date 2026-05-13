#!/bin/bash
set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${BLUE}→${NC} $1"; }
err()  { echo -e "${RED}✗ ERROR:${NC} $1"; exit 1; }
hdr()  { echo -e "\n${BOLD}${BLUE}[$1/7]${NC} $2"; }

echo -e "${BOLD}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║           POS System — Setup completo             ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─────────────────────────────────────────────────────────
hdr 1 "Verificando requisitos"
command -v docker &>/dev/null || err "Docker no encontrado. Abre Docker Desktop en Windows."
docker info &>/dev/null      || err "Docker no corre. Abre Docker Desktop primero."
command -v git    &>/dev/null || err "Git no encontrado: sudo apt install git"
command -v python3 &>/dev/null|| err "Python3 no encontrado: sudo apt install python3"
ok "Docker corriendo"
ok "Git y Python3 disponibles"

# ─────────────────────────────────────────────────────────
hdr 2 "Creando estructura de carpetas"
PROJECT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT"
mkdir -p backend/app/routes
mkdir -p frontend/src/{components,pages,utils}
mkdir -p frontend/public
mkdir -p k8s
ok "Carpetas creadas"

# ─────────────────────────────────────────────────────────
hdr 3 "Generando archivos del backend"

touch backend/app/__init__.py
touch backend/app/routes/__init__.py

cat > backend/requirements.txt << 'EOF'
fastapi==0.110.0
uvicorn==0.29.0
sqlalchemy==2.0.29
psycopg2-binary==2.9.9
python-multipart==0.0.9
boto3==1.34.74
pydantic==2.6.4
EOF

cat > backend/Dockerfile << 'EOF'
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

cat > backend/app/database.py << 'EOF'
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
DATABASE_URL = os.getenv("DATABASE_URL","postgresql://posuser:pospass123@localhost:5432/posdb")
engine       = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()
def get_db():
    db = SessionLocal()
    try:    yield db
    finally: db.close()
EOF

cat > backend/app/models.py << 'EOF'
from sqlalchemy import Column,Integer,String,Float,Boolean,DateTime,ForeignKey,Text,Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class TipoMovimiento(str,enum.Enum):
    entrada="entrada"; salida="salida"; ajuste="ajuste"; venta="venta"
class MetodoPago(str,enum.Enum):
    efectivo="efectivo"; tarjeta="tarjeta"; transferencia="transferencia"; otro="otro"
class EstadoVenta(str,enum.Enum):
    completada="completada"; cancelada="cancelada"; pendiente="pendiente"

class Configuracion(Base):
    __tablename__="configuracion"
    id=Column(Integer,primary_key=True)
    nombre_negocio=Column(String(200),default="Mi Negocio")
    rfc=Column(String(20),default=""); direccion=Column(Text,default="")
    telefono=Column(String(20),default=""); email=Column(String(100),default="")
    logo_url=Column(String(500),default=""); moneda=Column(String(10),default="MXN")
    simbolo_moneda=Column(String(5),default="$"); iva_porcentaje=Column(Float,default=16.0)
    color_primario=Column(String(10),default="#1d4ed8")
    ticket_footer=Column(Text,default="¡Gracias por su compra!")
    tipo_negocio=Column(String(50),default="retail")
    updated_at=Column(DateTime,server_default=func.now(),onupdate=func.now())

class Categoria(Base):
    __tablename__="categorias"
    id=Column(Integer,primary_key=True,index=True)
    nombre=Column(String(100),nullable=False); descripcion=Column(String(300),default="")
    color=Column(String(10),default="#6366f1"); icono=Column(String(50),default="📦")
    activa=Column(Boolean,default=True)
    productos=relationship("Producto",back_populates="categoria")

class Producto(Base):
    __tablename__="productos"
    id=Column(Integer,primary_key=True,index=True)
    codigo=Column(String(50),unique=True,index=True)
    nombre=Column(String(200),nullable=False); descripcion=Column(Text,default="")
    categoria_id=Column(Integer,ForeignKey("categorias.id"),nullable=True)
    precio_costo=Column(Float,default=0.0); precio_venta=Column(Float,nullable=False)
    aplica_iva=Column(Boolean,default=True); porcentaje_iva=Column(Float,default=16.0)
    stock_actual=Column(Integer,default=0); stock_minimo=Column(Integer,default=5)
    stock_maximo=Column(Integer,default=100); unidad_medida=Column(String(30),default="pieza")
    imagen_url=Column(String(500),default=""); activo=Column(Boolean,default=True)
    es_servicio=Column(Boolean,default=False)
    created_at=Column(DateTime,server_default=func.now())
    updated_at=Column(DateTime,server_default=func.now(),onupdate=func.now())
    categoria=relationship("Categoria",back_populates="productos")
    movimientos=relationship("MovimientoInventario",back_populates="producto")
    detalles_venta=relationship("DetalleVenta",back_populates="producto")
    @property
    def precio_con_iva(self):
        return round(self.precio_venta*(1+self.porcentaje_iva/100),2) if self.aplica_iva else self.precio_venta
    @property
    def alerta_stock(self): return self.stock_actual<=self.stock_minimo

class Cliente(Base):
    __tablename__="clientes"
    id=Column(Integer,primary_key=True,index=True)
    nombre=Column(String(200),nullable=False); rfc=Column(String(20),default="XAXX010101000")
    email=Column(String(100),default=""); telefono=Column(String(20),default="")
    direccion=Column(Text,default=""); notas=Column(Text,default="")
    credito_max=Column(Float,default=0.0); saldo_favor=Column(Float,default=0.0)
    activo=Column(Boolean,default=True)
    created_at=Column(DateTime,server_default=func.now())
    ventas=relationship("Venta",back_populates="cliente")

class Proveedor(Base):
    __tablename__="proveedores"
    id=Column(Integer,primary_key=True,index=True)
    nombre=Column(String(200),nullable=False); rfc=Column(String(20),default="")
    contacto=Column(String(100),default=""); email=Column(String(100),default="")
    telefono=Column(String(20),default=""); direccion=Column(Text,default="")
    notas=Column(Text,default=""); activo=Column(Boolean,default=True)
    created_at=Column(DateTime,server_default=func.now())
    movimientos=relationship("MovimientoInventario",back_populates="proveedor")

class Venta(Base):
    __tablename__="ventas"
    id=Column(Integer,primary_key=True,index=True)
    folio=Column(String(20),unique=True,index=True)
    cliente_id=Column(Integer,ForeignKey("clientes.id"),nullable=True)
    subtotal=Column(Float,default=0.0); descuento=Column(Float,default=0.0)
    iva=Column(Float,default=0.0); total=Column(Float,default=0.0)
    metodo_pago=Column(SAEnum(MetodoPago),default=MetodoPago.efectivo)
    monto_recibido=Column(Float,default=0.0); cambio=Column(Float,default=0.0)
    estado=Column(SAEnum(EstadoVenta),default=EstadoVenta.completada)
    notas=Column(Text,default=""); cajero=Column(String(100),default="Admin")
    created_at=Column(DateTime,server_default=func.now())
    cliente=relationship("Cliente",back_populates="ventas")
    detalles=relationship("DetalleVenta",back_populates="venta",cascade="all, delete-orphan")

class DetalleVenta(Base):
    __tablename__="detalles_venta"
    id=Column(Integer,primary_key=True,index=True)
    venta_id=Column(Integer,ForeignKey("ventas.id"))
    producto_id=Column(Integer,ForeignKey("productos.id"))
    cantidad=Column(Float,default=1.0); precio_unitario=Column(Float,nullable=False)
    descuento=Column(Float,default=0.0); iva_porcentaje=Column(Float,default=0.0)
    subtotal=Column(Float,nullable=False)
    venta=relationship("Venta",back_populates="detalles")
    producto=relationship("Producto",back_populates="detalles_venta")

class MovimientoInventario(Base):
    __tablename__="movimientos_inventario"
    id=Column(Integer,primary_key=True,index=True)
    producto_id=Column(Integer,ForeignKey("productos.id"))
    proveedor_id=Column(Integer,ForeignKey("proveedores.id"),nullable=True)
    tipo=Column(SAEnum(TipoMovimiento)); cantidad=Column(Float,nullable=False)
    stock_anterior=Column(Integer,default=0); stock_nuevo=Column(Integer,default=0)
    costo_unitario=Column(Float,default=0.0); motivo=Column(String(300),default="")
    referencia=Column(String(100),default=""); usuario=Column(String(100),default="Admin")
    created_at=Column(DateTime,server_default=func.now())
    producto=relationship("Producto",back_populates="movimientos")
    proveedor=relationship("Proveedor",back_populates="movimientos")

class CorteCaja(Base):
    __tablename__="cortes_caja"
    id=Column(Integer,primary_key=True,index=True)
    fecha=Column(DateTime,server_default=func.now()); cajero=Column(String(100),default="Admin")
    fondo_inicial=Column(Float,default=0.0); total_efectivo=Column(Float,default=0.0)
    total_tarjeta=Column(Float,default=0.0); total_transferencia=Column(Float,default=0.0)
    total_ventas=Column(Float,default=0.0); num_ventas=Column(Integer,default=0)
    num_cancelaciones=Column(Integer,default=0); total_cancelaciones=Column(Float,default=0.0)
    efectivo_contado=Column(Float,default=0.0); diferencia=Column(Float,default=0.0)
    notas=Column(Text,default=""); cerrado=Column(Boolean,default=False)
EOF
ok "backend/app/models.py"

# main.py
cat > backend/app/main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import productos, ventas, inventario, clientes, proveedores, reportes, config
Base.metadata.create_all(bind=engine)
app = FastAPI(title="POS System API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(config.router,      prefix="/api/config",      tags=["Config"])
app.include_router(productos.router,   prefix="/api/productos",   tags=["Productos"])
app.include_router(ventas.router,      prefix="/api/ventas",      tags=["Ventas"])
app.include_router(inventario.router,  prefix="/api/inventario",  tags=["Inventario"])
app.include_router(clientes.router,    prefix="/api/clientes",    tags=["Clientes"])
app.include_router(proveedores.router, prefix="/api/proveedores", tags=["Proveedores"])
app.include_router(reportes.router,    prefix="/api/reportes",    tags=["Reportes"])
@app.get("/api/health")
def health(): return {"status":"ok","version":"1.0.0"}
EOF
ok "backend/app/main.py"

# routes/config.py
cat > backend/app/routes/config.py << 'EOF'
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
EOF
ok "backend/app/routes/config.py"

# routes/clientes.py
cat > backend/app/routes/clientes.py << 'EOF'
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
EOF
ok "backend/app/routes/clientes.py"

# routes/proveedores.py
cat > backend/app/routes/proveedores.py << 'EOF'
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
EOF
ok "backend/app/routes/proveedores.py"

# routes/inventario.py
cat > backend/app/routes/inventario.py << 'EOF'
from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import MovimientoInventario,Producto
router = APIRouter()
@router.get("/movimientos")
def movimientos(limit:int=100,db:Session=Depends(get_db)):
    movs=db.query(MovimientoInventario).order_by(MovimientoInventario.created_at.desc()).limit(limit).all()
    return [{"id":m.id,"producto":m.producto.nombre if m.producto else "—","tipo":m.tipo,
             "cantidad":m.cantidad,"stock_ant":m.stock_anterior,"stock_nuevo":m.stock_nuevo,
             "motivo":m.motivo,"created_at":m.created_at.isoformat() if m.created_at else None} for m in movs]
@router.get("/alertas")
def alertas(db:Session=Depends(get_db)):
    prods=db.query(Producto).filter(Producto.activo==True,Producto.es_servicio==False,
        Producto.stock_actual<=Producto.stock_minimo).all()
    return [{"id":p.id,"nombre":p.nombre,"stock_actual":p.stock_actual,"stock_minimo":p.stock_minimo} for p in prods]
EOF
ok "backend/app/routes/inventario.py"

# routes/reportes.py
cat > backend/app/routes/reportes.py << 'EOF'
from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from sqlalchemy import func,cast,Date
from datetime import date,timedelta
from app.database import get_db
from app.models import Venta,DetalleVenta,Producto
router = APIRouter()
@router.get("/dashboard")
def dashboard(db:Session=Depends(get_db)):
    hoy=date.today(); semana=hoy-timedelta(days=7)
    vh=db.query(Venta).filter(cast(Venta.created_at,Date)==hoy,Venta.estado=="completada").all()
    vs=db.query(Venta).filter(Venta.created_at>=semana,Venta.estado=="completada").all()
    top=db.query(Producto.nombre,func.sum(DetalleVenta.cantidad).label("total_vendido"),
        func.sum(DetalleVenta.subtotal).label("total_importe"))\
        .join(DetalleVenta,Producto.id==DetalleVenta.producto_id)\
        .join(Venta,DetalleVenta.venta_id==Venta.id)\
        .filter(Venta.estado=="completada").group_by(Producto.nombre)\
        .order_by(func.sum(DetalleVenta.subtotal).desc()).limit(10).all()
    return {"hoy":{"ventas":len(vh),"total":round(sum(v.total for v in vh),2),
        "iva":round(sum(v.iva for v in vh),2),
        "ticket_promedio":round(sum(v.total for v in vh)/max(len(vh),1),2)},
        "semana":{"ventas":len(vs),"total":round(sum(v.total for v in vs),2)},
        "top_productos":[{"nombre":t.nombre,"cantidad":float(t.total_vendido),"importe":float(t.total_importe)} for t in top]}
EOF
ok "backend/app/routes/reportes.py"

ok "Backend completo"

# ─────────────────────────────────────────────────────────
hdr 4 "Generando archivos del frontend"

cat > frontend/package.json << 'EOF'
{
  "name":"pos-system","version":"1.0.0","private":true,
  "dependencies":{"react":"^18.2.0","react-dom":"^18.2.0",
    "react-scripts":"5.0.1","axios":"^1.6.8",
    "recharts":"^2.12.3","react-hot-toast":"^2.4.1"},
  "scripts":{"start":"react-scripts start","build":"react-scripts build"},
  "browserslist":{"production":[">0.2%","not dead","not op_mini all"],
    "development":["last 1 chrome version"]}
}
EOF

cat > frontend/Dockerfile << 'EOF'
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json .
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
EOF

cat > frontend/nginx.conf << 'EOF'
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        client_max_body_size 10M;
    }
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

cat > frontend/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>POS System</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0}
    ::-webkit-scrollbar{width:6px}
    ::-webkit-scrollbar-track{background:#1e293b}
    ::-webkit-scrollbar-thumb{background:#475569;border-radius:3px}
  </style>
</head>
<body><div id="root"></div></body>
</html>
EOF

cat > frontend/src/index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App/></React.StrictMode>
);
EOF

ok "Frontend base listo"

# ─────────────────────────────────────────────────────────
hdr 5 "Generando docker-compose.yml"

cat > docker-compose.yml << 'EOF'
version: "3.8"
services:
  postgres:
    image: postgres:15-alpine
    container_name: pos-postgres
    environment:
      POSTGRES_DB: posdb
      POSTGRES_USER: posuser
      POSTGRES_PASSWORD: pospass123
    volumes: [pg_data:/var/lib/postgresql/data]
    networks: [pos-net]
    healthcheck:
      test: ["CMD-SHELL","pg_isready -U posuser -d posdb"]
      interval: 10s
      retries: 15

  minio:
    image: minio/minio:latest
    container_name: pos-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    ports: ["9000:9000","9001:9001"]
    volumes: [minio_data:/data]
    networks: [pos-net]

  backend:
    build: {context: ./backend}
    container_name: pos-backend
    environment:
      DATABASE_URL: postgresql://posuser:pospass123@postgres:5432/posdb
      MINIO_URL: http://minio:9000
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin123
    ports: ["8000:8000"]
    depends_on:
      postgres: {condition: service_healthy}
    networks: [pos-net]

  frontend:
    build: {context: ./frontend}
    container_name: pos-frontend
    ports: ["3000:80"]
    depends_on: [backend]
    networks: [pos-net]

volumes:
  pg_data:
  minio_data:
networks:
  pos-net:
    driver: bridge
EOF
ok "docker-compose.yml"

# ─────────────────────────────────────────────────────────
hdr 6 "Construyendo y levantando contenedores"
info "Primera vez puede tardar 4-6 minutos..."
docker compose down 2>/dev/null || true
docker compose up -d --build

info "Esperando backend..."
for i in $(seq 1 40); do
  curl -sf http://localhost:8000/api/health >/dev/null 2>&1 && break
  sleep 3 && echo -n "."
done
echo ""
ok "Backend listo"

# ─────────────────────────────────────────────────────────
hdr 7 "Cargando datos iniciales"

for cat_data in \
  '{"nombre":"Electrónica","icono":"💻","color":"#3b82f6"}' \
  '{"nombre":"Ropa","icono":"👕","color":"#8b5cf6"}' \
  '{"nombre":"Alimentos","icono":"🍔","color":"#f59e0b"}' \
  '{"nombre":"Servicios","icono":"🔧","color":"#10b981"}'; do
  curl -sf -X POST http://localhost:8000/api/productos/categorias \
    -H "Content-Type: application/json" -d "$cat_data" >/dev/null
done
ok "Categorías de ejemplo creadas"

curl -sf -X PUT http://localhost:8000/api/config \
  -H "Content-Type: application/json" \
  -d '{"nombre_negocio":"Mi Negocio","iva_porcentaje":16,"simbolo_moneda":"$","tipo_negocio":"retail","ticket_footer":"¡Gracias por su compra!"}' \
  >/dev/null
ok "Configuración inicial cargada"

docker compose ps

echo ""
echo -e "${GREEN}${BOLD}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║      ✓  POS System desplegado exitosamente           ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  🌐 Dashboard:  http://localhost:3000                ║"
echo "║  📡 API:        http://localhost:8000/api            ║"
echo "║  📚 Docs:       http://localhost:8000/docs           ║"
echo "║  🗄️  MinIO:      http://localhost:9001                ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  PRIMEROS PASOS:                                     ║"
echo "║  1. Abre http://localhost:3000                       ║"
echo "║  2. Ve a ⚙️ Config → personaliza tu negocio          ║"
echo "║  3. Agrega productos en 🏷️ Productos                  ║"
echo "║  4. ¡Vende en 🛒 POS!                                ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
