import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Aviso,
  Boton,
  C,
  Cargando,
  Etiqueta,
  fechaHora,
  ModalBase,
  PantallaC2,
  Tarjeta,
  Tono,
  Vacio,
} from "../../components/c2/ui";
import {
  dispensarReceta,
  DisponibilidadItem,
  getRecetasPendientes,
  RecetaPendiente,
  verificarQR,
} from "../../services/almacenService";
import { mensajeError } from "../../services/c2Service";

const TONO: Record<DisponibilidadItem["estado"], Tono> = {
  disponible: "ok",
  parcial: "warn",
  no_disponible: "danger",
  dispensado: "neutral",
};
const TEXTO: Record<DisponibilidadItem["estado"], string> = {
  disponible: "Disponible",
  parcial: "Stock parcial",
  no_disponible: "Sin existencias",
  dispensado: "Entregado",
};

const aEntregar = (d: DisponibilidadItem) =>
  Math.min(d.cantidad_pendiente, d.stock_disponible);

export default function Dispensacion() {
  const [recetas, setRecetas] = useState<RecetaPendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const [confirmar, setConfirmar] = useState<RecetaPendiente | null>(null);
  const [enviando, setEnviando] = useState(false);

  // --- ESTADOS DEL ESCÁNER QR ---
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneando, setEscaneando] = useState(false);
  const [buscandoQR, setBuscandoQR] = useState(false);
  const [recetaEscaneada, setRecetaEscaneada] = useState<any | null>(null);

  // Estado para mostrar el error del escaneo en un modal controlado
  const [errorEscaneo, setErrorEscaneo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setRecetas(await getRecetasPendientes());
      setError("");
    } catch (e) {
      setError(
        mensajeError(e, "No se pudieron cargar las recetas pendientes."),
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const dispensar = async () => {
    if (!confirmar) return;
    setEnviando(true);
    setError("");
    try {
      const r = await dispensarReceta(confirmar.id_PK);
      setExito(
        r.completa
          ? `Receta #${r.receta_id} dispensada por completo.`
          : `Receta #${r.receta_id} dispensada parcialmente. Pendiente: ${r.faltantes
              .map((f) => `${f.medicamento} (${f.cantidad_pendiente})`)
              .join(", ")}. Se avisó al médico.`,
      );
      setConfirmar(null);
      setRecetaEscaneada(null);
      await cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo dispensar la receta."));
      setConfirmar(null);
    } finally {
      setEnviando(false);
    }
  };

  // --- LÓGICA DEL ESCÁNER ---
  const abrirEscaner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          "Permiso denegado",
          "Necesitamos acceso a la cámara para escanear el QR.",
        );
        return;
      }
    }
    setErrorEscaneo(null); // Limpiamos errores previos
    setBuscandoQR(false);
    setEscaneando(true);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (buscandoQR) return;
    setBuscandoQR(true);
    setEscaneando(false);

    try {
      const receta = await verificarQR(data);
      setRecetaEscaneada(receta);
    } catch (err: any) {
      // Guardamos el error para mostrarlo en un modal, en lugar de un Alert nativo
      const msg =
        err?.response?.data?.detail ||
        "Código QR no válido o la receta ya expiró.";
      setErrorEscaneo(msg);
    } finally {
      setBuscandoQR(false);
    }
  };

  return (
    <PantallaC2
      titulo="Dispensación de recetas"
      subtitulo="Recetas activas o parcialmente entregadas"
      roles={[1, 6]}
    >
      <View style={{ marginBottom: 16 }}>
        <Boton texto="Escanear Código QR" onPress={abrirEscaner} />
      </View>

      {!!error && <Aviso tipo="error" texto={error} />}
      {!!exito && <Aviso tipo="ok" texto={exito} />}

      {cargando && recetas.length === 0 ? (
        <Cargando />
      ) : recetas.length === 0 ? (
        <Vacio texto="No hay recetas pendientes de dispensar." />
      ) : (
        recetas.map((r) => {
          const algoQueEntregar = r.disponibilidad.some(
            (d) => aEntregar(d) > 0,
          );
          return (
            <Tarjeta key={r.id_PK} style={{ gap: 8 }}>
              <View style={s.cabecera}>
                <Text style={s.titulo}>Receta #{r.id_PK}</Text>
                <Etiqueta
                  texto={
                    r.estado === "dispensada_parcial" ? "Parcial" : "Pendiente"
                  }
                  tono={r.estado === "dispensada_parcial" ? "warn" : "info"}
                />
              </View>
              <Text style={s.sub}>
                {r.paciente ?? "Paciente"} · Dr. {r.doctor ?? "—"} ·{" "}
                {fechaHora(r.creado_en)}
              </Text>

              {r.disponibilidad.map((d) => (
                <View key={d.item_receta_id} style={s.fila}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.item}>
                      {d.medicamento ?? "Medicamento"}
                      {d.presentacion ? ` · ${d.presentacion}` : ""}
                    </Text>
                    <Text style={s.sub}>
                      Pendiente {d.cantidad_pendiente} de {d.cantidad_recetada}{" "}
                      · Stock vigente {d.stock_disponible}
                    </Text>
                  </View>
                  <Etiqueta texto={TEXTO[d.estado]} tono={TONO[d.estado]} />
                </View>
              ))}

              <Boton
                texto={
                  algoQueEntregar
                    ? "Dispensar disponible"
                    : "Sin existencias para entregar"
                }
                deshabilitado={!algoQueEntregar}
                onPress={() => setConfirmar(r)}
              />
            </Tarjeta>
          );
        })
      )}

      {/* MODAL DE CONFIRMACIÓN DE DISPENSACIÓN */}
      <ModalBase
        visible={!!confirmar}
        titulo={`Dispensar receta #${confirmar?.id_PK ?? ""}`}
        onClose={() => setConfirmar(null)}
      >
        <Text style={s.sub}>
          Se descontará del inventario (primero los lotes que vencen antes):
        </Text>
        {confirmar?.disponibilidad
          .filter((d) => aEntregar(d) > 0)
          .map((d) => (
            <Text key={d.item_receta_id} style={s.item}>
              • {d.medicamento}: {aEntregar(d)} u.
              {aEntregar(d) < d.cantidad_pendiente
                ? `  (faltarán ${d.cantidad_pendiente - aEntregar(d)})`
                : ""}
            </Text>
          ))}
        <View style={{ height: 14 }} />
        <View style={s.botones}>
          <Boton
            texto="Cancelar"
            variante="secundario"
            onPress={() => setConfirmar(null)}
            deshabilitado={enviando}
          />
          <Boton
            texto="Confirmar entrega"
            onPress={dispensar}
            cargando={enviando}
          />
        </View>
      </ModalBase>

      {/* MODAL DE LA CÁMARA (ESCÁNER) */}
      <Modal
        visible={escaneando}
        animationType="slide"
        onRequestClose={() => setEscaneando(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={buscandoQR ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
          <View style={s.camaraOverlay}>
            <Text style={s.camaraTexto}>Apunta al código QR de la receta</Text>
            <Boton
              texto="Cancelar"
              variante="secundario"
              onPress={() => setEscaneando(false)}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL DE ERROR AL ESCANEAR (Reemplaza el Alert nativo) */}
      <ModalBase
        visible={!!errorEscaneo}
        titulo="No se puede dispensar"
        onClose={() => setErrorEscaneo(null)}
      >
        <View style={{ alignItems: "center", padding: 20 }}>
          <Ionicons name="alert-circle" size={60} color="#B03A3A" />
          <Text
            style={{
              fontSize: 16,
              textAlign: "center",
              marginTop: 16,
              color: "#B03A3A",
              fontWeight: "bold",
            }}
          >
            {errorEscaneo}
          </Text>
          <View style={{ height: 20 }} />
          <Boton texto="Entendido" onPress={() => setErrorEscaneo(null)} />
        </View>
      </ModalBase>

      {/* MODAL DE RECETA ESCANEADA (CON DISEÑO MEJORADO Y DATOS COMPLETOS) */}
      <ModalBase
        visible={!!recetaEscaneada}
        titulo="Receta Validada"
        onClose={() => setRecetaEscaneada(null)}
      >
        {recetaEscaneada && (
          <ScrollView style={{ maxHeight: 550 }}>
            <View style={s.modalHeader}>
              <View style={s.modalIconBox}>
                <Ionicons name="checkmark-circle" size={40} color="#0F766E" />
              </View>
              <Text style={s.modalTitle}>Receta #{recetaEscaneada.id_PK}</Text>
              <Text style={s.modalSub}>Folio: {recetaEscaneada.codigo_qr}</Text>
            </View>

            <View style={s.modalCard}>
              <Text style={s.modalCardTitle}>Información del Paciente</Text>
              <Text style={s.modalText}>
                <Text style={{ fontWeight: "bold" }}>Paciente:</Text>{" "}
                {recetaEscaneada.paciente}
              </Text>
              <Text style={s.modalText}>
                <Text style={{ fontWeight: "bold" }}>Médico:</Text> Dr.{" "}
                {recetaEscaneada.doctor}
              </Text>
              <Text style={s.modalText}>
                <Text style={{ fontWeight: "bold" }}>Licencia:</Text>{" "}
                {recetaEscaneada.numero_licencia || "No registrada"}
              </Text>
            </View>

            <View style={s.modalCard}>
              <Text style={s.modalCardTitle}>Medicamentos Recetados</Text>
              {recetaEscaneada.items.map((it: any) => (
                <View key={it.id_PK} style={s.modalMedItem}>
                  <Ionicons
                    name="medical"
                    size={18}
                    color="#0F766E"
                    style={{ marginTop: 2, marginRight: 6 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalMedName}>
                      {it.medicamento}{" "}
                      {it.presentacion ? `(${it.presentacion})` : ""}
                    </Text>
                    <Text style={s.modalMedDetail}>
                      <Text style={{ fontWeight: "bold" }}>Dosis:</Text>{" "}
                      {it.dosis || "—"}
                    </Text>
                    <Text style={s.modalMedDetail}>
                      <Text style={{ fontWeight: "bold" }}>Frecuencia:</Text>{" "}
                      {it.frecuencia || "—"}
                    </Text>
                    <Text style={s.modalMedDetail}>
                      <Text style={{ fontWeight: "bold" }}>Duración:</Text>{" "}
                      {it.duracion || "—"}
                    </Text>
                    <Text style={s.modalMedDetail}>
                      <Text style={{ fontWeight: "bold" }}>Cantidad:</Text>{" "}
                      {it.cantidad} piezas
                    </Text>
                    {!!it.via_administracion && (
                      <Text style={s.modalMedDetail}>
                        <Text style={{ fontWeight: "bold" }}>Vía:</Text>{" "}
                        {it.via_administracion}
                      </Text>
                    )}
                    {!!it.instrucciones && (
                      <Text style={s.modalMedDetail}>
                        <Text style={{ fontWeight: "bold" }}>
                          Instrucciones:
                        </Text>{" "}
                        {it.instrucciones}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            <View style={s.modalBotones}>
              <Boton
                texto="Dispensar Receta"
                onPress={() => {
                  const recetaEnLista = recetas.find(
                    (r) => r.id_PK === recetaEscaneada.id_PK,
                  );
                  if (recetaEnLista) {
                    setConfirmar(recetaEnLista);
                    setRecetaEscaneada(null);
                  } else {
                    Alert.alert(
                      "Aviso",
                      "Esta receta no está en la lista de pendientes. Actualiza la pantalla.",
                    );
                  }
                }}
              />
            </View>
          </ScrollView>
        )}
      </ModalBase>
    </PantallaC2>
  );
}

const s = StyleSheet.create({
  cabecera: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titulo: { fontSize: 16, fontWeight: "800", color: C.titulo },
  sub: { fontSize: 12.5, color: C.texto2, marginTop: 2 },
  item: { fontSize: 14, fontWeight: "700", color: C.texto, marginTop: 4 },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: C.borde,
    paddingTop: 8,
  },
  botones: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  camaraOverlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: 40,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  camaraTexto: {
    color: "#FFF",
    fontSize: 18,
    textAlign: "center",
    marginTop: 50,
    fontWeight: "bold",
  },

  // Estilos del modal de receta
  modalHeader: { alignItems: "center", marginBottom: 20 },
  modalIconBox: {
    backgroundColor: "#E7F5F2",
    padding: 10,
    borderRadius: 50,
    marginBottom: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: "900", color: C.titulo },
  modalSub: { fontSize: 12, color: C.texto2, marginTop: 2 },
  modalCard: {
    backgroundColor: C.fondo,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.borde,
  },
  modalCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.primario,
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  modalText: { fontSize: 14, color: C.texto, marginBottom: 4 },
  modalMedItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borde,
    paddingBottom: 12,
  },
  modalMedName: {
    fontSize: 15,
    fontWeight: "bold",
    color: C.texto,
    marginBottom: 4,
  },
  modalMedDetail: { fontSize: 13, color: C.texto2, marginBottom: 2 },
  modalBotones: { gap: 10, marginTop: 10, marginBottom: 20 },
});
