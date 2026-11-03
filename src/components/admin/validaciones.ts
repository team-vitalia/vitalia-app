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

/* ───────── Datos personales, CURP y RFC (espejo de las reglas del backend) ───────── */

const LETRAS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";
// Letras separadas por espacio, guion, apóstrofo o punto ("Dr. Juan", "O'Brien", "Ana-Lucía").
const reNombrePersona = new RegExp(`^[${LETRAS}]+(?:(?:\\.? |['\\-])[${LETRAS}]+)*\\.?$`);

export const normalizarEspacios = (v: string) => v.replace(/\s+/g, " ").trim();

/** Valida un nombre o apellido. Si no es obligatorio, vacío es válido. */
export const vNombrePersona = (v: string, etiqueta: string, requerido = true) => {
  const limpio = normalizarEspacios(v);
  if (!limpio) return requerido ? `${etiqueta} es obligatorio.` : "";
  if (limpio.length > 100) return `${etiqueta} no puede exceder 100 caracteres.`;
  return reNombrePersona.test(limpio)
    ? ""
    : `${etiqueta} solo puede contener letras, espacios, apóstrofos, puntos y guiones.`;
};

/** CURP en mayúsculas y sin espacios ni guiones. */
export const normalizarCurp = (v: string) => v.replace(/[\s-]/g, "").toUpperCase();
/** RFC en mayúsculas y sin espacios ni guiones. */
export const normalizarRfc = (v: string) => v.replace(/[\s-]/g, "").toUpperCase();

const ENTIDADES =
  "AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE";
const reCurp = new RegExp(
  `^[A-Z][AEIOUX][A-Z]{2}(\\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])[HMX](${ENTIDADES})[B-DF-HJ-NP-TV-Z]{3}[A-Z\\d]\\d$`
);

export const CURP_LONGITUD = 18;

/** CURP mexicana de 18 caracteres. Devuelve "" si es válida. */
export const vCurp = (v: string) => {
  const curp = normalizarCurp(v);
  if (!curp) return "La CURP es obligatoria.";
  if (curp.length !== CURP_LONGITUD) return `La CURP debe tener ${CURP_LONGITUD} caracteres (llevas ${curp.length}).`;
  const m = reCurp.exec(curp);
  if (!m) return "El formato de la CURP no es válido.";

  // La fecha de nacimiento contenida debe existir (posición 17: dígito = 1900s, letra = 2000s).
  const anio = Number(m[1]) + (/\d/.test(curp[16]) ? 1900 : 2000);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const fecha = new Date(anio, mes - 1, dia);
  const existe = fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  return existe && fecha <= new Date() ? "" : "La fecha de nacimiento contenida en la CURP no es válida.";
};

const reRfc = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;

/** RFC de 12 (moral) o 13 (física) caracteres. Devuelve "" si es válido. */
export const vRfc = (v: string) => {
  const rfc = normalizarRfc(v);
  if (!rfc) return "El RFC es obligatorio.";
  if (rfc.length !== 12 && rfc.length !== 13) return "El RFC debe tener 12 o 13 caracteres.";
  return reRfc.test(rfc) ? "" : "El formato del RFC no es válido.";
};

/** Reglas y nivel de fortaleza de una contraseña (los colores los pone cada pantalla). */
export function fortalezaPassword(p: string) {
  const reglas = [
    { ok: p.length >= 8, texto: "8+ caracteres" },
    { ok: /[a-z]/.test(p) && /[A-Z]/.test(p), texto: "Mayúscula y minúscula" },
    { ok: /\d/.test(p), texto: "Un número" },
    { ok: /[^A-Za-z0-9]/.test(p), texto: "Un símbolo" },
  ];
  const puntos = reglas.filter((r) => r.ok).length;
  const nivel = puntos <= 1 ? "Débil" : puntos === 2 ? "Regular" : puntos === 3 ? "Buena" : "Excelente";
  return { reglas, puntos, nivel };
}

/* ───────── Fecha de nacimiento (día / mes / año) y sexo/género ───────── */

export const GENEROS = ["Femenino", "Masculino", "Otro"] as const;

const dos = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" a partir de día, mes y año escritos; "" si no forman una fecha real. */
export const fechaNacimientoISO = (dia: string, mes: string, anio: string) => {
  const d = Number(dia), m = Number(mes), a = Number(anio);
  if (!/^\d{1,2}$/.test(dia) || !/^\d{1,2}$/.test(mes) || !/^\d{4}$/.test(anio)) return "";
  const f = new Date(a, m - 1, d);
  return f.getFullYear() === a && f.getMonth() === m - 1 && f.getDate() === d ? `${a}-${dos(m)}-${dos(d)}` : "";
};

/** Valida la fecha de nacimiento capturada en tres campos. Devuelve "" si es válida. */
export const vFechaNacimiento = (dia: string, mes: string, anio: string) => {
  if (!dia && !mes && !anio) return "La fecha de nacimiento es obligatoria.";
  const iso = fechaNacimientoISO(dia, mes, anio);
  if (!iso) return "Escribe una fecha real (día, mes y año de 4 dígitos).";
  if (iso > hoyISO()) return "La fecha no puede ser futura.";
  if (iso < "1900-01-01") return "La fecha de nacimiento no es válida.";
  return "";
};

/** Fecha ISO contenida en una CURP válida; null si la CURP aún no es válida. */
export const fechaDeCurp = (curp: string) => {
  const c = normalizarCurp(curp);
  if (vCurp(c)) return null;
  const anio = Number(c.slice(4, 6)) + (/\d/.test(c[16]) ? 1900 : 2000);
  return `${anio}-${c.slice(6, 8)}-${c.slice(8, 10)}`;
};

export const vGenero = (v: string) => ((GENEROS as readonly string[]).includes(v) ? "" : "Selecciona una opción.");