/** Tipos y constantes compartidos por el calendario semanal de salas (web y móvil). */
export type BloqueCal = {
  id: number;
  /** 0 = lunes ... 6 = domingo; null = todos los días */
  dia: number | null;
  /** minutos desde las 00:00 */
  ini: number;
  fin: number;
  titulo: string;
  subtitulo?: string;
  color: string;
  /** Turno que cruza la medianoche: «inicio» llega hasta las 24:00; «continuacion» es la madrugada del día siguiente. */
  parte?: "inicio" | "continuacion";
  /** No se puede arrastrar (la continuación se mueve desde su parte de inicio). */
  fijo?: boolean;
};

export type ItemArrastrable = { tipo: "doctor" | "sala"; id: number; etiqueta: string };

export type CalendarioSemanaProps = {
  bloques: BloqueCal[];
  /** Días a mostrar (0 = lunes ... 6 = domingo). Por defecto toda la semana; con un solo día se ve por horas. */
  dias?: number[];
  /** Texto bajo el nombre del día en el encabezado (p. ej. la fecha «23 nov»). */
  etiquetaDia?: (dia: number) => string;
  /** Píxeles por minuto (altura de cada hora). Por defecto PX_MIN. */
  pxMin?: number;
  horaIni: number;
  horaFin: number;
  /** duración (min) con la que se crea un bloque nuevo; sirve para dibujar la sombra al arrastrar */
  duracionNueva: number;
  /** true cuando hay un doctor/sala «tomado» para colocar con un toque (móvil o clic) */
  colocando: boolean;
  onSoltarItem: (item: ItemArrastrable, dia: number, minutos: number) => void;
  onColocar: (dia: number, minutos: number) => void;
  onBloque: (id: number) => void;
  onMoverBloque: (id: number, dia: number, minutos: number) => void;
};

export type ChipArrastrableProps = {
  item: ItemArrastrable;
  color: string;
  subtitulo?: string;
  activo?: boolean;
  deshabilitado?: boolean;
  onPress: () => void;
};

export const PX_MIN = 0.8; // 48 px por hora
export const PASO_MIN = 30;
export const DIAS_LARGO = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const DIAS_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const aHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const deHHMM = (h: string) => {
  const [a, b] = (h || "00:00").split(":");
  return Number(a) * 60 + Number(b || 0);
};
export const ajustar = (min: number, desde: number, hasta: number) => Math.min(Math.max(min, desde), hasta);
export const hoyIndiceSemana = () => (new Date().getDay() + 6) % 7;

/* ---------------------------------------------------------------- turnos que cruzan la medianoche */
/** true si el turno termina al día siguiente (fin <= inicio), p. ej. 23:00 → 04:00. */
export const cruzaMedianoche = (ini: string, fin: string) => deHHMM(fin) <= deHHMM(ini);
export const diaSiguiente = (d: number | null) => (d === null ? null : (d + 1) % 7);
export const diaAnterior = (d: number) => (d + 6) % 7;

/* ---------------------------------------------------------------- fechas (hora local) */
export const MESES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const sumarDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Lunes de la semana de `d` (la semana empieza en lunes, igual que dia_semana = 0). */
export const lunesDeSemana = (d: Date) => sumarDias(d, -((d.getDay() + 6) % 7));
export const mismaFecha = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
/** Fecha real de un día (0 = lunes) dentro de la semana que empieza en `lunes`. */
export const fechaDeDia = (lunes: Date, dia: number) => sumarDias(lunes, dia);
/** «23 nov» */
export const fechaDiaMes = (d: Date) => `${d.getDate()} ${MESES_CORTO[d.getMonth()]}`;
/** «jueves 26 de noviembre de 2026» */
export const fechaLarga = (d: Date) => `${DIAS_LARGO[(d.getDay() + 6) % 7].toLowerCase()} ${d.getDate()} de ${MESES_LARGO[d.getMonth()]} de ${d.getFullYear()}`;
/** «23 – 29 nov 2026» o «30 nov – 6 dic 2026» */
export const rangoSemana = (lunes: Date) => {
  const dom = sumarDias(lunes, 6);
  const mismoMes = lunes.getMonth() === dom.getMonth();
  const ini = mismoMes ? `${lunes.getDate()}` : fechaDiaMes(lunes);
  return `${ini} – ${fechaDiaMes(dom)} ${dom.getFullYear()}`;
};
