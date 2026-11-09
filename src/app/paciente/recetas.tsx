import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Aviso, C, Cargando, Etiqueta, etiquetaEstado, fechaHora, PantallaC2, Tarjeta, Vacio } from "../../components/c2/ui";
import { mensajeError } from "../../services/c2Service";
import { getMisRecetas, RecetaPaciente } from "../../services/clinicoService";

export default function MisRecetas() {
  const [recetas, setRecetas] = useState<RecetaPaciente[] | null>(null);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      getMisRecetas()
        .then((r) => (setRecetas(r), setError("")))
        .catch((e) => setError(mensajeError(e, "No se pudieron cargar tus recetas.")));
    }, [])
  );

  return (
    <PantallaC2 titulo="Mis recetas" subtitulo="Medicamentos indicados por tu médico" roles={[3]}>
      {!!error && <Aviso tipo="error" texto={error} />}
      {recetas === null && !error ? (
        <Cargando />
      ) : recetas && recetas.length === 0 ? (
        <Vacio texto="Aún no tienes recetas." />
      ) : (
        recetas?.map((r) => (
          <Tarjeta key={r.id_PK} style={{ gap: 6 }}>
            <View style={s.cabecera}>
              <Text style={s.titulo}>Receta #{r.id_PK}</Text>
              <Etiqueta
                texto={r.estado === "activa" ? "Por recoger" : etiquetaEstado(r.estado)}
                tono={r.estado === "dispensada" ? "ok" : r.estado === "dispensada_parcial" ? "warn" : "info"}
              />
            </View>
            <Text style={s.sub}>Dr. {r.doctor ?? "—"} · {fechaHora(r.creado_en)}</Text>
            {r.items.map((it) => (
              <View key={it.id_PK} style={s.item}>
                <Text style={s.med}>
                  {it.medicamento}{it.presentacion ? ` · ${it.presentacion}` : ""}
                </Text>
                <Text style={s.sub}>
                  {it.dosis} · {it.frecuencia} · {it.duracion} · {it.cantidad} u.
                </Text>
                {!!it.instrucciones && <Text style={s.sub}>{it.instrucciones}</Text>}
                <Text style={s.meta}>Entregado: {it.cantidad_dispensada} de {it.cantidad}</Text>
              </View>
            ))}
          </Tarjeta>
        ))
      )}
    </PantallaC2>
  );
}

const s = StyleSheet.create({
  cabecera: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titulo: { fontSize: 16, fontWeight: "800", color: C.titulo },
  sub: { fontSize: 12.5, color: C.texto2 },
  item: { borderTopWidth: 1, borderTopColor: C.borde, paddingTop: 6 },
  med: { fontSize: 14, fontWeight: "700", color: C.texto },
  meta: { fontSize: 11.5, color: C.muted, marginTop: 2 },
});
