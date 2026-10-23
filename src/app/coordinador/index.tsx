import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../../context/AuthContext";

type Acceso = {
  ruta: "/admin/salas" | "/admin/auditoria" | "/admin/reportes" | "/admin/usuarios" | "/admin/especialidades" | "/admin/doctores" | "/admin/doctores/salas";
  icono: string;
  titulo: string;
  descripcion: string;
};

const ACCESOS: Acceso[] = [
  { ruta: "/admin/salas", icono: "🏥", titulo: "Salas y equipamiento", descripcion: "Consulta y gestiona salas, su estado y los equipos de cada una." },
  { ruta: "/admin/reportes", icono: "📊", titulo: "Reportes", descripcion: "Ocupación, citas por doctor, tiempos de espera, inventario y recetas." },
  { ruta: "/admin/auditoria", icono: "🧾", titulo: "Auditoría", descripcion: "Revisa quién cambió qué y cuándo en el sistema." },
  { ruta: "/admin/usuarios", icono: "👥", titulo: "Gestión de usuarios", descripcion: "Administra médicos, pacientes y personal de recepción." },
  { ruta: "/admin/especialidades", icono: "🩺", titulo: "Especialidades médicas", descripcion: "Mantén actualizado el catálogo de especialidades." },
  { ruta: "/admin/doctores/salas", icono: "🗓️", titulo: "Salas por doctor", descripcion: "Asigna salas y horarios de uso a cada médico." },
  { ruta: "/admin/doctores", icono: "📋", titulo: "Médicos y contratos", descripcion: "Perfiles de médicos y consulta de contratos." },
];

export default function CoordinadorScreen() {
  const router = useRouter();
  const { usuario } = useAuth();

  const saludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Buenos días";
    if (hora < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{saludo()}</Text>
          <Text style={styles.name}>{usuario?.nombre || "Coordinador"}</Text>
          <Text style={styles.role}>Coordinación operativa</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{usuario?.nombre?.charAt(0)?.toUpperCase() || "C"}</Text>
        </View>
      </View>

      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeSmall}>BIENVENIDO A</Text>
        <Text style={styles.welcomeTitle}>VITALIA</Text>
        <Text style={styles.welcomeDescription}>
          Panel de coordinación para supervisar salas, reportes, auditoría y el personal de la clínica.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Accesos rápidos</Text>

      {ACCESOS.map((a) => (
        <Pressable
          key={a.ruta}
          style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
          onPress={() => router.push(a.ruta)}
        >
          <View style={styles.actionIcon}>
            <Text style={styles.actionIconText}>{a.icono}</Text>
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>{a.titulo}</Text>
            <Text style={styles.actionDescription}>{a.descripcion}</Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FAF8" },
  content: { padding: 30, paddingBottom: 50, maxWidth: 1100, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  greeting: { fontSize: 14, color: "#82938F" },
  name: { fontSize: 28, fontWeight: "800", color: "#173F3A" },
  role: { fontSize: 13, color: "#2A8C82", fontWeight: "600", marginTop: 4 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#DDF3EF", justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 20, fontWeight: "800", color: "#247F76" },
  welcomeCard: { borderRadius: 24, backgroundColor: "#247F76", padding: 30, marginBottom: 20 },
  welcomeSmall: { fontSize: 11, fontWeight: "800", color: "#BDE5DF" },
  welcomeTitle: { fontSize: 34, fontWeight: "900", color: "#FFFFFF" },
  welcomeDescription: { fontSize: 14, color: "#DCEFEB", marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#173F3A", marginVertical: 14 },
  actionCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E4EEEB", marginBottom: 12 },
  actionCardPressed: { opacity: 0.85 },
  actionIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#E2F4F0", alignItems: "center", justifyContent: "center", marginRight: 14 },
  actionIconText: { fontSize: 22 },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 14, fontWeight: "800", color: "#26443F" },
  actionDescription: { fontSize: 11, color: "#879691", marginTop: 4 },
  actionArrow: { fontSize: 22, color: "#247F76" },
});
