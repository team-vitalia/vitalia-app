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
  /** Oculta la fila con el nombre del día (útil cuando el encabezado ya lo muestra otro componente). */
  sinEncabezado?: boolean;
  /** Marca la hora actual con una línea roja en ese día (solo cuando se ve la fecha de hoy). */
  ahora?: { dia: number; min: number } | null;
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

/* ---------------------------------------------------------------- turnos del día (para cortar la vista por horas) */
export type TurnoClave = "madrugada" | "matutino" | "vespertino" | "noche";
export type TurnoDef = {
  clave: TurnoClave;
  nombre: string;
  detalle: string;
  /** minutos desde las 00:00 */
  ini: number;
  fin: number;
  color: string;
  colorFin: string;
  icono: "moon-outline" | "sunny-outline" | "partly-sunny-outline" | "cloudy-night-outline";
};

/** El día se corta en cuatro tramos: la madrugada y la noche son las dos puntas del turno nocturno. */
export const TURNOS_DIA: TurnoDef[] = [
  { clave: "madrugada", nombre: "Madrugada", detalle: "turno nocturno (termina)", ini: 0, fin: 7 * 60, color: "#4338CA", colorFin: "#6D28D9", icono: "moon-outline" },
  { clave: "matutino", nombre: "Matutino", detalle: "turno de la mañana", ini: 7 * 60, fin: 15 * 60, color: "#F59E0B", colorFin: "#EA580C", icono: "sunny-outline" },
  { clave: "vespertino", nombre: "Vespertino", detalle: "turno de la tarde", ini: 15 * 60, fin: 23 * 60, color: "#2563EB", colorFin: "#0891B2", icono: "partly-sunny-outline" },
  { clave: "noche", nombre: "Noche", detalle: "turno nocturno (empieza)", ini: 23 * 60, fin: 24 * 60, color: "#6D28D9", colorFin: "#4338CA", icono: "cloudy-night-outline" },
];

export type GrupoTurno = "todo" | "matutino" | "vespertino" | "nocturno";
export const GRUPOS_TURNO: { clave: GrupoTurno; etiqueta: string; secciones: TurnoClave[] }[] = [
  { clave: "todo", etiqueta: "Todo el día", secciones: ["madrugada", "matutino", "vespertino", "noche"] },
  { clave: "matutino", etiqueta: "Matutino", secciones: ["matutino"] },
  { clave: "vespertino", etiqueta: "Vespertino", secciones: ["vespertino"] },
  { clave: "nocturno", etiqueta: "Nocturno", secciones: ["madrugada", "noche"] },
];

/** true si el tramo [ini, fin) toca el rango [desde, hasta). */
export const solapa = (b: { ini: number; fin: number }, desde: number, hasta: number) => b.ini < hasta && desde < b.fin;
