import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import FirmaRecetaPanel from "../../components/FirmaRecetaPanel";
import { Aviso, C, Cargando, Etiqueta, etiquetaEstado, fechaHora, PantallaC2, Tarjeta, Vacio } from "../../components/c2/ui";
import api from "../../services/api";
import { mensajeError } from "../../services/c2Service";
import { FirmaReceta, getMisFirmas, LEYENDA_FIRMA_SIMULADA } from "../../services/firmaRecetaService";

type RecetaLista = {
  id_PK: number;
  paciente: string | null;
  estado: string | null;
  creado_en: string;
  items: { id_PK: number; medicamento: string | null; dosis: string | null; cantidad: number | null }[];
};

/** Recetas del médico con su estado de firma electrónica SIMULADA (uso académico). */
export default function RecetasYFirma() {
  const [recetas, setRecetas] = useState<RecetaLista[] | null>(null);
  const [firmas, setFirmas] = useState<Record<number, FirmaReceta>>({});
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const [lista, mias] = await Promise.all([api.get("/api/recetas/"), getMisFirmas()]);
      setRecetas(lista.data);
      setFirmas(Object.fromEntries(mias.map((f) => [f.receta_id, f])));
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar las recetas."));
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  return (
    <PantallaC2 titulo="Recetas y firma" subtitulo={LEYENDA_FIRMA_SIMULADA} roles={[2]}>
      {!!error && <Aviso tipo="error" texto={error} />}
      {recetas === null && !error ? (
        <Cargando />
      ) : recetas && recetas.length === 0 ? (
        <Vacio texto="Aún no has emitido recetas." />
      ) : (
        recetas?.map((r) => (
          <Tarjeta key={r.id_PK} style={{ gap: 6 }}>
            <View style={s.fila}>
              <Text style={s.titulo}>Receta #{String(r.id_PK).padStart(6, "0")}</Text>
              <Etiqueta texto={firmas[r.id_PK] ? "Firmada" : "Sin firmar"} tono={firmas[r.id_PK] ? "ok" : "neutral"} />
            </View>
            <Text style={s.sub}>
              {r.paciente ?? "Paciente"} · {fechaHora(r.creado_en)} · {etiquetaEstado(r.estado)}
            </Text>
            {r.items.map((i) => (
              <Text key={i.id_PK} style={s.item}>
                • {i.medicamento} — {i.dosis} ({i.cantidad} u.)
              </Text>
            ))}
            {r.estado === "cancelada" ? (
              <Text style={s.sub}>Una receta cancelada no se puede firmar.</Text>
            ) : (
              <FirmaRecetaPanel recetaId={r.id_PK} firma={firmas[r.id_PK] ?? null} onFirmada={(f) => setFirmas((p) => ({ ...p, [f.receta_id]: f }))} />
            )}
          </Tarjeta>
        ))
      )}
    </PantallaC2>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  titulo: { fontSize: 15, fontWeight: "800", color: C.titulo },
  sub: { fontSize: 12.5, color: C.texto2 },
  item: { fontSize: 13, color: C.texto },
});
