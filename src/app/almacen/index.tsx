import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Aviso, Boton, Cargando, Estadistica, PantallaC2, Tarjeta } from "../../components/c2/ui";
import { getResumenAlmacen, ResumenAlmacen } from "../../services/almacenService";
import { mensajeError } from "../../services/c2Service";

/** Panel del rol Almacén: indicadores y accesos rápidos. */
export default function AlmacenInicio() {
  const router = useRouter();
  const [resumen, setResumen] = useState<ResumenAlmacen | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setCargando(true);
      getResumenAlmacen()
        .then((r) => activo && (setResumen(r), setError("")))
        .catch((e) => activo && setError(mensajeError(e, "No se pudo cargar el resumen del almacén.")))
        .finally(() => activo && setCargando(false));
      return () => {
        activo = false;
      };
    }, [])
  );

  return (
    <PantallaC2 titulo="Almacén" subtitulo="Existencias, caducidades y entrega de medicamentos" roles={[1, 5, 6]}>
      {!!error && <Aviso tipo="error" texto={error} />}
      {cargando && !resumen ? (
        <Cargando />
      ) : (
        resumen && (
          <View style={s.grid}>
            <View style={s.celda}>
              <Estadistica titulo="Recetas por dispensar" valor={resumen.recetas_pendientes} tono={resumen.recetas_pendientes ? "warn" : "ok"} />
            </View>
            <View style={s.celda}>
              <Estadistica titulo={`Lotes por vencer (${resumen.dias_alerta_caducidad} d)`} valor={resumen.lotes_por_vencer} tono={resumen.lotes_por_vencer ? "warn" : "ok"} />
            </View>
            <View style={s.celda}>
              <Estadistica titulo="Lotes vencidos con stock" valor={resumen.lotes_vencidos} tono={resumen.lotes_vencidos ? "danger" : "ok"} />
            </View>
            <View style={s.celda}>
              <Estadistica titulo={`Stock bajo (≤ ${resumen.umbral_stock_bajo})`} valor={resumen.medicamentos_stock_bajo} tono={resumen.medicamentos_stock_bajo ? "warn" : "ok"} />
            </View>
            <View style={s.celda}>
              <Estadistica titulo="Unidades vigentes" valor={resumen.unidades_vigentes} tono="info" />
            </View>
            <View style={s.celda}>
              <Estadistica titulo="Medicamentos / lotes" valor={`${resumen.total_medicamentos} / ${resumen.total_lotes}`} tono="neutral" />
            </View>
          </View>
        )
      )}

      <Tarjeta style={{ gap: 10 }}>
        <Boton texto="Dispensar recetas" onPress={() => router.push("/almacen/dispensacion")} />
        <Boton texto="Analítica y predicción (IA)" variante="secundario" onPress={() => router.push("/almacen/analitica")} />
        <Boton texto="Registrar consumo de insumos" variante="secundario" onPress={() => router.push("/almacen/consumo")} />
        <Boton texto="Ver caducidades" variante="secundario" onPress={() => router.push("/almacen/caducidades")} />
        <Boton texto="Movimientos de inventario" variante="secundario" onPress={() => router.push("/almacen/movimientos")} />
        <Boton texto="Medicamentos y lotes" variante="secundario" onPress={() => router.push("/admin/inventario")} />
      </Tarjeta>
    </PantallaC2>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  celda: { width: "50%", padding: 6 },
});
