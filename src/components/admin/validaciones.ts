/** Validadores puros compartidos por registro y edición. Devuelven "" si el valor es válido. */

const reCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const vNombre = (v: string) => (v.trim().length < 3 ? "Escribe al menos 3 caracteres." : "");

export const vCorreo = (v: string) =>
  !reCorreo.test(v.trim()) ? "Correo no válido (ej. nombre@clinica.com)." : "";

export const vTelefono = (v: string) => {
  if (!v.trim()) return "";
  const digitos = v.replace(/\D/g, "").length;
  return /^[0-9+\-\s()]+$/.test(v) && digitos >= 7 && digitos <= 15 ? "" : "Teléfono no válido (7 a 15 dígitos).";
};

export const vPassword = (v: string) => (v.length < 8 ? "Mínimo 8 caracteres." : "");

export const vCosto = (v: string) => {
  if (!v.trim()) return "Ingresa el costo de consulta.";
  const n = Number(v);
  return isNaN(n) || n < 0 ? "Ingresa un monto válido (≥ 0)." : "";
};

export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const vFecha = (v: string) => (v && v > hoyISO() ? "La fecha no puede ser futura." : "");
