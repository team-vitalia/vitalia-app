import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  Aviso, Boton, C, Cargando, Etiqueta, fechaHora, ModalBase, PantallaC2, Tarjeta, Tono, Vacio,
} from "../../components/c2/ui";
import {
  DisponibilidadItem, dispensarReceta, getRecetasPendientes, RecetaPendiente,
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

/** Cuánto se entregará ahora de un ítem (lo pendiente, limitado por el stock vigente). */
const aEntregar = (d: DisponibilidadItem) => Math.min(d.cantidad_pendiente, d.stock_disponible);

export default function Dispensacion() {
  const [recetas, setRecetas] = useState<RecetaPendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [confirmar, setConfirmar] = useState<RecetaPendiente | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setRecetas(await getRecetasPendientes());
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar las recetas pendientes."));
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

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
              .join(", ")}. Se avisó al médico.`
      );
      setConfirmar(null);
      await cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo dispensar la receta."));
      setConfirmar(null);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PantallaC2 titulo="Dispensación de recetas" subtitulo="Recetas activas o parcialmente entregadas" roles={[1, 6]}>
      {!!error && <Aviso tipo="error" texto={error} />}
      {!!exito && <Aviso tipo="ok" texto={exito} />}
      {cargando && recetas.length === 0 ? (
        <Cargando />
      ) : recetas.length === 0 ? (
        <Vacio texto="No hay recetas pendientes de dispensar." />
      ) : (
        recetas.map((r) => {
          const algoQueEntregar = r.disponibilidad.some((d) => aEntregar(d) > 0);
          return (
            <Tarjeta key={r.id_PK} style={{ gap: 8 }}>
              <View style={s.cabecera}>
                <Text style={s.titulo}>Receta #{r.id_PK}</Text>
                <Etiqueta texto={r.estado === "dispensada_parcial" ? "Parcial" : "Pendiente"} tono={r.estado === "dispensada_parcial" ? "warn" : "info"} />
              </View>
              <Text style={s.sub}>
                {r.paciente ?? "Paciente"} · Dr. {r.doctor ?? "—"} · {fechaHora(r.creado_en)}
              </Text>

              {r.disponibilidad.map((d) => (
                <View key={d.item_receta_id} style={s.fila}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.item}>{d.medicamento ?? "Medicamento"}{d.presentacion ? ` · ${d.presentacion}` : ""}</Text>
                    <Text style={s.sub}>
                      Pendiente {d.cantidad_pendiente} de {d.cantidad_recetada} · Stock vigente {d.stock_disponible}
                    </Text>
                  </View>
                  <Etiqueta texto={TEXTO[d.estado]} tono={TONO[d.estado]} />
                </View>
              ))}

              <Boton
                texto={algoQueEntregar ? "Dispensar disponible" : "Sin existencias para entregar"}
                deshabilitado={!algoQueEntregar}
                onPress={() => setConfirmar(r)}
              />
            </Tarjeta>
          );
        })
      )}

      <ModalBase visible={!!confirmar} titulo={`Dispensar receta #${confirmar?.id_PK ?? ""}`} onClose={() => setConfirmar(null)}>
        <Text style={s.sub}>Se descontará del inventario (primero los lotes que vencen antes):</Text>
        {confirmar?.disponibilidad
          .filter((d) => aEntregar(d) > 0)
          .map((d) => (
            <Text key={d.item_receta_id} style={s.item}>
              • {d.medicamento}: {aEntregar(d)} u.{aEntregar(d) < d.cantidad_pendiente ? `  (faltarán ${d.cantidad_pendiente - aEntregar(d)})` : ""}
            </Text>
          ))}
        <View style={{ height: 14 }} />
        <View style={s.botones}>
          <Boton texto="Cancelar" variante="secundario" onPress={() => setConfirmar(null)} deshabilitado={enviando} />
          <Boton texto="Confirmar entrega" onPress={dispensar} cargando={enviando} />
        </View>
      </ModalBase>
    </PantallaC2>
  );
}

const s = StyleSheet.create({
  cabecera: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titulo: { fontSize: 16, fontWeight: "800", color: C.titulo },
  sub: { fontSize: 12.5, color: C.texto2, marginTop: 2 },
  item: { fontSize: 14, fontWeight: "700", color: C.texto, marginTop: 4 },
  fila: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: C.borde, paddingTop: 8 },
  botones: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
});
