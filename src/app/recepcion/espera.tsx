import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  Aviso, Boton, C, Campo, Cargando, ConfirmarModal, Etiqueta, fechaValida, ModalBase, Opciones, PantallaC2,
  soloFecha, Tarjeta, Tono, Vacio,
} from "../../components/c2/ui";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { mensajeError } from "../../services/c2Service";
import {
  agregarAEspera, cambiarEstadoEspera, EntradaEspera, listarEspera, notificarEspera, Prioridad, quitarDeEspera,
} from "../../services/clinicoService";

const TONO_PRIORIDAD: Record<Prioridad, Tono> = { normal: "neutral", alta: "warn", urgente: "danger" };

type Persona = { id_PK: number; nombre: string; apellido?: string };

/** Lista de espera de citas (pacientes que esperan un horario). No confundir con la cola de turnos del día. */
export default function EsperaCitas() {
  const { token } = useAuth();
  const [lista, setLista] = useState<EntradaEspera[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const [modal, setModal] = useState<"agregar" | "asignar" | null>(null);
  const [errorModal, setErrorModal] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pacientes, setPacientes] = useState<Persona[]>([]);
  const [doctores, setDoctores] = useState<Persona[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [pacienteId, setPacienteId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [prioridad, setPrioridad] = useState<Prioridad>("normal");
  const [fecha, setFecha] = useState("");
  const [motivo, setMotivo] = useState("");
  const [objetivo, setObjetivo] = useState<EntradaEspera | null>(null);
  const [citaId, setCitaId] = useState("");
  const [quitar, setQuitar] = useState<EntradaEspera | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setLista(await listarEspera());
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar la lista de espera."));
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  useEffect(() => {
    if (!token) return;
    Promise.all([api.get("/api/pacientes/"), api.get("/api/doctores/")])
      .then(([p, d]) => (setPacientes(p.data), setDoctores(d.data)))
      .catch(() => undefined);
  }, [token]);

  const coincidencias = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    if (t.length < 2) return [];
    return pacientes.filter((p) => `${p.nombre} ${p.apellido ?? ""}`.toLowerCase().includes(t)).slice(0, 6);
  }, [busqueda, pacientes]);

  const nombrePaciente = pacientes.find((p) => p.id_PK === pacienteId);

  /** Ejecuta una acción; devuelve true si salió bien (para limpiar formularios solo entonces). */
  const accion = async (fn: () => Promise<unknown>, mensaje: string, cerrar = true): Promise<boolean> => {
    setEnviando(true);
    setErrorModal("");
    try {
      await fn();
      setExito(mensaje);
      setError("");
      if (cerrar) setModal(null);
      await cargar();
      return true;
    } catch (e) {
      const m = mensajeError(e);
      if (cerrar) setErrorModal(m);
      else setError(m);
      return false;
    } finally {
      setEnviando(false);
    }
  };

  const agregar = () => {
    if (!pacienteId) return setErrorModal("Selecciona un paciente.");
    if (fecha.trim() && !fechaValida(fecha.trim())) return setErrorModal("La fecha debe tener formato AAAA-MM-DD.");
    accion(
      () => agregarAEspera({ pacienteId, doctorId, fechaDeseada: fecha.trim(), motivo: motivo.trim(), prioridad }),
      "Paciente agregado a la lista de espera."
    ).then((ok) => {
      if (!ok) return;
      setPacienteId(null); setBusqueda(""); setDoctorId(null); setMotivo(""); setFecha(""); setPrioridad("normal");
    });
  };

  const asignar = () => {
    if (!objetivo || !Number(citaId)) return setErrorModal("Escribe el ID de la cita creada.");
    accion(() => cambiarEstadoEspera(objetivo.id_PK, "asignada", Number(citaId)), "Cita asignada; el paciente salió de la lista.").then((ok) => ok && setCitaId(""));
  };

  return (
    <PantallaC2 titulo="Espera de citas" subtitulo="Pacientes que esperan que se libere un horario" roles={[1, 4, 5]}>
      {!!error && <Aviso tipo="error" texto={error} />}
      {!!exito && <Aviso tipo="ok" texto={exito} />}
      <Boton texto="Agregar paciente a la lista" onPress={() => { setErrorModal(""); setModal("agregar"); }} />

      {cargando && lista.length === 0 ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <Vacio texto="No hay pacientes en espera." />
      ) : (
        lista.map((e) => (
          <Tarjeta key={e.id_PK} style={{ gap: 6 }}>
            <View style={s.cabecera}>
              <Text style={s.titulo}>#{e.posicion} · {e.paciente ?? `Paciente ${e.paciente_id_FK}`}</Text>
              <Etiqueta texto={e.prioridad} tono={TONO_PRIORIDAD[e.prioridad]} />
            </View>
            <Text style={s.sub}>
              {e.doctor ? `Dr. ${e.doctor}` : "Cualquier doctor"}
              {e.fecha_deseada ? ` · desde ${soloFecha(e.fecha_deseada)}` : ""}
              {e.estado === "notificado" ? " · ya notificado" : ""}
            </Text>
            {!!e.motivo && <Text style={s.sub}>{e.motivo}</Text>}
            <View style={s.botones}>
              <Boton pequeno variante="secundario" texto="Avisar" onPress={() => accion(() => notificarEspera(e.id_PK), "Se avisó al paciente.", false)} />
              <Boton pequeno texto="Asignar cita" onPress={() => { setObjetivo(e); setErrorModal(""); setModal("asignar"); }} />
              <Boton pequeno variante="peligro" texto="Quitar" onPress={() => setQuitar(e)} />
            </View>
          </Tarjeta>
        ))
      )}

      <ModalBase visible={modal === "agregar"} titulo="Agregar a lista de espera" onClose={() => setModal(null)}>
        {!!errorModal && <Aviso tipo="error" texto={errorModal} />}
        {nombrePaciente ? (
          <View style={s.cabecera}>
            <Text style={s.titulo}>{nombrePaciente.nombre} {nombrePaciente.apellido}</Text>
            <Boton pequeno variante="secundario" texto="Cambiar" onPress={() => setPacienteId(null)} />
          </View>
        ) : (
          <>
            <Campo etiqueta="Buscar paciente" value={busqueda} onChangeText={setBusqueda} placeholder="Nombre o apellido" />
            {coincidencias.map((p) => (
              <Pressable key={p.id_PK} style={s.opcion} onPress={() => setPacienteId(p.id_PK)}>
                <Text style={s.titulo}>{p.nombre} {p.apellido}</Text>
              </Pressable>
            ))}
          </>
        )}
        <Text style={s.etiqueta}>Doctor (opcional)</Text>
        <Pressable style={[s.opcion, doctorId === null && s.opcionActiva]} onPress={() => setDoctorId(null)}>
          <Text style={s.titulo}>Cualquier doctor</Text>
        </Pressable>
        {doctores.slice(0, 12).map((d) => (
          <Pressable key={d.id_PK} style={[s.opcion, doctorId === d.id_PK && s.opcionActiva]} onPress={() => setDoctorId(d.id_PK)}>
            <Text style={s.titulo}>{d.nombre}</Text>
          </Pressable>
        ))}
        <Text style={s.etiqueta}>Prioridad</Text>
        <Opciones valor={prioridad} onChange={setPrioridad} opciones={[{ valor: "normal", etiqueta: "Normal" }, { valor: "alta", etiqueta: "Alta" }, { valor: "urgente", etiqueta: "Urgente" }]} />
        <Campo etiqueta="Fecha deseada (opcional)" value={fecha} onChangeText={setFecha} placeholder="AAAA-MM-DD" />
        <Campo etiqueta="Motivo" value={motivo} onChangeText={setMotivo} multiline />
        <Boton texto="Agregar" onPress={agregar} cargando={enviando} />
      </ModalBase>

      <ModalBase visible={modal === "asignar"} titulo="Asignar cita" onClose={() => setModal(null)}>
        {!!errorModal && <Aviso tipo="error" texto={errorModal} />}
        <Text style={s.sub}>Primero crea la cita en «Citas médicas» y escribe aquí su ID.</Text>
        <Campo etiqueta="ID de la cita" value={citaId} onChangeText={setCitaId} keyboardType="numeric" />
        <Boton texto="Confirmar" onPress={asignar} cargando={enviando} />
      </ModalBase>

      <ConfirmarModal
        visible={!!quitar}
        titulo="Quitar de la lista"
        mensaje={`¿Quitar a ${quitar?.paciente ?? "este paciente"} de la lista de espera?`}
        textoConfirmar="Quitar"
        cargando={enviando}
        onConfirmar={() => quitar && accion(() => quitarDeEspera(quitar.id_PK), "Paciente quitado de la lista.", false).then(() => setQuitar(null))}
        onCancelar={() => setQuitar(null)}
      />
    </PantallaC2>
  );
}

const s = StyleSheet.create({
  cabecera: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  titulo: { fontSize: 14.5, fontWeight: "800", color: C.titulo, flexShrink: 1 },
  sub: { fontSize: 12.5, color: C.texto2 },
  etiqueta: { fontSize: 12.5, fontWeight: "700", color: C.texto, marginTop: 10, marginBottom: 4 },
  botones: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 },
  opcion: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: C.borde, marginBottom: 6 },
  opcionActiva: { borderColor: C.primario, backgroundColor: C.primarioSuave },
});
