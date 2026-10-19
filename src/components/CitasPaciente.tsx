import { StyleSheet, Text, View } from "react-native";

export type CitaPaciente = {
  id_PK: number;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado: string | null;
  motivo: string | null;
  sala_nombre?: string | null;
  no_realizada?: boolean;
};

const ETIQUETAS: Record<string, string> = {
  programada: "Programada",
  confirmada: "Confirmada",
  en_curso: "En curso",
  completada: "Realizada",
  cancelada: "Cancelada",
  no_asistio: "No asististe",
};

export function estadoVisible(c: CitaPaciente): { texto: string; fondo: string; color: string } {
  const e = (c.estado || "").toLowerCase();
  if (e === "completada") return { texto: ETIQUETAS.completada, fondo: "#DDF3EF", color: "#247F76" };
  if (e === "cancelada") return { texto: ETIQUETAS.cancelada, fondo: "#FEE4E2", color: "#B42318" };
  if (e === "no_asistio") return { texto: ETIQUETAS.no_asistio, fondo: "#FEE4E2", color: "#B42318" };
  if (c.no_realizada) return { texto: "No se realizó", fondo: "#FEF0C7", color: "#B54708" };
  return { texto: ETIQUETAS[e] ?? (c.estado || "Programada"), fondo: "#E0EDFF", color: "#1D4ED8" };
}

export function esProxima(c: CitaPaciente): boolean {
  const e = (c.estado || "").toLowerCase();
  return !c.no_realizada && e !== "completada" && e !== "cancelada" && e !== "no_asistio";
}

export default function CitasPaciente({ citas }: { citas: CitaPaciente[] }) {
  if (citas.length === 0) {
    return <Text style={s.vacio}>No tienes citas registradas.</Text>;
  }
  return (
    <View>
      {citas.map((c) => {
        const est = estadoVisible(c);
        const [y, m, d] = (c.fecha || "").split("-");
        return (
          <View key={c.id_PK} style={s.tarjeta}>
            <View style={{ flex: 1 }}>
              <Text style={s.fecha}>
                {d && m && y ? `${d}/${m}/${y}` : "Sin fecha"} · {(c.hora_inicio || "").slice(0, 5)}
                {c.hora_fin ? ` – ${c.hora_fin.slice(0, 5)}` : ""}
              </Text>
              {!!c.motivo && <Text style={s.detalle}>{c.motivo}</Text>}
              {!!c.sala_nombre && <Text style={s.detalle}>Sala: {c.sala_nombre}</Text>}
            </View>
            <View style={[s.badge, { backgroundColor: est.fondo }]}>
              <Text style={[s.badgeTexto, { color: est.color }]}>{est.texto}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  vacio: { fontSize: 13, color: "#879691" },
  tarjeta: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E4EEEB", marginBottom: 10 },
  fecha: { fontSize: 14, fontWeight: "800", color: "#26443F" },
  detalle: { fontSize: 11, color: "#879691", marginTop: 3 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeTexto: { fontSize: 11, fontWeight: "800" },
});
