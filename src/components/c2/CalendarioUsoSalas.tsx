import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Aviso, Boton, Cargando, Tarjeta, Vacio, useAccesoC2 } from "./ui";
import { ChipColor, estiloTipoSala, etiquetaEstadoSala, useEstilosC2, type Paleta } from "./extra";
import { CalendarioSemana, ChipArrastrable } from "./CalendarioSemana";
import {
  BloqueCal,
  DIAS_CORTO,
  DIAS_LARGO,
  GRUPOS_TURNO,
  GrupoTurno,
  ItemArrastrable,
  MESES_CORTO,
  MESES_LARGO,
  TURNOS_DIA,
  TurnoDef,
  aHHMM,
  deHHMM,
  diaSiguiente,
  fechaDeDia,
  fechaDiaMes,
  fechaLarga,
  lunesDeSemana,
  mismaFecha,
  rangoSemana,
  solapa,
  sumarDias,
} from "./calendarioTipos";
import ModalAsignacionSala, { DatosAsignacion } from "./ModalAsignacionSala";
import api from "../../services/api";
import { AsignacionCalendario, Sala, calendarioSalas, descargarResumenAsignaciones, listarSalas, mensajeError } from "../../services/c2Service";

/**
 * Calendario de uso de salas (vive dentro de «Salas y equipamiento»).
 *
 *  - Vista semana: una tarjeta por día (con su fecha) que marca qué horas están reservadas y cuáles libres.
 *  - Al tocar un día se abre la vista por horas de ese día, donde se reserva jalando/tocando.
 *  - Los horarios se repiten cada semana; las fechas indican la semana que se está viendo.
 *  - Un turno puede cruzar la medianoche (23:00 → 04:00): se dibuja en dos tramos, uno por día.
 */

type DoctorItem = { id_PK: number; nombre: string; especialidades?: { id_PK: number; nombre: string }[] };
type Modo = "sala" | "doctor" | "general";

const COLORES_DOCTOR = ["#2563EB", "#DB2777", "#D97706", "#059669", "#7C3AED", "#DC2626", "#0891B2", "#65A30D", "#C026D3", "#EA580C"];
const colorDoctor = (id: number) => COLORES_DOCTOR[id % COLORES_DOCTOR.length];
const DURACION_NUEVA = 60;
const PX_MIN_DIA = 1.1; // vista por horas: ~66 px por hora, más cómoda para tocar

const horas = (min: number) => `${Math.round((min / 60) * 10) / 10} h`;
const hh = (min: number) => (min >= 1440 ? "24:00" : aHHMM(min));
const rango = (a: number, b: number) => `${hh(a)}–${hh(b)}`;

/** Texto corto del horario de un tramo, pensado para las tarjetas de la semana. */
const textoRango = (b: { ini: number; fin: number; parte?: "inicio" | "continuacion" }) =>
  b.parte === "inicio" ? `${hh(b.ini)} → mañana` : b.parte === "continuacion" ? `00:00–${hh(b.fin)} (de ayer)` : rango(b.ini, b.fin);

