import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Aviso, Boton, Cargando, Tarjeta, Vacio, useAccesoC2 } from "./ui";
import { ChipColor, estiloTipoSala, etiquetaEstadoSala, useEstilosC2, type Paleta } from "./extra";
import { CalendarioSemana, ChipArrastrable } from "./CalendarioSemana";
import {
  BloqueCal,
  DIAS_CORTO,
  DIAS_LARGO,
  ItemArrastrable,
  MESES_CORTO,
  MESES_LARGO,
  aHHMM,
  deHHMM,
  diaSiguiente,
  fechaDeDia,
  fechaDiaMes,
  fechaLarga,
  lunesDeSemana,
  mismaFecha,
  rangoSemana,
  sumarDias,
} from "./calendarioTipos";
import ModalAsignacionSala, { DatosAsignacion } from "./ModalAsignacionSala";
import api from "../../services/api";
import { AsignacionCalendario, Sala, calendarioSalas, listarSalas, mensajeError } from "../../services/c2Service";

/**
 * Calendario de uso de salas (vive dentro de «Salas y equipamiento»).
 *
 *  - Vista semana: una tarjeta por día (con su fecha) que marca qué horas están reservadas y cuáles libres.
 *  - Al tocar un día se abre la vista por horas de ese día, donde se reserva jalando/tocando.
 *  - Los horarios se repiten cada semana; las fechas indican la semana que se está viendo.
 *  - Un turno puede cruzar la medianoche (23:00 → 04:00): se dibuja en dos tramos, uno por día.
 */

type DoctorItem = { id_PK: number; nombre: string; especialidades?: { id_PK: number; nombre: string }[] };
type Modo = "sala" | "doctor";

const COLORES_DOCTOR = ["#2563EB", "#DB2777", "#D97706", "#059669", "#7C3AED", "#DC2626", "#0891B2", "#65A30D", "#C026D3", "#EA580C"];
const colorDoctor = (id: number) => COLORES_DOCTOR[id % COLORES_DOCTOR.length];
const DURACION_NUEVA = 60;
const PX_MIN_DIA = 1.1; // vista por horas: ~66 px por hora, más cómoda para tocar

const horas = (min: number) => `${Math.round((min / 60) * 10) / 10} h`;
const hh = (min: number) => (min >= 1440 ? "24:00" : aHHMM(min));
const rango = (a: number, b: number) => `${hh(a)}–${hh(b)}`;

/** Texto corto del horario de un tramo, pensado para las tarjetas de la semana. */
const textoRango = (b: BloqueCal) =>
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

type Props = {
  /** Sala (o doctor, según el modo) que se muestra al abrir. */
  salaInicialId?: number | null;
  /** Día (0 = lunes) con el que se abre directamente la vista por horas. */
  diaInicial?: number | null;
  /** Se llama cuando se crea, mueve o quita una reserva (para refrescar la lista de salas). */
  onCambio?: () => void;
};

export default function CalendarioUsoSalas({ salaInicialId = null, diaInicial = null, onCambio }: Props) {
  const { C, s } = useEstilosC2(crearEstilos);
  const { token } = useAccesoC2();

  const [doctores, setDoctores] = useState<DoctorItem[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionCalendario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [modo, setModo] = useState<Modo>("sala");
  const [sujetoId, setSujetoId] = useState<number | null>(salaInicialId);
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
    setCargando(true);
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
    setCargando(false);
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Al cambiar de modo o cargar datos se asegura que haya un elemento elegido
  useEffect(() => {
    setTomado(null);
    const lista = modo === "sala" ? salas.map((x) => x.id_PK) : doctores.map((x) => x.id_PK);
    setSujetoId((actual) => (actual != null && lista.includes(actual) ? actual : lista[0] ?? null));
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

  const [horaIni, horaFin] = useMemo(() => {
    const min = Math.min(6 * 60, ...bloques.map((b) => b.ini));
    const max = Math.max(22 * 60, ...bloques.map((b) => b.fin));
    return [Math.floor(min / 60), Math.ceil(max / 60)];
  }, [bloques]);

  const minIni = horaIni * 60;
  const minFin = horaFin * 60;

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
    setSujetoId(id);
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
        <ChipColor texto="Ver una sala y colocar doctores" color="#7C3AED" icono="business-outline" activo={modo === "sala"} onPress={() => setModo("sala")} />
        <ChipColor texto="Ver un doctor y colocar salas" color="#2563EB" icono="person-outline" activo={modo === "doctor"} onPress={() => setModo("doctor")} />
      </View>

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
  );

  /** Franja horaria del día: verde = libre, color = reservado. */
  const barraDia = (dia: number, alto = 8) => {
    const total = minFin - minIni;
    return (
      <View style={{ height: alto, borderRadius: alto / 2, backgroundColor: "#10B98133", overflow: "hidden" }}>
        {delDia(dia).map((b) => (
          <View
            key={b.id}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${(Math.max(b.ini - minIni, 0) / total) * 100}%`,
              width: `${((Math.min(b.fin, minFin) - Math.max(b.ini, minIni)) / total) * 100}%`,
              backgroundColor: b.color,
            }}
          />
        ))}
      </View>
    );
  };

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
        <View style={[s.punto, { backgroundColor: "#10B981" }]} />
        <Text style={s.leyendaTexto}>Libre</Text>
        <View style={[s.punto, { backgroundColor: C.primario }]} />
        <Text style={s.leyendaTexto}>Reservado (color según {modo === "sala" ? "doctor" : "tipo de sala"})</Text>
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
                <Text style={s.heroTitulo}>
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

        <CalendarioSemana
          bloques={bloques}
          dias={[dia]}
          etiquetaDia={(d) => `${fecha(d).getDate()} de ${MESES_LARGO[fecha(d).getMonth()]}`}
          pxMin={PX_MIN_DIA}
          horaIni={horaIni}
          horaFin={horaFin}
          duracionNueva={DURACION_NUEVA}
          colocando={!!tomado}
          onSoltarItem={abrirNueva}
          onColocar={(d, min) => tomado && abrirNueva(tomado, d, min)}
          onBloque={(id) => abrirExistente(id)}
          onMoverBloque={(id, d, min) => abrirExistente(id, { dia: d, min })}
        />

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

  return (
    <>
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

          {selectorModo}

          {sujetoId == null ? null : diaSel == null ? vistaSemana : vistaDia(diaSel)}
        </>
      )}

      <ModalAsignacionSala token={token ?? null} datos={modal} onCerrar={() => setModal(null)} onListo={alTerminar} />
    </>
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
  });
