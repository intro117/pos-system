// Guardar y leer sesión del localStorage
export const getToken  = ()    => localStorage.getItem('pos_token');
export const getUser   = ()    => JSON.parse(localStorage.getItem('pos_user') || 'null');
export const setSession = (token, user) => {
  localStorage.setItem('pos_token', token);
  localStorage.setItem('pos_user', JSON.stringify(user));
};
export const clearSession = () => {
  localStorage.removeItem('pos_token');
  localStorage.removeItem('pos_user');
};
export const isAdmin  = () => getUser()?.rol === 'admin';
export const isCajero = () => getUser()?.rol === 'cajero';
