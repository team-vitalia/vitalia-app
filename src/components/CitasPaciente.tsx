import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme, type Theme } from "../theme/theme";
import { sombra } from "../utils/sombra";

export type CitaPaciente = {
  id_PK: number;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado: string | null;
  motivo: string | null;
  sala_nombre?: string | null;
  sala_piso?: string | null;
  doctor_nombre?: string | null;
  especialidad?: string | null;
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
  const c = useTheme();
  const s = useMemo(() => createStyles(c), [c]);
  
  if (citas.length === 0) {
    return <Text style={s.vacio}>No tienes citas registradas.</Text>;
  }
  
  return (
    <View>
      {citas.map((cita) => {
        const est = estadoVisible(cita);
        const [y, m, d] = (cita.fecha || "").split("-");
        
        // Lógica para mostrar el doctor, especialidad y sala
        const nombreDoctor = cita.doctor_nombre ? `Dr. ${cita.doctor_nombre}` : "Doctor por asignar";
        const especialidad = cita.especialidad || "Medicina General";
        const ubicacionSala = cita.sala_nombre 
          ? `${cita.sala_nombre}${cita.sala_piso ? ` - Piso ${cita.sala_piso}` : ""}` 
          : "Consultorio por asignar";

        return (
          <View key={cita.id_PK} style={s.tarjeta}>
            <View style={{ flex: 1 }}>
              {/* Fecha y Hora */}
              <Text style={s.fecha}>
                {d && m && y ? `${d}/${m}/${y}` : "Sin fecha"} · {(cita.hora_inicio || "").slice(0, 5)}
                {cita.hora_fin ? ` – ${cita.hora_fin.slice(0, 5)}` : ""}
              </Text>
              
              {/* Doctor y Especialidad */}
              <View style={s.filaInfo}>
                <View style={[s.iconoFondo, { backgroundColor: (c.primary || "#005f4b") + "15" }]}>
                  <Ionicons name="person" size={12} color={c.primary || "#005f4b"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.tituloInfo}>{nombreDoctor}</Text>
                  <Text style={s.detalle}>{especialidad}</Text>
                </View>
              </View>

              {/* Ubicación / Sala */}
              <View style={s.filaInfo}>
                <View style={[s.iconoFondo, { backgroundColor: (c.info || "#1D4ED8") + "15" }]}>
                  <Ionicons name="location" size={12} color={c.info || "#1D4ED8"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.tituloInfo}>Ubicación</Text>
                  <Text style={s.detalle}>{ubicacionSala}</Text>
                </View>
              </View>

              {/* Motivo */}
              {!!cita.motivo && (
                <View style={s.motivoBox}>
                  <Text style={s.detalle}>
                    <Text style={{ fontWeight: "700", color: c.text }}>Motivo: </Text>
                    {cita.motivo}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Etiqueta de Estado */}
            <View style={[s.badge, { backgroundColor: est.fondo, alignSelf: 'flex-start' }]}>
              <Text style={[s.badgeTexto, { color: est.color }]}>{est.texto}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (c: Theme) => StyleSheet.create({
  vacio: { fontSize: 13, color: c.muted },
  tarjeta: { 
    flexDirection: "row", 
    alignItems: "flex-start", // Alineado arriba para que el badge no se centre si hay mucho texto
    gap: 10, 
    backgroundColor: c.card, 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: c.border, 
    marginBottom: 12,
    ...sombra({ color: "#000", x: 0, y: 2, opacity: 0.05, radius: 8, elevation: 2 }),
  },
  fecha: { fontSize: 14, fontWeight: "800", color: c.text, marginBottom: 8 },
  filaInfo: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 10, 
    marginBottom: 10 
  },
  iconoFondo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tituloInfo: { fontSize: 13, fontWeight: "700", color: c.text },
  detalle: { fontSize: 12, color: c.muted, marginTop: 2 },
  motivoBox: {
    backgroundColor: c.bg,
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  badge: { 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 999 
  },
  badgeTexto: { fontSize: 11, fontWeight: "800" },
});