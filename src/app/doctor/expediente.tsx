import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import ExpedienteVista from "../../components/ExpedienteVista";
import {
  Aviso, Boton, C, Campo, Cargando, ConfirmarModal, ModalBase, Opciones, PantallaC2, useAccesoC2,
} from "../../components/c2/ui";
import { mensajeError } from "../../services/c2Service";
import {
  agregarAntecedente, agregarRegistro, asignarAlergia, crearAlergiaCatalogo, Expediente, getCatalogoAlergias,
  getDoctoresParaTransferir, getExpediente, quitarAlergia, transferirPaciente,
} from "../../services/clinicoService";

type Modal = null | "alergia" | "antecedente" | "nota" | "transferir";

/** Expediente clínico de un paciente (médico). Edición: antecedentes, alergias, notas y transferencia. */
export default function ExpedienteDoctor() {
  const router = useRouter();
  const { pacienteId } = useLocalSearchParams<{ pacienteId: string }>();
  const { rolId } = useAccesoC2([1, 2, 5]);
  const id = Number(pacienteId);
  const puedeEditar = rolId === 1 || rolId === 2;

  const [exp, setExp] = useState<Expediente | null>(null);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [errorModal, setErrorModal] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [quitar, setQuitar] = useState<number | null>(null);

  // formularios
  const [alergia, setAlergia] = useState("");
  const [severidad, setSeveridad] = useState<"leve" | "moderada" | "grave">("moderada");
  const [diagnostico, setDiagnostico] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [sangre, setSangre] = useState("");
  const [nota, setNota] = useState("");
  const [doctores, setDoctores] = useState<{ id_PK: number; nombre: string; especialidad: string }[]>([]);
  const [destino, setDestino] = useState<number | null>(null);
  const [motivo, setMotivo] = useState("");

  const cargar = useCallback(async () => {
    try {
      setExp(await getExpediente(id));
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar el expediente."));
    }
  }, [id]);

  useEffect(() => {
    if (id) cargar();
  }, [id, cargar]);

  const abrir = async (m: Modal) => {
    setErrorModal("");
    setModal(m);
    if (m === "transferir") {
      try {
        const lista = await getDoctoresParaTransferir();
        setDoctores(lista.map((d) => ({ id_PK: d.id_PK, nombre: d.nombre, especialidad: d.especialidades[0]?.nombre ?? "" })));
      } catch (e) {
        setErrorModal(mensajeError(e, "No se pudo cargar la lista de médicos."));
      }
    }
  };

  const ejecutar = async (accion: () => Promise<string | void>) => {
    setEnviando(true);
    setErrorModal("");
    try {
      const mensaje = await accion();
      setExito(mensaje || "Cambios guardados.");
      setModal(null);
      await cargar();
    } catch (e) {
      setErrorModal(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  };

  const guardarAlergia = () =>
    ejecutar(async () => {
      const nombre = alergia.trim();
      if (!nombre) throw new Error("Escribe el nombre de la alergia.");
      const catalogo = await getCatalogoAlergias();
      const existente = catalogo.find((a) => a.nombre.toLowerCase() === nombre.toLowerCase());
      const alergiaId = existente ? existente.id_PK : (await crearAlergiaCatalogo(nombre)).id_PK;
      await asignarAlergia(id, alergiaId, severidad);
      setAlergia("");
      return "Alergia registrada.";
    });

  const guardarAntecedente = () =>
    ejecutar(async () => {
      if (!diagnostico.trim() && !descripcion.trim() && !tratamiento.trim() && !sangre.trim()) {
        throw new Error("Captura al menos un dato.");
      }
      await agregarAntecedente(id, {
        diagnostico: diagnostico.trim() || null,
        descripcion: descripcion.trim() || null,
        tratamiento: tratamiento.trim() || null,
        tipo_sangre: sangre.trim().toUpperCase() || null,
      });
      setDiagnostico(""); setDescripcion(""); setTratamiento(""); setSangre("");
      return "Antecedente registrado.";
    });

  const guardarNota = () =>
    ejecutar(async () => {
      if (!nota.trim()) throw new Error("Escribe la nota.");
      await agregarRegistro(id, nota.trim(), "nota");
      setNota("");
      return "Nota agregada.";
    });

  const transferir = () =>
    ejecutar(async () => {
      if (!destino) throw new Error("Selecciona el médico destino.");
      const r = await transferirPaciente(id, destino, motivo.trim());
      setDestino(null); setMotivo("");
      const conflictos = r.citas_con_conflicto.length
        ? ` ${r.citas_con_conflicto.length} cita(s) se empalman con la agenda del nuevo médico; recepción debe reprogramarlas.`
        : "";
      return `Paciente transferido. Citas reasignadas: ${r.citas_reasignadas}.${conflictos}`;
    });

  const confirmarQuitar = async () => {
    if (quitar === null) return;
    setEnviando(true);
    try {
      await quitarAlergia(id, quitar);
      setExito("Alergia eliminada del expediente.");
      setQuitar(null);
      await cargar();
    } catch (e) {
      setError(mensajeError(e));
      setQuitar(null);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PantallaC2 titulo="Expediente clínico" roles={[1, 2, 5]}>
      {!!error && <Aviso tipo="error" texto={error} />}
      {!!exito && <Aviso tipo="ok" texto={exito} />}
      {!exp && !error ? (
        <Cargando />
      ) : (
        exp && (
          <>
            <ExpedienteVista
              exp={exp}
              onQuitarAlergia={puedeEditar ? setQuitar : undefined}
              accionesAlergias={puedeEditar && <Boton pequeno variante="secundario" texto="Agregar" onPress={() => abrir("alergia")} />}
              accionesAntecedentes={puedeEditar && <Boton pequeno variante="secundario" texto="Agregar" onPress={() => abrir("antecedente")} />}
              accionesNotas={puedeEditar && <Boton pequeno variante="secundario" texto="Agregar" onPress={() => abrir("nota")} />}
            />
            {rolId === 2 && (
              <View style={{ gap: 8 }}>
                <Boton texto="Transferir paciente a otro médico" variante="secundario" onPress={() => abrir("transferir")} />
                <Boton texto="Volver a mis pacientes" variante="secundario" onPress={() => router.replace("/doctor/pacientes")} />
              </View>
            )}
          </>
        )
      )}

      <ModalBase visible={modal === "alergia"} titulo="Agregar alergia" onClose={() => setModal(null)}>
        {!!errorModal && <Aviso tipo="error" texto={errorModal} />}
        <Campo etiqueta="Alergia" value={alergia} onChangeText={setAlergia} placeholder="Ej. Penicilina" />
        <Opciones valor={severidad} onChange={setSeveridad} opciones={[{ valor: "leve", etiqueta: "Leve" }, { valor: "moderada", etiqueta: "Moderada" }, { valor: "grave", etiqueta: "Grave" }]} />
        <View style={{ height: 12 }} />
        <Boton texto="Guardar" onPress={guardarAlergia} cargando={enviando} />
      </ModalBase>

      <ModalBase visible={modal === "antecedente"} titulo="Agregar antecedente" onClose={() => setModal(null)}>
        {!!errorModal && <Aviso tipo="error" texto={errorModal} />}
        <Campo etiqueta="Diagnóstico" value={diagnostico} onChangeText={setDiagnostico} />
        <Campo etiqueta="Descripción" value={descripcion} onChangeText={setDescripcion} multiline />
        <Campo etiqueta="Tratamiento" value={tratamiento} onChangeText={setTratamiento} />
        <Campo etiqueta="Tipo de sangre" value={sangre} onChangeText={setSangre} placeholder="Ej. O+" />
        <Boton texto="Guardar" onPress={guardarAntecedente} cargando={enviando} />
      </ModalBase>

      <ModalBase visible={modal === "nota"} titulo="Nueva nota" onClose={() => setModal(null)}>
        {!!errorModal && <Aviso tipo="error" texto={errorModal} />}
        <Campo etiqueta="Nota" value={nota} onChangeText={setNota} multiline />
        <Boton texto="Guardar" onPress={guardarNota} cargando={enviando} />
      </ModalBase>

      <ModalBase visible={modal === "transferir"} titulo="Transferir paciente" onClose={() => setModal(null)}>
        {!!errorModal && <Aviso tipo="error" texto={errorModal} />}
        <Text style={s.ayuda}>
          El nuevo médico tendrá acceso al expediente. Tus citas futuras con este paciente pasarán a su agenda.
        </Text>
        {doctores.map((d) => (
          <Pressable key={d.id_PK} onPress={() => setDestino(d.id_PK)} style={[s.doctor, destino === d.id_PK && s.doctorActivo]}>
            <Text style={s.doctorNombre}>{d.nombre}</Text>
            {!!d.especialidad && <Text style={s.ayuda}>{d.especialidad}</Text>}
          </Pressable>
        ))}
        <Campo etiqueta="Motivo (opcional)" value={motivo} onChangeText={setMotivo} multiline />
        <Boton texto="Transferir" onPress={transferir} cargando={enviando} deshabilitado={!destino} />
      </ModalBase>

      <ConfirmarModal
        visible={quitar !== null}
        titulo="Quitar alergia"
        mensaje="Se eliminará esta alergia del expediente del paciente."
        textoConfirmar="Quitar"
        cargando={enviando}
        onConfirmar={confirmarQuitar}
        onCancelar={() => setQuitar(null)}
      />
    </PantallaC2>
  );
}

const s = StyleSheet.create({
  ayuda: { fontSize: 12.5, color: C.texto2, marginBottom: 8 },
  doctor: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: C.borde, marginBottom: 6 },
  doctorActivo: { borderColor: C.primario, backgroundColor: C.primarioSuave },
  doctorNombre: { fontSize: 14, fontWeight: "700", color: C.texto },
});
