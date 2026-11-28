import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";

import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  ConfirmarModal,
  ModalBase,
  PantallaC2,
  Paginador,
  Tarjeta,
  Vacio,
  useAccesoC2,
} from "../../../components/c2/ui";
import CalendarioUsoSalas from "../../../components/c2/CalendarioUsoSalas";
import { DIAS_CORTO, cruzaMedianoche, diaSiguiente } from "../../../components/c2/calendarioTipos";
import {
  CampoFecha,
  ChipColor,
  CirculoIcono,
  ESTADOS_EQUIPO,
  ESTADOS_SALA,
  MANTENIMIENTO,
  SelectorIconos,
  TIPOS_EQUIPO,
  useEstilosC2,
  TIPOS_SALA,
  colorEstadoEquipo,
  colorEstadoSala,
  estiloTipoSala,
  etiquetaEstadoEquipo,
  etiquetaEstadoSala,
  fechaCorta,
  hoyLocal,
  infoTipoEquipo,
  type Paleta,
} from "../../../components/c2/extra";
import {
  AsignacionCalendario,
  PageMeta,
  Sala,
  SalaPayload,
  actualizarSala,
  calendarioSalas,
  cambiarEstadoSala,
  crearSala,
  eliminarSala,
  listarSalas,
  mensajeError,
} from "../../../services/c2Service";
import { sombra } from "../../../utils/sombra";

const FORM_SALA_VACIO = { nombre: "", tipo: "", ubicacion: "", piso: "", capacidad: "", estado: "disponible", lista_equipamiento: "" };

/* Catálogo de equipos frecuentes por categoría (se pueden elegir con un toque). */
const EQUIPOS_SUGERIDOS: Record<string, string[]> = {
  diagnostico: ["Electrocardiógrafo", "Ultrasonido", "Rayos X", "Otoscopio", "Oftalmoscopio", "Estetoscopio", "Báscula con estadímetro"],
  monitoreo: ["Monitor de signos vitales", "Oxímetro de pulso", "Baumanómetro", "Termómetro digital", "Glucómetro"],
  cirugia: ["Electrobisturí", "Lámpara quirúrgica", "Mesa quirúrgica", "Instrumental quirúrgico", "Aspirador"],
  soporte_vital: ["Desfibrilador", "Ventilador mecánico", "Tanque de oxígeno", "Carro de paro", "Bomba de infusión"],
  laboratorio: ["Centrífuga", "Microscopio", "Analizador de sangre", "Refrigerador de muestras"],
  esterilizacion: ["Autoclave", "Esterilizador de calor seco", "Lavador ultrasónico"],
  mobiliario: ["Camilla", "Mesa de exploración", "Escritorio", "Silla de ruedas", "Banco giratorio", "Lavamanos"],
  otro: ["Aire acondicionado", "Computadora", "Impresora", "Lámpara de exploración"],
};

