from fastapi import APIRouter,Depends,HTTPException,UploadFile,File,Form
from sqlalchemy.orm import Session
from typing import Optional
import boto3,os,uuid,logging
from botocore.client import Config
from app.database import get_db
from app.models import Producto,Categoria,MovimientoInventario,TipoMovimiento
from pydantic import BaseModel

router=APIRouter()
logger=logging.getLogger(__name__)

MINIO_URL        = os.getenv("MINIO_URL","http://minio:9000")
MINIO_ACCESS     = os.getenv("MINIO_ACCESS_KEY","minioadmin")
MINIO_SECRET     = os.getenv("MINIO_SECRET_KEY","minioadmin123")
MINIO_BUCKET     = "pos-imagenes"
# FIX 4: URL pública separada de la URL interna de MinIO
# En localhost: igual que MINIO_URL (http://localhost:9000)
# En VPS: http://tudominio.com:9000 o https://storage.tudominio.com
# En Render QA: no aplica (MinIO no disponible en plan free)
MINIO_PUBLIC_URL = os.getenv("MINIO_PUBLIC_URL", MINIO_URL)

_s3_client=None

def get_s3():
    global _s3_client
    if _s3_client is None:
        _s3_client=boto3.client(
            "s3",endpoint_url=MINIO_URL,
            aws_access_key_id=MINIO_ACCESS,
            aws_secret_access_key=MINIO_SECRET,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1"
        )
    return _s3_client

def upload_img(file:UploadFile)->str:
    s3=get_s3()
    try:
        s3.head_bucket(Bucket=MINIO_BUCKET)
    except Exception:
        s3.create_bucket(Bucket=MINIO_BUCKET)
        s3.put_bucket_policy(
            Bucket=MINIO_BUCKET,
            Policy=f'{{"Version":"2012-10-17","Statement":[{{"Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::{MINIO_BUCKET}/*"}}]}}'
        )
    ext=file.filename.split(".")[-1] if "." in file.filename else "jpg"
    key=f"productos/{uuid.uuid4()}.{ext}"
    s3.upload_fileobj(
        file.file,MINIO_BUCKET,key,
        ExtraArgs={"ContentType":file.content_type or "image/jpeg"}
    )
    # FIX 4: Usar URL pública para que el navegador del cliente pueda acceder
    return f"{MINIO_PUBLIC_URL}/{MINIO_BUCKET}/{key}"

@router.get("/categorias")
def listar_cats(db:Session=Depends(get_db)):
    return db.query(Categoria).filter(Categoria.activa==True).all()

@router.post("/categorias")
def crear_cat(data:dict,db:Session=Depends(get_db)):
    c=Categoria(**{k:v for k,v in data.items() if k in ['nombre','descripcion','color','icono']})
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

@router.delete("/categorias/{cid}")
def borrar_cat(cid:int,db:Session=Depends(get_db)):
    c=db.query(Categoria).filter(Categoria.id==cid).first()
    if not c:raise HTTPException(404,"Categoría no encontrada")
    c.activa=False
    db.commit()
    return{"ok":True}

@router.get("/categorias/inactivas")
def listar_cats_inactivas(db:Session=Depends(get_db)):
    return db.query(Categoria).filter(Categoria.activa==False).all()

@router.put("/categorias/{cid}/restaurar")
def restaurar_cat(cid:int,db:Session=Depends(get_db)):
    c=db.query(Categoria).filter(Categoria.id==cid).first()
    if not c:raise HTTPException(404,"Categoría no encontrada")
    c.activa=True
    db.commit()
    db.refresh(c)
    return c

@router.get("/")
def listar(
    busqueda:str="",
    categoria_id:Optional[int]=None,
    limit:int=100,
    offset:int=0,
    db:Session=Depends(get_db)
):
    q=db.query(Producto).filter(Producto.activo==True)
    if busqueda:
        q=q.filter(
            (Producto.nombre.ilike(f"%{busqueda}%"))|
            (Producto.codigo.ilike(f"%{busqueda}%"))
        )
    if categoria_id:
        q=q.filter(Producto.categoria_id==categoria_id)
    q=q.order_by(Producto.nombre)
    total=q.count()
    productos=q.offset(offset).limit(limit).all()
    return{
        "total":total,
        "limit":limit,
        "offset":offset,
        "hay_mas":(offset+limit)<total,
        "items":[{
            "id":p.id,"codigo":p.codigo,"nombre":p.nombre,"descripcion":p.descripcion,
            "categoria_id":p.categoria_id,"categoria":p.categoria.nombre if p.categoria else None,
            "precio_costo":p.precio_costo,"precio_venta":p.precio_venta,
            "precio_con_iva":p.precio_con_iva,"aplica_iva":p.aplica_iva,
            "porcentaje_iva":p.porcentaje_iva,"stock_actual":p.stock_actual,
            "stock_minimo":p.stock_minimo,"alerta_stock":p.alerta_stock,
            "unidad_medida":p.unidad_medida,"imagen_url":p.imagen_url,
            "es_servicio":p.es_servicio
        } for p in productos]
    }

