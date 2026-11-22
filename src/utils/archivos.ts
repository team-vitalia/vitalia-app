import { Platform } from "react-native";

/**
 * Utilidades de archivos compartidas (Excel/PDF).
 *
 * Requiere:  npx expo install expo-document-picker expo-file-system
 * (expo-sharing ya está en el proyecto). Los módulos nativos se cargan solo cuando
 * hacen falta, así que en web no se usan.
 */

export const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const MIME_PDF = "application/pdf";

/** Guarda (web) o comparte (Android/iOS) un archivo recibido como ArrayBuffer. */
export async function guardarArchivo(nombre: string, datos: ArrayBuffer, mime: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined" || typeof document === "undefined") {
      throw new Error("La descarga solo está disponible en el navegador.");
    }
    const url = window.URL.createObjectURL(new Blob([datos], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return;
  }

  const { File, Paths } = await import("expo-file-system");
  const Sharing = await import("expo-sharing");

  const archivo = new File(Paths.cache, nombre);
  if (archivo.exists) archivo.delete();
  archivo.create();
  archivo.write(new Uint8Array(datos));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("No se puede compartir archivos en este dispositivo.");
  }
  await Sharing.shareAsync(archivo.uri, { mimeType: mime, dialogTitle: nombre });
}

export type ArchivoElegido = { nombre: string; base64: string };

/** Abre el selector del sistema y devuelve el .xlsx en base64 (null si se cancela). */
export async function elegirExcel(): Promise<ArchivoElegido | null> {
  const DocumentPicker = await import("expo-document-picker");
  const resultado = await DocumentPicker.getDocumentAsync({
    type: "*/*", // algunos dispositivos reportan los .xlsx como octet-stream; se valida la extensión abajo
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (resultado.canceled || !resultado.assets?.length) return null;

  const asset = resultado.assets[0];
  if (!/\.xlsx$/i.test(asset.name || "")) {
    throw new Error("Selecciona un archivo Excel con extensión .xlsx (puedes descargar la plantilla).");
  }
  const blob = await (await fetch(asset.uri)).blob();
  const base64 = await blobABase64(blob);
  return { nombre: asset.name, base64 };
}

function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
    lector.onload = () => {
      const texto = String(lector.result || "");
      resolve(texto.includes(",") ? texto.split(",")[1] : texto);
    };
    lector.readAsDataURL(blob);
  });
}
