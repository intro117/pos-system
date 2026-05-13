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