@router.post("/")
async def crear(
    codigo:str=Form(...),nombre:str=Form(...),descripcion:str=Form(""),
    categoria_id:Optional[int]=Form(None),precio_costo:float=Form(0.0),
    precio_venta:float=Form(...),aplica_iva:bool=Form(True),
    porcentaje_iva:float=Form(16.0),stock_actual:int=Form(0),
    stock_minimo:int=Form(5),stock_maximo:int=Form(100),
    unidad_medida:str=Form("pieza"),es_servicio:bool=Form(False),
    imagen:Optional[UploadFile]=File(None),db:Session=Depends(get_db)
):
    if db.query(Producto).filter(Producto.codigo==codigo).first():
        raise HTTPException(400,f"Ya existe producto con código {codigo}")
    img=""
    if imagen and imagen.filename:
        try:
            img=upload_img(imagen)
        except Exception as e:
            # FIX 5: Log del error en lugar de silenciarlo
            logger.warning(f"Error subiendo imagen para '{nombre}': {e}")
    p=Producto(
        codigo=codigo,nombre=nombre,descripcion=descripcion,categoria_id=categoria_id,
        precio_costo=precio_costo,precio_venta=precio_venta,aplica_iva=aplica_iva,
        porcentaje_iva=porcentaje_iva,stock_actual=stock_actual,stock_minimo=stock_minimo,
        stock_maximo=stock_maximo,unidad_medida=unidad_medida,es_servicio=es_servicio,imagen_url=img
    )
    db.add(p)
    if stock_actual>0:
        db.flush()
        db.add(MovimientoInventario(
            producto_id=p.id,tipo=TipoMovimiento.entrada,
            cantidad=stock_actual,stock_anterior=0,
            stock_nuevo=stock_actual,motivo="Stock inicial"
        ))
    db.commit()
    db.refresh(p)
    return p

@router.put("/{pid}")
async def actualizar(
    pid:int,codigo:str=Form(...),nombre:str=Form(...),descripcion:str=Form(""),
    categoria_id:Optional[int]=Form(None),precio_costo:float=Form(0.0),
    precio_venta:float=Form(...),aplica_iva:bool=Form(True),
    porcentaje_iva:float=Form(16.0),stock_minimo:int=Form(5),
    stock_maximo:int=Form(100),unidad_medida:str=Form("pieza"),
    es_servicio:bool=Form(False),imagen:Optional[UploadFile]=File(None),
    db:Session=Depends(get_db)
):
    p=db.query(Producto).filter(Producto.id==pid).first()
    if not p:raise HTTPException(404,"Producto no encontrado")
    p.codigo=codigo
    p.nombre=nombre
    p.descripcion=descripcion
    p.categoria_id=categoria_id
    p.precio_costo=precio_costo
    p.precio_venta=precio_venta
    p.aplica_iva=aplica_iva
    p.porcentaje_iva=porcentaje_iva
    p.stock_minimo=stock_minimo
    p.stock_maximo=stock_maximo
    p.unidad_medida=unidad_medida
    p.es_servicio=es_servicio
    if imagen and imagen.filename:
        try:
            p.imagen_url=upload_img(imagen)
        except Exception as e:
            logger.warning(f"Error subiendo imagen para producto {pid}: {e}")
    db.commit()
    db.refresh(p)
    return p

@router.delete("/{pid}")
def borrar(pid:int,db:Session=Depends(get_db)):
    p=db.query(Producto).filter(Producto.id==pid).first()
    if not p:raise HTTPException(404,"Producto no encontrado")
    p.activo=False
    db.commit()
    return{"ok":True}

class AjusteInv(BaseModel):
    tipo:str
    cantidad:float
    motivo:str=""
    proveedor_id:Optional[int]=None
    costo_unitario:float=0.0

@router.post("/{pid}/inventario")
def ajustar(pid:int,data:AjusteInv,db:Session=Depends(get_db)):
    p=db.query(Producto).filter(Producto.id==pid).first()
    if not p:raise HTTPException(404,"Producto no encontrado")
    ant=p.stock_actual
    if data.tipo=="entrada":
        p.stock_actual+=int(data.cantidad)
    elif data.tipo=="salida":
        if p.stock_actual<data.cantidad:
            raise HTTPException(400,"Stock insuficiente")
        p.stock_actual-=int(data.cantidad)
    else:
        p.stock_actual=int(data.cantidad)
    db.add(MovimientoInventario(
        producto_id=p.id,tipo=data.tipo,cantidad=data.cantidad,
        stock_anterior=ant,stock_nuevo=p.stock_actual,
        costo_unitario=data.costo_unitario,motivo=data.motivo
    ))
    db.commit()
    return{"stock_nuevo":p.stock_actual,"ok":True}

@router.get("/{pid}/movimientos")
def movimientos(pid:int,db:Session=Depends(get_db)):
    return[{
        "id":m.id,"tipo":m.tipo,"cantidad":m.cantidad,
        "stock_ant":m.stock_anterior,"stock_nuevo":m.stock_nuevo,
        "motivo":m.motivo,
        "created_at":m.created_at.isoformat() if m.created_at else None
    } for m in db.query(MovimientoInventario)
        .filter(MovimientoInventario.producto_id==pid)
        .order_by(MovimientoInventario.created_at.desc())
        .limit(50).all()]
