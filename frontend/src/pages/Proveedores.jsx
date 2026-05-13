import React, { useState, useEffect } from 'react';
import { proveedoresAPI } from '../utils/api';
import { Card, Btn, Input, Modal, Table, Alert } from '../components/UI';

export default function Proveedores() {
  const [lista,  setLista]  = useState([]);
  const [modal,  setModal]  = useState(false);
  const [error,  setError]  = useState('');
  const init = { nombre:'', rfc:'', contacto:'', email:'', telefono:'', direccion:'', notas:'' };
  const [form, setForm] = useState(init);
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(() => { cargar(); }, []);
  const cargar = async () => {
    try { setLista(await proveedoresAPI.listar()); } catch(e) { setError(e.message); }
  };
  const guardar = async () => {
    if (!form.nombre) { setError('El nombre es obligatorio'); return; }
    try { await proveedoresAPI.crear(form); setModal(false); setForm(init); cargar(); }
    catch(e) { setError(e.message); }
  };
  const cols = [
    { key:'nombre',   label:'Nombre',   style:{fontWeight:600} },
    { key:'contacto', label:'Contacto' },
    { key:'telefono', label:'Teléfono' },
    { key:'email',    label:'Email' },
    { key:'id', label:'Acción', render:v=>(
      <Btn sm onClick={async()=>{await proveedoresAPI.borrar(v);cargar();}} color="#991b1b">Eliminar</Btn>
    )},
  ];
  return (
    <div>
      {error && <Alert type="error">{error}</Alert>}
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
        <Btn onClick={()=>setModal(true)}>+ Nuevo proveedor</Btn>
      </div>
      <Card><Table cols={cols} rows={lista} empty="Sin proveedores registrados."/></Card>
      <Modal open={modal} onClose={()=>setModal(false)} title="Nuevo proveedor">
        <Input label="Nombre *"  value={form.nombre}   onChange={e=>upd('nombre',e.target.value)}/>
        <Input label="Contacto"  value={form.contacto} onChange={e=>upd('contacto',e.target.value)}/>
        <Input label="Teléfono"  value={form.telefono} onChange={e=>upd('telefono',e.target.value)}/>
        <Input label="Email"     value={form.email}    onChange={e=>upd('email',e.target.value)}/>
        <Input label="RFC"       value={form.rfc}      onChange={e=>upd('rfc',e.target.value)}/>
        <Input label="Dirección" value={form.direccion}onChange={e=>upd('direccion',e.target.value)}/>
        {error && <Alert type="error">{error}</Alert>}
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <Btn onClick={()=>setModal(false)} color="#374151" style={{flex:1}}>Cancelar</Btn>
          <Btn onClick={guardar} style={{flex:1}}>Crear proveedor</Btn>
        </div>
      </Modal>
    </div>
  );
}