/** Huecos sin reservar de un día entre `desde` y `hasta` (minutos). */
function rangosLibres(bloques: BloqueCal[], dia: number, desde: number, hasta: number): [number, number][] {
  const ocupados = bloques
    .filter((b) => b.dia === null || b.dia === dia)
    .map((b) => [Math.max(b.ini, desde), Math.min(b.fin, hasta)] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  const libres: [number, number][] = [];
  let cursor = desde;
  for (const [a, b] of ocupados) {
    if (a > cursor) libres.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < hasta) libres.push([cursor, hasta]);
  return libres;
}

type Seg = { dia: number | null; ini: number; fin: number; parte?: "inicio" | "continuacion" };

/** Tramos (dentro de un mismo día) de una asignación; un turno nocturno se parte en la medianoche. */
function segmentosAsig(a: AsignacionCalendario): Seg[] {
  const ini = deHHMM(a.hora_inicio.slice(0, 5));
  const fin = deHHMM(a.hora_fin.slice(0, 5));
  if (fin > ini) return [{ dia: a.dia_semana, ini, fin }];
  const out: Seg[] = [{ dia: a.dia_semana, ini, fin: 1440, parte: "inicio" }];
  if (fin > 0) out.push({ dia: diaSiguiente(a.dia_semana), ini: 0, fin, parte: "continuacion" });
  return out;
}

const COLOR_M = "#F59E0B";
const COLOR_V = "#2563EB";
const COLOR_N = "#6D28D9";

/** Une los días consecutivos que tienen exactamente lo mismo (p. ej. «todos los días» queda como una sola línea). */
function agruparDias<T extends Seg & { titulo: string; color: string }>(segs: T[]) {
  const porDia = [0, 1, 2, 3, 4, 5, 6].map((d) => segs.filter((sg) => sg.dia === null || sg.dia === d).sort((x, y) => x.ini - y.ini));
  const firma = (l: T[]) => l.map((sg) => `${sg.ini}-${sg.fin}-${sg.titulo}-${sg.parte ?? ""}`).join("|");
  const grupos: { dias: number[]; segs: T[] }[] = [];
  porDia.forEach((lista, d) => {
    const g = grupos[grupos.length - 1];
    if (g && firma(g.segs) === firma(lista)) g.dias.push(d);
    else grupos.push({ dias: [d], segs: lista });
  });
  return grupos;
}

const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Props = {
  /** Sala (o doctor, según el modo) que se muestra al abrir. */
  salaInicialId?: number | null;
  /** Cómo se abre: por sala, por doctor o la vista general. */
  modoInicial?: Modo;
  /** Doctor preseleccionado (cuando se abre en modo doctor). */
  doctorInicialId?: number | null;
  /** Día (0 = lunes) con el que se abre directamente la vista por horas. */
  diaInicial?: number | null;
  /** Se llama cuando se crea, mueve o quita una reserva (para refrescar la lista de salas). */
  onCambio?: () => void;
};

export default function CalendarioUsoSalas({ salaInicialId = null, doctorInicialId = null, modoInicial = "sala", diaInicial = null, onCambio }: Props) {
  const { C, s } = useEstilosC2(crearEstilos);
  const { token } = useAccesoC2();

  const [doctores, setDoctores] = useState<DoctorItem[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionCalendario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [modo, setModo] = useState<Modo>(modoInicial);
  // La selección se guarda por separado para sala y doctor (sus ids son números distintos que pueden coincidir)
  const [seleccion, setSeleccion] = useState<{ sala: number | null; doctor: number | null }>({ sala: salaInicialId, doctor: doctorInicialId });
  const sujetoId = modo === "sala" ? seleccion.sala : modo === "doctor" ? seleccion.doctor : null;
  const [grupo, setGrupo] = useState<GrupoTurno>("todo");
  const [filasPor, setFilasPor] = useState<"sala" | "doctor">("sala");
  const [vistaGen, setVistaGen] = useState<"dias" | "linea">("dias");
  const [exportando, setExportando] = useState<"excel" | "pdf" | null>(null);
  // Ancho real del contenedor (hay barra lateral en escritorio): decide cuántas columnas caben
  const { width: anchoVentana } = useWindowDimensions();
  const [anchoCont, setAnchoCont] = useState(0);
  const ancho = anchoCont || anchoVentana;
  const compacto = ancho < 560;
  const primeraCarga = useRef(true);
  const [diaSel, setDiaSel] = useState<number | null>(diaInicial); // null = vista semana
  const [tomado, setTomado] = useState<ItemArrastrable | null>(null);
  const [modal, setModal] = useState<DatosAsignacion | null>(null);

  // Semana que se está viendo (0 = la actual) y sus fechas reales
  const [semana, setSemana] = useState(0);
  const hoyFecha = new Date();
  const lunes = sumarDias(lunesDeSemana(hoyFecha), semana * 7);
  const fecha = (dia: number) => fechaDeDia(lunes, dia);
  const esHoy = (dia: number) => mismaFecha(fecha(dia), hoyFecha);
  const etiquetaDia = (dia: number) => fechaDiaMes(fecha(dia));

  const cargar = useCallback(async () => {
    if (!token) return;
    if (primeraCarga.current) setCargando(true); // en recargas posteriores no se tapa la pantalla
    const cab = { headers: { Authorization: `Bearer ${token}` } };
    // allSettled: si falla una consulta (p. ej. doctores) las demás se muestran igual.
    const [d, p, a] = await Promise.allSettled([
      api.get("/api/doctores/", cab),
      listarSalas(token, { page_size: 100 }),
      calendarioSalas(token),
    ]);
    const fallos: string[] = [];
    if (d.status === "fulfilled") setDoctores(d.value.data);
    else fallos.push(mensajeError(d.reason, "No se pudieron cargar los doctores."));
    if (p.status === "fulfilled") setSalas(p.value.data);
    else fallos.push(mensajeError(p.reason, "No se pudieron cargar las salas."));
    if (a.status === "fulfilled") setAsignaciones(a.value);
    else fallos.push(mensajeError(a.reason, "No se pudieron cargar los horarios."));
    setError(fallos.join(" "));
    primeraCarga.current = false;
    setCargando(false);
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Al cargar los datos se asegura que haya un elemento válido elegido; si aún no cargan, se conserva la preselección.
  useEffect(() => {
    if (modo === "general") return;
    const lista = modo === "sala" ? salas.map((x) => x.id_PK) : doctores.map((x) => x.id_PK);
    if (lista.length === 0) return;
    setSeleccion((prev) => {
      const actual = prev[modo];
      return actual != null && lista.includes(actual) ? prev : { ...prev, [modo]: lista[0] };
    });
  }, [modo, salas, doctores]);

  const doctorDe = (id: number) => doctores.find((d) => d.id_PK === id);
  const salaDe = (id: number) => salas.find((x) => x.id_PK === id);
  const datosDoctor = (id: number) => {
    const d = doctorDe(id) ?? asignaciones.find((a) => a.doctor_id === id);
    const nombre = (d as any)?.nombre ?? (d as any)?.doctor_nombre ?? `Doctor #${id}`;
    const esp = (d as DoctorItem)?.especialidades?.map((e) => e.nombre).join(", ") || (d as any)?.especialidad || null;
    return { id, nombre, especialidad: esp };
  };
  const datosSala = (id: number) => {
    const x = salaDe(id);
    return { id, nombre: x?.nombre ?? `Sala #${id}`, tipo: x?.tipo ?? null, piso: x?.piso ?? null, estado: x?.estado ?? null };
  };

  /* ---------- bloques del calendario ---------- */
  const visibles = useMemo(
    () => asignaciones.filter((a) => (modo === "sala" ? a.sala_id === sujetoId : a.doctor_id === sujetoId)),
    [asignaciones, modo, sujetoId]
  );

  // Un turno que cruza la medianoche (fin <= inicio) se dibuja en dos tramos: hasta las 24:00 y desde las 00:00 del día siguiente.
  const bloques: BloqueCal[] = useMemo(
    () =>
      visibles.flatMap((a): BloqueCal[] => {
        const ini = deHHMM(a.hora_inicio.slice(0, 5));
        const fin = deHHMM(a.hora_fin.slice(0, 5));
        const hi = a.hora_inicio.slice(0, 5);
        const hf = a.hora_fin.slice(0, 5);
        const todos = a.dia_semana == null ? " · todos los días" : "";
        const base = {
          id: a.id_PK,
          titulo: modo === "sala" ? a.doctor_nombre ?? `Doctor #${a.doctor_id}` : a.sala_nombre ?? `Sala #${a.sala_id}`,
          color: modo === "sala" ? colorDoctor(a.doctor_id) : estiloTipoSala(a.sala_tipo).color,
        };
        if (fin > ini) return [{ ...base, dia: a.dia_semana, ini, fin, subtitulo: `${hi} – ${hf}${todos}` }];
        const partes: BloqueCal[] = [
          { ...base, dia: a.dia_semana, ini, fin: 1440, parte: "inicio", subtitulo: `${hi} – ${hf} (día siguiente)${todos}` },
        ];
        if (fin > 0) {
          partes.push({ ...base, dia: diaSiguiente(a.dia_semana), ini: 0, fin, parte: "continuacion", fijo: true, subtitulo: `viene de las ${hi} · termina ${hf}` });
        }
        return partes;
      }),
    [visibles, modo]
  );

  // Las barras y los huecos libres se miden sobre el día completo (00:00–24:00)
  const minIni = 0;
  const minFin = 1440;

  const delDia = (dia: number) => bloques.filter((b) => b.dia === null || b.dia === dia).sort((a, b) => a.ini - b.ini);

  const horasSemana = useMemo(
    () => bloques.reduce((t, b) => t + ((b.fin - b.ini) / 60) * (b.dia === null ? 7 : 1), 0),
    [bloques]
  );

  // Cuántas reservas tiene cada sala/doctor (para el selector)
  const conteo = useMemo(() => {
    const m = new Map<number, number>();
    asignaciones.forEach((a) => {
      const k = modo === "sala" ? a.sala_id : a.doctor_id;
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  }, [asignaciones, modo]);

  /* ---------- acciones ---------- */
  const abrirNueva = (item: ItemArrastrable, dia: number, min: number) => {
    if (sujetoId == null) return;
    setOk("");
    setError("");
    const doctor = datosDoctor(modo === "sala" ? item.id : sujetoId);
    const sala = datosSala(modo === "sala" ? sujetoId : item.id);
    setModal({ doctor, sala, dia, ini: min, fin: (min + DURACION_NUEVA) % 1440 });
    setTomado(null);
  };

  const abrirExistente = (id: number, nuevo?: { dia: number; min: number }) => {
    const a = asignaciones.find((x) => x.id_PK === id);
    if (!a) return;
    setOk("");
    setError("");
    const dur = (deHHMM(a.hora_fin.slice(0, 5)) - deHHMM(a.hora_inicio.slice(0, 5)) + 1440) % 1440; // turnos nocturnos incluidos
    setModal({
      asignacionId: a.id_PK,
      doctor: datosDoctor(a.doctor_id),
      sala: datosSala(a.sala_id),
      dia: nuevo ? nuevo.dia : a.dia_semana,
      ini: nuevo ? nuevo.min : deHHMM(a.hora_inicio.slice(0, 5)),
      fin: nuevo ? (nuevo.min + dur) % 1440 : deHHMM(a.hora_fin.slice(0, 5)),
      movido: !!nuevo,
    });
  };

  const alTerminar = async (mensaje: string) => {
    setModal(null);
    setOk(mensaje);
    await cargar();
    onCambio?.();
  };

  const exportar = async (formato: "excel" | "pdf") => {
    if (!token) return;
    setExportando(formato);
    setError("");
    setOk("");
    try {
      await descargarResumenAsignaciones(token, formato, isoLocal(lunes));
      setOk(`Resumen en ${formato === "pdf" ? "PDF" : "Excel"} generado. Revisa tus descargas.`);
    } catch (e) {
      setError(mensajeError(e, "No se pudo generar el resumen. Inténtalo de nuevo."));
    } finally {
      setExportando(null);
    }
  };

  /** Cambia de día; pasar del lunes hacia atrás o del domingo hacia adelante cambia también de semana. */
  const irAlDia = (dia: number) => {
    if (dia < 0) {
      setSemana((x) => x - 1);
      setDiaSel(6);
    } else if (dia > 6) {
      setSemana((x) => x + 1);
      setDiaSel(0);
    } else setDiaSel(dia);
    setTomado(null);
  };

  const elegirSujeto = (id: number) => {
    setSeleccion((prev) => ({ ...prev, [modo]: id }));
    setTomado(null);
  };

  const cambiarModo = (m: Modo) => {
    setModo(m);
    setDiaSel(null);
    setTomado(null);
  };

  /** Desde la vista general: abre la sala/doctor tocado (en un día concreto, o en su semana si dia es null). */
  const abrirDesdeGeneral = (tipo: "sala" | "doctor", id: number, dia: number | null) => {
    setSeleccion((prev) => ({ ...prev, [tipo]: id }));
    setModo(tipo);
    setDiaSel(dia);
    setTomado(null);
  };

  const sujetoNombre = modo === "sala" ? salaDe(sujetoId ?? -1)?.nombre : doctorDe(sujetoId ?? -1)?.nombre;
  const sujetoSala = modo === "sala" ? salaDe(sujetoId ?? -1) : undefined;
  const salaNoDisponible = sujetoSala?.estado === "inactiva" || sujetoSala?.estado === "mantenimiento";

  /* ---------- piezas de la vista ---------- */
  const selectorModo = (
    <>
      <Text style={s.titulo}>¿Cómo quieres trabajar?</Text>
      <View style={s.chips}>
        <ChipColor texto="Vista general de todo" color="#0F766E" icono="grid-outline" activo={modo === "general"} onPress={() => cambiarModo("general")} />
        <ChipColor texto="Ver una sala y colocar doctores" color="#7C3AED" icono="business-outline" activo={modo === "sala"} onPress={() => cambiarModo("sala")} />
        <ChipColor texto="Ver un doctor y colocar salas" color="#2563EB" icono="person-outline" activo={modo === "doctor"} onPress={() => cambiarModo("doctor")} />
      </View>

      {modo !== "general" && (
        <>
      <Text style={s.titulo}>Elige {modo === "sala" ? "la sala" : "el doctor"} que quieres ver</Text>
      <Text style={s.ayuda}>El número entre paréntesis son los horarios ya reservados.</Text>
      {(modo === "sala" ? salas.length === 0 : doctores.length === 0) ? (
        <Vacio texto={modo === "sala" ? "No hay salas registradas. Crea una en la pestaña «Salas y equipo»." : "No hay doctores activos."} />
      ) : (
        <View style={s.chips}>
          {modo === "sala"
            ? salas.map((x) => {
                const est = estiloTipoSala(x.tipo);
                const n = conteo.get(x.id_PK) ?? 0;
                return <ChipColor key={x.id_PK} texto={`${x.nombre} (${n})`} color={est.color} icono={est.icono} activo={sujetoId === x.id_PK} onPress={() => elegirSujeto(x.id_PK)} />;
              })
            : doctores.map((d) => (
                <ChipColor key={d.id_PK} texto={`${d.nombre} (${conteo.get(d.id_PK) ?? 0})`} color={colorDoctor(d.id_PK)} icono="person-outline" activo={sujetoId === d.id_PK} onPress={() => elegirSujeto(d.id_PK)} />
              ))}
        </View>
      )}
        </>
      )}
    </>
  );

  /** Franja horaria del día (00:00–24:00): el fondo se tiñe por turno y los tramos reservados van en color fuerte. */
  const barraDia = (dia: number, alto = 8) => (
    <View style={{ height: alto, borderRadius: alto / 2, overflow: "hidden", flexDirection: "row" }}>
      {TURNOS_DIA.map((tu) => (
        <View key={tu.clave} style={{ width: `${((tu.fin - tu.ini) / 1440) * 100}%`, backgroundColor: `${tu.color}26` }} />
      ))}
      {delDia(dia).map((b, i) => (
        <View
          key={`${b.id}-${i}`}
          style={{ position: "absolute", top: 0, bottom: 0, left: `${(b.ini / 1440) * 100}%`, width: `${((b.fin - b.ini) / 1440) * 100}%`, backgroundColor: b.color }}
        />
      ))}
    </View>
  );

  /* ---------- encabezado con degradado ---------- */
  const botonHero = (icono: "chevron-back" | "chevron-forward", onPress: () => void, etiqueta: string) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={etiqueta} style={({ pressed }) => [s.heroBtn, pressed && { opacity: 0.65 }]}>
      <Ionicons name={icono} size={20} color="#FFFFFF" />
    </Pressable>
  );
  const pildoraHero = (icono: React.ComponentProps<typeof Ionicons>["name"], texto: string) => (
    <View key={texto} style={s.heroPildora}>
      <Ionicons name={icono} size={13} color="#FFFFFF" />
      <Text style={s.heroPildoraTexto}>{texto}</Text>
    </View>
  );
  const heroMarco = (hijos: React.ReactNode) => (
    <LinearGradient colors={["#0F766E", "#1D4ED8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
      <View pointerEvents="none" style={s.heroCirculoA} />
      <View pointerEvents="none" style={s.heroCirculoB} />
      {hijos}
    </LinearGradient>
  );

  const vistaSemana = (
    <>
      {heroMarco(
        <>
          <View style={s.heroFila}>
            <View style={s.heroIcono}>
              <Ionicons name={modo === "sala" ? "business" : "person"} size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroSuper}>{modo === "sala" ? "CALENDARIO DE LA SALA" : "CALENDARIO DEL DOCTOR"}</Text>
              <Text style={s.heroTitulo} numberOfLines={2}>
                {sujetoNombre}
              </Text>
            </View>
          </View>

          <View style={s.heroNav}>
            {botonHero("chevron-back", () => setSemana((x) => x - 1), "Semana anterior")}
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={s.heroSemana}>Semana del {rangoSemana(lunes)}</Text>
              <Text style={s.heroSub}>{semana === 0 ? "Esta semana" : semana > 0 ? `Dentro de ${semana} semana${semana === 1 ? "" : "s"}` : `Hace ${-semana} semana${semana === -1 ? "" : "s"}`}</Text>
            </View>
            {botonHero("chevron-forward", () => setSemana((x) => x + 1), "Semana siguiente")}
          </View>

          <View style={s.heroChips}>
            {pildoraHero("calendar-outline", `${visibles.length} reserva${visibles.length === 1 ? "" : "s"}`)}
            {pildoraHero("time-outline", `${Math.round(horasSemana * 10) / 10} h por semana`)}
            {pildoraHero("repeat-outline", "Se repite cada semana")}
            {semana !== 0 && (
              <Pressable onPress={() => setSemana(0)} style={s.heroHoy} accessibilityRole="button">
                <Text style={s.heroHoyTexto}>Ir a hoy</Text>
              </Pressable>
            )}
          </View>
        </>
      )}

      <Text style={s.ayuda}>Toca un día para ver sus horas y reservar. Los turnos de noche que pasan de las 24:00 también marcan el día siguiente.</Text>

      {salaNoDisponible && <Aviso tipo="info" texto={`Esta sala está ${etiquetaEstadoSala(sujetoSala?.estado).toLowerCase()}: no se pueden asignar nuevos horarios hasta que vuelva a estar disponible.`} />}

      <View style={s.leyenda}>
        <View style={[s.punto, { backgroundColor: COLOR_M }]} />
        <Text style={s.leyendaTexto}>Matutino 07–15</Text>
        <View style={[s.punto, { backgroundColor: COLOR_V }]} />
        <Text style={s.leyendaTexto}>Vespertino 15–23</Text>
        <View style={[s.punto, { backgroundColor: COLOR_N }]} />
        <Text style={s.leyendaTexto}>Nocturno 23–07</Text>
        <Text style={s.leyendaTexto}>· Tono claro = libre · color fuerte = reservado</Text>
      </View>

      <View style={s.rejilla}>
        {[0, 1, 2, 3, 4, 5, 6].map((dia) => {
          const items = delDia(dia);
          const libres = rangosLibres(bloques, dia, minIni, minFin);
          const libreMin = libres.reduce((tot, [x, y]) => tot + (y - x), 0);
          const ocupadoMin = minFin - minIni - libreMin;
          const f = fecha(dia);
          const hoyEs = esHoy(dia);
          return (
            <Pressable
              key={dia}
              onPress={() => setDiaSel(dia)}
              style={[s.diaTarjeta, hoyEs && { borderColor: C.primario, borderWidth: 2 }]}
              accessibilityRole="button"
              accessibilityLabel={`${fechaLarga(f)}: ${items.length} reservas. Ver por horas`}
            >
              <View style={s.diaCab}>
                <View style={[s.fechaMini, hoyEs && { backgroundColor: C.primario }]}>
                  <Text style={[s.fechaMiniMes, hoyEs && { color: "#FFFFFF" }]}>{MESES_CORTO[f.getMonth()].toUpperCase()}</Text>
                  <Text style={[s.fechaMiniNum, hoyEs && { color: "#FFFFFF" }]}>{f.getDate()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.diaNombre}>{DIAS_LARGO[dia]}</Text>
                  {hoyEs && <Text style={s.hoyPildora}>hoy</Text>}
                </View>
              </View>
              {barraDia(dia)}
              {items.length === 0 ? (
                <Text style={s.diaLibre}>Libre todo el día</Text>
              ) : (
                <>
                  <Text style={s.diaCuenta}>
                    {items.length} reserva{items.length === 1 ? "" : "s"} · {horas(ocupadoMin)} ocupadas
                  </Text>
                  {items.slice(0, 3).map((b, i) => (
                    <View key={`${b.id}-${b.parte ?? "u"}-${i}`} style={s.diaFila}>
                      <View style={[s.punto, { backgroundColor: b.color }]} />
                      <Text style={s.diaFilaTexto} numberOfLines={1}>
                        <Text style={s.negrita}>{textoRango(b)}</Text> {b.titulo}
                      </Text>
                    </View>
                  ))}
                  {items.length > 3 && <Text style={s.ayuda}>+{items.length - 3} más</Text>}
                </>
              )}
              <Text style={s.diaVer}>Ver por horas ›</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  /** Un tramo del día (Matutino, Vespertino…) con su propio encabezado y su cuadrícula de horas. */
  const seccionTurno = (def: TurnoDef, dia: number, items: BloqueCal[]) => {
    const delTurno = new Set(items.filter((b) => solapa(b, def.ini, def.fin)).map((b) => b.id)).size;
    const libresT = rangosLibres(bloques, dia, def.ini, def.fin);
    const libreT = libresT.reduce((tot, [x, y]) => tot + (y - x), 0);
    const ahoraMarca = esHoy(dia) ? { dia, min: hoyFecha.getHours() * 60 + hoyFecha.getMinutes() } : null;
    return (
      <View key={def.clave} style={s.turno}>
        <LinearGradient colors={[def.color, def.colorFin]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.turnoCab}>
          <View style={s.turnoIcono}>
            <Ionicons name={def.icono} size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.turnoNombre}>{def.nombre}</Text>
            <Text style={s.turnoRango}>
              {hh(def.ini)} – {hh(def.fin)} · {def.detalle}
            </Text>
          </View>
          <View style={{ alignItems: compacto ? "flex-start" : "flex-end", flexDirection: compacto ? "row" : "column", flexWrap: "wrap", gap: 4 }}>
            <Text style={s.turnoPildora}>{delTurno === 0 ? "Sin reservas" : `${delTurno} reserva${delTurno === 1 ? "" : "s"}`}</Text>
            <Text style={s.turnoPildora}>{horas(libreT)} libres</Text>
          </View>
        </LinearGradient>
        <CalendarioSemana
          bloques={bloques}
          dias={[dia]}
          sinEncabezado
          ahora={ahoraMarca}
          pxMin={grupo === "todo" ? 0.95 : PX_MIN_DIA}
          horaIni={def.ini / 60}
          horaFin={def.fin / 60}
          duracionNueva={DURACION_NUEVA}
          colocando={!!tomado}
          onSoltarItem={abrirNueva}
          onColocar={(d, min) => tomado && abrirNueva(tomado, d, min)}
          onBloque={(id) => abrirExistente(id)}
          onMoverBloque={(id, d, min) => abrirExistente(id, { dia: d, min })}
        />
      </View>
    );
  };

  const vistaDia = (dia: number) => {
    const items = delDia(dia);
    const libres = rangosLibres(bloques, dia, minIni, minFin);
    const libreMin = libres.reduce((tot, [x, y]) => tot + (y - x), 0);
    const f = fecha(dia);
    const hoyEs = esHoy(dia);

    return (
      <>
        {heroMarco(
          <>
            <View style={s.heroFila}>
              <View style={s.fechaCaja}>
                <Text style={s.fechaMes}>{MESES_CORTO[f.getMonth()].toUpperCase()}</Text>
                <Text style={s.fechaNum}>{f.getDate()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroSuper} numberOfLines={1}>
                  {(modo === "sala" ? "SALA · " : "DOCTOR · ") + (sujetoNombre ?? "").toUpperCase()}
                </Text>
                <Text style={[s.heroTitulo, compacto && { fontSize: 18 }]}>
                  {DIAS_LARGO[dia]}
                  {hoyEs ? "  · hoy" : ""}
                </Text>
                <Text style={s.heroSub}>
                  {f.getDate()} de {MESES_LARGO[f.getMonth()]} de {f.getFullYear()}
                </Text>
              </View>
              <View style={{ gap: 8 }}>
                {botonHero("chevron-back", () => irAlDia(dia - 1), "Día anterior")}
                {botonHero("chevron-forward", () => irAlDia(dia + 1), "Día siguiente")}
              </View>
            </View>
            <View style={s.heroChips}>
              {pildoraHero("calendar-outline", items.length === 0 ? "Libre todo el día" : `${items.length} reserva${items.length === 1 ? "" : "s"}`)}
              {libres.length > 0 && pildoraHero("hourglass-outline", `${horas(libreMin)} libres`)}
              {pildoraHero("repeat-outline", `Se repite cada ${DIAS_LARGO[dia].toLowerCase()}`)}
            </View>
            <Pressable onPress={() => { setDiaSel(null); setTomado(null); }} style={s.heroHoy} accessibilityRole="button">
              <Text style={s.heroHoyTexto}>← Ver la semana</Text>
            </Pressable>
          </>
        )}

        {/* Mosaicos de fecha de la semana */}
        <View style={s.mosaicos}>
          {[0, 1, 2, 3, 4, 5, 6].map((d) => {
            const fd = fecha(d);
            const activo = d === dia;
            const hay = delDia(d).length > 0;
            return (
              <Pressable
                key={d}
                onPress={() => irAlDia(d)}
                accessibilityRole="button"
                accessibilityLabel={fechaLarga(fd)}
                style={[s.mosaico, activo && { backgroundColor: C.primario, borderColor: C.primario }, !activo && esHoy(d) && { borderColor: C.primario, borderWidth: 2 }]}
              >
                <Text style={[s.mosaicoDia, activo && { color: "#FFFFFF" }]}>{DIAS_CORTO[d]}</Text>
                <Text style={[s.mosaicoNum, activo && { color: "#FFFFFF" }]}>{fd.getDate()}</Text>
                <View style={[s.mosaicoPunto, { backgroundColor: hay ? (activo ? "#FFFFFF" : C.primario) : "transparent" }]} />
              </Pressable>
            );
          })}
        </View>

        <Text style={s.titulo}>¿Qué parte del día quieres ver?</Text>
        <View style={s.chips}>
          {GRUPOS_TURNO.map((g) => {
            const info = g.clave === "matutino" ? { c: COLOR_M, i: "sunny-outline" } : g.clave === "vespertino" ? { c: COLOR_V, i: "partly-sunny-outline" } : g.clave === "nocturno" ? { c: COLOR_N, i: "moon-outline" } : { c: C.primario, i: "time-outline" };
            return <ChipColor key={g.clave} texto={g.etiqueta} color={info.c} icono={info.i as any} activo={grupo === g.clave} onPress={() => setGrupo(g.clave)} />;
          })}
        </View>

        {libres.length > 0 && (
          <View style={s.chips}>
            <Text style={[s.ayuda, { marginBottom: 0, alignSelf: "center" }]}>Libre:</Text>
            {libres.map(([x, y]) => (
              <View key={`${x}-${y}`} style={s.libreChip}>
                <Text style={s.libreChipTexto}>{rango(x, y)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* La paleta para colocar */}
        {!salaNoDisponible && (
          <>
            <Text style={s.titulo}>{modo === "sala" ? "Jala un doctor" : "Jala una sala"} a la hora que quieras</Text>
            <Text style={s.ayuda}>
              En computadora, jala la tarjeta y suéltala en la hora. En celular (o con un clic), toca la tarjeta y luego toca la hora en el calendario. Para un turno de noche (p. ej. 23:00 a 04:00) elige la hora de inicio y ajusta la hora de fin en la ventana que se abre.
            </Text>
            <View style={s.chips}>
              {modo === "sala"
                ? doctores.map((d) => (
                    <ChipArrastrable
                      key={d.id_PK}
                      item={{ tipo: "doctor", id: d.id_PK, etiqueta: d.nombre }}
                      subtitulo={d.especialidades?.map((e) => e.nombre).join(", ") || undefined}
                      color={colorDoctor(d.id_PK)}
                      activo={tomado?.tipo === "doctor" && tomado.id === d.id_PK}
                      onPress={() => setTomado(tomado?.id === d.id_PK && tomado.tipo === "doctor" ? null : { tipo: "doctor", id: d.id_PK, etiqueta: d.nombre })}
                    />
                  ))
                : salas.map((x) => {
                    const est = estiloTipoSala(x.tipo);
                    const noDisp = x.estado === "inactiva" || x.estado === "mantenimiento";
                    return (
                      <ChipArrastrable
                        key={x.id_PK}
                        item={{ tipo: "sala", id: x.id_PK, etiqueta: x.nombre }}
                        subtitulo={noDisp ? etiquetaEstadoSala(x.estado) : [x.tipo, x.piso ? `Piso ${x.piso}` : null].filter(Boolean).join(" · ") || undefined}
                        color={est.color}
                        deshabilitado={noDisp}
                        activo={tomado?.tipo === "sala" && tomado.id === x.id_PK}
                        onPress={() => setTomado(tomado?.id === x.id_PK && tomado.tipo === "sala" ? null : { tipo: "sala", id: x.id_PK, etiqueta: x.nombre })}
                      />
                    );
                  })}
            </View>
          </>
        )}

        {!!tomado && (
          <View style={s.tomado}>
            <Ionicons name="hand-right-outline" size={18} color={C.primario} />
            <Text style={s.tomadoTexto}>
              Elegiste <Text style={s.negrita}>{tomado.etiqueta}</Text>: toca en el calendario la hora donde quieres colocarlo.
            </Text>
            <Boton texto="Cancelar" variante="secundario" pequeno onPress={() => setTomado(null)} />
          </View>
        )}

        {GRUPOS_TURNO.find((g) => g.clave === grupo)!
          .secciones.map((c) => TURNOS_DIA.find((x) => x.clave === c)!)
          .map((def) => seccionTurno(def, dia, items))}

        <Tarjeta style={{ marginTop: 12 }}>
          <Text style={s.titulo}>
            Reservas del {DIAS_LARGO[dia].toLowerCase()} {f.getDate()} de {MESES_LARGO[f.getMonth()]}
          </Text>
          {items.length === 0 ? (
            <Text style={s.ayuda}>Sin reservas este día.</Text>
          ) : (
            items.map((b, i) => {
              const a = visibles.find((x) => x.id_PK === b.id);
              if (!a) return null;
              const hi = a.hora_inicio.slice(0, 5);
              const hf = a.hora_fin.slice(0, 5);
              const horario =
                b.parte === "continuacion"
                  ? `00:00–${hf} (sigue del turno de ${hi} de la noche anterior)`
                  : b.parte === "inicio"
                    ? `${hi}–${hf} (termina al día siguiente)`
                    : `${hi}–${hf}`;
              return (
                <View key={`${b.id}-${b.parte ?? "u"}-${i}`} style={s.fila}>
                  <View style={[s.punto, { backgroundColor: b.color }]} />
                  <Text style={s.filaTexto}>
                    <Text style={s.negrita}>{horario}</Text> · {modo === "sala" ? a.doctor_nombre : `${a.sala_nombre}${a.sala_piso ? ` (piso ${a.sala_piso})` : ""}`}
                    {a.dia_semana == null ? " · todos los días" : ""}
                  </Text>
                  <Boton texto="Ver" variante="secundario" pequeno onPress={() => abrirExistente(a.id_PK)} />
                </View>
              );
            })
          )}
        </Tarjeta>
      </>
    );
  };

  /* ---------- vista general: todas las salas (o doctores) de un vistazo ---------- */
  const vistaGeneral = (() => {
    const filas = (
      filasPor === "sala"
        ? salas.map((x) => ({
            id: x.id_PK,
            nombre: x.nombre,
            sub: [x.tipo, x.piso ? `Piso ${x.piso}` : null].filter(Boolean).join(" · "),
            color: estiloTipoSala(x.tipo).color,
          }))
        : doctores.map((d) => ({
            id: d.id_PK,
            nombre: d.nombre,
            sub: d.especialidades?.map((e) => e.nombre).join(", ") || "",
            color: colorDoctor(d.id_PK),
          }))
    ).map((f) => {
      const asigs = asignaciones.filter((a) => (filasPor === "sala" ? a.sala_id === f.id : a.doctor_id === f.id));
      const segs = asigs.flatMap((a) =>
        segmentosAsig(a).map((sg) => ({
          ...sg,
          color: filasPor === "sala" ? colorDoctor(a.doctor_id) : estiloTipoSala(a.sala_tipo).color,
          titulo: (filasPor === "sala" ? a.doctor_nombre : a.sala_nombre) ?? "",
        }))
      );
      return { ...f, asigs, segs };
    });

    const conHorarios = filas.filter((f) => f.asigs.length > 0).length;
    // Columnas según el ancho real disponible: 7 (escritorio), 4 (tableta) o una lista vertical (celular)
    const cols = ancho >= 900 ? 7 : ancho >= 560 ? 4 : 1;
    const lbl = compacto ? 76 : 108;
    const etiquetaGrupo = (dias: number[]) =>
      dias.length === 7 ? "Todos los días" : dias.length === 1 ? `${DIAS_CORTO[dias[0]]} ${fecha(dias[0]).getDate()}` : `${DIAS_CORTO[dias[0]]} – ${DIAS_CORTO[dias[dias.length - 1]]}`;

    const tarjetasPorDia = filas.map((f) => (
      <View key={f.id} style={s.gTarjeta}>
        <View style={s.gTarjetaCab}>
          <View style={[s.gMarca, { backgroundColor: f.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.gNombre} numberOfLines={1}>
              {f.nombre}
            </Text>
            {!!f.sub && (
              <Text style={s.gSub} numberOfLines={1}>
                {f.sub}
              </Text>
            )}
          </View>
          <Text style={[s.gInsignia, f.asigs.length === 0 && { color: C.muted, backgroundColor: C.fondo }]}>
            {f.asigs.length === 0 ? "Sin horarios" : `${f.asigs.length} reserva${f.asigs.length === 1 ? "" : "s"}`}
          </Text>
        </View>
        <View style={s.gDias}>
          {[0, 1, 2, 3, 4, 5, 6].map((d) => {
            const lista = f.segs.filter((sg) => sg.dia === null || sg.dia === d).sort((x, y) => x.ini - y.ini);
            return (
              <View key={d} style={{ width: cols === 1 ? "100%" : `${100 / cols}%`, padding: 3 }}>
                <Pressable
                  onPress={() => abrirDesdeGeneral(filasPor, f.id, d)}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.nombre}, ${fechaLarga(fecha(d))}`}
                  style={[s.gDia, esHoy(d) && { borderColor: C.primario, borderWidth: 2 }, cols === 1 && { flexDirection: "row", alignItems: "flex-start", gap: 10 }]}
                >
                  <View style={cols === 1 ? { width: 62 } : undefined}>
                    <Text style={[s.gDiaNombre, esHoy(d) && { color: C.primario }]}>{DIAS_CORTO[d]}</Text>
                    <Text style={s.gDiaFecha}>{etiquetaDia(d)}</Text>
                  </View>
                  <View style={{ flex: cols === 1 ? 1 : undefined, gap: 4, marginTop: cols === 1 ? 0 : 4 }}>
                    {lista.length === 0 ? (
                      <Text style={s.gLibre}>Libre</Text>
                    ) : (
                      lista.map((sg, i) => (
                        <View key={i} style={[s.gEntrada, { borderLeftColor: sg.color, backgroundColor: `${sg.color}1A` }]}>
                          <Text style={s.gEntradaHora} numberOfLines={1}>
                            {textoRango(sg)}
                          </Text>
                          <Text style={s.gEntradaNombre} numberOfLines={2}>
                            {sg.titulo}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    ));

    const lineaDeTiempo = (
      <Tarjeta>
        <Text style={s.ayuda}>
          Cada fila es un día (o varios días seguidos con lo mismo: si algo aplica a <Text style={s.negrita}>todos los días</Text> se ve como una sola línea). Toca una línea para abrir ese día.
        </Text>
        <View style={s.tlFila}>
          <View style={{ width: lbl }} />
          <View style={s.tlEscala}>
            {["00", "06", "12", "18", "24"].map((h) => (
              <Text key={h} style={s.gSub}>
                {h}
              </Text>
            ))}
          </View>
        </View>
        {filas.map((f) => (
          <View key={f.id} style={s.tlBloque}>
            <View style={s.tlTitulo}>
              <View style={[s.gMarca, { backgroundColor: f.color, height: 18 }]} />
              <Text style={s.gNombre} numberOfLines={1}>
                {f.nombre}
              </Text>
            </View>
            {agruparDias(f.segs).map((g, gi) => (
              <Pressable key={gi} style={s.tlLinea} onPress={() => abrirDesdeGeneral(filasPor, f.id, g.dias[0])} accessibilityRole="button" accessibilityLabel={`${f.nombre}, ${etiquetaGrupo(g.dias)}`}>
                <View style={{ width: lbl }}>
                  <Text style={s.tlDias} numberOfLines={2}>
                    {etiquetaGrupo(g.dias)}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ height: 20, borderRadius: 10, overflow: "hidden", flexDirection: "row" }}>
                    {TURNOS_DIA.map((tu) => (
                      <View key={tu.clave} style={{ width: `${((tu.fin - tu.ini) / 1440) * 100}%`, backgroundColor: `${tu.color}26` }} />
                    ))}
                    {g.segs.map((sg, i) => (
                      <View key={i} style={{ position: "absolute", top: 0, bottom: 0, left: `${(sg.ini / 1440) * 100}%`, width: `${((sg.fin - sg.ini) / 1440) * 100}%`, backgroundColor: sg.color }} />
                    ))}
                  </View>
                  <Text style={g.segs.length === 0 ? s.gLibre : s.tlTexto}>
                    {g.segs.length === 0 ? "Libre" : g.segs.map((sg) => `${textoRango(sg)}  ${sg.titulo}`).join("   ·   ")}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </Tarjeta>
    );

    return (
      <>
        {heroMarco(
          <>
            <View style={s.heroFila}>
              <View style={s.heroIcono}>
                <Ionicons name="grid" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroSuper}>VISTA GENERAL</Text>
                <Text style={[s.heroTitulo, compacto && { fontSize: 18 }]}>{filasPor === "sala" ? "Todas las salas" : "Todos los doctores"}</Text>
              </View>
            </View>
            <View style={s.heroNav}>
              {botonHero("chevron-back", () => setSemana((x) => x - 1), "Semana anterior")}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={[s.heroSemana, compacto && { fontSize: 13.5 }]}>Semana del {rangoSemana(lunes)}</Text>
                <Text style={s.heroSub}>{semana === 0 ? "Esta semana" : semana > 0 ? `Dentro de ${semana} semana${semana === 1 ? "" : "s"}` : `Hace ${-semana} semana${semana === -1 ? "" : "s"}`}</Text>
              </View>
              {botonHero("chevron-forward", () => setSemana((x) => x + 1), "Semana siguiente")}
            </View>
            <View style={s.heroChips}>
              {pildoraHero("calendar-outline", `${asignaciones.length} reserva${asignaciones.length === 1 ? "" : "s"} en total`)}
              {pildoraHero("checkmark-circle-outline", `${conHorarios} con horarios`)}
              {pildoraHero("ellipse-outline", `${filas.length - conHorarios} sin asignar`)}
              {semana !== 0 && (
                <Pressable onPress={() => setSemana(0)} style={s.heroHoy} accessibilityRole="button">
                  <Text style={s.heroHoyTexto}>Ir a hoy</Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        <View style={s.chips}>
          <ChipColor texto="Filas: salas" color="#7C3AED" icono="business-outline" activo={filasPor === "sala"} onPress={() => setFilasPor("sala")} />
          <ChipColor texto="Filas: doctores" color="#2563EB" icono="person-outline" activo={filasPor === "doctor"} onPress={() => setFilasPor("doctor")} />
        </View>
        <View style={s.chips}>
          <ChipColor texto="Por día, con nombres" color="#0F766E" icono="albums-outline" activo={vistaGen === "dias"} onPress={() => setVistaGen("dias")} />
          <ChipColor texto="Línea de tiempo 24 h" color="#0F766E" icono="git-commit-outline" activo={vistaGen === "linea"} onPress={() => setVistaGen("linea")} />
        </View>

        {filas.length === 0 ? (
          <Vacio texto={filasPor === "sala" ? "No hay salas registradas." : "No hay doctores activos."} />
        ) : (
          <>
            <View style={s.leyenda}>
              <View style={[s.punto, { backgroundColor: C.primario }]} />
              <Text style={s.leyendaTexto}>El color indica {filasPor === "sala" ? "al doctor" : "el tipo de sala"} · toca un día para abrirlo y reservar</Text>
            </View>
            {vistaGen === "dias" ? tarjetasPorDia : lineaDeTiempo}
          </>
        )}
      </>
    );
  })();

  return (
    <View style={{ width: "100%" }} onLayout={(e) => {
      const w = Math.round(e.nativeEvent.layout.width);
      setAnchoCont((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    }}>
      {!!error && <Aviso tipo="error" texto={error} />}
      {!!ok && <Aviso tipo="ok" texto={ok} />}

      {cargando ? (
        <Cargando mensaje="Consultando doctores, salas y horarios…" />
      ) : (
        <>
          <View style={s.reglas}>
            <Ionicons name="information-circle-outline" size={18} color={C.info} />
            <Text style={s.reglasTexto}>
              Un doctor solo puede estar en <Text style={s.negrita}>una sala a la vez</Text> y una sala solo puede tener{" "}
              <Text style={s.negrita}>un doctor por horario</Text>. Una misma sala puede usarse por varios doctores si lo hacen a horas distintas.
            </Text>
          </View>

          <View style={s.exportar}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={s.exportarTitulo}>Resumen de asignación</Text>
              <Text style={s.exportarTexto}>Descarga todas las salas y doctores de la clínica: calendario semanal con nombres, detalle y pendientes.</Text>
            </View>
            <View style={s.exportarBotones}>
              <Boton texto="Descargar Excel" variante="secundario" pequeno cargando={exportando === "excel"} deshabilitado={!!exportando} onPress={() => exportar("excel")} />
              <Boton texto="Descargar PDF" variante="secundario" pequeno cargando={exportando === "pdf"} deshabilitado={!!exportando} onPress={() => exportar("pdf")} />
            </View>
          </View>

          {selectorModo}

          {modo === "general" ? vistaGeneral : sujetoId == null ? null : diaSel == null ? vistaSemana : vistaDia(diaSel)}
        </>
      )}

      <ModalAsignacionSala token={token ?? null} datos={modal} onCerrar={() => setModal(null)} onListo={alTerminar} />
    </View>
  );
}

const crearEstilos = (C: Paleta) =>
  StyleSheet.create({
    reglas: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 12, backgroundColor: C.infoSuave, marginBottom: 14 },
    reglasTexto: { flex: 1, fontSize: 12.5, color: C.texto, lineHeight: 18 },
    negrita: { fontWeight: "800" },
    titulo: { fontSize: 14, fontWeight: "800", color: C.titulo, marginBottom: 8, marginTop: 4 },
    ayuda: { fontSize: 12, color: C.muted, marginBottom: 8 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    tomado: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, backgroundColor: C.primarioSuave, marginBottom: 12 },
    tomadoTexto: { flex: 1, fontSize: 12.5, color: C.texto },
    cabCal: { marginTop: 6 },
    fila: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
    punto: { width: 10, height: 10, borderRadius: 5 },
    filaTexto: { flex: 1, fontSize: 12.5, color: C.texto },
    leyenda: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 10 },
    leyendaTexto: { fontSize: 12, color: C.muted, marginRight: 10 },
    rejilla: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    diaTarjeta: { flexGrow: 1, flexBasis: 150, minWidth: 140, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: C.borde, backgroundColor: C.tarjeta, gap: 6 },
    diaCab: { flexDirection: "row", alignItems: "center", gap: 8 },
    diaNombre: { fontSize: 14, fontWeight: "800", color: C.titulo },
    hoyPildora: { alignSelf: "flex-start", fontSize: 10, fontWeight: "800", color: C.primario, backgroundColor: C.primarioSuave, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
    diaLibre: { fontSize: 12, fontWeight: "700", color: "#059669" },
    diaCuenta: { fontSize: 12, fontWeight: "700", color: C.texto },
    diaFila: { flexDirection: "row", alignItems: "center", gap: 6 },
    diaFilaTexto: { flex: 1, fontSize: 11.5, color: C.texto },
    diaVer: { fontSize: 12, fontWeight: "800", color: C.primario, marginTop: 2 },
    navDia: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    navDiaTitulo: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800", color: C.titulo },
    flecha: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: C.primarioSuave },
    libreChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#10B98122", borderWidth: 1, borderColor: "#10B981" },
    libreChipTexto: { fontSize: 12, fontWeight: "700", color: "#059669" },
    // --- encabezado con degradado
    hero: { borderRadius: 20, padding: 16, marginBottom: 12, overflow: "hidden", gap: 12 },
    heroCirculoA: { position: "absolute", width: 160, height: 160, borderRadius: 80, right: -40, top: -60, backgroundColor: "rgba(255,255,255,0.10)" },
    heroCirculoB: { position: "absolute", width: 110, height: 110, borderRadius: 55, left: -30, bottom: -50, backgroundColor: "rgba(255,255,255,0.08)" },
    heroFila: { flexDirection: "row", alignItems: "center", gap: 12 },
    heroIcono: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.20)" },
    heroSuper: { fontSize: 10.5, fontWeight: "800", letterSpacing: 1, color: "rgba(255,255,255,0.78)" },
    heroTitulo: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
    heroSub: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 1 },
    heroNav: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.14)" },
    heroSemana: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", textAlign: "center" },
    heroBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.22)" },
    heroChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
    heroPildora: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)" },
    heroPildoraTexto: { fontSize: 11.5, fontWeight: "700", color: "#FFFFFF" },
    heroHoy: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "#FFFFFF" },
    heroHoyTexto: { fontSize: 12, fontWeight: "800", color: "#0F766E" },
    fechaCaja: { width: 62, height: 66, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
    fechaMes: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: "#DC2626" },
    fechaNum: { fontSize: 28, fontWeight: "900", color: "#0F172A", lineHeight: 32 },
    // --- fecha en cada tarjeta de día
    fechaMini: { width: 44, paddingVertical: 4, borderRadius: 10, alignItems: "center", backgroundColor: C.primarioSuave },
    fechaMiniMes: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.5, color: C.primario },
    fechaMiniNum: { fontSize: 18, fontWeight: "900", color: C.titulo, lineHeight: 20 },
    // --- mosaicos de fecha (vista por horas)
    mosaicos: { flexDirection: "row", gap: 6, marginBottom: 12 },
    mosaico: { flex: 1, minWidth: 40, alignItems: "center", paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: C.borde, backgroundColor: C.tarjeta },
    mosaicoDia: { fontSize: 11, fontWeight: "700", color: C.muted },
    mosaicoNum: { fontSize: 17, fontWeight: "900", color: C.titulo },
    mosaicoPunto: { width: 6, height: 6, borderRadius: 3, marginTop: 3 },
    // --- secciones por turno
    turno: { marginBottom: 14, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: C.borde },
    turnoCab: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, padding: 12 },
    turnoIcono: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.22)" },
    turnoNombre: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
    turnoRango: { fontSize: 11.5, color: "rgba(255,255,255,0.88)", marginTop: 1 },
    turnoPildora: { fontSize: 11, fontWeight: "800", color: "#FFFFFF", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
    // --- vista general
    gTarjeta: { marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: C.borde, backgroundColor: C.tarjeta, overflow: "hidden" },
    gTarjetaCab: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: C.borde },
    gMarca: { width: 6, height: 34, borderRadius: 3 },
    gNombre: { fontSize: 14, fontWeight: "800", color: C.titulo, flexShrink: 1 },
    gSub: { fontSize: 11, color: C.muted },
    gInsignia: { fontSize: 11, fontWeight: "800", color: C.primario, backgroundColor: C.primarioSuave, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, overflow: "hidden" },
    gDias: { flexDirection: "row", flexWrap: "wrap", padding: 5 },
    gDia: { borderRadius: 12, borderWidth: 1, borderColor: C.borde, backgroundColor: C.fondo, padding: 8, minHeight: 62 },
    gDiaNombre: { fontSize: 12, fontWeight: "800", color: C.titulo },
    gDiaFecha: { fontSize: 10.5, color: C.muted },
    gLibre: { fontSize: 11.5, color: C.muted, fontStyle: "italic" },
    gEntrada: { borderLeftWidth: 4, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
    gEntradaHora: { fontSize: 10.5, fontWeight: "800", color: C.muted },
    gEntradaNombre: { fontSize: 12, fontWeight: "700", color: C.titulo },
    tlFila: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
    tlEscala: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
    tlBloque: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.borde },
    tlTitulo: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    tlLinea: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 5 },
    tlDias: { fontSize: 12, fontWeight: "800", color: C.titulo },
    tlTexto: { fontSize: 11, color: C.texto },
    // --- descarga del resumen
    exportar: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: C.borde, backgroundColor: C.tarjeta, marginBottom: 14 },
    exportarTitulo: { fontSize: 14, fontWeight: "800", color: C.titulo },
    exportarTexto: { fontSize: 12, color: C.muted, marginTop: 2 },
    exportarBotones: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  });
