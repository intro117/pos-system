import React, { useState, useEffect, useCallback } from 'react';
import { productosAPI, ventasAPI, inventarioAPI, configAPI } from './utils/api';
import { fmt } from './utils/format';
import { Card, Btn, Badge, Alert, Modal, Input, Select, Stat, Table } from './components/UI';
import Productos  from './pages/Productos';
import Clientes   from './pages/Clientes';
import Proveedores from './pages/Proveedores';
import Reportes   from './pages/Reportes';

// ── POS ────────────────────────────────────────────────────
function POS({ config, productos, categorias, recargar }) {
  const [carrito,    setCarrito]    = useState([]);
  const [busqueda,   setBusqueda]   = useState('');
  const [catFiltro,  setCatFiltro]  = useState(null);
  const [metodo,     setMetodo]     = useState('efectivo');
  const [recibido,   setRecibido]   = useState('');
  const [descGlobal, setDescGlobal] = useState(0);
  const [ticket,     setTicket]     = useState(null);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const sym = config?.simbolo_moneda || '$';

  const prods = productos.filter(p => {
    const t = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo.includes(busqueda);
    const c = !catFiltro || p.categoria_id === catFiltro;
    return t && c;
  });

  const agregar = p => setCarrito(prev => {
    const ex = prev.find(i => i.producto_id === p.id);
    if (ex) return prev.map(i => i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
    return [...prev, { producto_id:p.id, nombre:p.nombre, precio_unitario:p.precio_venta,
      iva_porcentaje:p.aplica_iva?p.porcentaje_iva:0, cantidad:1, descuento:0 }];
  });

  const quitar   = id    => setCarrito(p => p.filter(i => i.producto_id !== id));
  const cambiarQ = (id,d)=> setCarrito(p => p.map(i => i.producto_id===id?{...i,cantidad:Math.max(0.5,i.cantidad+d)}:i));

  const subtotal  = carrito.reduce((s,i) => s + i.precio_unitario*i.cantidad*(1-i.descuento/100), 0);
  const descuento = subtotal * descGlobal / 100;
  const ivaAmt    = carrito.reduce((s,i) => s+(i.precio_unitario*i.cantidad*(1-i.descuento/100))*i.iva_porcentaje/100,0)*(1-descGlobal/100);
  const total     = subtotal - descuento + ivaAmt;
  const cambio    = Math.max(0,(parseFloat(recibido)||0)-total);

  const cobrar = async () => {
    if (!carrito.length) return;
    setLoading(true); setError('');
    try {
      const res = await ventasAPI.crear({
        items: carrito, metodo_pago: metodo,
        monto_recibido: metodo==='efectivo'?(parseFloat(recibido)||total):total,
        descuento: descGlobal, cajero:'Admin',
      });
      setTicket({...res, items:carrito, negocio:config?.nombre_negocio, sym});
      setCarrito([]); setRecibido(''); setDescGlobal(0); recargar();
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  if (ticket) return (
    <div style={{maxWidth:400,margin:'0 auto'}}>
      <Card style={{fontFamily:'monospace',textAlign:'center'}}>
        <div style={{fontSize:18,fontWeight:700}}>🧾 {ticket.negocio}</div>
        <div style={{fontSize:11,color:'#64748b',marginBottom:12}}>{new Date().toLocaleString('es-MX')}</div>
        <div style={{fontSize:12,marginBottom:8}}>Folio: <b>{ticket.folio}</b></div>
        <hr style={{border:'none',borderTop:'1px dashed #334155',margin:'8px 0'}}/>
        {ticket.items.map((i,idx)=>(
          <div key={idx} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
            <span>{i.nombre} × {i.cantidad}</span>
            <span>{fmt(i.precio_unitario*i.cantidad,sym)}</span>
          </div>
        ))}
        <hr style={{border:'none',borderTop:'1px dashed #334155',margin:'8px 0'}}/>
        <div style={{fontSize:13}}>
          <div style={{display:'flex',justifyContent:'space-between'}}><span>Subtotal</span><span>{fmt(ticket.subtotal,sym)}</span></div>
          {parseFloat(ticket.descuento)>0&&<div style={{display:'flex',justifyContent:'space-between',color:'#ef4444'}}><span>Descuento</span><span>-{fmt(ticket.descuento,sym)}</span></div>}
          <div style={{display:'flex',justifyContent:'space-between'}}><span>IVA</span><span>{fmt(ticket.iva,sym)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:15,margin:'6px 0'}}><span>TOTAL</span><span style={{color:'#22c55e'}}>{fmt(ticket.total,sym)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between'}}><span>Cambio</span><span style={{color:'#22c55e',fontWeight:700}}>{fmt(ticket.cambio,sym)}</span></div>
        </div>
        <div style={{marginTop:12,fontSize:11,color:'#64748b'}}>¡Gracias por su compra!</div>
        <div style={{display:'flex',gap:8,marginTop:14}}>
          <Btn onClick={()=>window.print()} color="#374151" style={{flex:1}}>🖨️ Imprimir</Btn>
          <Btn onClick={()=>setTicket(null)} style={{flex:1}}>+ Nueva venta</Btn>
        </div>
      </Card>
    </div>
  );

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:16,height:'calc(100vh - 130px)'}}>
      <div style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="🔍 Nombre o código..."
            style={{flex:1,minWidth:160,padding:'8px 12px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}}/>
          <button onClick={()=>setCatFiltro(null)}
            style={{padding:'6px 12px',borderRadius:8,border:'1px solid #334155',background:!catFiltro?'#1d4ed8':'transparent',color:!catFiltro?'#fff':'#94a3b8',cursor:'pointer',fontSize:12,fontWeight:600}}>
            Todos
          </button>
          {categorias.map(c=>(
            <button key={c.id} onClick={()=>setCatFiltro(c.id)}
              style={{padding:'6px 10px',borderRadius:8,border:`1px solid ${c.color||'#334155'}`,background:catFiltro===c.id?c.color+'33':'transparent',color:catFiltro===c.id?c.color:'#94a3b8',cursor:'pointer',fontSize:12,fontWeight:600}}>
              {c.icono} {c.nombre}
            </button>
          ))}
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
            {prods.map(p=>(
              <div key={p.id} onClick={()=>agregar(p)}
                style={{background:'#1e293b',border:'1px solid #334155',borderRadius:10,padding:12,cursor:'pointer',transition:'.2s',position:'relative'}}
                onMouseOver={e=>e.currentTarget.style.borderColor='#3b82f6'}
                onMouseOut={e=>e.currentTarget.style.borderColor='#334155'}>
                <div style={{width:'100%',height:80,background:'#0f172a',borderRadius:8,marginBottom:8,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                  {p.imagen_url?<img src={p.imagen_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:32}}>📦</span>}
                </div>
                <div style={{fontSize:12,fontWeight:600,marginBottom:2,color:'#e2e8f0'}}>{p.nombre}</div>
                <div style={{fontSize:13,fontWeight:700,color:'#22c55e'}}>{fmt(p.precio_con_iva,sym)}</div>
                <div style={{fontSize:10,color:'#64748b'}}>Stock: {p.stock_actual}</div>
                {p.alerta_stock&&<div style={{position:'absolute',top:6,right:6,background:'#ef4444',color:'#fff',borderRadius:99,padding:'1px 5px',fontSize:9,fontWeight:700}}>⚠️</div>}
              </div>
            ))}
            {!prods.length&&<div style={{gridColumn:'1/-1',color:'#475569',textAlign:'center',padding:32}}>Sin productos</div>}
          </div>
        </div>
      </div>

      <Card style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:10}}>🛒 Carrito</div>
        {error&&<Alert type="error">{error}</Alert>}
        <div style={{flex:1,overflowY:'auto',marginBottom:10}}>
          {!carrito.length&&<div style={{color:'#475569',textAlign:'center',padding:32,fontSize:13}}>Toca un producto</div>}
          {carrito.map(item=>(
            <div key={item.producto_id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid #334155'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600}}>{item.nombre}</div>
                <div style={{fontSize:11,color:'#64748b'}}>{fmt(item.precio_unitario,sym)} · IVA {item.iva_porcentaje}%</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:3}}>
                <button onClick={()=>cambiarQ(item.producto_id,-1)} style={{width:22,height:22,borderRadius:6,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',cursor:'pointer',fontWeight:700}}>-</button>
                <span style={{minWidth:24,textAlign:'center',fontWeight:700,fontSize:13}}>{item.cantidad}</span>
                <button onClick={()=>cambiarQ(item.producto_id,1)}  style={{width:22,height:22,borderRadius:6,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',cursor:'pointer',fontWeight:700}}>+</button>
              </div>
              <span style={{fontSize:12,fontWeight:700,minWidth:60,textAlign:'right'}}>{fmt(item.precio_unitario*item.cantidad,sym)}</span>
              <button onClick={()=>quitar(item.producto_id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:16}}>✕</button>
            </div>
          ))}
        </div>
        <div style={{borderTop:'1px solid #334155',paddingTop:10}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <span style={{fontSize:12,color:'#94a3b8',whiteSpace:'nowrap'}}>Desc. %</span>
            <input type="number" min={0} max={100} value={descGlobal}
              onChange={e=>setDescGlobal(Math.min(100,Math.max(0,parseFloat(e.target.value)||0)))}
              style={{width:55,padding:'4px 8px',borderRadius:6,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}}/>
          </div>
          <div style={{fontSize:12,marginBottom:6}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}><span style={{color:'#94a3b8'}}>Subtotal</span><span>{fmt(subtotal,sym)}</span></div>
            {descuento>0&&<div style={{display:'flex',justifyContent:'space-between',marginBottom:2,color:'#ef4444'}}><span>Descuento</span><span>-{fmt(descuento,sym)}</span></div>}
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}><span style={{color:'#94a3b8'}}>IVA</span><span>{fmt(ivaAmt,sym)}</span></div>
            <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:15,margin:'6px 0'}}><span>TOTAL</span><span style={{color:'#22c55e'}}>{fmt(total,sym)}</span></div>
          </div>
          <div style={{display:'flex',gap:5,marginBottom:8}}>
            {[['efectivo','💵'],['tarjeta','💳'],['transferencia','🏦']].map(([m,ico])=>(
              <button key={m} onClick={()=>setMetodo(m)}
                style={{flex:1,padding:'6px 2px',borderRadius:8,border:`1px solid ${metodo===m?'#3b82f6':'#334155'}`,background:metodo===m?'#1d4ed822':'transparent',color:metodo===m?'#60a5fa':'#94a3b8',cursor:'pointer',fontSize:10,fontWeight:600}}>
                {ico} {m.slice(0,5)}.
              </button>
            ))}
          </div>
          {metodo==='efectivo'&&<input type="number" value={recibido} onChange={e=>setRecibido(e.target.value)}
            placeholder="Monto recibido"
            style={{width:'100%',padding:'7px 12px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13,marginBottom:6}}/>}
          {metodo==='efectivo'&&recibido&&<div style={{fontSize:12,color:'#22c55e',fontWeight:700,marginBottom:8}}>Cambio: {fmt(cambio,sym)}</div>}
          <Btn onClick={cobrar} disabled={!carrito.length||loading} full style={{padding:'11px 0',fontSize:14}}>
            {loading?'Procesando...':`💰 Cobrar ${fmt(total,sym)}`}
          </Btn>
        </div>
      </Card>
    </div>
  );
}

// ── Inventario ─────────────────────────────────────────────
function Inventario({ productos, recargar }) {
  const [modal,  setModal]  = useState(false);
  const [prod,   setProd]   = useState(null);
  const [form,   setForm]   = useState({tipo:'entrada',cantidad:1,motivo:'',costo_unitario:0});
  const [filtro, setFiltro] = useState('');
  const [error,  setError]  = useState('');
  const alertas = productos.filter(p=>p.alerta_stock&&!p.es_servicio);
  const abrir = p => { setProd(p); setForm({tipo:'entrada',cantidad:1,motivo:'',costo_unitario:0}); setModal(true); };
  const aplicar = async () => {
    try { await productosAPI.ajustarStock(prod.id, form); setModal(false); recargar(); }
    catch(e) { setError(e.message); }
  };
  const cols = [
    {key:'codigo',      label:'Código',  style:{fontFamily:'monospace',color:'#64748b',fontSize:12}},
    {key:'nombre',      label:'Nombre',  style:{fontWeight:600}},
    {key:'categoria',   label:'Cat.'},
    {key:'stock_actual',label:'Stock',   render:(v,r)=><span style={{fontWeight:700,color:r.alerta_stock?'#ef4444':'#22c55e'}}>{v} {r.unidad_medida}</span>},
    {key:'stock_minimo',label:'Mín.',    style:{color:'#64748b'}},
    {key:'alerta_stock',label:'Estado',  render:v=>v?<Badge text="⚠️ BAJO" color="#ef4444"/>:<Badge text="✓ OK" color="#22c55e"/>},
    {key:'id',          label:'Acción',  render:(_,r)=>!r.es_servicio&&<Btn sm onClick={()=>abrir(r)}>Ajustar</Btn>},
  ];
  return (
    <div>
      {alertas.length>0&&<Alert type="error" style={{marginBottom:16}}>⚠️ <b>{alertas.length} producto(s) con stock bajo:</b> {alertas.map(p=>p.nombre).join(', ')}</Alert>}
      <div style={{display:'flex',gap:10,marginBottom:16}}>
        <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="🔍 Filtrar inventario..."
          style={{flex:1,padding:'8px 12px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}}/>
      </div>
      <Card><Table cols={cols} rows={productos.filter(p=>!filtro||p.nombre.toLowerCase().includes(filtro.toLowerCase()))} empty="Sin productos."/></Card>
      <Modal open={modal} onClose={()=>setModal(false)} title={`Ajuste — ${prod?.nombre}`}>
        <div style={{marginBottom:12,fontSize:13,color:'#94a3b8'}}>Stock actual: <b style={{color:'#e2e8f0'}}>{prod?.stock_actual}</b></div>
        <div style={{display:'flex',gap:6,marginBottom:12}}>
          {[['entrada','📥 Entrada'],['salida','📤 Salida'],['ajuste','✏️ Ajuste']].map(([t,l])=>(
            <button key={t} onClick={()=>setForm(f=>({...f,tipo:t}))}
              style={{flex:1,padding:'7px 4px',borderRadius:8,border:`1px solid ${form.tipo===t?'#3b82f6':'#334155'}`,background:form.tipo===t?'#1d4ed822':'transparent',color:form.tipo===t?'#60a5fa':'#94a3b8',cursor:'pointer',fontSize:11,fontWeight:600}}>
              {l}
            </button>
          ))}
        </div>
        <Input label={form.tipo==='ajuste'?'Nuevo stock total':'Cantidad'} type="number"
          value={form.cantidad} onChange={e=>setForm(f=>({...f,cantidad:parseFloat(e.target.value)||0}))}/>
        {form.tipo==='entrada'&&<Input label="Costo unitario" type="number" value={form.costo_unitario}
          onChange={e=>setForm(f=>({...f,costo_unitario:parseFloat(e.target.value)||0}))}/>}
        <Input label="Motivo" value={form.motivo} onChange={e=>setForm(f=>({...f,motivo:e.target.value}))} placeholder="Opcional"/>
        {error&&<Alert type="error">{error}</Alert>}
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <Btn onClick={()=>setModal(false)} color="#374151" style={{flex:1}}>Cancelar</Btn>
          <Btn onClick={aplicar} color="#22c55e" style={{flex:1}}>Aplicar</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ── Corte de caja ──────────────────────────────────────────
function Corte({ config }) {
  const sym = config?.simbolo_moneda || '$';
  const [resumen, setResumen] = useState(null);
  const [form,    setForm]    = useState({fondo_inicial:500,efectivo_contado:'',cajero:'Admin',notas:''});
  const [hecho,   setHecho]   = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');
  useEffect(() => { ventasAPI.corteDia().then(setResumen).catch(e=>setError(e.message)); }, []);
  const diferencia = parseFloat(form.efectivo_contado||0)-((resumen?.efectivo||0)+form.fondo_inicial);
  const hacer = async () => {
    try { const r=await ventasAPI.hacerCorte(form); setResult(r); setHecho(true); }
    catch(e) { setError(e.message); }
  };
  return (
    <div style={{maxWidth:760,margin:'0 auto'}}>
      {error&&<Alert type="error">{error}</Alert>}
      {resumen&&<>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:20}}>
          <Stat label="Ventas hoy"    value={resumen.num_ventas}       icon="🧾" color="#3b82f6"/>
          <Stat label="Total ventas"  value={fmt(resumen.total_ventas,sym)} icon="💰" color="#22c55e"/>
          <Stat label="IVA cobrado"   value={fmt(resumen.total_iva,sym)}    icon="📋" color="#f59e0b"/>
          <Stat label="Efectivo"      value={fmt(resumen.efectivo,sym)}     icon="💵" color="#10b981"/>
          <Stat label="Tarjeta"       value={fmt(resumen.tarjeta,sym)}      icon="💳" color="#8b5cf6"/>
          <Stat label="Transferencia" value={fmt(resumen.transferencia,sym)}icon="🏦" color="#06b6d4"/>
        </div>
        <Card style={{marginBottom:16}}>
          <div style={{fontWeight:700,marginBottom:14}}>🔒 Cierre de caja</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <Input label="Fondo inicial" type="number" value={form.fondo_inicial} onChange={e=>setForm(f=>({...f,fondo_inicial:parseFloat(e.target.value)||0}))}/>
            <Input label="Efectivo contado" type="number" value={form.efectivo_contado} onChange={e=>setForm(f=>({...f,efectivo_contado:e.target.value}))} placeholder="Contar físicamente"/>
            <Input label="Cajero" value={form.cajero} onChange={e=>setForm(f=>({...f,cajero:e.target.value}))}/>
            <Input label="Notas"  value={form.notas}  onChange={e=>setForm(f=>({...f,notas:e.target.value}))}/>
          </div>
          {form.efectivo_contado&&(
            <div style={{background:diferencia===0?'#15803d22':diferencia>0?'#1d4ed822':'#7f1d1d22',
              border:`1px solid ${diferencia===0?'#22c55e':diferencia>0?'#3b82f6':'#ef4444'}44`,
              borderRadius:8,padding:16,marginBottom:14,textAlign:'center'}}>
              <div style={{fontSize:12,color:'#94a3b8'}}>Diferencia de caja</div>
              <div style={{fontSize:28,fontWeight:700,color:diferencia===0?'#22c55e':diferencia>0?'#60a5fa':'#ef4444'}}>
                {diferencia>0?'+':''}{fmt(diferencia,sym)}
              </div>
              <div style={{fontSize:12,color:'#64748b'}}>{diferencia===0?'✓ Cuadre exacto':diferencia>0?'Sobrante':'Faltante'}</div>
            </div>
          )}
          <Btn onClick={hacer} disabled={hecho||!form.efectivo_contado} full style={{padding:'12px 0',fontSize:14}}>
            {hecho?'✓ Corte realizado':'🔒 Cerrar caja del día'}
          </Btn>
        </Card>
        {result&&<Card>
          <div style={{fontWeight:700,marginBottom:12}}>Resumen del corte</div>
          {[['Total ventas',fmt(result.total_ventas,sym)],['Núm. ventas',result.num_ventas],
            ['Efectivo esperado',fmt((resumen.efectivo||0)+form.fondo_inicial,sym)],
            ['Efectivo contado',fmt(result.efectivo_contado,sym)],['Diferencia',fmt(result.diferencia,sym)]
          ].map(([l,v])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #334155',fontSize:14}}>
              <span style={{color:'#94a3b8'}}>{l}</span><span style={{fontWeight:600}}>{v}</span>
            </div>
          ))}
        </Card>}
      </>}
    </div>
  );
}

// ── App principal ──────────────────────────────────────────
const TABS = [
  {id:'pos',         label:'🛒 POS',       title:'Punto de Venta'},
  {id:'inventario',  label:'📦 Inventario', title:'Inventario'},
  {id:'corte',       label:'💰 Corte',      title:'Corte del Día'},
  {id:'productos',   label:'🏷️ Productos',  title:'Catálogo'},
  {id:'clientes',    label:'👥 Clientes',   title:'Clientes'},
  {id:'proveedores', label:'🚚 Proveedores',title:'Proveedores'},
  {id:'reportes',    label:'📊 Reportes',   title:'Reportes'},
  {id:'config',      label:'⚙️ Config',     title:'Configuración'},
];

export default function App() {
  const [tab,        setTab]     = useState('pos');
  const [config,     setConfig]  = useState({nombre_negocio:'POS System',simbolo_moneda:'$',iva_porcentaje:16,color_primario:'#1d4ed8',logo_url:'',tipo_negocio:'retail'});
  const [cfgForm,    setCfgForm] = useState({});
  const [productos,  setProds]   = useState([]);
  const [categorias, setCats]    = useState([]);
  const [alertas,    setAlertas] = useState(0);
  const [error,      setError]   = useState('');

  const cargar = useCallback(async () => {
    try {
      const [cfg,prods,cats,inv] = await Promise.all([
        configAPI.get(), productosAPI.listar(), productosAPI.categorias(), inventarioAPI.alertas()
      ]);
      setConfig(cfg); setCfgForm(cfg); setProds(prods); setCats(cats); setAlertas(inv.length);
    } catch(e) { setError('Error conectando al servidor. Verifica que el backend esté corriendo.'); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardarConfig = async () => {
    try { const c=await configAPI.update(cfgForm); setConfig(c); alert('✓ Configuración guardada'); }
    catch(e) { setError(e.message); }
  };

  const primary = config.color_primario || '#1d4ed8';
  const tabActual = TABS.find(t=>t.id===tab);

  return (
    <div style={{minHeight:'100vh',background:'#0f172a',color:'#e2e8f0'}}>
      <div style={{background:primary,padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {config.logo_url&&<img src={config.logo_url} alt="logo" style={{height:36,borderRadius:8,objectFit:'cover'}}/>}
          <div>
            <div style={{fontWeight:700,fontSize:16,color:'#fff'}}>{config.nombre_negocio}</div>
            <div style={{fontSize:11,color:'#ffffff88'}}>{config.tipo_negocio} · {tabActual?.title}</div>
          </div>
        </div>
        <div style={{fontSize:12,color:'#ffffff88'}}>{new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
      </div>

      <div style={{display:'flex',gap:2,padding:'8px 16px 0',background:'#1e293b',borderBottom:'1px solid #334155',overflowX:'auto'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'8px 14px',borderRadius:'8px 8px 0 0',border:'none',cursor:'pointer',fontSize:13,fontWeight:600,whiteSpace:'nowrap',
              background:tab===t.id?'#0f172a':'transparent',color:tab===t.id?primary:'#94a3b8',
              borderBottom:tab===t.id?`2px solid ${primary}`:'2px solid transparent'}}>
            {t.label}
            {t.id==='inventario'&&alertas>0&&<span style={{marginLeft:6,background:'#ef4444',color:'#fff',borderRadius:99,padding:'0 6px',fontSize:10}}>{alertas}</span>}
          </button>
        ))}
      </div>

      <div style={{padding:16}}>
        {error&&<Alert type="error" style={{marginBottom:16}}>{error}</Alert>}
        {tab==='pos'         && <POS config={config} productos={productos} categorias={categorias} recargar={cargar}/>}
        {tab==='inventario'  && <Inventario productos={productos} recargar={cargar}/>}
        {tab==='corte'       && <Corte config={config}/>}
        {tab==='productos'   && <Productos/>}
        {tab==='clientes'    && <Clientes/>}
        {tab==='proveedores' && <Proveedores/>}
        {tab==='reportes'    && <Reportes/>}
        {tab==='config'      && (
          <div style={{maxWidth:600}}>
            <Card style={{marginBottom:16}}>
              <div style={{fontWeight:700,marginBottom:14}}>🏪 Datos del negocio</div>
              {[['nombre_negocio','Nombre'],['rfc','RFC'],['direccion','Dirección'],['telefono','Teléfono'],['email','Email'],['ticket_footer','Mensaje en ticket']].map(([k,l])=>(
                <Input key={k} label={l} value={cfgForm[k]||''} onChange={e=>setCfgForm(f=>({...f,[k]:e.target.value}))}/>
              ))}
            </Card>
            <Card style={{marginBottom:16}}>
              <div style={{fontWeight:700,marginBottom:14}}>💰 Fiscal</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <Input label="IVA (%)" type="number" value={cfgForm.iva_porcentaje||16} onChange={e=>setCfgForm(f=>({...f,iva_porcentaje:parseFloat(e.target.value)||16}))}/>
                <Input label="Símbolo moneda" value={cfgForm.simbolo_moneda||'$'} onChange={e=>setCfgForm(f=>({...f,simbolo_moneda:e.target.value}))}/>
              </div>
            </Card>
            <Card style={{marginBottom:16}}>
              <div style={{fontWeight:700,marginBottom:14}}>🎨 Personalización</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div>
                  <label style={{fontSize:12,color:'#94a3b8',display:'block',marginBottom:4}}>Color primario</label>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <input type="color" value={cfgForm.color_primario||'#1d4ed8'} onChange={e=>setCfgForm(f=>({...f,color_primario:e.target.value}))}
                      style={{width:40,height:36,borderRadius:8,border:'1px solid #334155',cursor:'pointer'}}/>
                    <span style={{fontSize:12,color:'#64748b'}}>{cfgForm.color_primario}</span>
                  </div>
                </div>
                <Select label="Tipo de negocio" value={cfgForm.tipo_negocio||'retail'} onChange={e=>setCfgForm(f=>({...f,tipo_negocio:e.target.value}))}
                  options={[{value:'retail',label:'🏪 Retail'},{value:'restaurante',label:'🍔 Restaurante'},{value:'mixto',label:'🏬 Mixto'},{value:'farmacia',label:'💊 Farmacia'},{value:'servicios',label:'🔧 Servicios'}]}/>
              </div>
              <Input label="URL del logo" value={cfgForm.logo_url||''} onChange={e=>setCfgForm(f=>({...f,logo_url:e.target.value}))} placeholder="https://tulogo.com/logo.png"/>
              {cfgForm.logo_url&&<img src={cfgForm.logo_url} alt="" style={{marginTop:8,height:48,borderRadius:8}}/>}
            </Card>
            <Btn onClick={guardarConfig} full style={{padding:'12px 0',fontSize:14,background:primary}}>💾 Guardar configuración</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
