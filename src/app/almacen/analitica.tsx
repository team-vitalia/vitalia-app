import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BarraSegmentada, BarrasHorizontales, COLOR, ColumnasApiladas, nombreMes, Sparkline } from "../../components/Graficas";
import { Aviso, Boton, C, Cargando, Etiqueta, Opciones, PantallaC2, Tarjeta, Tono, Vacio } from "../../components/c2/ui";
import {
  AnalisisIA, getAnalisisIA, getPanelAnalitico, getPrediccion, PanelAnalitico, Prediccion, RiesgoStock, TipoArticulo,
} from "../../services/almacenService";
import { mensajeError } from "../../services/c2Service";

const TONO_RIESGO: Record<RiesgoStock, Tono> = { agotado: "danger", critico: "danger", bajo: "warn", ok: "ok", sin_movimiento: "neutral" };
const TEXTO_RIESGO: Record<RiesgoStock, string> = {
  agotado: "Agotado", critico: "Crítico", bajo: "Stock bajo", ok: "Suficiente", sin_movimiento: "Sin movimiento",
};
const TIPO_TEXTO: Record<TipoArticulo, string> = { medicamento: "Medicamento", insumo: "Insumo", equipo: "Equipo" };

/** Gráficas de consumo/caducidad, predicción de demanda y análisis con IA. */
export default function AnaliticaAlmacen() {
  const [horizonte, setHorizonte] = useState<"15" | "30" | "60">("30");
  const [tipo, setTipo] = useState<"todos" | TipoArticulo>("todos");
  const [panel, setPanel] = useState<PanelAnalitico | null>(null);
  const [pred, setPred] = useState<Prediccion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [analisis, setAnalisis] = useState<AnalisisIA | null>(null);
  const [analizando, setAnalizando] = useState(false);

  const tipoApi = tipo === "todos" ? undefined : tipo;

  const cargar = useCallback(async () => {
    setCargando(true);
    setAnalisis(null);
    try {
      const [p, pr] = await Promise.all([getPanelAnalitico(6), getPrediccion(Number(horizonte), tipoApi)]);
      setPanel(p);
      setPred(pr);
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar la analítica."));
    } finally {
      setCargando(false);
    }
  }, [horizonte, tipoApi]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const analizar = async () => {
    setAnalizando(true);
    setError("");
    try {
      setAnalisis(await getAnalisisIA(Number(horizonte), tipoApi));
    } catch (e) {
      setError(mensajeError(e, "No se pudo generar el análisis."));
    } finally {
      setAnalizando(false);
    }
  };

  const cad = panel?.caducidad_unidades;
  const reposicion = (pred?.items ?? []).filter((i) => ["agotado", "critico", "bajo"].includes(i.riesgo) || i.excedente_por_vencer > 0);

  return (
    <PantallaC2 titulo="Analítica y predicción" subtitulo="Consumo, caducidades y qué se va a necesitar" roles={[1, 5, 6]}>
      <Opciones
        valor={horizonte}
        onChange={setHorizonte}
        opciones={[{ valor: "15", etiqueta: "Próx. 15 días" }, { valor: "30", etiqueta: "Próx. 30 días" }, { valor: "60", etiqueta: "Próx. 60 días" }]}
      />
      <Opciones
        valor={tipo}
        onChange={setTipo}
        opciones={[{ valor: "todos", etiqueta: "Todo" }, { valor: "medicamento", etiqueta: "Medicamentos" }, { valor: "insumo", etiqueta: "Insumos" }]}
      />
      {!!error && <Aviso tipo="error" texto={error} />}

      {cargando && !panel ? (
        <Cargando />
      ) : (
        <>
          {/* ---------- Análisis con IA ---------- */}
          <Tarjeta style={{ gap: 8 }}>
            <Text style={s.titulo}>Análisis de abastecimiento</Text>
            <Text style={s.sub}>
              La IA redacta alertas y recomendaciones a partir de los números calculados. Solo recibe datos de inventario, nunca de pacientes.
            </Text>
            <Boton texto={analisis ? "Volver a analizar" : "Generar análisis con IA"} onPress={analizar} cargando={analizando} />
            {analisis && (
              <View style={{ gap: 6, marginTop: 4 }}>
                <View style={s.fila}>
                  <Etiqueta texto={analisis.origen === "ia" ? "Generado con IA" : "Análisis por reglas"} tono={analisis.origen === "ia" ? "info" : "neutral"} />
                  <Text style={s.meta}>{analisis.articulos_analizados} artículos analizados</Text>
                </View>
                {!!analisis.aviso && <Aviso tipo="info" texto={analisis.aviso} />}
                <Text style={s.cuerpo}>{analisis.resumen}</Text>
                {analisis.alertas.map((a, i) => (
                  <Text key={i} style={s.cuerpo}>
                    {a.nivel === "critico" ? "🔴" : a.nivel === "merma" ? "🟠" : "🟡"} <Text style={s.negrita}>{a.articulo}:</Text> {a.detalle}
                  </Text>
                ))}
                {analisis.recomendaciones.length > 0 && <Text style={[s.titulo, { marginTop: 6 }]}>Recomendaciones</Text>}
                {analisis.recomendaciones.map((r, i) => (
                  <Text key={i} style={s.cuerpo}>• {r}</Text>
                ))}
                {!!analisis.observaciones && <Text style={s.meta}>{analisis.observaciones}</Text>}
              </View>
            )}
          </Tarjeta>

          {/* ---------- Consumo mensual ---------- */}
          {panel && (
            <Tarjeta style={{ gap: 8 }}>
              <Text style={s.titulo}>Consumo mensual (unidades)</Text>
              <ColumnasApiladas
                descripcion="Consumo mensual de medicamentos e insumos en los últimos seis meses"
                datos={panel.consumo_mensual.map((m) => ({ etiqueta: nombreMes(m.mes), valores: [m.medicamentos, m.insumos] }))}
                series={[{ nombre: "Medicamentos", color: COLOR.medicamentos }, { nombre: "Insumos", color: COLOR.insumos }]}
              />
            </Tarjeta>
          )}

          {/* ---------- Más consumidos ---------- */}
          {panel && (
            <Tarjeta style={{ gap: 8 }}>
              <Text style={s.titulo}>Más consumidos (últimos 90 días)</Text>
              {panel.top_consumo_90d.length === 0 ? (
                <Vacio texto="Aún no hay consumos registrados." />
              ) : (
                <BarrasHorizontales
                  descripcion="Los diez artículos más consumidos en los últimos 90 días"
                  datos={panel.top_consumo_90d.map((t) => ({
                    etiqueta: t.nombre,
                    valor: t.unidades,
                    color: t.tipo_articulo === "medicamento" ? COLOR.medicamentos : COLOR.insumos,
                  }))}
                />
              )}
            </Tarjeta>
          )}

          {/* ---------- Estado de caducidad ---------- */}
          {cad && (
            <Tarjeta style={{ gap: 8 }}>
              <Text style={s.titulo}>Estado de caducidad (unidades en existencia)</Text>
              <BarraSegmentada
                descripcion="Unidades en existencia según su fecha de caducidad"
                segmentos={[
                  { nombre: "Vencido", valor: cad.vencido, color: COLOR.peligro },
                  { nombre: "Vence en 30 días", valor: cad.por_vencer_30, color: COLOR.aviso },
                  { nombre: "Vence en 31-90 días", valor: cad.por_vencer_90, color: "#E0B04A" },
                  { nombre: "Vigente", valor: cad.vigente, color: COLOR.ok },
                  { nombre: "Sin caducidad", valor: cad.sin_fecha, color: COLOR.neutro },
                ]}
              />
            </Tarjeta>
          )}

          {/* ---------- Pronóstico ---------- */}
          {pred && (
            <>
              <Tarjeta style={{ gap: 8 }}>
                <Text style={s.titulo}>Lo que más se ocupará en los próximos {pred.horizonte_dias} días</Text>
                {pred.mas_demandados.length === 0 ? (
                  <Vacio texto="Aún no hay historial suficiente para pronosticar." />
                ) : (
                  <BarrasHorizontales
                    descripcion="Artículos con mayor demanda esperada"
                    datos={pred.mas_demandados.map((d) => ({
                      etiqueta: d.nombre,
                      valor: d.pronostico_horizonte,
                      color: d.tipo_articulo === "medicamento" ? COLOR.medicamentos : COLOR.insumos,
                    }))}
                  />
                )}
                <Text style={s.meta}>{pred.nota}</Text>
              </Tarjeta>

              <Text style={s.seccion}>Reposición sugerida</Text>
              {reposicion.length === 0 ? (
                <Vacio texto="No hay artículos en riesgo con la demanda esperada." />
              ) : (
                reposicion.map((i) => (
                  <Tarjeta key={i.medicamento_id} style={{ gap: 6 }}>
                    <View style={s.fila}>
                      <Text style={[s.titulo, { flex: 1 }]}>{i.nombre}</Text>
                      <Etiqueta texto={TEXTO_RIESGO[i.riesgo]} tono={TONO_RIESGO[i.riesgo]} />
                    </View>
                    <Text style={s.meta}>
                      {TIPO_TEXTO[i.tipo_articulo]} · existencia {i.stock_vigente} {i.unidad_medida ?? "u."}
                      {i.cobertura_dias !== null ? ` · alcanza ~${i.cobertura_dias} días` : ""}
                    </Text>
                    <View style={s.fila}>
                      <Sparkline serie={i.serie_semanal} color={i.tipo_articulo === "medicamento" ? COLOR.medicamentos : COLOR.insumos} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.cuerpo}>
                          Demanda esperada: <Text style={s.negrita}>{i.pronostico_horizonte}</Text>
                          {i.tendencia_pct !== null ? `  (${i.tendencia_pct > 0 ? "▲" : "▼"} ${Math.abs(i.tendencia_pct)}% vs. periodo previo)` : ""}
                        </Text>
                        {i.sugerido_pedir > 0 && (
                          <Text style={[s.cuerpo, { color: C.primario }]}>
                            Pedir sugerido: <Text style={s.negrita}>{i.sugerido_pedir} {i.unidad_medida ?? "u."}</Text>
                          </Text>
                        )}
                        {i.excedente_por_vencer > 0 && (
                          <Text style={[s.cuerpo, { color: C.aviso }]}>⚠ {i.excedente_por_vencer} u. vencerán antes de usarse</Text>
                        )}
                      </View>
                    </View>
                    <Text style={s.meta}>
                      Confianza {i.confianza.replace("_", " ")}
                      {i.error_backtest_pct !== null ? ` · error típico ${i.error_backtest_pct}%` : ""}
                    </Text>
                  </Tarjeta>
                ))
              )}
            </>
          )}
        </>
      )}
    </PantallaC2>
  );
}

const s = StyleSheet.create({
  titulo: { fontSize: 15, fontWeight: "800", color: C.titulo },
  seccion: { fontSize: 14, fontWeight: "800", color: C.titulo, marginTop: 6 },
  sub: { fontSize: 12.5, color: C.texto2 },
  cuerpo: { fontSize: 13.5, color: C.texto, lineHeight: 19 },
  negrita: { fontWeight: "800" },
  meta: { fontSize: 11.5, color: C.muted },
  fila: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
});