/** "a, b; c" → ["a","b","c"] (sin vacíos ni repetidos). */
const textoAItems = (t: string): string[] => {
  const vistos = new Set<string>();
  return t
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter((x) => {
      const k = x.toLowerCase();
      if (!x || vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
};

type AvisoEstado = { tipo: "ok" | "error"; texto: string } | null;
const NOMBRES_TIPO = TIPOS_SALA.map((t) => t.valor);

export default function SalasScreen() {
  const { C, s } = useEstilosC2(crearEstilos);
  const { token, esAdmin } = useAccesoC2();
  const params = useLocalSearchParams<{ vista?: string; sala?: string; dia?: string; modo?: string; doctor?: string }>();

  /* ---------- Pestañas: lista de salas / calendario de uso ---------- */
  const [vista, setVista] = useState<"salas" | "calendario">(params.vista === "calendario" ? "calendario" : "salas");
  const [salaCal, setSalaCal] = useState<number | null>(params.sala ? Number(params.sala) || null : null);
  const [diaCal, setDiaCal] = useState<number | null>(params.dia != null && params.dia !== "" ? Number(params.dia) : null);
  const [modoCal, setModoCal] = useState<"sala" | "doctor" | "general">(params.modo === "doctor" || params.modo === "general" ? params.modo : "sala");
  const [doctorCal, setDoctorCal] = useState<number | null>(params.doctor ? Number(params.doctor) || null : null);
  const [asignaciones, setAsignaciones] = useState<AsignacionCalendario[]>([]);

  // Si se llega desde otra pantalla (p. ej. «Asignar sala» en Médicos) con la pantalla ya abierta, se actualizan los parámetros
  useEffect(() => {
    if (params.vista !== "calendario") return;
    setVista("calendario");
    setModoCal(params.modo === "doctor" || params.modo === "general" ? params.modo : "sala");
    setDoctorCal(params.doctor ? Number(params.doctor) || null : null);
    setSalaCal(params.sala ? Number(params.sala) || null : null);
    setDiaCal(params.dia != null && params.dia !== "" ? Number(params.dia) : null);
  }, [params.vista, params.modo, params.doctor, params.sala, params.dia]);

  const cargarAsignaciones = useCallback(async () => {
    if (!token) return;
    try {
      setAsignaciones(await calendarioSalas(token));
    } catch {
      setAsignaciones([]); // sin acceso al calendario: las tarjetas simplemente no muestran horarios
    }
  }, [token]);

  useEffect(() => {
    cargarAsignaciones();
  }, [cargarAsignaciones]);

  const abrirCalendario = (salaId: number | null, dia: number | null = null) => {
    setModoCal("sala");
    setDoctorCal(null);
    setSalaCal(salaId);
    setDiaCal(dia);
    setVista("calendario");
  };

  /* ---------- Listado ---------- */
  const [salas, setSalas] = useState<Sala[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<AvisoEstado>(null);

  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [buscarInput, setBuscarInput] = useState("");
  const [pisoInput, setPisoInput] = useState("");
  const [filtros, setFiltros] = useState({ piso: "", buscar: "" });
  const [pagina, setPagina] = useState(1);

  const cargar = useCallback(async () => {
    if (!token) return;
    try {
      setCargando(true);
      const r = await listarSalas(token, {
        estado: estadoFiltro,
        tipo: tipoFiltro,
        piso: filtros.piso,
        buscar: filtros.buscar,
        page: pagina,
        page_size: 10,
      });
      setSalas(r.data);
      setMeta(r.meta);
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e, "No se pudieron cargar las salas.") });
    } finally {
      setCargando(false);
    }
  }, [token, estadoFiltro, tipoFiltro, filtros, pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const aplicarFiltros = () => {
    setPagina(1);
    setFiltros({ piso: pisoInput.trim(), buscar: buscarInput.trim() });
  };
  const limpiarFiltros = () => {
    setPisoInput("");
    setBuscarInput("");
    setEstadoFiltro("");
    setTipoFiltro("");
    setFiltros({ piso: "", buscar: "" });
    setPagina(1);
  };

  /* ---------- Crear / editar sala ---------- */
  const [modalSala, setModalSala] = useState(false);
  const [editando, setEditando] = useState<Sala | null>(null);
  const [form, setForm] = useState(FORM_SALA_VACIO);
  const [tipoOtro, setTipoOtro] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);

  const abrirNueva = () => {
    setEditando(null);
    setForm(FORM_SALA_VACIO);
    setEquipoNuevo("");
    setTipoOtro(false);
    setErrorForm("");
    setModalSala(true);
  };

  const abrirEditar = (sala: Sala) => {
    setEditando(sala);
    setForm({
      nombre: sala.nombre ?? "",
      tipo: sala.tipo ?? "",
      ubicacion: sala.ubicacion ?? "",
      piso: sala.piso ?? "",
      capacidad: sala.capacidad != null ? String(sala.capacidad) : "",
      estado: sala.estado ?? "disponible",
      lista_equipamiento: sala.lista_equipamiento ?? "",
    });
    setTipoOtro(!!sala.tipo && !NOMBRES_TIPO.includes(sala.tipo));
    setErrorForm("");
    setModalSala(true);
  };

  const guardarSala = async () => {
    if (!token) return;
    const nombre = form.nombre.trim();
    if (!nombre) return setErrorForm("El nombre de la sala es obligatorio.");
    let capacidad: number | null = null;
    if (form.capacidad.trim() !== "") {
      capacidad = Number(form.capacidad);
      if (!Number.isInteger(capacidad) || capacidad <= 0) return setErrorForm("La capacidad debe ser un número entero mayor a 0.");
    }
    const vacioANull = (t: string) => (t.trim() === "" ? null : t.trim());
    const payload: SalaPayload = {
      nombre,
      tipo: vacioANull(form.tipo),
      ubicacion: vacioANull(form.ubicacion),
      piso: vacioANull(form.piso),
      capacidad,
      estado: form.estado,
      lista_equipamiento: vacioANull(form.lista_equipamiento),
    };
    try {
      setGuardando(true);
      setErrorForm("");
      if (editando) {
        await actualizarSala(token, editando.id_PK, payload);
        setAviso({ tipo: "ok", texto: `Sala «${nombre}» actualizada.` });
      } else {
        await crearSala(token, payload);
        setAviso({ tipo: "ok", texto: `Sala «${nombre}» creada.` });
      }
      setModalSala(false);
      await cargar();
    } catch (e) {
      setErrorForm(mensajeError(e, "No se pudo guardar la sala."));
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Cambiar estado ---------- */
  const [cambiandoId, setCambiandoId] = useState<number | null>(null);
  const cambiarEstado = async (sala: Sala, nuevo: string) => {
    if (!token || sala.estado === nuevo) return;
    try {
      setCambiandoId(sala.id_PK);
      const actualizada = await cambiarEstadoSala(token, sala.id_PK, nuevo);
      setSalas((prev) => prev.map((x) => (x.id_PK === sala.id_PK ? { ...x, ...actualizada } : x)));
      setAviso({ tipo: "ok", texto: `«${sala.nombre}» ahora está ${etiquetaEstadoSala(nuevo).toLowerCase()}.` });
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e, "No se pudo cambiar el estado.") });
    } finally {
      setCambiandoId(null);
    }
  };

  /* ---------- Eliminar sala ---------- */
  const [salaEliminar, setSalaEliminar] = useState<Sala | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const confirmarEliminarSala = async () => {
    if (!token || !salaEliminar) return;
    try {
      setEliminando(true);
      await eliminarSala(token, salaEliminar.id_PK);
      setAviso({ tipo: "ok", texto: `Sala «${salaEliminar.nombre}» eliminada.` });
      setSalaEliminar(null);
      if (salas.length === 1 && pagina > 1) setPagina(pagina - 1);
      else await cargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e, "No se pudo eliminar la sala.") });
      setSalaEliminar(null);
    } finally {
      setEliminando(false);
    }
  };

  /* ---------- Equipamiento (se guarda como texto en la sala) ---------- */
  const [catEquipo, setCatEquipo] = useState<string>(TIPOS_EQUIPO[0].valor);
  const [equipoNuevo, setEquipoNuevo] = useState("");

  const itemsEquipo = textoAItems(form.lista_equipamiento);
  const setItemsEquipo = (items: string[]) => setForm((f) => ({ ...f, lista_equipamiento: items.join(", ") }));
  const tieneEquipo = (nombre: string) => itemsEquipo.some((x) => x.toLowerCase() === nombre.toLowerCase());
  const alternarEquipo = (nombre: string) =>
    setItemsEquipo(tieneEquipo(nombre) ? itemsEquipo.filter((x) => x.toLowerCase() !== nombre.toLowerCase()) : [...itemsEquipo, nombre]);
  const agregarEquipoPropio = () => {
    const nombre = equipoNuevo.replace(/[,;\n]/g, " ").replace(/\s+/g, " ").trim();
    if (!nombre) return;
    if (!tieneEquipo(nombre)) setItemsEquipo([...itemsEquipo, nombre]);
    setEquipoNuevo("");
  };
  const catActual = infoTipoEquipo(catEquipo);

  /* ---------- Render ---------- */
  return (
    <PantallaC2
      titulo="Salas y equipamiento"
      subtitulo={
        vista === "calendario"
          ? "Reserva salas para cada doctor y consulta qué días y a qué hora están ocupadas."
          : "Administra los espacios de la clínica, su estado y los equipos de cada sala."
      }
    >
      <View style={s.pestanas}>
        <Pressable
          onPress={() => setVista("salas")}
          accessibilityRole="tab"
          accessibilityState={{ selected: vista === "salas" }}
          style={[s.pestana, vista === "salas" && { borderColor: C.primario, backgroundColor: C.primarioSuave }]}
        >
          <View style={[s.pestanaIcono, { backgroundColor: vista === "salas" ? C.primario : C.primarioSuave }]}>
            <Ionicons name="business-outline" size={20} color={vista === "salas" ? "#FFFFFF" : C.primario} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.pestanaTitulo}>Salas y equipo</Text>
            <Text style={s.pestanaSub} numberOfLines={2}>
              Estado, equipos y mantenimiento
            </Text>
          </View>
        </Pressable>

        {/* Pestaña destacada: asignar salas a los doctores */}
        <Pressable
          onPress={() => vista !== "calendario" && abrirCalendario(salaCal)}
          accessibilityRole="tab"
          accessibilityState={{ selected: vista === "calendario" }}
          accessibilityLabel="Asignar salas a doctores. Calendario de uso"
          style={({ pressed }) => [s.pestanaCta, vista === "calendario" && s.pestanaCtaActiva, pressed && { opacity: 0.85 }]}
        >
          <LinearGradient colors={["#0F766E", "#1D4ED8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.pestanaCtaFondo}>
            <View style={s.pestanaCtaIcono}>
              <Ionicons name="calendar" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.pestanaCtaTitulo}>Asignar salas a doctores</Text>
              <Text style={s.pestanaCtaSub} numberOfLines={2}>
                Calendario de uso por día y hora
              </Text>
            </View>
            {vista === "calendario" ? (
              <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
            ) : (
              <Text style={s.pestanaCtaInsignia}>{asignaciones.length} reserva{asignaciones.length === 1 ? "" : "s"}</Text>
            )}
          </LinearGradient>
        </Pressable>
      </View>

      {vista === "calendario" ? (
        <CalendarioUsoSalas
          key={`${modoCal}-${salaCal ?? "x"}-${doctorCal ?? "x"}-${diaCal ?? "x"}`}
          modoInicial={modoCal}
          salaInicialId={salaCal}
          doctorInicialId={doctorCal}
          diaInicial={diaCal}
          onCambio={() => {
            cargarAsignaciones();
            cargar();
          }}
        />
      ) : (
        <>
      {aviso && <Aviso tipo={aviso.tipo} texto={aviso.texto} />}

      <Tarjeta>
        <Text style={s.filtroTitulo}>ESTADO</Text>
        <View style={s.chips}>
          <ChipColor texto="Todas" color="#475569" activo={estadoFiltro === ""} onPress={() => { setPagina(1); setEstadoFiltro(""); }} />
          {ESTADOS_SALA.map((e) => (
            <ChipColor
              key={e.valor}
              texto={e.etiqueta}
              color={e.color}
              icono={e.icono}
              activo={estadoFiltro === e.valor}
              onPress={() => { setPagina(1); setEstadoFiltro(estadoFiltro === e.valor ? "" : e.valor); }}
            />
          ))}
        </View>

        <Text style={s.filtroTitulo}>TIPO DE SALA</Text>
        <View style={s.chips}>
          <ChipColor texto="Todos" color="#475569" activo={tipoFiltro === ""} onPress={() => { setPagina(1); setTipoFiltro(""); }} />
          {TIPOS_SALA.map((t) => (
            <ChipColor
              key={t.valor}
              texto={t.valor}
              color={t.color}
              icono={t.icono}
              activo={tipoFiltro === t.valor}
              onPress={() => { setPagina(1); setTipoFiltro(tipoFiltro === t.valor ? "" : t.valor); }}
            />
          ))}
        </View>

        <View style={s.fila}>
          <Campo etiqueta="Buscar por nombre o ubicación" value={buscarInput} onChangeText={setBuscarInput} placeholder="Ej. Quirófano" />
          <Campo etiqueta="Piso" value={pisoInput} onChangeText={setPisoInput} placeholder="Ej. 1" />
        </View>
        <View style={s.filaBotones}>
          <Boton texto="Buscar" onPress={aplicarFiltros} pequeno />
          <Boton texto="Limpiar" variante="secundario" onPress={limpiarFiltros} pequeno />
          <View style={{ flex: 1 }} />
          <Boton texto="+ Nueva sala" onPress={abrirNueva} />
        </View>
      </Tarjeta>

      {cargando ? (
        <Cargando mensaje="Actualizando salas, equipamiento y disponibilidad…" />
      ) : salas.length === 0 ? (
        <Vacio texto="No hay salas que coincidan con los filtros." />
      ) : (
        salas.map((sala) => {
          const est = estiloTipoSala(sala.tipo);
          const colorEstado = colorEstadoSala(sala.estado);
          return (
            <Tarjeta key={sala.id_PK} style={{ borderLeftWidth: 6, borderLeftColor: est.color }}>
              <View style={s.cabeceraSala}>
                <CirculoIcono name={est.icono} color={est.color} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={s.salaNombre}>{sala.nombre}</Text>
                  <Text style={s.salaDetalle}>
                    {[sala.tipo, sala.piso ? `Piso ${sala.piso}` : null, sala.ubicacion].filter(Boolean).join(" · ") || "Sin detalles"}
                  </Text>
                </View>
                <View style={[s.estadoPildora, { backgroundColor: `${colorEstado}1A`, borderColor: colorEstado }]}>
                  <View style={[s.punto, { backgroundColor: colorEstado }]} />
                  <Text style={[s.estadoTexto, { color: colorEstado }]}>{etiquetaEstadoSala(sala.estado)}</Text>
                </View>
              </View>

              <View style={s.datos}>
                <Dato icono="people-outline" texto={`Capacidad: ${sala.capacidad ?? "—"}`} />
                <Dato icono="construct-outline" texto={`${textoAItems(sala.lista_equipamiento ?? "").length} equipo(s)`} />
                <Dato icono="calendar-outline" texto={`${sala.citas_proximas ?? 0} cita(s) próximas`} color={C.info} />
              </View>
              {!!sala.lista_equipamiento && (
                <Text style={s.salaDetalle} numberOfLines={2}>
                  Equipamiento: {sala.lista_equipamiento}
                </Text>
              )}

              {(() => {
                const deLaSala = asignaciones.filter((a) => a.sala_id === sala.id_PK);
                const diasOcupados = new Set<number>();
                deLaSala.forEach((a) => {
                  // un turno nocturno (23:00 → 04:00) también ocupa la madrugada del día siguiente
                  const cruza = cruzaMedianoche(a.hora_inicio.slice(0, 5), a.hora_fin.slice(0, 5));
                  if (a.dia_semana == null) [0, 1, 2, 3, 4, 5, 6].forEach((d) => diasOcupados.add(d));
                  else {
                    diasOcupados.add(a.dia_semana);
                    if (cruza && a.hora_fin.slice(0, 5) !== "00:00") diasOcupados.add(diaSiguiente(a.dia_semana) as number);
                  }
                });
                const ordenadas = [...deLaSala].sort((a, b) => (a.dia_semana ?? -1) - (b.dia_semana ?? -1) || a.hora_inicio.localeCompare(b.hora_inicio));
                return (
                  <View style={s.asignaciones}>
                    <Text style={s.filtroTitulo}>
                      {deLaSala.length === 0 ? "HORARIOS: SIN ASIGNAR" : `HORARIOS ASIGNADOS (${deLaSala.length}) · toca un día para verlo por horas`}
                    </Text>
                    <View style={s.diasFila}>
                      {DIAS_CORTO.map((d, i) => {
                        const ocupado = diasOcupados.has(i);
                        return (
                          <Pressable
                            key={d}
                            onPress={() => abrirCalendario(sala.id_PK, i)}
                            style={[s.diaPildora, ocupado ? { backgroundColor: est.color, borderColor: est.color } : { borderColor: C.borde }]}
                          >
                            <Text style={[s.diaPildoraTexto, { color: ocupado ? "#FFFFFF" : C.muted }]}>{d}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {ordenadas.slice(0, 3).map((a) => (
                      <Text key={a.id_PK} style={s.salaDetalle} numberOfLines={1}>
                        {a.dia_semana == null ? "Todos los días" : DIAS_CORTO[a.dia_semana]} {a.hora_inicio.slice(0, 5)}–{a.hora_fin.slice(0, 5)}{cruzaMedianoche(a.hora_inicio.slice(0, 5), a.hora_fin.slice(0, 5)) ? " (+1 día)" : ""} · {a.doctor_nombre ?? `Doctor #${a.doctor_id}`}
                      </Text>
                    ))}
                    {ordenadas.length > 3 && <Text style={s.salaDetalle}>+{ordenadas.length - 3} más…</Text>}
                  </View>
                );
              })()}

              <Text style={[s.filtroTitulo, { marginTop: 12 }]}>CAMBIAR ESTADO</Text>
              <View style={s.chips}>
                {ESTADOS_SALA.map((e) => (
                  <ChipColor
                    key={e.valor}
                    texto={e.etiqueta}
                    color={e.color}
                    icono={e.icono}
                    activo={sala.estado === e.valor}
                    deshabilitado={sala.estado === e.valor || cambiandoId === sala.id_PK}
                    onPress={() => cambiarEstado(sala, e.valor)}
                  />
                ))}
              </View>

              <View style={[s.filaBotones, { marginTop: 4 }]}>
                <Boton texto="Horarios" variante="secundario" pequeno onPress={() => abrirCalendario(sala.id_PK)} />
                <Boton texto="Editar" variante="secundario" pequeno onPress={() => abrirEditar(sala)} />
                {esAdmin && <Boton texto="Eliminar" variante="peligro" pequeno onPress={() => setSalaEliminar(sala)} />}
              </View>
            </Tarjeta>
          );
        })
      )}

      <Paginador meta={meta} onCambiar={setPagina} />
        </>
      )}

      {/* ---------- Modal crear / editar sala ---------- */}
      <ModalBase visible={modalSala} titulo={editando ? "Editar sala" : "Nueva sala"} onClose={() => setModalSala(false)}>
        {!!errorForm && <Aviso tipo="error" texto={errorForm} />}
        <Campo etiqueta="Nombre *" value={form.nombre} onChangeText={(t) => setForm({ ...form, nombre: t })} placeholder="Ej. Consultorio 1" />

        <Text style={s.filtroTitulo}>TIPO DE SALA</Text>
        <View style={s.chips}>
          {TIPOS_SALA.map((t) => (
            <ChipColor
              key={t.valor}
              texto={t.valor}
              color={t.color}
              icono={t.icono}
              activo={!tipoOtro && form.tipo === t.valor}
              onPress={() => { setTipoOtro(false); setForm({ ...form, tipo: t.valor }); }}
            />
          ))}
          <ChipColor texto="Otro" color="#475569" icono="business-outline" activo={tipoOtro} onPress={() => { setTipoOtro(true); if (NOMBRES_TIPO.includes(form.tipo)) setForm({ ...form, tipo: "" }); }} />
        </View>
        {tipoOtro && (
          <Campo etiqueta="¿Qué tipo de sala es?" value={form.tipo} onChangeText={(t) => setForm({ ...form, tipo: t })} placeholder="Ej. Sala de rehabilitación" />
        )}

        <View style={s.fila}>
          <Campo etiqueta="Piso" value={form.piso} onChangeText={(t) => setForm({ ...form, piso: t })} placeholder="Ej. 2" />
          <Campo
            etiqueta="Capacidad (personas)"
            value={form.capacidad}
            onChangeText={(t) => setForm({ ...form, capacidad: t.replace(/[^0-9]/g, "") })}
            keyboardType="numeric"
            placeholder="Ej. 4"
          />
        </View>
        <Campo etiqueta="Ubicación" value={form.ubicacion} onChangeText={(t) => setForm({ ...form, ubicacion: t })} placeholder="Ala norte, pasillo B…" />

        <Text style={s.filtroTitulo}>ESTADO</Text>
        <View style={s.chips}>
          {ESTADOS_SALA.map((e) => (
            <ChipColor key={e.valor} texto={e.etiqueta} color={e.color} icono={e.icono} activo={form.estado === e.valor} onPress={() => setForm({ ...form, estado: e.valor })} />
          ))}
        </View>

        <Text style={s.filtroTitulo}>EQUIPAMIENTO DE LA SALA</Text>
        <Text style={s.salaDetalle}>Elige la categoría y toca los equipos que tiene la sala, o escribe uno propio.</Text>
        <SelectorIconos opciones={TIPOS_EQUIPO} valor={catEquipo} onChange={setCatEquipo} />
        <View style={s.chips}>
          {(EQUIPOS_SUGERIDOS[catEquipo] ?? []).map((nombre) => (
            <ChipColor key={nombre} texto={nombre} color={catActual.color} icono={catActual.icono} activo={tieneEquipo(nombre)} onPress={() => alternarEquipo(nombre)} />
          ))}
        </View>
        <View style={s.fila}>
          <Campo
            etiqueta="Otro equipo"
            value={equipoNuevo}
            onChangeText={setEquipoNuevo}
            placeholder={catActual.ejemplo}
          />
          <Boton texto="Agregar" variante="secundario" pequeno onPress={agregarEquipoPropio} deshabilitado={!equipoNuevo.trim()} />
        </View>

        <Text style={s.filtroTitulo}>SELECCIONADOS ({itemsEquipo.length})</Text>
        {itemsEquipo.length === 0 ? (
          <Text style={s.salaDetalle}>Aún no has elegido equipos.</Text>
        ) : (
          <View style={s.chips}>
            {itemsEquipo.map((nombre) => (
              <ChipColor key={nombre} texto={`${nombre}  ✕`} color={C.info} activo onPress={() => alternarEquipo(nombre)} />
            ))}
          </View>
        )}
        <View style={s.fila}>
          <Boton texto="Cancelar" variante="secundario" onPress={() => setModalSala(false)} deshabilitado={guardando} />
          <Boton texto={editando ? "Guardar cambios" : "Crear sala"} onPress={guardarSala} cargando={guardando} />
        </View>
      </ModalBase>

      <ConfirmarModal
        visible={!!salaEliminar}
        titulo="Eliminar sala"
        mensaje={`Se eliminará «${salaEliminar?.nombre ?? ""}» junto con todo su equipamiento. Si la sala ya tiene citas registradas no se podrá eliminar (usa «Inactiva»). Esta acción queda registrada en auditoría.`}
        cargando={eliminando}
        onConfirmar={confirmarEliminarSala}
        onCancelar={() => setSalaEliminar(null)}
      />
    </PantallaC2>
  );
}

function Dato({ icono, texto, color: colorProp }: { icono: React.ComponentProps<typeof Ionicons>["name"]; texto: string; color?: string }) {
  const { C, s } = useEstilosC2(crearEstilos);
  const color = colorProp ?? C.texto2;
  return (
    <View style={s.dato}>
      <Ionicons name={icono} size={14} color={color} />
      <Text style={[s.datoTexto, { color }]}>{texto}</Text>
    </View>
  );
}

const crearEstilos = (C: Paleta) =>
  StyleSheet.create({
  filtroTitulo: { fontSize: 11, fontWeight: "800", color: C.texto2, marginBottom: 6, letterSpacing: 0.5 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  fila: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  filaBotones: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  cabeceraSala: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  salaNombre: { fontSize: 15, fontWeight: "800", color: C.texto },
  salaDetalle: { fontSize: 12, color: C.muted, marginTop: 2 },
  estadoPildora: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  estadoTexto: { fontSize: 11, fontWeight: "800" },
  punto: { width: 8, height: 8, borderRadius: 4 },
  datos: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 4 },
  dato: { flexDirection: "row", alignItems: "center", gap: 5 },
  datoTexto: { fontSize: 12, fontWeight: "600" },
  mantTexto: { fontSize: 11, fontWeight: "800", marginTop: 4 },
  pestanas: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  pestana: { flexGrow: 1, flexBasis: 200, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, borderWidth: 2, borderColor: C.borde, backgroundColor: C.tarjeta },
  pestanaIcono: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pestanaTitulo: { fontSize: 14.5, fontWeight: "800", color: C.titulo },
  pestanaSub: { fontSize: 11.5, color: C.muted, marginTop: 1 },
  pestanaCta: { flexGrow: 1.4, flexBasis: 240, borderRadius: 16, overflow: "hidden", borderWidth: 2, borderColor: "transparent", ...sombra({ color: "#1D4ED8", x: 0, y: 4, opacity: 0.3, radius: 10, elevation: 4 }) },
  pestanaCtaActiva: { borderColor: "#0F766E" },
  pestanaCtaFondo: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  pestanaCtaIcono: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.22)" },
  pestanaCtaTitulo: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  pestanaCtaSub: { fontSize: 11.5, color: "rgba(255,255,255,0.88)", marginTop: 1 },
  pestanaCtaInsignia: { fontSize: 11, fontWeight: "800", color: "#0F766E", backgroundColor: "#FFFFFF", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, overflow: "hidden" },
  asignaciones: { marginTop: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: C.borde, backgroundColor: C.fondo, gap: 4 },
  diasFila: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  diaPildora: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  diaPildoraTexto: { fontSize: 11, fontWeight: "800" },
});
