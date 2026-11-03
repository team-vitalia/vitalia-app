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
import {
  getInventario,
  registrarLoteInventario,
  getMedicamentos,
  registrarMedicamento,
  actualizarLoteInventario,
} from "../../services/almacenService";

export default function ControlInventarioScreen() {
  const router = useRouter();

  const [inventario, setInventario] = useState<any[]>([]);
  const [medicamentos, setMedicamentos] = useState<any[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"lote" | "medicamento" | "editar-lote">("lote");
  const [medSeleccionado, setMedSeleccionado] = useState<number | null>(null);
  const [loteEditando, setLoteEditando] = useState<any | null>(null);
  const [numeroLote, setNumeroLote] = useState<string>("");
  const [stockActual, setStockActual] = useState<string>("");
  const [ubicacion, setUbicacion] = useState<string>("");
  const [nombreMedicamento, setNombreMedicamento] = useState<string>("");
  const [principioActivo, setPrincipioActivo] = useState<string>("");
  const [presentacion, setPresentacion] = useState<string>("");
  const [categoria, setCategoria] = useState<string>("");
  const [codigoBarras, setCodigoBarras] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [requiereReceta, setRequiereReceta] = useState<boolean>(false);
  const [guardando, setGuardando] = useState<boolean>(false);

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

    const datosLote = {
        medicamento_id_FK: medSeleccionado,
        numero_lote: numeroLote,
        stock_actual: parseInt(stockActual, 10),
        ubicacion: ubicacion || undefined,
        fecha_vencimiento: loteEditando?.fecha_vencimiento,
        precio_venta: loteEditando?.precio_venta,
        proveedor_id_FK: loteEditando?.proveedor_id_FK,
        fecha_recepcion: loteEditando?.fecha_recepcion,
      };

    try {
      setGuardando(true);
      if (modalMode === "editar-lote" && loteEditando) {
        await actualizarLoteInventario(loteEditando.id_PK, datosLote);
      } else {
        await registrarLoteInventario(datosLote);
      }

      Alert.alert(
        "Éxito",
        modalMode === "editar-lote"
          ? "Lote actualizado correctamente."
          : "Lote registrado correctamente en el almacén."
      );
      setModalVisible(false);
      setNumeroLote("");
      setStockActual("");
      setUbicacion("");
      setMedSeleccionado(null);
      setLoteEditando(null);
      cargarDatos();
    } catch (error: any) {
      console.warn("Error al registrar lote:", error);
      Alert.alert(
        "Error",
        error?.response?.data?.detail || "No se pudo guardar el lote de inventario."
      );
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicionLote = (item: any) => {
    setLoteEditando(item);
    setMedSeleccionado(Number(item.medicamento_id_FK));
    setNumeroLote(item.numero_lote || "");
    setStockActual(String(item.stock_actual ?? ""));
    setUbicacion(item.ubicacion || "");
    setModalMode("editar-lote");
    setModalVisible(true);
  };

  const handleGuardarMedicamento = async () => {
    if (!nombreMedicamento.trim()) {
      Alert.alert("Campo requerido", "Escribe el nombre del medicamento.");
      return;
    }

    try {
      setGuardando(true);
      const nuevoMedicamento = await registrarMedicamento({
        nombre: nombreMedicamento,
        principio_activo: principioActivo,
        presentacion,
        categoria,
        codigo_barras: codigoBarras,
        descripcion,
        requiere_receta: requiereReceta,
      });

      setMedicamentos((actuales) =>
        [...actuales, nuevoMedicamento].sort((a, b) =>
          a.nombre.localeCompare(b.nombre)
        )
      );
      setMedSeleccionado(nuevoMedicamento.id_PK);
      setNombreMedicamento("");
      setPrincipioActivo("");
      setPresentacion("");
      setCategoria("");
      setCodigoBarras("");
      setDescripcion("");
      setRequiereReceta(false);
      setModalMode("lote");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.detail || "No se pudo guardar el medicamento."
      );
    } finally {
      setGuardando(false);
    }
  };

  const volverAlPanel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/admin");
    }
  };

  const medicamentosPorId = new Map(
    medicamentos.map((medicamento) => [Number(medicamento.id_PK), medicamento])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={volverAlPanel} style={styles.backButton}>
        <Text style={styles.backText}>← Volver al panel</Text>
      </Pressable>

      <Text style={styles.title}>Control de Inventario y Almacén</Text>
      <Text style={styles.subtitle}>
        Supervisa existencias, lotes y registra nuevas entradas de insumos.
      </Text>

      <Pressable
        style={styles.btnAgregar}
        onPress={() => {
          setModalMode("lote");
          setModalVisible(true);
        }}
      >
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
          const medicamento =
            item.medicamento || medicamentosPorId.get(Number(item.medicamento_id_FK));
          return (
            <View key={item.id_PK} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {medicamento?.nombre || `Medicamento #${item.medicamento_id_FK}`}
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
              <View style={styles.cardActions}>
                <Pressable
                  style={styles.editButton}
                  onPress={() => iniciarEdicionLote(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar lote ${item.numero_lote || item.id_PK}`}
                >
                  <Text style={styles.editButtonText}>Editar lote</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentInner}
            keyboardShouldPersistTaps="handled"
          >
            {modalMode !== "medicamento" ? (
              <>
                <Text style={styles.modalTitle}>
                  {modalMode === "editar-lote" ? "Editar Lote de Inventario" : "Registrar Lote de Inventario"}
                </Text>

                <Text style={styles.label}>Selecciona Medicamento:</Text>
                {medicamentos.length === 0 ? (
                  <View style={styles.catalogoVacio}>
                    <Text style={styles.catalogoVacioText}>
                      Aún no hay medicamentos en el catálogo.
                    </Text>
                    <Pressable
                      style={styles.btnAgregarSecundario}
                      onPress={() => setModalMode("medicamento")}
                    >
                      <Text style={styles.btnAgregarSecundarioText}>Agregar medicamento</Text>
                    </Pressable>
                  </View>
                ) : (
                  <ScrollView style={styles.medList} nestedScrollEnabled>
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
                        {!!m.presentacion && (
                          <Text style={medSeleccionado === m.id_PK ? styles.medSubSelected : styles.medSub}>
                            {m.presentacion}
                          </Text>
                        )}
                      </Pressable>
                    ))}
                  </ScrollView>
                )}

                {modalMode === "lote" && medicamentos.length > 0 && (
                  <Pressable
                    style={styles.linkAgregarMedicamento}
                    onPress={() => setModalMode("medicamento")}
                  >
                    <Text style={styles.linkAgregarMedicamentoText}>+ Agregar medicamento nuevo</Text>
                  </Pressable>
                )}

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
                    disabled={guardando}
                  >
                    <Text style={styles.btnTextCancelar}>Cancelar</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.btnModal, styles.btnGuardar, guardando && styles.btnDisabled]}
                    onPress={handleGuardarLote}
                    disabled={guardando}
                  >
                    <Text style={styles.btnTextGuardar}>
                      {guardando
                        ? "Guardando..."
                        : modalMode === "editar-lote"
                          ? "Guardar cambios"
                          : "Guardar Lote"}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Pressable onPress={() => setModalMode("lote")} style={styles.backToLot}>
                  <Text style={styles.backToLotText}>← Volver al lote</Text>
                </Pressable>
                <Text style={styles.modalTitle}>Agregar Medicamento</Text>
                <Text style={styles.helperText}>El nombre es obligatorio; los demás datos son opcionales.</Text>

                <Text style={styles.label}>Nombre *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Paracetamol"
                  value={nombreMedicamento}
                  onChangeText={setNombreMedicamento}
                  maxLength={200}
                />

                <Text style={styles.label}>Principio activo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Paracetamol"
                  value={principioActivo}
                  onChangeText={setPrincipioActivo}
                  maxLength={200}
                />

                <Text style={styles.label}>Presentación</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 500 mg, caja con 20 tabletas"
                  value={presentacion}
                  onChangeText={setPresentacion}
                  maxLength={100}
                />

                <Text style={styles.label}>Categoría</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Analgésico"
                  value={categoria}
                  onChangeText={setCategoria}
                  maxLength={100}
                />

                <Text style={styles.label}>Código de barras</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Opcional"
                  value={codigoBarras}
                  onChangeText={setCodigoBarras}
                  maxLength={100}
                />

                <Text style={styles.label}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.descriptionInput]}
                  placeholder="Opcional"
                  value={descripcion}
                  onChangeText={setDescripcion}
                  multiline
                  textAlignVertical="top"
                />

                <Text style={styles.label}>¿Requiere receta?</Text>
                <View style={styles.recipeToggle}>
                  {[false, true].map((value) => (
                    <Pressable
                      key={String(value)}
                      style={[
                        styles.recipeOption,
                        requiereReceta === value && styles.recipeOptionSelected,
                      ]}
                      onPress={() => setRequiereReceta(value)}
                    >
                      <Text
                        style={[
                          styles.recipeOptionText,
                          requiereReceta === value && styles.recipeOptionTextSelected,
                        ]}
                      >
                        {value ? "Sí" : "No"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.modalButtons}>
                  <Pressable
                    style={[styles.btnModal, styles.btnCancelar]}
                    onPress={() => setModalVisible(false)}
                    disabled={guardando}
                  >
                    <Text style={styles.btnTextCancelar}>Cancelar</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.btnModal, styles.btnGuardar, guardando && styles.btnDisabled]}
                    onPress={handleGuardarMedicamento}
                    disabled={guardando}
                  >
                    <Text style={styles.btnTextGuardar}>
                      {guardando ? "Guardando..." : "Guardar y continuar"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
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
  cardActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  editButton: { borderWidth: 1, borderColor: "#247F76", borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12 },
  editButtonText: { color: "#247F76", fontSize: 13, fontWeight: "700" },
  bold: { fontWeight: "bold" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeSuccess: { backgroundColor: "#E2F4F0" },
  badgeWarning: { backgroundColor: "#FFEBE9" },
  badgeText: { fontSize: 11, fontWeight: "bold" },
  badgeTextSuccess: { color: "#247F76" },
  badgeTextWarning: { color: "#CF222E" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#FFF", borderRadius: 18, maxHeight: "90%" },
  modalContentInner: { padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#173F3A", marginBottom: 15 },
  helperText: { fontSize: 12, color: "#82938F", marginTop: -10, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "700", color: "#526360", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#E4EEEB", borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 14 },
  descriptionInput: { minHeight: 72 },
  catalogoVacio: { borderWidth: 1, borderStyle: "dashed", borderColor: "#B8CCC7", borderRadius: 8, padding: 12, marginBottom: 12 },
  catalogoVacioText: { color: "#526360", fontSize: 13, marginBottom: 10 },
  btnAgregarSecundario: { alignSelf: "flex-start", borderWidth: 1, borderColor: "#247F76", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  btnAgregarSecundarioText: { color: "#247F76", fontWeight: "700", fontSize: 13 },
  linkAgregarMedicamento: { alignSelf: "flex-start", paddingVertical: 4, marginBottom: 12 },
  linkAgregarMedicamentoText: { color: "#247F76", fontWeight: "700", fontSize: 13 },
  medList: { maxHeight: 120, marginBottom: 4 },
  medOption: { padding: 8, borderRadius: 6, borderWidth: 1, borderColor: "#E4EEEB", marginBottom: 4 },
  medOptionSelected: { backgroundColor: "#247F76", borderColor: "#247F76" },
  medSub: { color: "#82938F", fontSize: 11, marginTop: 2 },
  medSubSelected: { color: "#E2F4F0", fontSize: 11, marginTop: 2 },
  textWhite: { color: "#FFF", fontWeight: "bold" },
  textDark: { color: "#173F3A" },
  backToLot: { alignSelf: "flex-start", marginBottom: 12 },
  backToLotText: { color: "#247F76", fontWeight: "700" },
  recipeToggle: { flexDirection: "row", gap: 8, marginBottom: 12 },
  recipeOption: { borderWidth: 1, borderColor: "#E4EEEB", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  recipeOptionSelected: { backgroundColor: "#247F76", borderColor: "#247F76" },
  recipeOptionText: { color: "#526360", fontWeight: "700" },
  recipeOptionTextSelected: { color: "#FFF" },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 15 },
  btnModal: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  btnCancelar: { backgroundColor: "#E4EEEB" },
  btnGuardar: { backgroundColor: "#247F76" },
  btnTextCancelar: { color: "#526360", fontWeight: "bold" },
  btnTextGuardar: { color: "#FFF", fontWeight: "bold" },
  btnDisabled: { opacity: 0.6 },
});
