export const fmt = (n, sym = '$') =>
  `${sym}${Number(n || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  })}`;
export const fmtFecha = (iso) =>
  iso ? new Date(iso).toLocaleString('es-MX') : '—';
export const fmtFechaCorta = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-MX') : '—';
