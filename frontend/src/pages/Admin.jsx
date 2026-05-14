import React, { useState, useEffect } from 'react';
import { authAPI, adminAPI } from '../utils/api';
import { Card, Btn, Input, Select, Modal, Table, Alert, Confirm } from '../components/UI';

export default function Admin() {
  const [usuarios, setUsuarios] = useState([]);
  const [modal,    setModal]    = useState(false);
  const [confirm,  setConfirm]  = useState(null);
  const [error,    setError]    = useState('');
  const [ok,       setOk]       = useState('');
  const init = { username:'', nombre:'', password:'', rol:'cajero' };
  const [form, setForm] = useState(init);
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(() => { cargar(); }, []);
  const cargar = async () => {
    try { setUsuarios(await authAPI.usuarios()); }
    catch(e) { setError(e.message); }
  };

  const guardar = async () => {
    if (!form.username||!form.password||!form.nombre) { setError('Todos los campos son requeridos'); return; }
    try { await authAPI.crearUsuario(form); setModal(false); setForm(init); cargar(); }
    catch(e) { setError(e.message); }
  };

  const handleReset = (tipo) => {
    const configs = {
      ventas: {
        titulo: '🧾 Reset de ventas',
        mensaje: 'Se borrarán todas las ventas, cortes de caja y detalles de venta. Los productos, clientes y proveedores se CONSERVAN.',
        fn: async () => { await adminAPI.resetVentas(); }
      },
      inventario: {
        titulo: '📦 Reset de inventario',
        mensaje: 'Se borrarán todos los productos, categorías y movimientos de inventario. Las ventas y clientes se CONSERVAN.',
        fn: async () => { await adminAPI.resetInventario(); }
      },
      todo: {
        titulo: '⚠️ Reset COMPLETO',
        mensaje: 'Se borrarán ABSOLUTAMENTE TODOS los datos: productos, ventas, clientes, proveedores y configuración. Esta acción NO se puede deshacer.',
        fn: async () => { await adminAPI.resetTodo(); }
      },
    };
    const cfg = configs[tipo];
    setConfirm({
      titulo:   cfg.titulo,
      mensaje:  cfg.mensaje,
      onConfirm: async () => {
        try {
          await cfg.fn();
          setOk(`✓ ${cfg.titulo} completado exitosamente`);
          setConfirm(null);
        } catch(e) { setError(e.message); setConfirm(null); }
      }
    });
  };

  const cols = [
    { key:'username', label:'Usuario', style:{fontFamily:'monospace',fontWeight:600} },
    { key:'nombre',   label:'Nombre' },
    { key:'rol',      label:'Rol', render:v=>(
      <span style={{background:v==='admin'?'#1d4ed822':'#15803d22',
        color:v==='admin'?'#60a5fa':'#4ade80',
        border:`1px solid ${v==='admin'?'#3b82f644':'#22c55e44'}`,
        borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600}}>
        {v==='admin'?'👑 Admin':'🧾 Cajero'}
      </span>
    )},
    { key:'activo', label:'Estado', render:v=>
      <span style={{color:v?'#22c55e':'#ef4444'}}>{v?'✓ Activo':'✗ Inactivo'}</span>
    },
    { key:'id', label:'Acción', render:(v,r)=>
      r.username !== 'admin' && (
        <Btn sm color="#991b1b" onClick={()=>setConfirm({
          titulo: 'Eliminar usuario',
          mensaje: `¿Eliminar al usuario "${r.nombre}" (${r.username})? Perderá acceso al sistema.`,
          onConfirm: async()=>{ await authAPI.borrarUsuario(v); cargar(); setConfirm(null); }
        })}>
          Eliminar
        </Btn>
      )
    },
  ];

  return (
    <div>
      {error && <Alert type="error">{error}</Alert>}
      {ok    && <Alert type="success">{ok}</Alert>}

      {/* Usuarios */}
      <Card style={{marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:15}}>👥 Usuarios del sistema</div>
          <Btn onClick={()=>setModal(true)}>+ Nuevo usuario</Btn>
        </div>
        <Table cols={cols} rows={usuarios} empty="Sin usuarios."/>
      </Card>

      {/* Reset de datos */}
      <Card>
        <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>🗑️ Reset de datos</div>
        <div style={{fontSize:13,color:'#94a3b8',marginBottom:16}}>
          Borra datos del sistema de forma permanente. Solo disponible para administradores.
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
          <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:10,padding:14}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:6}}>🧾 Solo ventas</div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:12}}>
              Borra ventas y cortes.<br/>Productos y clientes se conservan.
            </div>
            <Btn full sm color="#b45309" onClick={()=>handleReset('ventas')}>
              Reset ventas
            </Btn>
          </div>
          <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:10,padding:14}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:6}}>📦 Solo inventario</div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:12}}>
              Borra productos y categorías.<br/>Ventas y clientes se conservan.
            </div>
            <Btn full sm color="#7c3aed" onClick={()=>handleReset('inventario')}>
              Reset inventario
            </Btn>
          </div>
          <div style={{background:'#7f1d1d22',border:'1px solid #ef444444',borderRadius:10,padding:14}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:6,color:'#f87171'}}>⚠️ Reset total</div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:12}}>
              Borra TODO el sistema.<br/>Acción irreversible.
            </div>
            <Btn full sm color="#991b1b" onClick={()=>handleReset('todo')}>
              Reset completo
            </Btn>
          </div>
        </div>
      </Card>

      {/* Modal nuevo usuario */}
      <Modal open={modal} onClose={()=>setModal(false)} title="Nuevo usuario">
        <Input label="Username *"   value={form.username} onChange={e=>upd('username',e.target.value)} placeholder="ej: maria"/>
        <Input label="Nombre *"     value={form.nombre}   onChange={e=>upd('nombre',e.target.value)}   placeholder="ej: María López"/>
        <Input label="Contraseña *" value={form.password} onChange={e=>upd('password',e.target.value)} type="password"/>
        <Select label="Rol" value={form.rol} onChange={e=>upd('rol',e.target.value)}
          options={[
            {value:'cajero',label:'🧾 Cajero — solo POS y Corte'},
            {value:'admin', label:'👑 Admin — acceso completo'}
          ]}/>
        {error && <Alert type="error">{error}</Alert>}
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <Btn onClick={()=>setModal(false)} color="#374151" style={{flex:1}}>Cancelar</Btn>
          <Btn onClick={guardar} style={{flex:1}}>Crear usuario</Btn>
        </div>
      </Modal>

      {confirm && (
        <Confirm open={true}
          titulo={confirm.titulo}
          mensaje={confirm.mensaje}
          onConfirm={confirm.onConfirm}
          onCancel={()=>setConfirm(null)}/>
      )}
    </div>
  );
}
