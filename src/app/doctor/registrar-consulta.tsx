import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Aviso, Boton, Campo, fechaValida, PantallaC2, Tarjeta } from "../../components/c2/ui";
import { mensajeError } from "../../services/c2Service";
import { registrarConsulta } from "../../services/clinicoService";

/**
 * Registra la consulta de una cita (diagnóstico, tratamiento, signos vitales).
 * Marca la cita como completada y deja lista la consulta para el expediente y la receta.
 */
export default function RegistrarConsulta() {
  const router = useRouter();
  const { citaId, pacienteId } = useLocalSearchParams<{ citaId: string; pacienteId?: string }>();

  const [diagnostico, setDiagnostico] = useState("");
  const [cie10, setCie10] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [temp, setTemp] = useState("");
  const [presion, setPresion] = useState("");
  const [fc, setFc] = useState("");
  const [peso, setPeso] = useState("");
  const [notas, setNotas] = useState("");
  const [proxima, setProxima] = useState("");
  const [error, setError] = useState("");
  const [guardada, setGuardada] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const guardar = async () => {
    setError("");
    if (!diagnostico.trim() && !tratamiento.trim() && !notas.trim()) {
      return setError("Captura al menos el diagnóstico, el tratamiento o las notas.");
    }
    if (proxima.trim() && !fechaValida(proxima.trim())) return setError("La próxima cita debe tener formato AAAA-MM-DD.");

    const signos: Record<string, string | number> = {};
    if (temp.trim()) signos.temperatura_c = Number(temp);
    if (presion.trim()) signos.presion_arterial = presion.trim();
    if (fc.trim()) signos.frecuencia_cardiaca = Number(fc);
    if (peso.trim()) signos.peso_kg = Number(peso);

    setEnviando(true);
    try {
      await registrarConsulta({
        citaId: Number(citaId),
        diagnostico: diagnostico.trim(),
        tratamiento: tratamiento.trim(),
        notas: notas.trim(),
        codigoCie10: cie10.trim().toUpperCase(),
        signosVitales: signos,
        fechaProximaCita: proxima.trim(),
      });
      setGuardada(true);
    } catch (e) {
      setError(mensajeError(e, "No se pudo registrar la consulta."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PantallaC2 titulo="Registrar consulta" subtitulo={`Cita #${citaId ?? ""}`} roles={[2]}>
      {!!error && <Aviso tipo="error" texto={error} />}
      {guardada ? (
        <Tarjeta style={{ gap: 10 }}>
          <Aviso tipo="ok" texto="Consulta registrada y cita marcada como completada." />
          {!!pacienteId && (
            <Boton
              texto="Crear receta"
              onPress={() => router.replace({ pathname: "/doctor/receta", params: { pacienteId, citaId } })}
            />
          )}
          {!!pacienteId && (
            <Boton texto="Ver expediente" variante="secundario" onPress={() => router.replace({ pathname: "/doctor/expediente", params: { pacienteId } })} />
          )}
          <Boton texto="Volver a mis consultas" variante="secundario" onPress={() => router.replace("/doctor/consultas")} />
        </Tarjeta>
      ) : (
        <Tarjeta>
          <Campo etiqueta="Diagnóstico" value={diagnostico} onChangeText={setDiagnostico} multiline />
          <Campo etiqueta="Código CIE-10 (opcional)" value={cie10} onChangeText={setCie10} placeholder="Ej. J02.9" />
          <Campo etiqueta="Tratamiento / indicaciones" value={tratamiento} onChangeText={setTratamiento} multiline />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Campo etiqueta="Temp. (°C)" value={temp} onChangeText={setTemp} keyboardType="numeric" /></View>
            <View style={{ flex: 1 }}><Campo etiqueta="Presión" value={presion} onChangeText={setPresion} placeholder="120/80" /></View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Campo etiqueta="Frec. cardiaca" value={fc} onChangeText={setFc} keyboardType="numeric" /></View>
            <View style={{ flex: 1 }}><Campo etiqueta="Peso (kg)" value={peso} onChangeText={setPeso} keyboardType="numeric" /></View>
          </View>
          <Campo etiqueta="Notas internas" value={notas} onChangeText={setNotas} multiline ayuda="Solo las ve el personal clínico, no el paciente." />
          <Campo etiqueta="Próxima cita sugerida (opcional)" value={proxima} onChangeText={setProxima} placeholder="AAAA-MM-DD" />
          <Boton texto="Guardar consulta" onPress={guardar} cargando={enviando} />
        </Tarjeta>
      )}
    </PantallaC2>
  );
}
