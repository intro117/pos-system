import React from 'react';

export const Card = ({ children, style = {} }) => (
  <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:16, ...style }}>
    {children}
  </div>
);

export const Btn = ({ children, onClick, color='#1d4ed8', sm=false, disabled=false, style={}, type='button', full=false }) => (
  <button type={type} onClick={onClick} disabled={disabled} style={{
    background: disabled ? '#374151' : color, color:'#fff', border:'none',
    borderRadius:8, padding: sm ? '6px 12px' : '9px 20px',
    fontWeight:600, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: sm ? 12 : 13, opacity: disabled ? .6 : 1,
    width: full ? '100%' : 'auto', transition:'.15s', ...style
  }}>{children}</button>
);

export const Input = ({ label, value, onChange, type='text', placeholder='', required=false, style={} }) => (
  <div style={{ marginBottom:12, ...style }}>
    {label && <label style={{ fontSize:12, color:'#94a3b8', display:'block', marginBottom:4 }}>
      {label}{required && <span style={{ color:'#ef4444' }}> *</span>}
    </label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
      style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #334155',
        background:'#0f172a', color:'#e2e8f0', fontSize:13, outline:'none' }}/>
  </div>
);

export const Select = ({ label, value, onChange, options=[], style={} }) => (
  <div style={{ marginBottom:12, ...style }}>
    {label && <label style={{ fontSize:12, color:'#94a3b8', display:'block', marginBottom:4 }}>{label}</label>}
    <select value={value} onChange={onChange} style={{
      width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #334155',
      background:'#0f172a', color:'#e2e8f0', fontSize:13 }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

export const Badge = ({ text, color='#3b82f6' }) => (
  <span style={{ background:color+'22', color, border:`1px solid ${color}44`,
    borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:600 }}>{text}</span>
);

export const Modal = ({ open, onClose, title, children, width=500 }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'#00000090',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'#1e293b', border:'1px solid #475569', borderRadius:14,
        padding:24, width:'100%', maxWidth:width, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:16 }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const Table = ({ cols, rows, empty='Sin datos' }) => (
  <div style={{ overflowX:'auto' }}>
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
      <thead>
        <tr style={{ borderBottom:'2px solid #334155' }}>
          {cols.map(c => (
            <th key={c.key} style={{ padding:'8px 10px', textAlign:'left',
              color:'#64748b', fontWeight:600, fontSize:11, textTransform:'uppercase' }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0
          ? <tr><td colSpan={cols.length} style={{ textAlign:'center', padding:32, color:'#475569' }}>{empty}</td></tr>
          : rows.map((row, i) => (
            <tr key={i} style={{ borderBottom:'1px solid #334155' }}>
              {cols.map(c => (
                <td key={c.key} style={{ padding:'9px 10px', ...c.style }}>
                  {c.render ? c.render(row[c.key], row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
      </tbody>
    </table>
  </div>
);

export const Stat = ({ label, value, icon, color='#3b82f6', sub }) => (
  <Card style={{ textAlign:'center' }}>
    <div style={{ fontSize:28 }}>{icon}</div>
    <div style={{ fontSize:22, fontWeight:700, color, margin:'6px 0' }}>{value}</div>
    <div style={{ fontSize:11, color:'#64748b', textTransform:'uppercase', letterSpacing:'.5px' }}>{label}</div>
    {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{sub}</div>}
  </Card>
);

export const Alert = ({ type='info', children }) => {
  const c = { info:'#3b82f6', warning:'#f59e0b', error:'#ef4444', success:'#22c55e' }[type];
  return (
    <div style={{ background:c+'22', border:`1px solid ${c}44`, borderRadius:8,
      padding:12, marginBottom:12, fontSize:13, color:c }}>{children}</div>
  );
};
