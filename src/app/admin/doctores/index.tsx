import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import VisorContrato from "@/components/VisorContrato";
import api from "@/services/api";

export default function DoctorScreen() {
  const router = useRouter();
  const { usuario, token } = useAuth();

  const [modalContrato, setModalContrato] = useState(false);
  const [contratoId, setContratoId] = useState<number | null>(null);
  const [urlContrato, setUrlContrato] = useState("");
  const [cargandoContrato, setCargandoContrato] = useState(false);
  const [errorContrato, setErrorContrato] = useState("");

  const obtenerSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Buenos días";
    if (hora < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  const abrirContrato = async () => {
    setModalContrato(true);
    setCargandoContrato(true);
    setErrorContrato("");
    setContratoId(null);
    setUrlContrato("");

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const respuesta = await api.get("/api/contratos/mi-contrato", { headers });

      const contratos = Array.isArray(respuesta.data)
        ? respuesta.data
        : respuesta.data
        ? [respuesta.data]
        : [];

      if (contratos.length === 0) {
        setErrorContrato("No tienes un contrato registrado.");
        return;
      }

      const contrato = [...contratos].sort(
        (a, b) => Number(b.id_PK) - Number(a.id_PK)
      )[0];

      const id = Number(contrato?.id_PK);
      if (!Number.isInteger(id) || id <= 0) {
        setErrorContrato("El servidor no devolvió un ID de contrato válido.");
        return;
      }

      const baseURL = (api.defaults.baseURL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
      setUrlContrato(`${baseURL}/api/contratos/${id}/documento`);
      setContratoId(id);
    } catch (err: any) {
      setErrorContrato("No fue posible consultar tu contrato.");
    } finally {
      setCargandoContrato(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.greeting}>{obtenerSaludo()}</Text>
          <Text style={styles.name}>{usuario?.nombre || "Doctor"}</Text>
          <Text style={styles.role}>Doctor</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{usuario?.nombre?.charAt(0)?.toUpperCase() || "D"}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Accesos rápidos</Text>

      <Pressable style={styles.actionCard} onPress={() => router.push("/doctor/consultas")}>
        <View style={styles.actionIcon}><Text style={styles.actionIconText}>◷</Text></View>
        <View style={styles.actionInfo}>
          <Text style={styles.actionTitle}>Mis consultas</Text>
          <Text style={styles.actionDescription}>Consulta tus citas y pacientes programados.</Text>
        </View>
        <Text style={styles.actionArrow}>→</Text>
      </Pressable>

      <Pressable style={styles.actionCard} onPress={() => router.push("/doctor/evaluar-interacciones")}>
        <View style={styles.actionIcon}><Text style={styles.actionIconText}>💊</Text></View>
        <View style={styles.actionInfo}>
          <Text style={styles.actionTitle}>Evaluador de Interacciones</Text>
          <Text style={styles.actionDescription}>Verifica incompatibilidades farmacológicas entre medicamentos.</Text>
        </View>
        <Text style={styles.actionArrow}>→</Text>
      </Pressable>

      <Pressable style={styles.actionCard} onPress={abrirContrato}>
        <View style={styles.actionIcon}><Text style={styles.actionIconText}>▤</Text></View>
        <View style={styles.actionInfo}>
          <Text style={styles.actionTitle}>Mi contrato</Text>
          <Text style={styles.actionDescription}>Consulta y visualiza tu contrato profesional.</Text>
        </View>
        <Text style={styles.actionArrow}>→</Text>
      </Pressable>

      <Modal visible={modalContrato} animationType="slide" onRequestClose={() => setModalContrato(false)}>
        <View style={styles.container}>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", padding: 16 }}>
            <Pressable onPress={() => setModalContrato(false)}>
              <Text style={styles.role}>Cerrar ✕</Text>
            </Pressable>
          </View>
          {cargandoContrato ? (
            <ActivityIndicator size="large" color="#247F76" style={{ marginTop: 40 }} />
          ) : errorContrato ? (
            <Text style={{ color: "#A83228", textAlign: "center", margin: 24 }}>{errorContrato}</Text>
          ) : contratoId !== null ? (
            <VisorContrato url={urlContrato} token={token ?? ""} />
          ) : null}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FAF8" },
  content: { padding: 30, paddingBottom: 50, maxWidth: 1100, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  headerInfo: { flex: 1 },
  greeting: { fontSize: 14, color: "#82938F" },
  name: { fontSize: 28, fontWeight: "800", color: "#173F3A" },
  role: { fontSize: 13, color: "#2A8C82", fontWeight: "600" },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#DDF3EF", justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 20, fontWeight: "800", color: "#247F76" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#173F3A", marginVertical: 14 },
  actionCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E4EEEB", marginBottom: 12 },
  actionIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#E2F4F0", alignItems: "center", justifyContent: "center", marginRight: 14 },
  actionIconText: { fontSize: 22, color: "#247F76" },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 14, fontWeight: "800", color: "#26443F" },
  actionDescription: { fontSize: 11, color: "#879691", marginTop: 4 },
  actionArrow: { fontSize: 22, color: "#247F76" },
});