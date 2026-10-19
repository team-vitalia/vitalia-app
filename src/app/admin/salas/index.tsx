import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  ConfirmarModal,
  Etiqueta,
  ModalBase,
  Opciones,
  PantallaC2,
  Paginador,
  Tarjeta,
  Tono,
  C,
  Vacio,
  etiquetaEstado,
  fechaValida,
  soloFecha,
  useAccesoC2,
} from "../../../components/c2/ui";
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

const ESTADOS_SALA = ["disponible", "ocupada", "mantenimiento", "inactiva"] as const;
const TONO_SALA: Record<string, Tono> = {
  disponible: "ok",
  ocupada: "warn",
  mantenimiento: "info",
  inactiva: "neutral",
};

const ESTADOS_EQUIPO = ["operativo", "mantenimiento", "fuera_de_servicio"] as const;
const TONO_EQUIPO: Record<string, Tono> = {
  operativo: "ok",
  mantenimiento: "warn",
  fuera_de_servicio: "danger",
};

const FORM_SALA_VACIO = {
  nombre: "",
  tipo: "",
  ubicacion: "",
  piso: "",
  capacidad: "",
  estado: "disponible",
  lista_equipamiento: "",
};

const FORM_EQUIPO_VACIO = {
  nombre_equipo: "",
  numero_serie: "",
  estado: "operativo",
  fecha_compra: "",
  ultimo_mantenimiento: "",
  proximo_mantenimiento: "",
};

type AvisoEstado = { tipo: "ok" | "error"; texto: string } | null;

