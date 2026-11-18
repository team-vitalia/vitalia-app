import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { Aviso, Boton, C, Etiqueta, fechaHora } from "./c2/ui";
import { mensajeError } from "../services/c2Service";
import {
  descargarPdfFirmado, EventoFirma, fechaFirmaUtcTexto, FirmaReceta, firmarReceta, getFirmaDeReceta,
  getHistorialFirma, LEYENDA_FIRMA_SIMULADA,
} from "../services/firmaRecetaService";

/**
 * Panel de firma electrónica SIMULADA de una receta (uso académico, sin validez jurídica).
 *  - Sin firmar: pide confirmación explícita y firma con la llave ficticia del médico (la llave privada nunca sale del backend).
 *  - Firmada: muestra identificador, médico ficticio, fecha/hora, QR de validación, descarga del PDF e historial.
 * `firma`: undefined = consultar al backend; null = se sabe que no está firmada; objeto = ya firmada.
 */
export default function FirmaRecetaPanel({
  recetaId,
  firma: firmaInicial,
  onFirmada,
}: {
  recetaId: number;
  firma?: FirmaReceta | null;
  onFirmada?: (f: FirmaReceta) => void;
}) {
  const [firma, setFirma] = useState<FirmaReceta | null | undefined>(firmaInicial);
  const [confirmando, setConfirmando] = useState(false);
  const [acepto, setAcepto] = useState(false);
  const [firmando, setFirmando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [descargando, setDescargando] = useState(false);
  const [historial, setHistorial] = useState<EventoFirma[] | null>(null);

  useEffect(() => setFirma(firmaInicial), [firmaInicial]);

  useEffect(() => {
    if (firmaInicial !== undefined) return;
    let activo = true;
    getFirmaDeReceta(recetaId)
      .then((f) => activo && setFirma(f))
      .catch((e) => activo && setError(mensajeError(e, "No se pudo consultar la firma.")));
    return () => { activo = false; };
  }, [recetaId, firmaInicial]);

  const firmar = async () => {
    setError("");
    setFirmando(true);
    try {
      const f = await firmarReceta(recetaId);
      setFirma(f);
      setConfirmando(false);
      setAcepto(false);
      onFirmada?.(f);
    } catch (e) {
      setError(mensajeError(e, "No se pudo firmar la receta."));
    } finally {
      setFirmando(false);
    }
  };

  const descargar = async () => {
    if (!firma) return;
    setError(""); setAviso("");
    setDescargando(true);
    try {
      const ok = await descargarPdfFirmado(firma.codigo_verificacion, firma.receta_id);
      if (!ok) setAviso("La descarga del PDF está disponible en la versión web. Aquí puedes abrir la página de verificación.");
    } catch (e) {
      setError(mensajeError(e, "No se pudo descargar el PDF."));
    } finally {
      setDescargando(false);
    }
  };

  const verHistorial = useCallback(async () => {
    if (!firma) return;
    if (historial) return setHistorial(null);
    try {
      setHistorial(await getHistorialFirma(firma.codigo_verificacion));
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar el historial."));
    }
  }, [firma, historial]);

  if (firma === undefined) return !!error ? <Aviso tipo="error" texto={error} /> : null;

  /* ---------------- ya firmada ---------------- */
  if (firma) {
    return (
      <View style={s.caja} accessibilityLabel="Receta firmada electrónicamente de forma simulada">
        <View style={s.fila}>
          <Text style={s.titulo}>✓ Receta firmada</Text>
          <Etiqueta texto="Simulación académica" tono="warn" />
        </View>
        <Text style={s.leyenda}>{LEYENDA_FIRMA_SIMULADA}</Text>

        <View style={s.cuerpo}>
          <View style={{ flex: 1, gap: 2, minWidth: 190 }}>
            <Text style={s.etq}>Identificador único</Text>
            <Text style={s.val} selectable>{firma.identificador}</Text>
            <Text style={s.etq}>Médico (ficticio)</Text>
            <Text style={s.val}>{firma.medico.nombre_ficticio}</Text>
            <Text style={s.sub}>Cédula ficticia {firma.medico.cedula_ficticia}</Text>
            <Text style={s.etq}>Fecha y hora de firma</Text>
            <Text style={s.val}>{fechaFirmaUtcTexto(firma.fecha_firma_utc)}</Text>
            <Text style={s.sub}>{fechaHora(firma.fecha_firma_utc)} (hora local)</Text>
            <Text style={s.etq}>Algoritmo</Text>
            <Text style={s.sub}>{firma.algoritmo.replace("/", " · ")}</Text>
          </View>
          <View style={s.qr}>
            <QRCode value={firma.url_verificacion} size={132} />
            <Text style={s.qrTxt}>Escanéalo para validar la firma</Text>
          </View>
        </View>

        {!!firma.advertencia && <Aviso tipo="info" texto={firma.advertencia} />}
        <Text style={s.url} selectable>{firma.url_verificacion}</Text>

        {!!error && <Aviso tipo="error" texto={error} />}
        {!!aviso && <Aviso tipo="info" texto={aviso} />}
        <View style={s.botones}>
          <Boton texto="Descargar PDF firmado" onPress={descargar} cargando={descargando} />
          <Boton texto="Abrir verificación" variante="secundario" onPress={() => Linking.openURL(firma.url_verificacion)} />
          <Boton texto={historial ? "Ocultar historial" : "Ver historial"} variante="secundario" onPress={verHistorial} />
        </View>

        {historial && (
          <View style={{ gap: 4 }}>
            {historial.map((h) => (
              <Text key={h.id_PK} style={s.sub}>
                • {fechaHora(h.creado_en)} — {h.accion.replace("_", " ").toLowerCase()}
                {h.resultado ? ` (${h.resultado === "VALIDA" ? "válida" : "INVÁLIDA"})` : ""}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  }

  /* ---------------- sin firmar ---------------- */
  return (
    <View style={s.caja}>
      {!!error && <Aviso tipo="error" texto={error} />}
      {!confirmando ? (
        <Boton texto="Firmar receta (simulación académica)" onPress={() => { setError(""); setConfirmando(true); }} />
      ) : (
        <View style={{ gap: 10 }}>
          <View style={s.advertencia}>
            <Text style={s.leyenda}>{LEYENDA_FIRMA_SIMULADA}</Text>
            <Text style={s.cuerpoTxt}>
              Se generará el PDF de la receta con un código QR y se firmará con una llave ficticia de un médico de prueba
              (RSA y SHA-256). No se usa tu e.firma ni ningún certificado real, y la firma no tiene validez jurídica.
              Una vez firmada, cualquier cambio a la receta hará que la validación la marque como inválida.
            </Text>
          </View>
          <Pressable
            onPress={() => setAcepto(!acepto)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acepto }}
            style={s.check}
          >
            <Text style={s.checkCaja}>{acepto ? "☑" : "☐"}</Text>
            <Text style={[s.cuerpoTxt, { flex: 1 }]}>
              Confirmo que revisé la receta y entiendo que esta firma es una simulación académica sin validez jurídica.
            </Text>
          </Pressable>
          <View style={s.botones}>
            <Boton texto="Confirmar y firmar" onPress={firmar} cargando={firmando} deshabilitado={!acepto} />
            <Boton texto="Cancelar" variante="secundario" onPress={() => { setConfirmando(false); setAcepto(false); }} deshabilitado={firmando} />
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  caja: { gap: 10, marginTop: 6 },
  fila: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  titulo: { fontSize: 15, fontWeight: "800", color: C.titulo },
  leyenda: { fontSize: 11.5, fontWeight: "800", color: "#6B4200", textAlign: "center" },
  advertencia: { backgroundColor: "#FFF3C4", borderColor: "#B7791F", borderWidth: 1, borderRadius: 10, padding: 10, gap: 6 },
  cuerpo: { flexDirection: "row", flexWrap: "wrap", gap: 14, alignItems: "flex-start" },
  cuerpoTxt: { fontSize: 13, color: C.texto, lineHeight: 18 },
  etq: { fontSize: 11, color: C.muted, marginTop: 6 },
  val: { fontSize: 14, fontWeight: "700", color: C.texto },
  sub: { fontSize: 12, color: C.texto2 },
  qr: { alignItems: "center", gap: 6, padding: 8, backgroundColor: "#FFFFFF", borderRadius: 10, borderWidth: 1, borderColor: C.borde },
  qrTxt: { fontSize: 11, color: C.muted, maxWidth: 140, textAlign: "center" },
  url: { fontSize: 11, color: C.muted },
  botones: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  check: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  checkCaja: { fontSize: 20, color: C.primario, lineHeight: 22 },
});
