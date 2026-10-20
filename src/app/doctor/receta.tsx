import { FontAwesome } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

interface Medicamento {
  id_PK: number;
  nombre: string;
  presentacion: string | null;
  requiere_receta: boolean | null;
  stock_actual: number; // 👈 Agregado para CU-32
}

interface ItemReceta {
  medicamento_id_FK: number;
  nombre_medicamento: string; // Solo para mostrar en la UI
  dosis: string;
  frecuencia: string;
  duracion: string;
  cantidad: number;
  instrucciones: string;
  via_administracion: string;
}

export default function RecetaScreen() {
  const { pacienteId, citaId } = useLocalSearchParams();
  const { token } = useAuth();

  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Medicamento[]>([]);
  const [buscando, setBuscando] = useState(false);

  const [medicamentoSeleccionado, setMedicamentoSeleccionado] =
    useState<Medicamento | null>(null);

  // Estado para el formulario del medicamento
  const [dosis, setDosis] = useState("");
  const [frecuencia, setFrecuencia] = useState("");
  const [duracion, setDuracion] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [via, setVia] = useState("Oral");

  const [items, setItems] = useState<ItemReceta[]>([]);
  const [guardando, setGuardando] = useState(false);

  const buscarMedicamentos = async (texto: string) => {
    setBusqueda(texto);
    if (texto.length < 3) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    try {
      const res = await api.get(`/api/medicamentos/?q=${texto}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResultados(res.data);
    } catch (error) {
      console.log("Error buscando medicamentos", error);
    } finally {
      setBuscando(false);
    }
  };

  const agregarMedicamento = () => {
    if (!medicamentoSeleccionado) return;
    if (!dosis || !frecuencia || !duracion || !cantidad) {
      Alert.alert(
        "Faltan datos",
        "Por favor llena todos los campos del medicamento.",
      );
      return;
    }

    const nuevoItem: ItemReceta = {
      medicamento_id_FK: medicamentoSeleccionado.id_PK,
      nombre_medicamento: medicamentoSeleccionado.nombre,
      dosis,
      frecuencia,
      duracion,
      cantidad: parseInt(cantidad),
      instrucciones: "",
      via_administracion: via,
    };

    setItems([...items, nuevoItem]);

    // Limpiar formulario
    setMedicamentoSeleccionado(null);
    setBusqueda("");
    setResultados([]);
    setDosis("");
    setFrecuencia("");
    setDuracion("");
    setCantidad("");
  };

  const guardarReceta = async () => {
    if (items.length === 0) {
      Alert.alert(
        "Receta vacía",
        "Agrega al menos un medicamento a la receta.",
      );
      return;
    }

    setGuardando(true);
    try {
      const consulta_id = 1;

      const payload = {
        paciente_id_FK: parseInt(pacienteId as string),
        consulta_id_FK: consulta_id,
        items: items,
      };

      await api.post("/api/recetas/", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert("Éxito", "Receta guardada correctamente.");
      router.replace("/doctor/consultas"); // Volver a la lista
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Error",
        error?.response?.data?.detail || "No se pudo guardar la receta.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome
            name="arrow-left"
            size={13}
            color="#247F76"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.backText}>Volver al Detalle</Text>
        </Pressable>
      </View>

      <Text style={styles.smallTitle}>MÓDULO MÉDICO</Text>
      <Text style={styles.title}>Crear Receta</Text>

      {/* BUSCADOR DE MEDICAMENTOS */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. Buscar Medicamento</Text>
        <View style={styles.searchContainer}>
          <FontAwesome
            name="search"
            size={14}
            color="#82938F"
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Escribe el nombre (ej. Paracetamol)..."
            value={busqueda}
            onChangeText={buscarMedicamentos}
          />
        </View>

        {buscando && (
          <ActivityIndicator color="#247F76" style={{ marginTop: 10 }} />
        )}

        {resultados.length > 0 && !medicamentoSeleccionado && (
          <View style={styles.resultsContainer}>
            {resultados.map((med) => (
              <Pressable
                key={med.id_PK}
                style={styles.resultItem}
                onPress={() => setMedicamentoSeleccionado(med)}
              >
                {/* 👇 MODIFICADO PARA MOSTRAR EL STOCK (CU-32) 👇 */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <Text style={styles.resultText}>
                    {med.nombre} - {med.presentacion}
                  </Text>
                  <Text
                    style={{
                      fontWeight: "bold",
                      color: med.stock_actual > 0 ? "#247F76" : "#D65A5A",
                    }}
                  >
                    Stock: {med.stock_actual}
                  </Text>
                </View>
                {/* 👆 FIN MODIFICACIÓN 👆 */}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* FORMULARIO DE DOSIS (Aparece al seleccionar un medicamento) */}
      {medicamentoSeleccionado && (
        <View style={[styles.card, { borderColor: "#247F76", borderWidth: 2 }]}>
          <Text style={styles.cardTitle}>
            Agregando: {medicamentoSeleccionado.nombre}
          </Text>

          <Text style={styles.label}>Dosis (ej. 1 tableta)</Text>
          <TextInput
            style={styles.input}
            value={dosis}
            onChangeText={setDosis}
          />

          <Text style={styles.label}>Frecuencia (ej. Cada 8 horas)</Text>
          <TextInput
            style={styles.input}
            value={frecuencia}
            onChangeText={setFrecuencia}
          />

          <Text style={styles.label}>Duración (ej. 5 días)</Text>
          <TextInput
            style={styles.input}
            value={duracion}
            onChangeText={setDuracion}
          />

          <Text style={styles.label}>Cantidad total (ej. 15)</Text>
          <TextInput
            style={styles.input}
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Vía de administración</Text>
          <TextInput style={styles.input} value={via} onChangeText={setVia} />

          <View style={styles.formActions}>
            <Pressable
              style={[styles.btn, styles.btnCancel]}
              onPress={() => setMedicamentoSeleccionado(null)}
            >
              <Text style={styles.btnTextCancel}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnSave]}
              onPress={agregarMedicamento}
            >
              <Text style={styles.btnTextSave}>Agregar a la Receta</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* LISTA DE MEDICAMENTOS AGREGADOS */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Medicamentos en la Receta</Text>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>
            Aún no has agregado medicamentos.
          </Text>
        ) : (
          items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <FontAwesome
                name="medkit"
                size={16}
                color="#247F76"
                style={{ marginTop: 4, marginRight: 10 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.nombre_medicamento}</Text>
                <Text style={styles.itemDetail}>
                  {item.dosis} - {item.frecuencia} por {item.duracion}
                </Text>
                <Text style={styles.itemDetail}>
                  Cantidad: {item.cantidad} | Vía: {item.via_administracion}
                </Text>
              </View>
              <Pressable
                onPress={() => setItems(items.filter((_, i) => i !== index))}
              >
                <FontAwesome name="trash" size={16} color="#D65A5A" />
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* BOTÓN GUARDAR */}
      {items.length > 0 && (
        <Pressable
          style={styles.mainButton}
          onPress={guardarReceta}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.mainButtonText}>Guardar Receta Médica</Text>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FAF8" },
  content: {
    padding: 30,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 50,
  },
  header: { marginBottom: 16 },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCEAE6",
  },
  backText: { color: "#247F76", fontSize: 13, fontWeight: "800" },
  smallTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#2A8C82",
    marginBottom: 5,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#173F3A",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#CCE4DD",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#173F3A",
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4FAF8",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 45,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#173F3A" },
  resultsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E8F0EE",
    paddingTop: 10,
  },
  resultItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8F0EE",
  },
  resultText: { fontSize: 14, color: "#31534D", fontWeight: "600" },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#31534D",
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#F8FAFA",
    borderWidth: 1,
    borderColor: "#DCEAE6",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#173F3A",
  },
  formActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  btnCancel: { backgroundColor: "#FFF0EF" },
  btnSave: { backgroundColor: "#247F76" },
  btnTextCancel: { color: "#D65A5A", fontWeight: "800", fontSize: 13 },
  btnTextSave: { color: "#FFF", fontWeight: "800", fontSize: 13 },
  emptyText: { fontSize: 13, color: "#82938F", fontStyle: "italic" },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8F0EE",
  },
  itemName: { fontSize: 14, fontWeight: "800", color: "#173F3A" },
  itemDetail: { fontSize: 12, color: "#667874", marginTop: 2 },
  mainButton: {
    backgroundColor: "#247F76",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  mainButtonText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
