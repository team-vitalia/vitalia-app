import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  Equipo,
  EquipoPayload,
  PageMeta,
  Sala,
  SalaPayload,
  actualizarEquipo,
  actualizarSala,
  agregarEquipo,
  cambiarEstadoSala,
  crearSala,
  eliminarEquipo,
  eliminarSala,
  listarEquipos,
  listarSalas,
  mensajeError,
} from "../../../services/c2Service";

const FORM_SALA_VACIO = { nombre: "", tipo: "", ubicacion: "", piso: "", capacidad: "", estado: "disponible", lista_equipamiento: "" };
const FORM_EQUIPO_VACIO = {
  nombre_equipo: "",
  tipo_equipo: "otro",
  numero_serie: "",
  estado: "operativo",
  fecha_compra: "",
  ultimo_mantenimiento: "",
  proximo_mantenimiento: "",
};

type AvisoEstado = { tipo: "ok" | "error"; texto: string } | null;
const NOMBRES_TIPO = TIPOS_SALA.map((t) => t.valor);

export default function SalasScreen() {
  const { C, s } = useEstilosC2(crearEstilos);
  const { token, esAdmin } = useAccesoC2();

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

  /* ---------- Equipamiento ---------- */
  const [salaEquipos, setSalaEquipos] = useState<Sala | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargandoEquipos, setCargandoEquipos] = useState(false);
  const [equipoEditando, setEquipoEditando] = useState<Equipo | null>(null);
  const [formEquipo, setFormEquipo] = useState(FORM_EQUIPO_VACIO);
  const [errorEquipo, setErrorEquipo] = useState("");
  const [guardandoEquipo, setGuardandoEquipo] = useState(false);
  const [equipoEliminarId, setEquipoEliminarId] = useState<number | null>(null);

  const cargarEquipos = async (salaId: number) => {
    if (!token) return;
    try {
      setCargandoEquipos(true);
      setEquipos(await listarEquipos(token, salaId));
    } catch (e) {
      setErrorEquipo(mensajeError(e, "No se pudo cargar el equipamiento."));
    } finally {
      setCargandoEquipos(false);
    }
  };

  const abrirEquipos = (sala: Sala) => {
    setSalaEquipos(sala);
    setEquipos([]);
    setEquipoEditando(null);
    setFormEquipo(FORM_EQUIPO_VACIO);
    setErrorEquipo("");
    setEquipoEliminarId(null);
    cargarEquipos(sala.id_PK);
  };

  const editarEquipo = (eq: Equipo) => {
    setEquipoEditando(eq);
    setFormEquipo({
      nombre_equipo: eq.nombre_equipo ?? "",
      tipo_equipo: eq.tipo_equipo ?? "otro",
      numero_serie: eq.numero_serie ?? "",
      estado: eq.estado ?? "operativo",
      fecha_compra: eq.fecha_compra ?? "",
      ultimo_mantenimiento: eq.ultimo_mantenimiento ?? "",
      proximo_mantenimiento: eq.proximo_mantenimiento ?? "",
    });
    setErrorEquipo("");
  };

  const cancelarEdicionEquipo = () => {
    setEquipoEditando(null);
    setFormEquipo(FORM_EQUIPO_VACIO);
    setErrorEquipo("");
  };

  const guardarEquipo = async () => {
    if (!token || !salaEquipos) return;
    const nombre = formEquipo.nombre_equipo.trim();
    if (!nombre) return setErrorEquipo("El nombre del equipo es obligatorio.");
    const hoy = hoyLocal();
    const { fecha_compra: compra, ultimo_mantenimiento: ult, proximo_mantenimiento: prox } = formEquipo;
    if (compra && compra > hoy) return setErrorEquipo("La fecha de compra no puede ser futura.");
    if (ult && ult > hoy) return setErrorEquipo("El último mantenimiento no puede ser una fecha futura.");
    if (compra && ult && ult < compra) return setErrorEquipo("El último mantenimiento no puede ser anterior a la compra.");
    if (ult && prox && prox < ult) return setErrorEquipo("El próximo mantenimiento no puede ser anterior al último.");

    const vacioANull = (t: string) => (t.trim() === "" ? null : t.trim());
    const payload: EquipoPayload = {
      nombre_equipo: nombre,
      tipo_equipo: formEquipo.tipo_equipo,
      numero_serie: vacioANull(formEquipo.numero_serie),
      estado: formEquipo.estado,
      fecha_compra: vacioANull(compra),
      ultimo_mantenimiento: vacioANull(ult),
      proximo_mantenimiento: vacioANull(prox),
    };
    try {
      setGuardandoEquipo(true);
      setErrorEquipo("");
      if (equipoEditando) await actualizarEquipo(token, equipoEditando.id_PK, payload);
      else await agregarEquipo(token, salaEquipos.id_PK, payload);
      cancelarEdicionEquipo();
      await cargarEquipos(salaEquipos.id_PK);
      cargar(); // refresca los contadores de la tarjeta
    } catch (e) {
      setErrorEquipo(mensajeError(e, "No se pudo guardar el equipo."));
    } finally {
      setGuardandoEquipo(false);
    }
  };

  const borrarEquipo = async (id: number) => {
    if (!token || !salaEquipos) return;
    try {
      setGuardandoEquipo(true);
      await eliminarEquipo(token, id);
      setEquipoEliminarId(null);
      if (equipoEditando?.id_PK === id) cancelarEdicionEquipo();
      await cargarEquipos(salaEquipos.id_PK);
      cargar();
    } catch (e) {
      setErrorEquipo(mensajeError(e, "No se pudo eliminar el equipo."));
      setEquipoEliminarId(null);
    } finally {
      setGuardandoEquipo(false);
    }
  };

  const tipoEquipoActual = infoTipoEquipo(formEquipo.tipo_equipo);

  /* ---------- Render ---------- */
  return (
    <PantallaC2 titulo="Salas y equipamiento" subtitulo="Administra los espacios de la clínica, su estado y los equipos de cada sala.">
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
        <Cargando />
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
                <Dato icono="construct-outline" texto={`${sala.total_equipos ?? 0} equipo(s)`} />
                {(sala.equipos_con_problema ?? 0) > 0 && (
                  <Dato icono="warning-outline" texto={`${sala.equipos_con_problema} con problema`} color="#DC2626" />
                )}
                <Dato icono="calendar-outline" texto={`${sala.citas_proximas ?? 0} cita(s) próximas`} color={C.info} />
              </View>
              {!!sala.lista_equipamiento && (
                <Text style={s.salaDetalle} numberOfLines={2}>
                  Equipamiento: {sala.lista_equipamiento}
                </Text>
              )}

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
                <Boton texto="Equipamiento" variante="secundario" pequeno onPress={() => abrirEquipos(sala)} />
                <Boton texto="Editar" variante="secundario" pequeno onPress={() => abrirEditar(sala)} />
                {esAdmin && <Boton texto="Eliminar" variante="peligro" pequeno onPress={() => setSalaEliminar(sala)} />}
              </View>
            </Tarjeta>
          );
        })
      )}

      <Paginador meta={meta} onCambiar={setPagina} />

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

        <Campo
          etiqueta="Resumen de equipamiento"
          value={form.lista_equipamiento}
          onChangeText={(t) => setForm({ ...form, lista_equipamiento: t })}
          multiline
          placeholder="Texto libre. El detalle de cada equipo se administra en «Equipamiento»."
        />
        <View style={s.fila}>
          <Boton texto="Cancelar" variante="secundario" onPress={() => setModalSala(false)} deshabilitado={guardando} />
          <Boton texto={editando ? "Guardar cambios" : "Crear sala"} onPress={guardarSala} cargando={guardando} />
        </View>
      </ModalBase>

      {/* ---------- Modal equipamiento ---------- */}
      <ModalBase visible={!!salaEquipos} titulo={salaEquipos ? `Equipamiento · ${salaEquipos.nombre}` : "Equipamiento"} onClose={() => setSalaEquipos(null)}>
        {!!errorEquipo && <Aviso tipo="error" texto={errorEquipo} />}

        {cargandoEquipos ? (
          <Cargando />
        ) : equipos.length === 0 ? (
          <Vacio texto="Esta sala aún no tiene equipos registrados." />
        ) : (
          equipos.map((eq) => {
            const tipo = infoTipoEquipo(eq.tipo_equipo);
            const colorEq = colorEstadoEquipo(eq.estado);
            const mant = MANTENIMIENTO[eq.mantenimiento_estado ?? "sin_programar"];
            return (
              <Tarjeta key={eq.id_PK} style={{ padding: 12, borderLeftWidth: 5, borderLeftColor: tipo.color }}>
                <View style={s.cabeceraSala}>
                  <CirculoIcono name={tipo.icono} color={tipo.color} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.salaNombre}>{eq.nombre_equipo || "Equipo sin nombre"}</Text>
                    <Text style={s.salaDetalle}>
                      {tipo.etiqueta} · Serie: {eq.numero_serie || "—"}
                    </Text>
                  </View>
                  <View style={[s.estadoPildora, { backgroundColor: `${colorEq}1A`, borderColor: colorEq }]}>
                    <Text style={[s.estadoTexto, { color: colorEq }]}>{etiquetaEstadoEquipo(eq.estado)}</Text>
                  </View>
                </View>
                <View style={s.datos}>
                  <Dato icono="cart-outline" texto={`Compra: ${fechaCorta(eq.fecha_compra)}`} />
                  <Dato icono="construct-outline" texto={`Último mant.: ${fechaCorta(eq.ultimo_mantenimiento)}`} />
                  <Dato icono="calendar-outline" texto={`Próximo: ${fechaCorta(eq.proximo_mantenimiento)}`} color={mant.color} />
                </View>
                <Text style={[s.mantTexto, { color: mant.color }]}>● {mant.etiqueta}</Text>

                {equipoEliminarId === eq.id_PK ? (
                  <View style={[s.filaBotones, { marginTop: 10 }]}>
                    <Text style={[s.salaDetalle, { flex: 1 }]}>¿Eliminar este equipo?</Text>
                    <Boton texto="No" variante="secundario" pequeno onPress={() => setEquipoEliminarId(null)} />
                    <Boton texto="Sí, eliminar" variante="peligro" pequeno cargando={guardandoEquipo} onPress={() => borrarEquipo(eq.id_PK)} />
                  </View>
                ) : (
                  <View style={[s.filaBotones, { marginTop: 10 }]}>
                    <Boton texto="Editar" variante="secundario" pequeno onPress={() => editarEquipo(eq)} />
                    {esAdmin && <Boton texto="Eliminar" variante="peligro" pequeno onPress={() => setEquipoEliminarId(eq.id_PK)} />}
                  </View>
                )}
              </Tarjeta>
            );
          })
        )}

        <Text style={[s.salaNombre, { marginTop: 8, marginBottom: 10 }]}>{equipoEditando ? "Editar equipo" : "Agregar equipo"}</Text>

        <Text style={s.filtroTitulo}>1. ¿QUÉ TIPO DE EQUIPO ES?</Text>
        <SelectorIconos opciones={TIPOS_EQUIPO} valor={formEquipo.tipo_equipo} onChange={(v) => setFormEquipo({ ...formEquipo, tipo_equipo: v })} />

        <Text style={s.filtroTitulo}>2. DATOS DEL EQUIPO</Text>
        <Campo
          etiqueta="Nombre del equipo *"
          value={formEquipo.nombre_equipo}
          onChangeText={(t) => setFormEquipo({ ...formEquipo, nombre_equipo: t })}
          placeholder={tipoEquipoActual.ejemplo}
        />
        <Campo etiqueta="Número de serie" value={formEquipo.numero_serie} onChangeText={(t) => setFormEquipo({ ...formEquipo, numero_serie: t })} />
        <Text style={s.filtroTitulo}>ESTADO</Text>
        <View style={s.chips}>
          {ESTADOS_EQUIPO.map((e) => (
            <ChipColor key={e.valor} texto={e.etiqueta} color={e.color} icono={e.icono} activo={formEquipo.estado === e.valor} onPress={() => setFormEquipo({ ...formEquipo, estado: e.valor })} />
          ))}
        </View>

        <Text style={s.filtroTitulo}>3. FECHAS (elige en el calendario)</Text>
        <View style={s.fila}>
          <CampoFecha etiqueta="Fecha de compra" value={formEquipo.fecha_compra} onChange={(v) => setFormEquipo({ ...formEquipo, fecha_compra: v })} max={hoyLocal()} />
          <CampoFecha
            etiqueta="Último mantenimiento"
            value={formEquipo.ultimo_mantenimiento}
            onChange={(v) => setFormEquipo({ ...formEquipo, ultimo_mantenimiento: v })}
            min={formEquipo.fecha_compra || undefined}
            max={hoyLocal()}
          />
          <CampoFecha
            etiqueta="Próximo mantenimiento"
            value={formEquipo.proximo_mantenimiento}
            onChange={(v) => setFormEquipo({ ...formEquipo, proximo_mantenimiento: v })}
            min={formEquipo.ultimo_mantenimiento || undefined}
          />
        </View>

        <View style={s.fila}>
          {equipoEditando && <Boton texto="Cancelar edición" variante="secundario" onPress={cancelarEdicionEquipo} />}
          <Boton texto={equipoEditando ? "Guardar equipo" : "Agregar equipo"} onPress={guardarEquipo} cargando={guardandoEquipo} />
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
});
