import React, { useState, useEffect } from 'react';
import { authAPI, adminAPI } from '../utils/api';
import { Card, Btn, Input, Select, Modal, Table, Alert } from '../components/UI';
import { Confirm } from '../components/UI';

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
    try { setUsuarios(await authAPI.usuarios()); } catch(e) { setError(e.message); }
  };

  const guardar = async () => {
    if (!form.username || !form.password || !form.nombre) { setError('Todos los campos son requeridos'); return; }
    try { await authAPI.crearUsuario(form); setModal(false); setForm(init); cargar(); }
    catch(e) { setError(e.message); }
  };

  const handleReset = (tipo) => {
    setConfirm({
      titulo: tipo === 'todo' ? 'Reset completo' : 'Reset de ventas',
      mensaje: tipo === 'todo'
        ? 'Se borrarán TODOS los datos: productos, ventas, clientes, proveedores y configuración. Esta acción NO se puede deshacer.'
        : 'Se borrarán todas las ventas y cortes de caja. Los productos y clientes se conservan.',
      onConfirm: async () => {
        try {
          if (tipo === 'todo') await adminAPI.resetTodo();
          else                  await adminAPI.resetVentas();
          setOk('Reset completado exitosamente'); setConfirm(null);
        } catch(e) { setError(e.message); setConfirm(null); }
      }
    });
  };

  const cols = [
    { key:'username', label:'Usuario', style:{fontFamily:'monospace',fontWeight:600} },
    { key:'nombre',   label:'Nombre' },
    { key:'rol',      label:'Rol',    render:v=>
      <span style={{background:v==='admin'?'#1d4ed822':'#15803d22',color:v==='admin'?'#60a5fa':'#4ade80',
        border:`1px solid ${v==='admin'?'#3b82f644':'#22c55e44'}`,borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600}}>
        {v==='admin'?'👑 Admin':'🧾 Cajero'}
      </span> },
    { key:'activo', label:'Estado', render:v=>
      <span style={{color:v?'#22c55e':'#ef4444'}}>{v?'✓ Activo':'✗ Inactivo'}</span> },
    { key:'id', label:'Acción', render:(v,r)=>
      r.username !== 'admin' && (
        <Btn sm color="#991b1b"
          onClick={()=>setConfirm({
            titulo:'Eliminar usuario',
            mensaje:`¿Eliminar al usuario "${r.nombre}" (${r.username})? Esta acción desactivará su acceso.`,
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
          Borra datos del sistema. Solo disponible para administradores. Acción irreversible.
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <Btn color="#b45309" onClick={()=>handleReset('ventas')}>
            🧾 Reset solo ventas y cortes
          </Btn>
          <Btn color="#991b1b" onClick={()=>handleReset('todo')}>
            ⚠️ Reset COMPLETO (todo)
          </Btn>
        </div>
      </Card>

      {/* Modal nuevo usuario */}
      <Modal open={modal} onClose={()=>setModal(false)} title="Nuevo usuario">
        <Input label="Username *"    value={form.username} onChange={e=>upd('username',e.target.value)} placeholder="ej: maria"/>
        <Input label="Nombre *"      value={form.nombre}   onChange={e=>upd('nombre',e.target.value)}   placeholder="ej: María López"/>
        <Input label="Contraseña *"  value={form.password} onChange={e=>upd('password',e.target.value)} type="password"/>
        <Select label="Rol" value={form.rol} onChange={e=>upd('rol',e.target.value)}
          options={[{value:'cajero',label:'🧾 Cajero — solo POS y Corte'},{value:'admin',label:'👑 Admin — acceso completo'}]}/>
        {error && <Alert type="error">{error}</Alert>}
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <Btn onClick={()=>setModal(false)} color="#374151" style={{flex:1}}>Cancelar</Btn>
          <Btn onClick={guardar} style={{flex:1}}>Crear usuario</Btn>
        </div>
      </Modal>

      {/* Confirm dialog */}
      {confirm && (
        <Confirm open={true} titulo={confirm.titulo} mensaje={confirm.mensaje}
          onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>
      )}
    </div>
  );
}
