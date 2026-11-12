import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import api from "../../services/api";

interface ItemReceta {
  id_PK: number;
  medicamento: string | null;
  presentacion: string | null;
  dosis: string | null;
  frecuencia: string | null;
  duracion: string | null;
  cantidad: number | null;
  instrucciones: string | null;
  via_administracion: string | null;
}

interface RecetaDetalle {
  id_PK: number;
  estado: string | null;
  creado_en: string;
  paciente: string | null;
  doctor: string | null;
  items: ItemReceta[];
}

export default function RecetaQRScreen() {
  const params = useLocalSearchParams<{
    recetaId: string;
    paciente: string;
    doctor: string;
    fecha: string;
    medicamentos: string;
    estado: string;
  }>();

  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [descargandoQR, setDescargandoQR] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [receta, setReceta] = useState<RecetaDetalle | null>(null);

  const recetaId = Number(params.recetaId || 0);
  const paciente = params.paciente || "Paciente";
  const doctor = params.doctor || "Médico";
  const fecha = params.fecha || "";
  const estado = params.estado || "activa";

  const fechaFormateada = (() => {
    try {
      const d = new Date(fecha);
      return d.toLocaleDateString("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return fecha;
    }
  })();

  const qrData = `VITALIA-RECETA-${recetaId}-${paciente.replace(/\s+/g, "_")}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`;

  // 👇 Cargar el detalle completo de la receta desde la API 👇
  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        const res = await api.get(`/api/recetas/${recetaId}`);
        setReceta(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.detail || "No se pudo cargar la receta.");
      } finally {
        setCargando(false);
      }
    };
    if (recetaId) cargar();
  }, [recetaId]);

  const items = receta?.items || [];

  // HTML del PDF (con todos los detalles)
  const htmlReceta = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Helvetica', Arial, sans-serif; color: #173F3A; padding: 40px; background: #FFFFFF; }
          .header { text-align: center; border-bottom: 3px solid #247F76; padding-bottom: 18px; margin-bottom: 25px; }
          .header h1 { color: #247F76; font-size: 30px; letter-spacing: 3px; font-weight: 800; }
          .header p { color: #6B7C77; font-size: 12px; margin-top: 4px; }
          .card { background: #F9FBFA; border: 1px solid #DCEAE6; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
          .card-title { font-size: 14px; font-weight: 800; color: #247F76; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #DCEAE6; }
          .info-row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px dashed #E2ECEA; }
          .info-row:last-child { border-bottom: none; }
          .info-label { font-weight: 700; color: #31534D; }
          .info-value { color: #173F3A; text-align: right; }
          .estado { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; background: #E7F5F2; color: #17685F; text-transform: uppercase; }
          .medicamento { background: #FFFFFF; border-left: 4px solid #10B981; border-radius: 6px; padding: 12px 16px; margin-bottom: 10px; }
          .med-nombre { font-size: 15px; font-weight: 800; color: #173F3A; margin-bottom: 6px; }
          .med-detalle { font-size: 12px; color: #4A5D59; margin: 2px 0; padding-left: 10px; }
          .med-detalle strong { color: #31534D; }
          .footer { margin-top: 35px; padding-top: 20px; border-top: 1px solid #DCEAE6; text-align: center; font-size: 11px; color: #82938F; line-height: 1.6; }
          .folio { font-family: monospace; font-size: 11px; color: #173F3A; background: #F0F7F5; padding: 6px 10px; border-radius: 6px; display: inline-block; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>VITALIA</h1>
          <p>Gestión clínica inteligente · Receta médica oficial</p>
        </div>
        <div class="card">
          <div class="card-title">Información de la Receta</div>
          <div class="info-row"><span class="info-label">Receta #</span><span class="info-value">${recetaId}</span></div>
          <div class="info-row"><span class="info-label">Paciente</span><span class="info-value">${paciente}</span></div>
          <div class="info-row"><span class="info-label">Médico</span><span class="info-value">Dr. ${doctor}</span></div>
          <div class="info-row"><span class="info-label">Fecha</span><span class="info-value">${fechaFormateada}</span></div>
          <div class="info-row"><span class="info-label">Estado</span><span class="info-value"><span class="estado">${estado}</span></span></div>
        </div>
        <div class="card">
          <div class="card-title">Medicamentos Recetados</div>
          ${
            items.length === 0
              ? `<p style="font-size:13px;color:#82938F;font-style:italic;">Sin medicamentos registrados.</p>`
              : items
                  .map(
                    (it) => `
            <div class="medicamento">
              <div class="med-nombre">💊 ${it.medicamento ?? "Medicamento"} ${it.presentacion ? `(${it.presentacion})` : ""}</div>
              ${it.dosis ? `<div class="med-detalle"><strong>Dosis:</strong> ${it.dosis}</div>` : ""}
              ${it.frecuencia ? `<div class="med-detalle"><strong>Frecuencia:</strong> ${it.frecuencia}</div>` : ""}
              ${it.duracion ? `<div class="med-detalle"><strong>Duración:</strong> ${it.duracion}</div>` : ""}
              ${it.cantidad ? `<div class="med-detalle"><strong>Cantidad:</strong> ${it.cantidad}</div>` : ""}
              ${it.instrucciones ? `<div class="med-detalle"><strong>Instrucciones:</strong> ${it.instrucciones}</div>` : ""}
            </div>
          `,
                  )
                  .join("")
          }
        </div>
        <div class="footer">
          Documento generado por VITALIA.<br/>
          Verifique la autenticidad escaneando el código QR adjunto.
          <div class="folio">Folio: ${qrData}</div>
        </div>
      </body>
    </html>
  `;

  const descargarPDF = async () => {
    setError("");
    setGenerandoPDF(true);
    try {
      if (Platform.OS === "web") {
        const win = window.open("", "_blank");
        if (!win) {
          setError("Habilita las ventanas emergentes para descargar el PDF.");
          return;
        }
        win.document.write(htmlReceta);
        win.document.close();
        win.focus();
        setTimeout(() => {
          win.print();
        }, 600);
      } else {
        const result: any = await Print.printToFileAsync({ html: htmlReceta });
        const uri = result?.uri;
        if (!uri) {
          setError("No se pudo generar el PDF.");
          return;
        }
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: `Receta #${recetaId}`,
            UTI: "com.adobe.pdf",
          });
        } else {
          setError("Tu dispositivo no soporta compartir archivos.");
        }
      }
    } catch (e: any) {
      setError(e?.message || "No se pudo generar el PDF.");
    } finally {
      setGenerandoPDF(false);
    }
  };

  const descargarQR = async () => {
    setError("");
    setDescargandoQR(true);
    try {
      if (Platform.OS === "web") {
        const response = await fetch(qrImageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `QR-Receta-${recetaId}-${paciente.replace(/\s+/g, "_")}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const response = await fetch(qrImageUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const FileSystem = require("expo-file-system");
          const fileUri = `${FileSystem.cacheDirectory}QR-Receta-${recetaId}.png`;
          await FileSystem.writeAsStringAsync(
            fileUri,
            base64data.replace("data:image/png;base64,", ""),
            { encoding: FileSystem.EncodingType.Base64 },
          );
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: "image/png",
              dialogTitle: `QR de Receta #${recetaId}`,
              UTI: "public.png",
            });
          } else {
            setError("Tu dispositivo no soporta compartir archivos.");
          }
        };
      }
    } catch (e: any) {
      setError(e?.message || "No se pudo generar la imagen del QR.");
    } finally {
      setDescargandoQR(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={16} color="#247F76" />
          <Text style={styles.backText}>Volver al expediente</Text>
        </Pressable>
      </View>

      <Text style={styles.smallTitle}>RECETA MÉDICA OFICIAL</Text>
      <Text style={styles.title}>Receta #{recetaId}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Información de la receta</Text>
        <View style={styles.divider} />
        <Text style={styles.label}>Paciente:</Text>
        <Text style={styles.value}>{paciente}</Text>
        <Text style={styles.label}>Médico:</Text>
        <Text style={styles.value}>Dr. {doctor}</Text>
        <Text style={styles.label}>Fecha:</Text>
        <Text style={styles.value}>{fechaFormateada}</Text>
        <Text style={styles.label}>Estado:</Text>
        <Text
          style={[
            styles.value,
            { textTransform: "capitalize", color: "#247F76" },
          ]}
        >
          {estado}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💊 Medicamentos</Text>
        <View style={styles.divider} />
        {cargando ? (
          <ActivityIndicator color="#247F76" />
        ) : items.length === 0 ? (
          <Text style={styles.vacio}>Sin medicamentos registrados.</Text>
        ) : (
          items.map((it) => (
            <View key={it.id_PK} style={styles.medBlock}>
              <Text style={styles.medTitle}>
                💊 {it.medicamento ?? "Medicamento"}{" "}
                {it.presentacion ? `(${it.presentacion})` : ""}
              </Text>
              {!!it.dosis && (
                <Text style={styles.medDetail}>
                  <Text style={styles.medLabel}>Dosis: </Text>
                  {it.dosis}
                </Text>
              )}
              {!!it.frecuencia && (
                <Text style={styles.medDetail}>
                  <Text style={styles.medLabel}>Frecuencia: </Text>
                  {it.frecuencia}
                </Text>
              )}
              {!!it.duracion && (
                <Text style={styles.medDetail}>
                  <Text style={styles.medLabel}>Duración: </Text>
                  {it.duracion}
                </Text>
              )}
              {!!it.cantidad && (
                <Text style={styles.medDetail}>
                  <Text style={styles.medLabel}>Cantidad: </Text>
                  {it.cantidad}
                </Text>
              )}
              {!!it.instrucciones && (
                <Text style={styles.medDetail}>
                  <Text style={styles.medLabel}>Instrucciones: </Text>
                  {it.instrucciones}
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      <View
        style={[styles.card, { alignItems: "center", paddingVertical: 24 }]}
      >
        <Text style={styles.cardTitle}>Código QR de verificación</Text>
        <View style={styles.divider} />
        <View
          style={{
            backgroundColor: "#FFFFFF",
            padding: 20,
            borderRadius: 16,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "800",
              color: "#173F3A",
              marginBottom: 10,
            }}
          >
            RECETA MÉDICA
          </Text>
          <QRCode
            value={qrData}
            size={220}
            color="#173F3A"
            backgroundColor="#FFF"
          />
          <Text style={{ fontSize: 10, color: "#82938F", marginTop: 8 }}>
            VITALIA - Folio #{recetaId}
          </Text>
        </View>
        <Text style={styles.qrHelp}>{qrData}</Text>
        <Text style={styles.qrSubtext}>
          El farmacéutico escanea este código para verificar la receta.
        </Text>
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <Pressable
        style={[styles.mainButton, generandoPDF && { opacity: 0.6 }]}
        onPress={descargarPDF}
        disabled={generandoPDF}
      >
        {generandoPDF ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="document-text" size={20} color="#FFF" />
            <Text style={styles.mainButtonText}>Descargar Receta (PDF)</Text>
          </>
        )}
      </Pressable>

      <Pressable
        style={[styles.secondaryButtonQR, descargandoQR && { opacity: 0.6 }]}
        onPress={descargarQR}
        disabled={descargandoQR}
      >
        {descargandoQR ? (
          <ActivityIndicator color="#247F76" />
        ) : (
          <>
            <Ionicons name="qr-code" size={20} color="#247F76" />
            <Text style={styles.secondaryButtonQRText}>Descargar QR (PNG)</Text>
          </>
        )}
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryButtonText}>Cancelar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FAF8" },
  content: {
    padding: 24,
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
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCEAE6",
    gap: 6,
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
    fontSize: 28,
    fontWeight: "900",
    color: "#173F3A",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#CCE4DD",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#173F3A",
    marginBottom: 10,
  },
  divider: { height: 1, backgroundColor: "#E8F0EE", marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "800", color: "#31534D", marginTop: 6 },
  value: { fontSize: 14, color: "#173F3A", marginBottom: 2 },
  vacio: { fontSize: 13, color: "#82938F", fontStyle: "italic" },
  medBlock: {
    backgroundColor: "#F9FBFA",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  medTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#173F3A",
    marginBottom: 6,
  },
  medDetail: { fontSize: 13, color: "#4A5D59", marginTop: 2 },
  medLabel: { fontWeight: "800", color: "#31534D" },
  qrHelp: {
    fontSize: 11,
    color: "#173F3A",
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  qrSubtext: {
    fontSize: 11,
    color: "#82938F",
    marginTop: 6,
    textAlign: "center",
    maxWidth: 280,
  },
  errorText: {
    color: "#B03A3A",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
  },
  mainButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#247F76",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  mainButtonText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  secondaryButtonQR: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#247F76",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  secondaryButtonQRText: { color: "#247F76", fontSize: 14, fontWeight: "800" },
  secondaryButton: { paddingVertical: 12, alignItems: "center", marginTop: 8 },
  secondaryButtonText: { color: "#82938F", fontSize: 13, fontWeight: "700" },
});
