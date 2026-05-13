import React, { useState, useEffect } from 'react';
import { clientesAPI } from '../utils/api';
import { Card, Btn, Input, Modal, Table, Alert } from '../components/UI';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [modal,    setModal]    = useState(false);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [error,    setError]    = useState('');
  const init = { nombre:'', rfc:'XAXX010101000', email:'', telefono:'', direccion:'', notas:'', credito_max:0 };
  const [form, setForm] = useState(init);
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(() => { cargar(); }, [busqueda]);
  const cargar = async () => {
    try { setClientes(await clientesAPI.listar(busqueda)); } catch(e) { setError(e.message); }
  };
  const abrirModal = (c=null) => {
    setEditando(c);
    setForm(c ? {nombre:c.nombre,rfc:c.rfc,email:c.email,telefono:c.telefono,
      direccion:c.direccion,notas:c.notas,credito_max:c.credito_max} : init);
    setError(''); setModal(true);
  };
  const guardar = async () => {
    if (!form.nombre) { setError('El nombre es obligatorio'); return; }
    try {
      if (editando) await clientesAPI.actualizar(editando.id, form);
      else           await clientesAPI.crear(form);
      setModal(false); cargar();
    } catch(e) { setError(e.message); }
  };
  const cols = [
    { key:'nombre',      label:'Nombre',   style:{fontWeight:600} },
    { key:'rfc',         label:'RFC',      style:{fontFamily:'monospace',fontSize:12} },
    { key:'telefono',    label:'Teléfono' },
    { key:'email',       label:'Email' },
    { key:'credito_max', label:'Crédito',  render:v=>v>0?`$${v.toFixed(2)}`:'—' },
    { key:'id', label:'Acciones', render:(v,r)=>(
      <div style={{display:'flex',gap:6}}>
        <Btn sm onClick={()=>abrirModal(r)}>Editar</Btn>
        <Btn sm onClick={async()=>{await clientesAPI.borrar(v);cargar();}} color="#991b1b">Borrar</Btn>
      </div>
    )},
  ];
  return (
    <div>
      {error && <Alert type="error">{error}</Alert>}
      <div style={{display:'flex',gap:10,marginBottom:16}}>
        <input value={busqueda} onChange={e=>setBusqueda(e.target.value)}
          placeholder="🔍 Buscar cliente..."
          style={{flex:1,padding:'8px 12px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}}/>
        <Btn onClick={()=>abrirModal()}>+ Nuevo cliente</Btn>
      </div>
      <Card><Table cols={cols} rows={clientes} empty="Sin clientes registrados."/></Card>
      <Modal open={modal} onClose={()=>setModal(false)} title={editando?'Editar cliente':'Nuevo cliente'}>
        <Input label="Nombre *"  value={form.nombre}    onChange={e=>upd('nombre',e.target.value)}/>
        <Input label="RFC"       value={form.rfc}       onChange={e=>upd('rfc',e.target.value)}/>
        <Input label="Teléfono"  value={form.telefono}  onChange={e=>upd('telefono',e.target.value)}/>
        <Input label="Email"     value={form.email}     onChange={e=>upd('email',e.target.value)}/>
        <Input label="Dirección" value={form.direccion} onChange={e=>upd('direccion',e.target.value)}/>
        <Input label="Crédito"   type="number" value={form.credito_max} onChange={e=>upd('credito_max',parseFloat(e.target.value)||0)}/>
        {error && <Alert type="error">{error}</Alert>}
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <Btn onClick={()=>setModal(false)} color="#374151" style={{flex:1}}>Cancelar</Btn>
          <Btn onClick={guardar} style={{flex:1}}>{editando?'Actualizar':'Crear'}</Btn>
        </div>
      </Modal>
    </div>
  );
}
