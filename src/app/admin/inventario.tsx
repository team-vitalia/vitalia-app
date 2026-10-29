import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { getInventario, registrarLoteInventario, getMedicamentos } from "../../services/almacenService";

export default function ControlInventarioScreen() {
  const router = useRouter();

  const [inventario, setInventario] = useState<any[]>([]);
  const [medicamentos, setMedicamentos] = useState<any[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [medSeleccionado, setMedSeleccionado] = useState<number | null>(null);
  const [numeroLote, setNumeroLote] = useState<string>("");
  const [stockActual, setStockActual] = useState<string>("");
  const [ubicacion, setUbicacion] = useState<string>("");

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [invData, medsData] = await Promise.all([
        getInventario(),
        getMedicamentos(),
      ]);
      setInventario(invData);
      setMedicamentos(medsData);
    } catch (error) {
      console.warn("Error al cargar datos del almacén:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleGuardarLote = async () => {
    if (!medSeleccionado || !numeroLote || !stockActual) {
      Alert.alert("Campos requeridos", "Por favor completa el medicamento, lote y stock.");
      return;
    }

    try {
      await registrarLoteInventario({
        medicamento_id_FK: medSeleccionado,
        numero_lote: numeroLote,
        stock_actual: parseInt(stockActual, 10),
        ubicacion: ubicacion || undefined,
      });

      Alert.alert("Éxito", "Lote registrado correctamente en el almacén.");
      setModalVisible(false);
      setNumeroLote("");
      setStockActual("");
      setUbicacion("");
      setMedSeleccionado(null);
      cargarDatos();
    } catch (error) {
      console.warn("Error al registrar lote:", error);
      Alert.alert("Error", "No se pudo guardar el lote de inventario.");
    }
  };

  const volverAlPanel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/admin");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={volverAlPanel} style={styles.backButton}>
        <Text style={styles.backText}>← Volver al panel</Text>
      </Pressable>

      <Text style={styles.title}>Control de Inventario y Almacén</Text>
      <Text style={styles.subtitle}>
        Supervisa existencias, lotes y registra nuevas entradas de insumos.
      </Text>

      <Pressable style={styles.btnAgregar} onPress={() => setModalVisible(true)}>
        <Text style={styles.btnAgregarText}>+ Registrar Entrada de Lote</Text>
      </Pressable>

      <Text style={styles.sectionHeader}>Existencias Actuales</Text>

      {cargando ? (
        <ActivityIndicator size="large" color="#247F76" style={{ marginTop: 20 }} />
      ) : inventario.length === 0 ? (
        <Text style={styles.emptyText}>No hay registros de inventario en almacén.</Text>
      ) : (
        inventario.map((item) => {
          const esBajoStock = item.stock_actual < 10;
          return (
            <View key={item.id_PK} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {item.medicamento?.nombre || `Medicamento #${item.medicamento_id_FK}`}
                </Text>
                <View
                  style={[
                    styles.badge,
                    esBajoStock ? styles.badgeWarning : styles.badgeSuccess,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      esBajoStock ? styles.badgeTextWarning : styles.badgeTextSuccess,
                    ]}
                  >
                    {esBajoStock ? "Stock Bajo" : "Disponible"}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardDetail}>
                Lote: <Text style={styles.bold}>{item.numero_lote || "N/A"}</Text>
              </Text>
              <Text style={styles.cardDetail}>
                Cantidad disponible: <Text style={styles.bold}>{item.stock_actual} unidades</Text>
              </Text>
              {item.ubicacion && (
                <Text style={styles.cardDetail}>
                  Ubicación en almacén: {item.ubicacion}
                </Text>
              )}
            </View>
          );
        })
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Registrar Lote de Inventario</Text>

            <Text style={styles.label}>Selecciona Medicamento:</Text>
            <ScrollView style={{ maxHeight: 120, marginBottom: 10 }}>
              {medicamentos.map((m) => (
                <Pressable
                  key={m.id_PK}
                  style={[
                    styles.medOption,
                    medSeleccionado === m.id_PK && styles.medOptionSelected,
                  ]}
                  onPress={() => setMedSeleccionado(m.id_PK)}
                >
                  <Text style={medSeleccionado === m.id_PK ? styles.textWhite : styles.textDark}>
                    {m.nombre}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Número de Lote:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. LOT-2026-A"
              value={numeroLote}
              onChangeText={setNumeroLote}
            />

            <Text style={styles.label}>Cantidad / Stock Inicial:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 50"
              keyboardType="numeric"
              value={stockActual}
              onChangeText={setStockActual}
            />

            <Text style={styles.label}>Ubicación en Almacén (Opcional):</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Estante B3"
              value={ubicacion}
              onChangeText={setUbicacion}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.btnModal, styles.btnCancelar]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnTextCancelar}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.btnModal, styles.btnGuardar]}
                onPress={handleGuardarLote}
              >
                <Text style={styles.btnTextGuardar}>Guardar Lote</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FAF8" },
  content: { padding: 20 },
  backButton: { marginBottom: 15 },
  backText: { color: "#247F76", fontWeight: "bold" },
  title: { fontSize: 24, fontWeight: "800", color: "#173F3A" },
  subtitle: { fontSize: 13, color: "#82938F", marginVertical: 6 },
  btnAgregar: { backgroundColor: "#247F76", padding: 14, borderRadius: 12, alignItems: "center", marginVertical: 15 },
  btnAgregarText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 15 },
  sectionHeader: { fontSize: 16, fontWeight: "700", color: "#173F3A", marginBottom: 10 },
  emptyText: { color: "#82938F", fontStyle: "italic", marginTop: 10 },
  card: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 14, borderWidth: 1, borderColor: "#E4EEEB", marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#173F3A" },
  cardDetail: { fontSize: 13, color: "#526360", marginTop: 2 },
  bold: { fontWeight: "bold" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeSuccess: { backgroundColor: "#E2F4F0" },
  badgeWarning: { backgroundColor: "#FFEBE9" },
  badgeText: { fontSize: 11, fontWeight: "bold" },
  badgeTextSuccess: { color: "#247F76" },
  badgeTextWarning: { color: "#CF222E" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#FFF", borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#173F3A", marginBottom: 15 },
  label: { fontSize: 12, fontWeight: "700", color: "#526360", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#E4EEEB", borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 14 },
  medOption: { padding: 8, borderRadius: 6, borderWidth: 1, borderColor: "#E4EEEB", marginBottom: 4 },
  medOptionSelected: { backgroundColor: "#247F76", borderColor: "#247F76" },
  textWhite: { color: "#FFF", fontWeight: "bold" },
  textDark: { color: "#173F3A" },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 15 },
  btnModal: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  btnCancelar: { backgroundColor: "#E4EEEB" },
  btnGuardar: { backgroundColor: "#247F76" },
  btnTextCancelar: { color: "#526360", fontWeight: "bold" },
  btnTextGuardar: { color: "#FFF", fontWeight: "bold" },
});
