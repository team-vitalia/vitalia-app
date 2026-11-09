import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import ExpedienteVista from "../../components/ExpedienteVista";
import { Aviso, Cargando, PantallaC2 } from "../../components/c2/ui";
import { mensajeError } from "../../services/c2Service";
import { Expediente, getMiExpediente } from "../../services/clinicoService";

/** Expediente del paciente (solo lectura; sin notas internas del médico). */
export default function MiExpediente() {
  const [exp, setExp] = useState<Expediente | null>(null);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      getMiExpediente()
        .then((e) => (setExp(e), setError("")))
        .catch((e) => setError(mensajeError(e, "No se pudo cargar tu expediente.")));
    }, [])
  );

  return (
    <PantallaC2 titulo="Mi expediente" subtitulo="Información clínica disponible para ti" roles={[3]}>
      {!!error && <Aviso tipo="error" texto={error} />}
      {!exp && !error ? <Cargando /> : exp && <ExpedienteVista exp={exp} />}
    </PantallaC2>
  );
}
