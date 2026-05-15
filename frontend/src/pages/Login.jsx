import React, { useState } from 'react';
import { authAPI } from '../utils/api';
import { setSession } from '../utils/auth';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError('Ingresa usuario y contraseña'); return; }
    setLoading(true); setError('');
    try {
      const res = await authAPI.login(username, password);
      setSession(res.access_token, { username: res.username, nombre: res.nombre, rol: res.rol });
      onLogin(res);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:16, padding:36, width:'100%', maxWidth:380 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🏪</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#f1f5f9' }}>Sistema de Ventas</div>
          <div style={{ fontSize:13, color:'#64748b', marginTop:4 }}>Inicia sesión para continuar</div>
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, color:'#94a3b8', display:'block', marginBottom:4 }}>Usuario</label>
            <input value={username} onChange={e=>setUsername(e.target.value)}
              placeholder="admin o cajero" autoFocus
              style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #334155',
                background:'#0f172a', color:'#e2e8f0', fontSize:14, outline:'none' }}/>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, color:'#94a3b8', display:'block', marginBottom:4 }}>Contraseña</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #334155',
                background:'#0f172a', color:'#e2e8f0', fontSize:14, outline:'none' }}/>
          </div>
          {error && (
            <div style={{ background:'#7f1d1d22', border:'1px solid #ef444444', borderRadius:8,
              padding:'8px 12px', color:'#f87171', fontSize:13, marginBottom:14 }}>
              ⚠️ {error}
            </div>
          )}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'11px 0', borderRadius:8, border:'none',
              background: loading ? '#374151' : '#1d4ed8', color:'#fff',
              fontWeight:700, fontSize:15, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Verificando...' : 'Iniciar sesión'}
          </button>
        </form>



 {/* 
       <div style={{ marginTop:20, padding:12, background:'#0f172a', borderRadius:8, fontSize:11, color:'#475569' }}>
          <div style={{ marginBottom:4 }}>👤 <b style={{color:'#64748b'}}>admin</b> / admin123 — Acceso completo</div>
          <div>👤 <b style={{color:'#64748b'}}>cajero</b> / cajero123 — Solo POS y Corte</div>
        </div>

 */}

      </div>
    </div>
  );
}
