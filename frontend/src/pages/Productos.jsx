import React, { useState, useEffect } from 'react';
import { productosAPI } from '../utils/api';
import { Card, Btn, Input, Select, Modal, Table, Badge, Alert } from '../components/UI';

const COLORES = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ef4444','#06b6d4','#f97316','#84cc16'];
const ICONOS  = ['📦','💻','👕','🍔','💊','🔧','📱','🏠','🚗','✈️','🎮','📚','🌿','🍕','⚡','🎯'];

export default function Productos() {
  const [productos,   setProductos]   = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [busqueda,    setBusqueda]    = useState('');
  const [vista,       setVista]       = useState('productos'); // productos | categorias
  const [modal,       setModal]       = useState(false);
  const [modalCat,    setModalCat]    = useState(false);
  const [editando,    setEditando]    = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [imagen,      setImagen]      = useState(null);

  const initProd = {
    codigo:'', nombre:'', descripcion:'', categoria_id:'',
    precio_costo:0, precio_venta:0, aplica_iva:true,
    porcentaje_iva:16, stock_actual:0, stock_minimo:5,
    stock_maximo:100, unidad_medida:'pieza', es_servicio:false,
  };
  const initCat = { nombre:'', descripcion:'', color:'#3b82f6', icono:'📦' };
  const [form,    setForm]    = useState(initProd);
  const [formCat, setFormCat] = useState(initCat);
  const upd    = (k,v) => setForm(f=>({...f,[k]:v}));
  const updCat = (k,v) => setFormCat(f=>({...f,[k]:v}));

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const [p,c] = await Promise.all([productosAPI.listar(), productosAPI.categorias()]);
      setProductos(p); setCategorias(c);
    } catch(e) { setError(e.message); }
  };

  // ── Productos ──────────────────────────────────────────
  const abrirModal = (p=null) => {
    setEditando(p);
    setForm(p ? {
      codigo:p.codigo, nombre:p.nombre, descripcion:p.descripcion||'',
      categoria_id:p.categoria_id||'', precio_costo:p.precio_costo,
      precio_venta:p.precio_venta, aplica_iva:p.aplica_iva,
      porcentaje_iva:p.porcentaje_iva, stock_actual:p.stock_actual,
      stock_minimo:p.stock_minimo, stock_maximo:p.stock_maximo,
      unidad_medida:p.unidad_medida, es_servicio:p.es_servicio||false,
    } : initProd);
    setImagen(null); setError(''); setModal(true);
  };

  const guardarProducto = async () => {
    if (!form.nombre||!form.codigo||!form.precio_venta) {
      setError('Nombre, código y precio son obligatorios'); return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k,v));
      if (imagen) fd.append('imagen', imagen);
      if (editando) await productosAPI.actualizar(editando.id, fd);
      else           await productosAPI.crear(fd);
      setModal(false); cargar();
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const borrarProducto = async (id) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    try { await productosAPI.borrarCat(id); cargar(); }
    catch(e) { setError(e.message); }
  };

  // ── Categorías ─────────────────────────────────────────
  const guardarCategoria = async () => {
    if (!formCat.nombre) { setError('El nombre es obligatorio'); return; }
    try {
      await productosAPI.crearCat(formCat);
      setModalCat(false); setFormCat(initCat); cargar();
    } catch(e) { setError(e.message); }
  };

  const borrarCategoria = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría? Los productos asociados quedarán sin categoría.')) return;
    try { await productosAPI.borrarCat(id); cargar(); }
    catch(e) { setError(e.message); }
  };

  // ── Tabla de productos ─────────────────────────────────
  const colsProd = [
    { key:'imagen_url', label:'', render:v=>
      v ? <img src={v} alt="" style={{width:36,height:36,objectFit:'cover',borderRadius:6}}/>
        : <span style={{fontSize:24}}>📦</span>
    },
    { key:'codigo',        label:'Código',   style:{fontFamily:'monospace',color:'#64748b',fontSize:12} },
    { key:'nombre',        label:'Nombre',   style:{fontWeight:600} },
    { key:'categoria',     label:'Categoría',render:v=> v
      ? <span style={{fontSize:12}}>{categorias.find(c=>c.nombre===v)?.icono} {v}</span>
      : <span style={{color:'#475569',fontSize:12}}>—</span>
    },
    { key:'precio_venta',  label:'Precio',   render:v=>`$${Number(v).toFixed(2)}` },
    { key:'precio_con_iva',label:'C/IVA',    render:v=>`$${Number(v||0).toFixed(2)}` },
    { key:'stock_actual',  label:'Stock',    render:(v,r)=>
      <span style={{fontWeight:700,color:r.alerta_stock?'#ef4444':'#22c55e'}}>{v} {r.unidad_medida}</span>
    },
    { key:'alerta_stock',  label:'Estado',   render:v=>
      v ? <Badge text="⚠️ BAJO" color="#ef4444"/> : <Badge text="OK" color="#22c55e"/>
    },
    { key:'id', label:'Acciones', render:(v,r)=>(
      <div style={{display:'flex',gap:6}}>
        <Btn sm onClick={()=>abrirModal(r)}>Editar</Btn>
        <Btn sm onClick={()=>borrarProducto(v)} color="#991b1b">Borrar</Btn>
      </div>
    )},
  ];

  // ── Tabla de categorías ────────────────────────────────
  const colsCat = [
    { key:'icono',       label:'',          render:v=><span style={{fontSize:24}}>{v}</span> },
    { key:'nombre',      label:'Nombre',    style:{fontWeight:600} },
    { key:'descripcion', label:'Descripción' },
    { key:'color',       label:'Color',     render:v=>
      <div style={{display:'flex',alignItems:'center',gap:6}}>
        <div style={{width:16,height:16,borderRadius:4,background:v}}/>
        <span style={{fontSize:11,fontFamily:'monospace',color:'#64748b'}}>{v}</span>
      </div>
    },
    { key:'id', label:'Acción', render:v=>(
      <Btn sm onClick={()=>borrarCategoria(v)} color="#991b1b">Borrar</Btn>
    )},
  ];

  const filtrados = productos.filter(p=>
    !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo.includes(busqueda)
  );

  return (
    <div>
      {error && <Alert type="error">{error}</Alert>}

      {/* Tabs Productos / Categorías */}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        <button onClick={()=>setVista('productos')}
          style={{padding:'8px 20px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:600,fontSize:13,
            background:vista==='productos'?'#1d4ed8':'#1e293b',color:vista==='productos'?'#fff':'#94a3b8'}}>
          🏷️ Productos ({productos.length})
        </button>
        <button onClick={()=>setVista('categorias')}
          style={{padding:'8px 20px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:600,fontSize:13,
            background:vista==='categorias'?'#1d4ed8':'#1e293b',color:vista==='categorias'?'#fff':'#94a3b8'}}>
          📂 Categorías ({categorias.length})
        </button>
      </div>

      {/* ── VISTA PRODUCTOS ── */}
      {vista==='productos' && (
        <>
          <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
            <input value={busqueda} onChange={e=>setBusqueda(e.target.value)}
              placeholder="🔍 Buscar producto..."
              style={{flex:1,minWidth:200,padding:'8px 12px',borderRadius:8,border:'1px solid #334155',
                background:'#0f172a',color:'#e2e8f0',fontSize:13}}/>
            <Btn onClick={()=>abrirModal()}>+ Nuevo producto</Btn>
          </div>
          <Card>
            <Table cols={colsProd} rows={filtrados} empty="No hay productos. Agrega el primero."/>
          </Card>
        </>
      )}

      {/* ── VISTA CATEGORÍAS ── */}
      {vista==='categorias' && (
        <>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
            <Btn onClick={()=>{ setFormCat(initCat); setError(''); setModalCat(true); }}>
              + Nueva categoría
            </Btn>
          </div>

          {/* Cards de categorías */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:16}}>
            {categorias.map(c=>(
              <Card key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:14}}>
                <div style={{width:44,height:44,borderRadius:10,background:c.color+'22',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,
                  border:`1px solid ${c.color}44`,flexShrink:0}}>
                  {c.icono}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:14,color:'#f1f5f9'}}>{c.nombre}</div>
                  <div style={{fontSize:11,color:'#64748b',marginTop:2}}>
                    {productos.filter(p=>p.categoria_id===c.id).length} productos
                  </div>
                </div>
                <button onClick={()=>borrarCategoria(c.id)}
                  style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:16,flexShrink:0}}>
                  ✕
                </button>
              </Card>
            ))}
            {!categorias.length && (
              <div style={{gridColumn:'1/-1',textAlign:'center',padding:32,color:'#475569'}}>
                No hay categorías. Crea la primera.
              </div>
            )}
          </div>

          <Card>
            <Table cols={colsCat} rows={categorias} empty="Sin categorías."/>
          </Card>
        </>
      )}

      {/* ── MODAL PRODUCTO ── */}
      <Modal open={modal} onClose={()=>setModal(false)}
        title={editando?`Editar: ${editando.nombre}`:'Nuevo producto'} width={620}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Input label="Código *"       value={form.codigo}       onChange={e=>upd('codigo',e.target.value)}/>
          <Input label="Nombre *"       value={form.nombre}       onChange={e=>upd('nombre',e.target.value)}/>
          <Input label="Precio costo"   type="number" value={form.precio_costo}  onChange={e=>upd('precio_costo',parseFloat(e.target.value)||0)}/>
          <Input label="Precio venta *" type="number" value={form.precio_venta}  onChange={e=>upd('precio_venta',parseFloat(e.target.value)||0)}/>
          <Select label="Categoría" value={form.categoria_id} onChange={e=>upd('categoria_id',e.target.value)}
            options={[{value:'',label:'Sin categoría'},...categorias.map(c=>({value:c.id,label:`${c.icono} ${c.nombre}`}))]}/>
          <Input label="Unidad de medida" value={form.unidad_medida} onChange={e=>upd('unidad_medida',e.target.value)}/>
          <Input label="Stock inicial"  type="number" value={form.stock_actual}  onChange={e=>upd('stock_actual',parseInt(e.target.value)||0)}/>
          <Input label="Stock mínimo"   type="number" value={form.stock_minimo}  onChange={e=>upd('stock_minimo',parseInt(e.target.value)||0)}/>
        </div>

        <div style={{display:'flex',gap:16,margin:'12px 0',alignItems:'center',flexWrap:'wrap'}}>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,cursor:'pointer'}}>
            <input type="checkbox" checked={form.aplica_iva}
              onChange={e=>upd('aplica_iva',e.target.checked)}/>
            Aplica IVA
          </label>
          {form.aplica_iva && (
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:13,color:'#94a3b8'}}>%</span>
              <input type="number" value={form.porcentaje_iva}
                onChange={e=>upd('porcentaje_iva',parseFloat(e.target.value)||0)}
                style={{width:55,padding:'4px 8px',borderRadius:6,border:'1px solid #334155',
                  background:'#0f172a',color:'#e2e8f0',fontSize:12}}/>
            </div>
          )}
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,cursor:'pointer'}}>
            <input type="checkbox" checked={form.es_servicio}
              onChange={e=>upd('es_servicio',e.target.checked)}/>
            Es servicio (sin stock)
          </label>
        </div>

        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,color:'#94a3b8',display:'block',marginBottom:4}}>
            Imagen del producto
          </label>
          <input type="file" accept="image/*" onChange={e=>setImagen(e.target.files[0])}
            style={{fontSize:13,color:'#94a3b8'}}/>
          {editando?.imagen_url && !imagen && (
            <img src={editando.imagen_url} alt="" style={{marginTop:8,height:60,borderRadius:8}}/>
          )}
        </div>

        {error && <Alert type="error">{error}</Alert>}
        <div style={{display:'flex',gap:8}}>
          <Btn onClick={()=>setModal(false)} color="#374151" style={{flex:1}}>Cancelar</Btn>
          <Btn onClick={guardarProducto} disabled={loading} style={{flex:1}}>
            {loading?'Guardando...':editando?'Actualizar':'Crear producto'}
          </Btn>
        </div>
      </Modal>

      {/* ── MODAL CATEGORÍA ── */}
      <Modal open={modalCat} onClose={()=>setModalCat(false)} title="Nueva categoría" width={480}>
        <Input label="Nombre *" value={formCat.nombre} onChange={e=>updCat('nombre',e.target.value)}
          placeholder="ej: Electrónica, Ropa, Alimentos..."/>
        <Input label="Descripción" value={formCat.descripcion} onChange={e=>updCat('descripcion',e.target.value)}
          placeholder="Opcional"/>

        {/* Selector de icono */}
        <div style={{marginBottom:12}}>
          <label style={{fontSize:12,color:'#94a3b8',display:'block',marginBottom:6}}>Ícono</label>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {ICONOS.map(ico=>(
              <button key={ico} onClick={()=>updCat('icono',ico)}
                style={{width:38,height:38,borderRadius:8,border:`2px solid ${formCat.icono===ico?'#3b82f6':'#334155'}`,
                  background:formCat.icono===ico?'#1d4ed822':'transparent',
                  fontSize:18,cursor:'pointer'}}>
                {ico}
              </button>
            ))}
          </div>
        </div>

        {/* Selector de color */}
        <div style={{marginBottom:16}}>
          <label style={{fontSize:12,color:'#94a3b8',display:'block',marginBottom:6}}>Color</label>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            {COLORES.map(c=>(
              <button key={c} onClick={()=>updCat('color',c)}
                style={{width:28,height:28,borderRadius:6,background:c,border:`3px solid ${formCat.color===c?'#fff':'transparent'}`,
                  cursor:'pointer',boxShadow:formCat.color===c?`0 0 0 2px ${c}`:'none'}}>
              </button>
            ))}
            <input type="color" value={formCat.color} onChange={e=>updCat('color',e.target.value)}
              style={{width:32,height:32,borderRadius:6,border:'1px solid #334155',cursor:'pointer'}}/>
          </div>
        </div>

        {/* Preview */}
        <div style={{background:'#0f172a',borderRadius:10,padding:12,marginBottom:14,
          display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:44,height:44,borderRadius:10,background:formCat.color+'22',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,
            border:`1px solid ${formCat.color}44`}}>
            {formCat.icono}
          </div>
          <div>
            <div style={{fontWeight:600,fontSize:14,color:'#f1f5f9'}}>{formCat.nombre||'Vista previa'}</div>
            <div style={{fontSize:11,color:'#64748b'}}>0 productos</div>
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}
        <div style={{display:'flex',gap:8}}>
          <Btn onClick={()=>setModalCat(false)} color="#374151" style={{flex:1}}>Cancelar</Btn>
          <Btn onClick={guardarCategoria} style={{flex:1}}>Crear categoría</Btn>
        </div>
      </Modal>
    </div>
  );
}
