import React, { useState, useEffect } from 'react';
import { productosAPI } from '../utils/api';
import { Card, Btn, Input, Select, Modal, Table, Badge, Alert } from '../components/UI';

export default function Productos() {
  const [productos,  setProductos]  = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda,   setBusqueda]   = useState('');
  const [modal,      setModal]      = useState(false);
  const [editando,   setEditando]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [imagen,     setImagen]     = useState(null);
  const init = { codigo:'', nombre:'', descripcion:'', categoria_id:'',
    precio_costo:0, precio_venta:0, aplica_iva:true, porcentaje_iva:16,
    stock_actual:0, stock_minimo:5, stock_maximo:100, unidad_medida:'pieza', es_servicio:false };
  const [form, setForm] = useState(init);

  useEffect(() => { cargar(); }, []);
  const cargar = async () => {
    try {
      const [p, c] = await Promise.all([productosAPI.listar(), productosAPI.categorias()]);
      setProductos(p); setCategorias(c);
    } catch(e) { setError(e.message); }
  };

  const abrirModal = (p = null) => {
    setEditando(p);
    setForm(p ? { codigo:p.codigo, nombre:p.nombre, descripcion:p.descripcion||'',
      categoria_id:p.categoria_id||'', precio_costo:p.precio_costo,
      precio_venta:p.precio_venta, aplica_iva:p.aplica_iva, porcentaje_iva:p.porcentaje_iva,
      stock_actual:p.stock_actual, stock_minimo:p.stock_minimo, stock_maximo:p.stock_maximo,
      unidad_medida:p.unidad_medida, es_servicio:p.es_servicio||false } : init);
    setImagen(null); setError(''); setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre || !form.codigo || !form.precio_venta) {
      setError('Nombre, código y precio son obligatorios'); return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      if (imagen) fd.append('imagen', imagen);
      if (editando) await productosAPI.actualizar(editando.id, fd);
      else           await productosAPI.crear(fd);
      setModal(false); cargar();
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const cols = [
    { key:'imagen_url', label:'', render:v =>
      v ? <img src={v} alt="" style={{width:36,height:36,objectFit:'cover',borderRadius:6}}/> : <span style={{fontSize:24}}>📦</span> },
    { key:'codigo',        label:'Código',   style:{fontFamily:'monospace',color:'#64748b',fontSize:12} },
    { key:'nombre',        label:'Nombre',   style:{fontWeight:600} },
    { key:'categoria',     label:'Categoría' },
    { key:'precio_venta',  label:'Precio',   render:v=>`$${Number(v).toFixed(2)}` },
    { key:'precio_con_iva',label:'C/IVA',    render:v=>`$${Number(v||0).toFixed(2)}` },
    { key:'stock_actual',  label:'Stock',    render:(v,r)=>
      <span style={{fontWeight:700,color:r.alerta_stock?'#ef4444':'#22c55e'}}>{v}</span> },
    { key:'alerta_stock',  label:'Estado',   render:v=>
      v ? <Badge text="⚠️ BAJO" color="#ef4444"/> : <Badge text="OK" color="#22c55e"/> },
    { key:'id', label:'Acciones', render:(v,r) => (
      <div style={{display:'flex',gap:6}}>
        <Btn sm onClick={()=>abrirModal(r)}>Editar</Btn>
        <Btn sm onClick={async()=>{await productosAPI.borrar(v);cargar();}} color="#991b1b">Borrar</Btn>
      </div>
    )},
  ];

  return (
    <div>
      {error && <Alert type="error">{error}</Alert>}
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <input value={busqueda} onChange={e=>setBusqueda(e.target.value)}
          placeholder="🔍 Buscar producto..."
          style={{flex:1,minWidth:200,padding:'8px 12px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}}/>
        <Btn onClick={()=>abrirModal()}>+ Nuevo producto</Btn>
      </div>
      <Card>
        <Table cols={cols}
          rows={productos.filter(p=>!busqueda||p.nombre.toLowerCase().includes(busqueda.toLowerCase())||p.codigo.includes(busqueda))}
          empty="No hay productos. Agrega el primero."/>
      </Card>
      <Modal open={modal} onClose={()=>setModal(false)}
        title={editando?`Editar: ${editando.nombre}`:'Nuevo producto'} width={600}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Input label="Código *"       value={form.codigo}        onChange={e=>setForm(f=>({...f,codigo:e.target.value}))}/>
          <Input label="Nombre *"       value={form.nombre}        onChange={e=>setForm(f=>({...f,nombre:e.target.value}))}/>
          <Input label="Precio costo"   type="number" value={form.precio_costo}  onChange={e=>setForm(f=>({...f,precio_costo:parseFloat(e.target.value)||0}))}/>
          <Input label="Precio venta *" type="number" value={form.precio_venta}  onChange={e=>setForm(f=>({...f,precio_venta:parseFloat(e.target.value)||0}))}/>
          <Select label="Categoría" value={form.categoria_id} onChange={e=>setForm(f=>({...f,categoria_id:e.target.value}))}
            options={[{value:'',label:'Sin categoría'},...categorias.map(c=>({value:c.id,label:c.nombre}))]}/>
          <Input label="Unidad"         value={form.unidad_medida} onChange={e=>setForm(f=>({...f,unidad_medida:e.target.value}))}/>
          <Input label="Stock inicial"  type="number" value={form.stock_actual}  onChange={e=>setForm(f=>({...f,stock_actual:parseInt(e.target.value)||0}))}/>
          <Input label="Stock mínimo"   type="number" value={form.stock_minimo}  onChange={e=>setForm(f=>({...f,stock_minimo:parseInt(e.target.value)||0}))}/>
        </div>
        <div style={{display:'flex',gap:16,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,cursor:'pointer'}}>
            <input type="checkbox" checked={form.aplica_iva} onChange={e=>setForm(f=>({...f,aplica_iva:e.target.checked}))}/>
            Aplica IVA {form.aplica_iva && <input type="number" value={form.porcentaje_iva}
              onChange={e=>setForm(f=>({...f,porcentaje_iva:parseFloat(e.target.value)||0}))}
              style={{width:50,marginLeft:4,padding:'2px 6px',borderRadius:6,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}}/>}%
          </label>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,cursor:'pointer'}}>
            <input type="checkbox" checked={form.es_servicio} onChange={e=>setForm(f=>({...f,es_servicio:e.target.checked}))}/>
            Es servicio (sin stock)
          </label>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,color:'#94a3b8',display:'block',marginBottom:4}}>Imagen del producto</label>
          <input type="file" accept="image/*" onChange={e=>setImagen(e.target.files[0])} style={{fontSize:13,color:'#94a3b8'}}/>
          {editando?.imagen_url && !imagen && <img src={editando.imagen_url} alt="" style={{marginTop:8,height:60,borderRadius:8}}/>}
        </div>
        {error && <Alert type="error">{error}</Alert>}
        <div style={{display:'flex',gap:8}}>
          <Btn onClick={()=>setModal(false)} color="#374151" style={{flex:1}}>Cancelar</Btn>
          <Btn onClick={guardar} disabled={loading} style={{flex:1}}>
            {loading?'Guardando...':editando?'Actualizar':'Crear producto'}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
