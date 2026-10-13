import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function AdminScreen() {
  const router = useRouter();
  const { usuario } = useAuth();

  const obtenerSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Buenos días";
    if (hora < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{obtenerSaludo()}</Text>
          <Text style={styles.name}>{usuario?.nombre || "Administrador"}</Text>
          <Text style={styles.role}>Administrador de Sistema</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{usuario?.nombre?.charAt(0)?.toUpperCase() || "A"}</Text>
        </View>
      </View>

      <View style={styles.welcomeCard}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeSmall}>BIENVENIDO A</Text>
          <Text style={styles.welcomeTitle}>VITALIA</Text>
          <Text style={styles.welcomeDescription}>
            Panel de control general para gestionar usuarios, contratos, especialidades y almacén.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Accesos rápidos</Text>

      <Pressable style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]} onPress={() => router.push("/admin/usuarios")}>
        <View style={styles.actionIcon}><Text style={styles.actionIconText}>◎</Text></View>
        <View style={styles.actionInfo}>
          <Text style={styles.actionTitle}>Gestión de usuarios</Text>
          <Text style={styles.actionDescription}>Administra médicos, pacientes y personal de recepción.</Text>
        </View>
        <Text style={styles.actionArrow}>→</Text>
      </Pressable>

      <Pressable style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]} onPress={() => router.push("/admin/inventario")}>
        <View style={styles.actionIcon}><Text style={styles.actionIconText}>📦</Text></View>
        <View style={styles.actionInfo}>
          <Text style={styles.actionTitle}>Control de Inventario y Almacén</Text>
          <Text style={styles.actionDescription}>Supervisa existencias, lotes e insumos médicos.</Text>
        </View>
        <Text style={styles.actionArrow}>→</Text>
      </Pressable>

      <Pressable style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]} onPress={() => router.push("/admin/doctores")}>
        <View style={styles.actionIcon}><Text style={styles.actionIconText}>▤</Text></View>
        <View style={styles.actionInfo}>
          <Text style={styles.actionTitle}>Gestión de contratos médicos</Text>
          <Text style={styles.actionDescription}>Registra y consulta contratos del personal médico.</Text>
        </View>
        <Text style={styles.actionArrow}>→</Text>
      </Pressable>
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
  welcomeContent: { flex: 1 },
  welcomeSmall: { fontSize: 11, fontWeight: "800", color: "#BDE5DF" },
  welcomeTitle: { fontSize: 34, fontWeight: "900", color: "#FFFFFF" },
  welcomeDescription: { fontSize: 14, color: "#DCEFEB", marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#173F3A", marginVertical: 14 },
  actionCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E4EEEB", marginBottom: 12 },
  actionCardPressed: { opacity: 0.85 },
  actionIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#E2F4F0", alignItems: "center", justifyContent: "center", marginRight: 14 },
  actionIconText: { fontSize: 22, color: "#247F76" },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 14, fontWeight: "800", color: "#26443F" },
  actionDescription: { fontSize: 11, color: "#879691", marginTop: 4 },
  actionArrow: { fontSize: 22, color: "#247F76" },
});