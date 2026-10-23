import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { AsignacionSala, hhmm, mensajeError, misSalas, nombreDia } from "../services/c2Service";

/** Salas asignadas al doctor autenticado con su horario de uso. */
export default function SalasDoctor() {
  const { token } = useAuth();
  const [salas, setSalas] = useState<AsignacionSala[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    misSalas(token)
      .then(setSalas)
      .catch((e) => setError(mensajeError(e, "No se pudieron cargar tus salas.")))
      .finally(() => setCargando(false));
  }, [token]);

  // Agrupa por sala
  const porSala = salas.reduce<Record<number, AsignacionSala[]>>((acc, a) => {
    (acc[a.sala_id_FK] ??= []).push(a);
    return acc;
  }, {});

  return (
    <View style={s.contenedor}>
      <Text style={s.titulo}>Mis salas y horario de uso</Text>
      {cargando ? (
        <ActivityIndicator color="#247F76" />
      ) : error ? (
        <Text style={s.error}>{error}</Text>
      ) : salas.length === 0 ? (
        <Text style={s.vacio}>Aún no tienes salas asignadas. Contacta a coordinación.</Text>
      ) : (
        Object.values(porSala).map((lista) => (
          <View key={lista[0].sala_id_FK} style={s.tarjeta}>
            <Text style={s.sala}>{lista[0].sala_nombre}</Text>
            <Text style={s.detalle}>
              {[lista[0].sala_tipo, lista[0].sala_piso ? `Piso ${lista[0].sala_piso}` : null, lista[0].sala_estado]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            {lista.map((a) => (
              <Text key={a.id_PK} style={s.horario}>
                {nombreDia(a.dia_semana)}: {hhmm(a.hora_inicio)} – {hhmm(a.hora_fin)}
              </Text>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

const s = StyleSheet.create({
  contenedor: { marginBottom: 20 },
  titulo: { fontSize: 18, fontWeight: "800", color: "#173F3A", marginVertical: 14 },
  tarjeta: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E4EEEB", marginBottom: 10 },
  sala: { fontSize: 15, fontWeight: "800", color: "#26443F" },
  detalle: { fontSize: 11, color: "#879691", marginTop: 2, marginBottom: 6 },
  horario: { fontSize: 13, color: "#247F76", fontWeight: "600", marginTop: 2 },
  vacio: { fontSize: 13, color: "#879691" },
  error: { fontSize: 13, color: "#B42318" },
});