export default function SalasScreen() {
  const { token, esAdmin } = useAccesoC2();

  /* ---------- Listado ---------- */
  const [salas, setSalas] = useState<Sala[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<AvisoEstado>(null);

  const [estadoFiltro, setEstadoFiltro] = useState<string>("");
  const [pisoInput, setPisoInput] = useState("");
  const [tipoInput, setTipoInput] = useState("");
  const [filtros, setFiltros] = useState({ piso: "", tipo: "" });
  const [pagina, setPagina] = useState(1);

  const cargar = useCallback(async () => {
    if (!token) return;
    try {
      setCargando(true);
      const r = await listarSalas(token, {
        estado: estadoFiltro,
        piso: filtros.piso,
        tipo: filtros.tipo,
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
  }, [token, estadoFiltro, filtros, pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const aplicarFiltros = () => {
    setPagina(1);
    setFiltros({ piso: pisoInput.trim(), tipo: tipoInput.trim() });
  };

  const limpiarFiltros = () => {
    setPisoInput("");
    setTipoInput("");
    setEstadoFiltro("");
    setFiltros({ piso: "", tipo: "" });
    setPagina(1);
  };

  /* ---------- Crear / editar sala ---------- */
  const [modalSala, setModalSala] = useState(false);
  const [editando, setEditando] = useState<Sala | null>(null);
  const [form, setForm] = useState(FORM_SALA_VACIO);
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);

  const abrirNueva = () => {
    setEditando(null);
    setForm(FORM_SALA_VACIO);
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
    setErrorForm("");
    setModalSala(true);
  };

  const guardarSala = async () => {
    if (!token) return;
    const nombre = form.nombre.trim();
    if (!nombre) {
      setErrorForm("El nombre de la sala es obligatorio.");
      return;
    }
    let capacidad: number | null = null;
    if (form.capacidad.trim() !== "") {
      capacidad = Number(form.capacidad);
      if (!Number.isInteger(capacidad) || capacidad <= 0) {
        setErrorForm("La capacidad debe ser un número entero mayor a 0.");
        return;
      }
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
        setAviso({ tipo: "ok", texto: `Sala "${nombre}" actualizada.` });
      } else {
        await crearSala(token, payload);
        setAviso({ tipo: "ok", texto: `Sala "${nombre}" creada.` });
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
      setSalas((prev) => prev.map((x) => (x.id_PK === sala.id_PK ? actualizada : x)));
      setAviso({ tipo: "ok", texto: `"${sala.nombre}" ahora está ${etiquetaEstado(nuevo).toLowerCase()}.` });
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e, "No se pudo cambiar el estado.") });
    } finally {
      setCambiandoId(null);
    }
  };

  /* ---------- Eliminar sala (solo Administrador) ---------- */
  const [salaEliminar, setSalaEliminar] = useState<Sala | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const confirmarEliminarSala = async () => {
    if (!token || !salaEliminar) return;
    try {
      setEliminando(true);
      await eliminarSala(token, salaEliminar.id_PK);
      setAviso({ tipo: "ok", texto: `Sala "${salaEliminar.nombre}" eliminada.` });
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

  /* ---------- Equipamiento de una sala ---------- */
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
    if (!nombre) {
      setErrorEquipo("El nombre del equipo es obligatorio.");
      return;
    }
    const fechas: [string, string][] = [
      ["Fecha de compra", formEquipo.fecha_compra.trim()],
      ["Último mantenimiento", formEquipo.ultimo_mantenimiento.trim()],
      ["Próximo mantenimiento", formEquipo.proximo_mantenimiento.trim()],
    ];
    for (const [nombreCampo, valor] of fechas) {
      if (valor && !fechaValida(valor)) {
        setErrorEquipo(`${nombreCampo}: usa el formato AAAA-MM-DD.`);
        return;
      }
    }
    const hoy = new Date().toISOString().slice(0, 10);
    if (formEquipo.fecha_compra.trim() && formEquipo.fecha_compra.trim() > hoy) {
      setErrorEquipo("La fecha de compra no puede ser futura.");
      return;
    }
    const ult = formEquipo.ultimo_mantenimiento.trim();
    const prox = formEquipo.proximo_mantenimiento.trim();
    if (ult && prox && prox < ult) {
      setErrorEquipo("El próximo mantenimiento no puede ser anterior al último.");
      return;
    }

    const vacioANull = (t: string) => (t.trim() === "" ? null : t.trim());
    const payload: EquipoPayload = {
      nombre_equipo: nombre,
      numero_serie: vacioANull(formEquipo.numero_serie),
      estado: formEquipo.estado,
      fecha_compra: vacioANull(formEquipo.fecha_compra),
      ultimo_mantenimiento: vacioANull(formEquipo.ultimo_mantenimiento),
      proximo_mantenimiento: vacioANull(formEquipo.proximo_mantenimiento),
    };

    try {
      setGuardandoEquipo(true);
      setErrorEquipo("");
      if (equipoEditando) await actualizarEquipo(token, equipoEditando.id_PK, payload);
      else await agregarEquipo(token, salaEquipos.id_PK, payload);
      cancelarEdicionEquipo();
      await cargarEquipos(salaEquipos.id_PK);
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
    } catch (e) {
      setErrorEquipo(mensajeError(e, "No se pudo eliminar el equipo."));
      setEquipoEliminarId(null);
    } finally {
      setGuardandoEquipo(false);
    }
  };

  /* ---------- Render ---------- */
  return (
    <PantallaC2
      titulo="Salas y equipamiento"
      subtitulo="Administra los espacios de la clínica, su estado y los equipos de cada sala."
    >
      {aviso && <Aviso tipo={aviso.tipo} texto={aviso.texto} />}

      <Tarjeta>
        <Text style={s.filtroTitulo}>Filtros</Text>
        <Opciones
          valor={estadoFiltro}
          onChange={(v) => {
            setPagina(1);
            setEstadoFiltro(v);
          }}
          opciones={[
            { valor: "", etiqueta: "Todas" },
            ...ESTADOS_SALA.map((e) => ({ valor: e as string, etiqueta: etiquetaEstado(e) })),
          ]}
        />
        <View style={s.fila}>
          <Campo etiqueta="Piso" value={pisoInput} onChangeText={setPisoInput} placeholder="Ej. 1" />
          <Campo etiqueta="Tipo" value={tipoInput} onChangeText={setTipoInput} placeholder="Ej. Consultorio" />
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
        salas.map((sala) => (
          <Tarjeta key={sala.id_PK}>
            <View style={s.cabeceraSala}>
              <View style={{ flex: 1 }}>
                <Text style={s.salaNombre}>{sala.nombre}</Text>
                <Text style={s.salaDetalle}>
                  {[sala.tipo, sala.piso ? `Piso ${sala.piso}` : null, sala.ubicacion].filter(Boolean).join(" · ") ||
                    "Sin detalles"}
                </Text>
              </View>
              <Etiqueta
                texto={etiquetaEstado(sala.estado)}
                tono={TONO_SALA[sala.estado ?? ""] ?? "neutral"}
              />
            </View>

            <Text style={s.salaDetalle}>
              Capacidad: <Text style={s.negrita}>{sala.capacidad ?? "—"}</Text>
            </Text>
            {!!sala.lista_equipamiento && (
              <Text style={s.salaDetalle} numberOfLines={2}>
                Equipamiento: {sala.lista_equipamiento}
              </Text>
            )}

            <Text style={[s.filtroTitulo, { marginTop: 12 }]}>Cambiar estado</Text>
            <View style={s.estadosFila}>
              {ESTADOS_SALA.map((e) => {
                const activo = sala.estado === e;
                return (
                  <Boton
                    key={e}
                    texto={etiquetaEstado(e)}
                    variante={activo ? "primario" : "secundario"}
                    pequeno
                    deshabilitado={activo || cambiandoId === sala.id_PK}
                    onPress={() => cambiarEstado(sala, e)}
                  />
                );
              })}
            </View>

            <View style={[s.filaBotones, { marginTop: 12 }]}>
              <Boton texto="Equipamiento" variante="secundario" pequeno onPress={() => abrirEquipos(sala)} />
              <Boton texto="Editar" variante="secundario" pequeno onPress={() => abrirEditar(sala)} />
              {esAdmin && (
                <Boton texto="Eliminar" variante="peligro" pequeno onPress={() => setSalaEliminar(sala)} />
              )}
            </View>
          </Tarjeta>
        ))
      )}

      <Paginador meta={meta} onCambiar={setPagina} />

      {/* ---------- Modal crear / editar sala ---------- */}
      <ModalBase
        visible={modalSala}
        titulo={editando ? "Editar sala" : "Nueva sala"}
        onClose={() => setModalSala(false)}
      >
        {!!errorForm && <Aviso tipo="error" texto={errorForm} />}
        <Campo
          etiqueta="Nombre *"
          value={form.nombre}
          onChangeText={(t) => setForm({ ...form, nombre: t })}
          placeholder="Ej. Consultorio 1"
        />
        <View style={s.fila}>
          <Campo
            etiqueta="Tipo"
            value={form.tipo}
            onChangeText={(t) => setForm({ ...form, tipo: t })}
            placeholder="Consultorio, Quirófano…"
          />
          <Campo
            etiqueta="Piso"
            value={form.piso}
            onChangeText={(t) => setForm({ ...form, piso: t })}
            placeholder="Ej. 2"
          />
        </View>
        <View style={s.fila}>
          <Campo
            etiqueta="Ubicación"
            value={form.ubicacion}
            onChangeText={(t) => setForm({ ...form, ubicacion: t })}
            placeholder="Ala norte, pasillo B…"
          />
          <Campo
            etiqueta="Capacidad"
            value={form.capacidad}
            onChangeText={(t) => setForm({ ...form, capacidad: t.replace(/[^0-9]/g, "") })}
            keyboardType="numeric"
            placeholder="Ej. 4"
          />
        </View>
        <Text style={s.filtroTitulo}>Estado</Text>
        <Opciones
          valor={form.estado}
          onChange={(v) => setForm({ ...form, estado: v })}
          opciones={ESTADOS_SALA.map((e) => ({ valor: e as string, etiqueta: etiquetaEstado(e) }))}
        />
        <Campo
          etiqueta="Resumen de equipamiento"
          value={form.lista_equipamiento}
          onChangeText={(t) => setForm({ ...form, lista_equipamiento: t })}
          multiline
          placeholder="Texto libre. El detalle de equipos se administra en “Equipamiento”."
        />
        <View style={s.fila}>
          <Boton texto="Cancelar" variante="secundario" onPress={() => setModalSala(false)} deshabilitado={guardando} />
          <Boton texto={editando ? "Guardar cambios" : "Crear sala"} onPress={guardarSala} cargando={guardando} />
        </View>
      </ModalBase>

      {/* ---------- Modal equipamiento ---------- */}
      <ModalBase
        visible={!!salaEquipos}
        titulo={salaEquipos ? `Equipamiento · ${salaEquipos.nombre}` : "Equipamiento"}
        onClose={() => setSalaEquipos(null)}
      >
        {!!errorEquipo && <Aviso tipo="error" texto={errorEquipo} />}

        {cargandoEquipos ? (
          <Cargando />
        ) : equipos.length === 0 ? (
          <Vacio texto="Esta sala aún no tiene equipos registrados." />
        ) : (
          equipos.map((eq) => (
            <Tarjeta key={eq.id_PK} style={{ padding: 12 }}>
              <View style={s.cabeceraSala}>
                <View style={{ flex: 1 }}>
                  <Text style={s.salaNombre}>{eq.nombre_equipo || "Equipo sin nombre"}</Text>
                  <Text style={s.salaDetalle}>Serie: {eq.numero_serie || "—"}</Text>
                </View>
                <Etiqueta
                  texto={etiquetaEstado(eq.estado)}
                  tono={TONO_EQUIPO[eq.estado ?? ""] ?? "neutral"}
                />
              </View>
              <Text style={s.salaDetalle}>
                Compra: {soloFecha(eq.fecha_compra)} · Último mant.: {soloFecha(eq.ultimo_mantenimiento)} · Próximo:{" "}
                {soloFecha(eq.proximo_mantenimiento)}
              </Text>

              {equipoEliminarId === eq.id_PK ? (
                <View style={[s.filaBotones, { marginTop: 10 }]}>
                  <Text style={[s.salaDetalle, { flex: 1 }]}>¿Eliminar este equipo?</Text>
                  <Boton texto="No" variante="secundario" pequeno onPress={() => setEquipoEliminarId(null)} />
                  <Boton
                    texto="Sí, eliminar"
                    variante="peligro"
                    pequeno
                    cargando={guardandoEquipo}
                    onPress={() => borrarEquipo(eq.id_PK)}
                  />
                </View>
              ) : (
                <View style={[s.filaBotones, { marginTop: 10 }]}>
                  <Boton texto="Editar" variante="secundario" pequeno onPress={() => editarEquipo(eq)} />
                  {esAdmin && (
                    <Boton
                      texto="Eliminar"
                      variante="peligro"
                      pequeno
                      onPress={() => setEquipoEliminarId(eq.id_PK)}
                    />
                  )}
                </View>
              )}
            </Tarjeta>
          ))
        )}

        <Text style={[s.salaNombre, { marginTop: 8, marginBottom: 10 }]}>
          {equipoEditando ? "Editar equipo" : "Agregar equipo"}
        </Text>
        <Campo
          etiqueta="Nombre del equipo *"
          value={formEquipo.nombre_equipo}
          onChangeText={(t) => setFormEquipo({ ...formEquipo, nombre_equipo: t })}
          placeholder="Ej. Electrocardiógrafo"
        />
        <Campo
          etiqueta="Número de serie"
          value={formEquipo.numero_serie}
          onChangeText={(t) => setFormEquipo({ ...formEquipo, numero_serie: t })}
        />
        <Text style={s.filtroTitulo}>Estado</Text>
        <Opciones
          valor={formEquipo.estado}
          onChange={(v) => setFormEquipo({ ...formEquipo, estado: v })}
          opciones={ESTADOS_EQUIPO.map((e) => ({ valor: e as string, etiqueta: etiquetaEstado(e) }))}
        />
        <View style={s.fila}>
          <Campo
            etiqueta="Fecha de compra"
            value={formEquipo.fecha_compra}
            onChangeText={(t) => setFormEquipo({ ...formEquipo, fecha_compra: t })}
            placeholder="AAAA-MM-DD"
          />
          <Campo
            etiqueta="Último mantenimiento"
            value={formEquipo.ultimo_mantenimiento}
            onChangeText={(t) => setFormEquipo({ ...formEquipo, ultimo_mantenimiento: t })}
            placeholder="AAAA-MM-DD"
          />
          <Campo
            etiqueta="Próximo mantenimiento"
            value={formEquipo.proximo_mantenimiento}
            onChangeText={(t) => setFormEquipo({ ...formEquipo, proximo_mantenimiento: t })}
            placeholder="AAAA-MM-DD"
          />
        </View>
        <View style={s.fila}>
          {equipoEditando && (
            <Boton texto="Cancelar edición" variante="secundario" onPress={cancelarEdicionEquipo} />
          )}
          <Boton
            texto={equipoEditando ? "Guardar equipo" : "Agregar equipo"}
            onPress={guardarEquipo}
            cargando={guardandoEquipo}
          />
        </View>
      </ModalBase>

      {/* ---------- Confirmar eliminación de sala ---------- */}
      <ConfirmarModal
        visible={!!salaEliminar}
        titulo="Eliminar sala"
        mensaje={`Se eliminará "${salaEliminar?.nombre ?? ""}" junto con todo su equipamiento. Esta acción queda registrada en auditoría y no se puede deshacer.`}
        cargando={eliminando}
        onConfirmar={confirmarEliminarSala}
        onCancelar={() => setSalaEliminar(null)}
      />
    </PantallaC2>
  );
}

const s = StyleSheet.create({
  filtroTitulo: { fontSize: 11, fontWeight: "800", color: C.texto2, marginBottom: 6, letterSpacing: 0.5 },
  fila: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  filaBotones: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  estadosFila: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cabeceraSala: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 6 },
  salaNombre: { fontSize: 15, fontWeight: "800", color: C.texto },
  salaDetalle: { fontSize: 12, color: C.muted, marginTop: 2 },
  negrita: { fontWeight: "800", color: C.texto },
});
