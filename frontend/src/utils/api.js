import axios from 'axios';
import { getToken, clearSession } from './auth';

const api = axios.create({
  baseURL: 'https://pos-system-qa.onrender.com/api',
  timeout: 15000,
});

// Agregar token a cada request
api.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el token expiró, cerrar sesión
api.interceptors.response.use(
  r => r.data,
  e => {
    if (e.response?.status === 401) {
      clearSession();
      window.location.reload();
    }
    return Promise.reject(new Error(e.response?.data?.detail || e.message || 'Error'));
  }
);

export const authAPI = {
  login:  (username, password) => {
    const form = new URLSearchParams();
    form.append('username', username);
    form.append('password', password);
    return api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  },
  me:              ()        => api.get('/auth/me'),
  usuarios:        ()        => api.get('/auth/usuarios'),
  crearUsuario:    (d)       => api.post('/auth/usuarios', d),
  borrarUsuario:   (id)      => api.delete(`/auth/usuarios/${id}`),
  cambiarPassword: (id, d)   => api.post(`/auth/usuarios/${id}/password`, d),
};

export const adminAPI = {
  resetTodo:   () => api.post('/admin/reset?confirmar=RESET_CONFIRMADO'),
  resetVentas: () => api.post('/admin/reset/ventas?confirmar=RESET_CONFIRMADO'),
};

export const productosAPI = {
  listar:      (p)    => api.get('/productos/', { params: p }),
  obtener:     (id)   => api.get(`/productos/${id}`),
  crear:       (form) => api.post('/productos/', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  actualizar:  (id,f) => api.put(`/productos/${id}`, f, { headers: { 'Content-Type': 'multipart/form-data' } }),
  borrar:      (id)   => api.delete(`/productos/${id}`),
  ajustarStock:(id,d) => api.post(`/productos/${id}/inventario`, d),
  movimientos: (id)   => api.get(`/productos/${id}/movimientos`),
  categorias:  ()     => api.get('/productos/categorias'),
  crearCat:    (d)    => api.post('/productos/categorias', d),
};
export const ventasAPI = {
  crear:     (d)  => api.post('/ventas/', d),
  listar:    (p)  => api.get('/ventas/', { params: p }),
  detalle:   (id) => api.get(`/ventas/${id}`),
  cancelar:  (id) => api.delete(`/ventas/${id}`),
  corteDia:  ()   => api.get('/ventas/corte/hoy'),
  hacerCorte:(d)  => api.post('/ventas/corte/nuevo', d),
};
export const clientesAPI = {
  listar:    (b)    => api.get('/clientes/', { params: { busqueda: b } }),
  crear:     (d)    => api.post('/clientes/', d),
  actualizar:(id,d) => api.put(`/clientes/${id}`, d),
  borrar:    (id)   => api.delete(`/clientes/${id}`),
};
export const proveedoresAPI = {
  listar: ()    => api.get('/proveedores/'),
  crear:  (d)   => api.post('/proveedores/', d),
  borrar: (id)  => api.delete(`/proveedores/${id}`),
};
export const inventarioAPI = {
  movimientos: (l) => api.get('/inventario/movimientos', { params: { limit: l } }),
  alertas:     ()  => api.get('/inventario/alertas'),
};
export const reportesAPI = {
  dashboard: () => api.get('/reportes/dashboard'),
};
export const configAPI = {
  get:    () => api.get('/config/'),
  update: (d) => api.put('/config/', d),
};
export default api;
