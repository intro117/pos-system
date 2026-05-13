import React, { useState, useEffect } from 'react';
import { reportesAPI, ventasAPI } from '../utils/api';
import { Card, Stat, Table, Alert } from '../components/UI';
import { fmt, fmtFecha } from '../utils/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
const COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
export default function Reportes() {
  const [dash,   setDash]   = useState(null);
  const [ventas, setVentas] = useState([]);
  const [error,  setError]  = useState('');
  useEffect(() => {
    Promise.all([reportesAPI.dashboard(), ventasAPI.listar({limit:20})])
      .then(([d,v]) => { setDash(d); setVentas(v); })
      .catch(e => setError(e.message));
  }, []);
  if (!dash) return <div style={{color:'#64748b',padding:32,textAlign:'center'}}>Cargando reportes...</div>;
  const metodoPago = [
    { name:'Efectivo',      value:ventas.filter(v=>v.metodo_pago==='efectivo').reduce((s,v)=>s+v.total,0) },
    { name:'Tarjeta',       value:ventas.filter(v=>v.metodo_pago==='tarjeta').reduce((s,v)=>s+v.total,0) },
    { name:'Transferencia', value:ventas.filter(v=>v.metodo_pago==='transferencia').reduce((s,v)=>s+v.total,0) },
  ].filter(m=>m.value>0);
  const cols = [
    { key:'folio',      label:'Folio',  style:{fontFamily:'monospace',fontSize:12,color:'#64748b'} },
    { key:'created_at', label:'Fecha',  render:v=>fmtFecha(v) },
    { key:'metodo_pago',label:'Método', render:v=><span style={{textTransform:'capitalize'}}>{v}</span> },
    { key:'num_items',  label:'Items' },
    { key:'iva',        label:'IVA',    render:v=>fmt(v) },
    { key:'total',      label:'Total',  render:v=><span style={{fontWeight:700,color:'#22c55e'}}>{fmt(v)}</span> },
    { key:'estado',     label:'Estado', render:v=>
      v==='completada'?<span style={{color:'#22c55e'}}>✓</span>:<span style={{color:'#ef4444'}}>✕</span> },
  ];
  return (
    <div>
      {error && <Alert type="error">{error}</Alert>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:20}}>
        <Stat label="Ventas hoy"      value={dash.hoy.ventas}                icon="🧾" color="#3b82f6"/>
        <Stat label="Total hoy"       value={fmt(dash.hoy.total)}             icon="💰" color="#22c55e"/>
        <Stat label="IVA hoy"         value={fmt(dash.hoy.iva)}               icon="📋" color="#f59e0b"/>
        <Stat label="Ticket promedio" value={fmt(dash.hoy.ticket_promedio)}   icon="🎯" color="#8b5cf6"/>
        <Stat label="Ventas semana"   value={dash.semana.ventas}              icon="📅" color="#06b6d4"/>
        <Stat label="Total semana"    value={fmt(dash.semana.total)}          icon="📈" color="#10b981"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
        <Card>
          <div style={{fontWeight:700,marginBottom:12}}>Top productos</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dash.top_productos.slice(0,8)}>
              <XAxis dataKey="nombre" tick={{fontSize:10,fill:'#64748b'}} angle={-30} textAnchor="end" height={60}/>
              <YAxis tick={{fontSize:10,fill:'#64748b'}}/>
              <Tooltip formatter={v=>fmt(v)} contentStyle={{background:'#1e293b',border:'1px solid #334155'}}/>
              <Bar dataKey="importe" fill="#3b82f6" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{fontWeight:700,marginBottom:12}}>Por método de pago</div>
          {metodoPago.length>0
            ? <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={metodoPago} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                    {metodoPago.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}
                  </Pie>
                  <Tooltip formatter={v=>fmt(v)} contentStyle={{background:'#1e293b',border:'1px solid #334155'}}/>
                </PieChart>
              </ResponsiveContainer>
            : <div style={{color:'#64748b',textAlign:'center',padding:32}}>Sin ventas aún</div>}
        </Card>
      </div>
      <Card>
        <div style={{fontWeight:700,marginBottom:12}}>Últimas ventas</div>
        <Table cols={cols} rows={ventas} empty="Sin ventas registradas."/>
      </Card>
    </div>
  );
}
