
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

interface VisorContratoProps {
  url: string;
  token: string;
}

export default function VisorContrato({
  url,
  token,
}: VisorContratoProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelado = false;

    async function cargarPDF() {
      try {
        setError("");
        setPdfUrl(null);

        const respuesta = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!respuesta.ok) {
          throw new Error(
            respuesta.status === 401
              ? "La sesión no está autenticada. Inicia sesión nuevamente."
              : `No se pudo cargar el PDF (${respuesta.status}).`
          );
        }

        const blob = await respuesta.blob();
        objectUrl = URL.createObjectURL(blob);

        if (!cancelado) {
          setPdfUrl(objectUrl);
        }
      } catch (e) {
        if (!cancelado) {
          setError(
            e instanceof Error
              ? e.message
              : "Error al cargar el documento."
          );
        }
      }
    }

    if (token) {
      cargarPDF();
    } else {
      setError("No se encontró el token de autenticación.");
    }

    return () => {
      cancelado = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, token]);

  if (error) {
    return <Text>{error}</Text>;
  }

  if (!pdfUrl) {
    return (
      <View style={{ padding: 20, alignItems: "center" }}>
        <ActivityIndicator />
        <Text>Cargando documento...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, minHeight: 500 }}>
      <iframe
        title="Vista previa del contrato"
        src={pdfUrl}
        style={{
          width: "100%",
          height: "100%",
          minHeight: 500,
          border: "none",
        }}
      />
    </View>
  );
}