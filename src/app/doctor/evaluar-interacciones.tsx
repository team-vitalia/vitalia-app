import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { evaluarInteracciones, getMedicamentos } from "../../services/almacenService";
import { AlertaInteraccion } from "../../components/AlertaInteraccion";
import { BotonAnalisisIA } from "../../components/BotonAnalisisIA";
import { usePlanFeatures } from "../../hooks/usePlanFeatures";
import { MejoraPlanModal } from "../../components/MejoraPlanModal";

export default function EvaluarInteraccionesScreen() {
  const router = useRouter();
  const { canUseAI } = usePlanFeatures();

  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [analizando, setAnalizando] = useState<boolean>(false);
  const [seleccionados, setSeleccionados] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [resultado, setResultado] = useState<{
    tiene_interaccion: boolean;
    detalles: any[];
  }>({ tiene_interaccion: false, detalles: [] });

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const data = await getMedicamentos();
        setCatalogo(data);
      } catch (e) {
        console.error("Error al cargar inventario:", e);
      } finally {
        setCargando(false);
      }
    };
    void cargarDatos();
  }, []);

  const ejecutarAnalisisIA = async () => {
    if (!canUseAI()) {
      setModalVisible(true);
      return;
    }

    if (seleccionados.length < 2) {
      return;
    }

    setAnalizando(true);
    try {
      const ids = seleccionados.map((item) => item.id_PK);
      const res = await evaluarInteracciones(ids);
      setResultado(res);
    } catch (e) {
      console.error("Error al evaluar interacciones con IA:", e);
    } finally {
      setAnalizando(false);
    }
  };

  const toggleSeleccion = (med: any) => {
    if (seleccionados.find((m) => m.id_PK === med.id_PK)) {
      setSeleccionados(seleccionados.filter((m) => m.id_PK !== med.id_PK));
    } else {
      setSeleccionados([...seleccionados, med]);
    }
  };

  const volverAlPanel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/doctor");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={volverAlPanel} style={styles.backButton}>
        <Text style={styles.backText}>← Volver al panel</Text>
      </Pressable>

      <Text style={styles.title}>Evaluador de Interacciones</Text>
      <Text style={styles.subtitle}>
        Selecciona 2 o más medicamentos para analizar incompatibilidades farmacológicas con IA.
      </Text>

      <AlertaInteraccion resultado={resultado} />

      <View style={styles.actionRow}>
        <BotonAnalisisIA
          onEjecutarAnalisis={ejecutarAnalisisIA}
          disabled={seleccionados.length < 2}
          cargando={analizando}
          texto="Análisis IA"
          testID="btn-analisis-ia"
        />
      </View>

      <Text style={styles.sectionHeader}>
        Fármacos a evaluar ({seleccionados.length})
      </Text>
      <View style={styles.chipContainer}>
        {seleccionados.map((med) => (
          <Pressable
            key={med.id_PK}
            style={styles.chip}
            onPress={() => toggleSeleccion(med)}
          >
            <Text style={styles.chipText}>{med.nombre} ✕</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionHeader}>Catálogo de Almacén</Text>
      {cargando ? (
        <ActivityIndicator size="large" color="#247F76" />
      ) : (
        catalogo.map((item) => {
          const estaSeleccionado = seleccionados.some(
            (m) => m.id_PK === item.id_PK
          );
          return (
            <Pressable
              key={item.id_PK}
              style={[
                styles.itemCard,
                estaSeleccionado && styles.itemCardSelected,
              ]}
              onPress={() => toggleSeleccion(item)}
            >
              <Text style={styles.itemName}>{item.nombre}</Text>
              <Text style={styles.itemSub}>{item.principio_activo}</Text>
            </Pressable>
          );
        })
      )}

      <MejoraPlanModal
        visible={modalVisible}
        funcionBloqueada="Análisis IA"
        onClose={() => setModalVisible(false)}
      />
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
  actionRow: { marginVertical: 14 },
  sectionHeader: { fontSize: 16, fontWeight: "700", color: "#173F3A", marginTop: 14, marginBottom: 8 },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "#247F76", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  chipText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  itemCard: { backgroundColor: "#FFF", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#E4EEEB", marginBottom: 8 },
  itemCardSelected: { borderColor: "#247F76", backgroundColor: "#E2F4F0" },
  itemName: { fontSize: 14, fontWeight: "700", color: "#173F3A" },
  itemSub: { fontSize: 12, color: "#82938F" },
});
