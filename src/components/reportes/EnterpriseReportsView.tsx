import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppTheme } from "../../context/ThemeContext";
import {
  MetricaComparativa,
  ReporteEmpresarialDatos,
  consultarIAReporte,
  descargarReporteEmpresarial,
  mensajeError,
  reporteEmpresarialDatos,
} from "../../services/c2Service";
import { useAccesoC2 } from "../c2/ui";

type TipoReporte = "general" | "citas" | "espera" | "ocupacion" | "inventario" | "recetas";

const TABS: { valor: TipoReporte; etiqueta: string; icono: keyof typeof Ionicons.glyphMap }[] = [
  { valor: "general", etiqueta: "Resumen general", icono: "grid-outline" },
  { valor: "citas", etiqueta: "Citas y médicos", icono: "calendar-outline" },
  { valor: "espera", etiqueta: "Tiempos de espera", icono: "time-outline" },
  { valor: "ocupacion", etiqueta: "Consultorios y salas", icono: "business-outline" },
  { valor: "inventario", etiqueta: "Medicamentos y farmacia", icono: "medkit-outline" },
  { valor: "recetas", etiqueta: "Recetas emitidas", icono: "document-text-outline" },
];

function hoyISO(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

export function EnterpriseReportsView() {
  const { theme: c, isDark } = useAppTheme();
  const { token } = useAccesoC2();

  const [tipo, setTipo] = useState<TipoReporte>("general");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [umbral, setUmbral] = useState("10");

  const [datos, setDatos] = useState<ReporteEmpresarialDatos | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [descargando, setDescargando] = useState<"pdf" | "excel" | null>(null);

  // Asistente para dudas de la clínica
  const [preguntaIA, setPreguntaIA] = useState("");
  const [respuestaIA, setRespuestaIA] = useState("");
  const [consultandoIA, setConsultandoIA] = useState(false);
  const [errorConsultor, setErrorConsultor] = useState("");

  const cargarDatos = useCallback(async () => {
    if (!token) return;
    try {
      setCargando(true);
      setError("");
      const res = await reporteEmpresarialDatos(
        token,
        tipo,
        desde.trim() || undefined,
        hasta.trim() || undefined,
        tipo === "inventario" || tipo === "general" ? Number(umbral) || 10 : undefined
      );
      setDatos(res);
    } catch (e) {
      setError(mensajeError(e, "No se pudieron obtener los datos de la clínica."));
    } finally {
      setCargando(false);
    }
  }, [token, tipo, desde, hasta, umbral]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const aplicarFiltroRapido = (dias: number | null) => {
    if (dias === null) {
      setDesde("");
      setHasta("");
    } else {
      setDesde(hoyISO(-dias));
      setHasta(hoyISO());
    }
  };

  const descargar = async (formato: "pdf" | "excel") => {
    if (!token) return;
    try {
      setDescargando(formato);
      setError("");
      await descargarReporteEmpresarial(token, tipo, formato, {
        desde: desde.trim() || undefined,
        hasta: hasta.trim() || undefined,
        umbral: tipo === "inventario" || tipo === "general" ? Number(umbral) || 10 : undefined,
      });
    } catch (e) {
      setError(mensajeError(e, "No se pudo descargar el reporte."));
    } finally {
      setDescargando(null);
    }
  };

  const enviarPreguntaIA = async (textoPregunta?: string) => {
    const q = (textoPregunta || preguntaIA).trim();
    if (!q || !token) return;
    try {
      setConsultandoIA(true);
      setErrorConsultor("");
      const res = await consultarIAReporte(
        token,
        q,
        tipo,
        desde.trim() || undefined,
        hasta.trim() || undefined
      );
      setRespuestaIA(res.respuesta);
    } catch (e) {
      setErrorConsultor(mensajeError(e, "El asistente no pudo responder en este momento. Intenta nuevamente."));
    } finally {
      setConsultandoIA(false);
    }
  };

  const score = datos?.insights_ia?.score_eficiencia ?? 50;
  const sinActividad =
    (datos?.resumen_general?.total_citas === 0) &&
    (datos?.resumen_general?.horas_ocupadas_totales === 0);

  const scoreColor = sinActividad ? "#64748B" : score >= 80 ? "#10B981" : score >= 65 ? "#F59E0B" : "#EF4444";
  const scoreEtiqueta = sinActividad
    ? "Periodo sin registros"
    : score >= 80
    ? "Excelente ritmo de atención"
    : score >= 65
    ? "Atención médica regular"
    : "Atención sugerida";

  // Datos agregados para vista general
  const metricasGenerales = datos?.tipo === "general" ? datos.resumen_general : null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      {/* Encabezado Principal */}
      <View style={styles.header}>
        <Text style={[styles.titulo, { color: c.text }]}>Reportes</Text>
        <Text style={[styles.subtitulo, { color: c.muted }]}>
          Monitoreo general de citas, médicos, consultorios, tiempos de espera y medicamentos de la clínica.
        </Text>
      </View>

      {/* Selector de Módulos (Tabs) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContainer}>
        {TABS.map((t) => {
          const activo = t.valor === tipo;
          return (
            <Pressable
              key={t.valor}
              onPress={() => setTipo(t.valor)}
              style={[
                styles.tabBtn,
                { backgroundColor: activo ? c.primary : c.card, borderColor: activo ? c.primary : c.border },
              ]}
            >
              <Ionicons name={t.icono} size={16} color={activo ? "#FFFFFF" : c.muted} style={{ marginRight: 6 }} />
              <Text style={[styles.tabTexto, { color: activo ? "#FFFFFF" : c.text }]}>{t.etiqueta}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* PANEL 1: OBSERVACIONES Y RESUMEN DE LA CLÍNICA */}
      <View style={[styles.cardIA, { backgroundColor: isDark ? "#0A2926" : "#F0FDFA", borderColor: "#99F6E4" }]}>
        <View style={styles.cardIAHeader}>
          <View style={styles.iaTag}>
            <Ionicons name="clipboard-outline" size={16} color="#0F766E" />
            <Text style={styles.iaTagTexto}>RESUMEN Y OBSERVACIONES</Text>
          </View>
          <Pressable
            style={styles.btnRegenerar}
            onPress={cargarDatos}
            disabled={cargando}
          >
            <Ionicons name="reload-outline" size={14} color="#0F766E" style={{ marginRight: 4 }} />
            <Text style={styles.btnRegenerarTexto}>Actualizar observaciones</Text>
          </Pressable>
        </View>

        {/* Nivel de actividad y Resumen */}
        <View style={styles.scoreRow}>
          <View style={[styles.scoreCirculo, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreNumero, { color: scoreColor }]}>{score}</Text>
            <Text style={[styles.scorePts, { color: c.muted }]}>/100</Text>
          </View>
          <View style={{ flex: 1, minWidth: 200 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <View style={[styles.puntoScore, { backgroundColor: scoreColor }]} />
              <Text style={[styles.scoreEstado, { color: scoreColor }]}>{scoreEtiqueta}</Text>
            </View>
            <Text style={[styles.resumenTexto, { color: c.text }]}>
              {datos?.insights_ia?.resumen_ejecutivo || "Consultando el estado de la clínica..."}
            </Text>
          </View>
        </View>

        {/* Puntos de Atención / Observaciones */}
        {!!datos?.insights_ia?.alertas_anomalias?.length && (
          <View style={styles.alertasGrid}>
            <Text style={[styles.seccionSubtitulo, { color: c.text }]}>Puntos de atención detectados</Text>
            <View style={styles.alertasFila}>
              {datos.insights_ia.alertas_anomalias.map((a, i) => {
                const esCritico = a.prioridad === "critico";
                const esOptimo = a.prioridad === "optimo";
                const colorBadge = esCritico ? "#DC2626" : esOptimo ? "#16A34A" : "#D97706";
                const bgBadge = esCritico ? "rgba(220,38,38,0.12)" : esOptimo ? "rgba(22,163,74,0.12)" : "rgba(217,119,6,0.12)";
                const etiquetaPrio = esCritico ? "ATENCIÓN SUGERIDA" : esOptimo ? "EN ORDEN" : "POR REVISAR";

                return (
                  <View key={i} style={[styles.alertaCard, { backgroundColor: c.card, borderColor: c.border }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <View style={[styles.alertaBadge, { backgroundColor: bgBadge }]}>
                        <Text style={[styles.alertaBadgeTexto, { color: colorBadge }]}>{etiquetaPrio}</Text>
                      </View>
                      <Text style={[styles.alertaMetrica, { color: colorBadge }]}>{a.metrica}</Text>
                    </View>
                    <Text style={[styles.alertaTitulo, { color: c.text }]}>{a.titulo}</Text>
                    <Text style={[styles.alertaDesc, { color: c.muted }]}>{a.descripcion}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recomendaciones para el equipo médico */}
        {!!datos?.insights_ia?.recomendaciones?.length && (
          <View style={styles.recsBox}>
            <Text style={[styles.seccionSubtitulo, { color: c.text }]}>Recomendaciones para el equipo médico</Text>
            {datos.insights_ia.recomendaciones.map((r, i) => (
              <View key={i} style={[styles.recItem, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={styles.recIcon}>
                  <Ionicons name="medical-outline" size={17} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.recTitulo, { color: c.text }]}>{r.titulo}</Text>
                    <View style={styles.areaTag}><Text style={styles.areaTagTexto}>{r.area}</Text></View>
                  </View>
                  <Text style={[styles.recAccion, { color: c.text }]}>{r.accion}</Text>
                  <Text style={styles.recImpacto}>Objetivo: {r.impacto_esperado}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* FILTROS DE FECHAS Y BOTONES DE DESCARGA */}
      <View style={[styles.filtroCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.filtrosRapidosRow}>
          <Pressable style={[styles.chipFiltro, { borderColor: c.border }]} onPress={() => aplicarFiltroRapido(0)}>
            <Text style={[styles.chipTexto, { color: c.text }]}>Hoy</Text>
          </Pressable>
          <Pressable style={[styles.chipFiltro, { borderColor: c.border }]} onPress={() => aplicarFiltroRapido(7)}>
            <Text style={[styles.chipTexto, { color: c.text }]}>Últimos 7 días</Text>
          </Pressable>
          <Pressable style={[styles.chipFiltro, { borderColor: c.border }]} onPress={() => aplicarFiltroRapido(30)}>
            <Text style={[styles.chipTexto, { color: c.text }]}>Últimos 30 días</Text>
          </Pressable>
          <Pressable style={[styles.chipFiltro, { borderColor: c.border }]} onPress={() => aplicarFiltroRapido(null)}>
            <Text style={[styles.chipTexto, { color: c.text }]}>Todo el historial</Text>
          </Pressable>
        </View>

        <View style={styles.inputsFila}>
          <View style={styles.inputCol}>
            <Text style={[styles.labelInput, { color: c.muted }]}>Desde</Text>
            <TextInput
              value={desde}
              onChangeText={setDesde}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={c.muted}
              style={[styles.inputBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC", borderColor: c.border, color: c.text }]}
            />
          </View>
          <View style={styles.inputCol}>
            <Text style={[styles.labelInput, { color: c.muted }]}>Hasta</Text>
            <TextInput
              value={hasta}
              onChangeText={setHasta}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={c.muted}
              style={[styles.inputBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC", borderColor: c.border, color: c.text }]}
            />
          </View>
        </View>

        <View style={styles.accionesExportRow}>
          <Pressable
            style={[styles.btnFiltrar, { backgroundColor: c.primary }]}
            onPress={cargarDatos}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="search-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.btnFiltrarTexto}>Consultar fechas</Text>
              </>
            )}
          </Pressable>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              style={[styles.btnDescargaPrem, { borderColor: "#DC2626" }]}
              onPress={() => descargar("pdf")}
              disabled={descargando !== null}
            >
              {descargando === "pdf" ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={[styles.btnDescargaPremTexto, { color: "#DC2626" }]}>Descargar PDF</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.btnDescargaPrem, { borderColor: "#16A34A" }]}
              onPress={() => descargar("excel")}
              disabled={descargando !== null}
            >
              {descargando === "excel" ? (
                <ActivityIndicator size="small" color="#16A34A" />
              ) : (
                <>
                  <Ionicons name="grid-outline" size={16} color="#16A34A" style={{ marginRight: 6 }} />
                  <Text style={[styles.btnDescargaPremTexto, { color: "#16A34A" }]}>Descargar Excel</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* COMPARATIVA CON EL PERIODO ANTERIOR */}
      {!!datos?.comparativa?.length && (
        <View style={styles.comparativaSection}>
          <Text style={[styles.seccionTitulo, { color: c.text, marginBottom: 10 }]}>
            Comparativa contra el periodo anterior ({datos.anterior_desde || "Previo"} → {datos.anterior_hasta || "Inicio"})
          </Text>
          <View style={styles.comparativaGrid}>
            {datos.comparativa.map((comp: MetricaComparativa, i: number) => {
              const deltaPositivo = comp.variacion_pct > 0;
              const colorTrend = comp.favorable ? "#10B981" : "#EF4444";
              const iconoTrend = deltaPositivo ? "trending-up" : comp.variacion_pct < 0 ? "trending-down" : "remove";

              return (
                <View key={i} style={[styles.compCard, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[styles.compIndicador, { color: c.muted }]}>{comp.indicador}</Text>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginVertical: 4 }}>
                    <Text style={[styles.compValorActual, { color: c.text }]}>
                      {comp.valor_actual} {comp.unidad}
                    </Text>
                    <Text style={[styles.compValorAnt, { color: c.muted }]}>
                      (anterior: {comp.valor_anterior})
                    </Text>
                  </View>
                  <View style={[styles.trendBadge, { backgroundColor: `${colorTrend}15` }]}>
                    <Ionicons name={iconoTrend as any} size={14} color={colorTrend} style={{ marginRight: 4 }} />
                    <Text style={[styles.trendTexto, { color: colorTrend }]}>
                      {deltaPositivo ? "+" : ""}{comp.variacion_pct}% vs periodo anterior
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* VISTA GENERAL DE TODOS LOS MÓDULOS DE LA CLÍNICA */}
      {tipo === "general" && metricasGenerales && (
        <View style={styles.modulosSection}>
          <Text style={[styles.seccionTitulo, { color: c.text, marginBottom: 10 }]}>
            Estado general de todos los módulos
          </Text>
          <View style={styles.modulosGrid}>
            {/* Módulo 1: Citas Médicas */}
            <View style={[styles.moduloCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.moduloCardHeader}>
                <Ionicons name="calendar" size={18} color="#2563EB" />
                <Text style={[styles.moduloCardTitulo, { color: c.text }]}>Citas Médicas</Text>
              </View>
              <View style={styles.moduloKpiFila}>
                <View>
                  <Text style={[styles.moduloKpiNum, { color: c.text }]}>{metricasGenerales.total_citas}</Text>
                  <Text style={[styles.moduloKpiLabel, { color: c.muted }]}>Total de citas</Text>
                </View>
                <View>
                  <Text style={[styles.moduloKpiNum, { color: "#10B981" }]}>{metricasGenerales.citas_atendidas}</Text>
                  <Text style={[styles.moduloKpiLabel, { color: c.muted }]}>Atendidas</Text>
                </View>
                <View>
                  <Text style={[styles.moduloKpiNum, { color: "#EF4444" }]}>{metricasGenerales.citas_canceladas}</Text>
                  <Text style={[styles.moduloKpiLabel, { color: c.muted }]}>Canceladas</Text>
                </View>
              </View>
            </View>

            {/* Módulo 2: Consultorios y Salas */}
            <View style={[styles.moduloCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.moduloCardHeader}>
                <Ionicons name="business" size={18} color="#0D9488" />
                <Text style={[styles.moduloCardTitulo, { color: c.text }]}>Consultorios y Salas</Text>
              </View>
              <View style={styles.moduloKpiFila}>
                <View>
                  <Text style={[styles.moduloKpiNum, { color: c.text }]}>{metricasGenerales.total_salas}</Text>
                  <Text style={[styles.moduloKpiLabel, { color: c.muted }]}>Consultorios</Text>
                </View>
                <View>
                  <Text style={[styles.moduloKpiNum, { color: "#0D9488" }]}>{metricasGenerales.horas_ocupadas_totales} h</Text>
                  <Text style={[styles.moduloKpiLabel, { color: c.muted }]}>Horas ocupadas</Text>
                </View>
              </View>
            </View>

            {/* Módulo 3: Tiempos de Espera */}
            <View style={[styles.moduloCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.moduloCardHeader}>
                <Ionicons name="time" size={18} color="#D97706" />
                <Text style={[styles.moduloCardTitulo, { color: c.text }]}>Tiempos en Recepción</Text>
              </View>
              <View style={styles.moduloKpiFila}>
                <View>
                  <Text style={[styles.moduloKpiNum, { color: metricasGenerales.espera_promedio_minutos > 20 ? "#EF4444" : "#10B981" }]}>
                    {metricasGenerales.espera_promedio_minutos} min
                  </Text>
                  <Text style={[styles.moduloKpiLabel, { color: c.muted }]}>Espera promedio</Text>
                </View>
                <View>
                  <Text style={[styles.moduloKpiNum, { color: c.text }]}>{metricasGenerales.total_atenciones_espera}</Text>
                  <Text style={[styles.moduloKpiLabel, { color: c.muted }]}>Pacientes en turno</Text>
                </View>
              </View>
            </View>

            {/* Módulo 4: Farmacia y Medicamentos */}
            <View style={[styles.moduloCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.moduloCardHeader}>
                <Ionicons name="medkit" size={18} color="#8B5CF6" />
                <Text style={[styles.moduloCardTitulo, { color: c.text }]}>Farmacia e Inventario</Text>
              </View>
              <View style={styles.moduloKpiFila}>
                <View>
                  <Text style={[styles.moduloKpiNum, { color: metricasGenerales.total_medicamentos_stock_bajo > 0 ? "#EF4444" : "#10B981" }]}>
                    {metricasGenerales.total_medicamentos_stock_bajo}
                  </Text>
                  <Text style={[styles.moduloKpiLabel, { color: c.muted }]}>En existencias bajas</Text>
                </View>
                <View>
                  <Text style={[styles.moduloKpiNum, { color: "#10B981" }]}>
                    {metricasGenerales.total_medicamentos_stock_bajo === 0 ? "Abastecido" : "Revisar"}
                  </Text>
                  <Text style={[styles.moduloKpiLabel, { color: c.muted }]}>Estado general</Text>
                </View>
              </View>
            </View>

            {/* Módulo 5: Recetas Médicas */}
            <View style={[styles.moduloCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.moduloCardHeader}>
                <Ionicons name="document-text" size={18} color="#059669" />
                <Text style={[styles.moduloCardTitulo, { color: c.text }]}>Recetas Médicas</Text>
              </View>
              <View style={styles.moduloKpiFila}>
                <View>
                  <Text style={[styles.moduloKpiNum, { color: c.text }]}>{metricasGenerales.total_recetas}</Text>
                  <Text style={[styles.moduloKpiLabel, { color: c.muted }]}>Recetas emitidas</Text>
                </View>
                <View>
                  <Text style={[styles.moduloKpiNum, { color: c.text }]}>{metricasGenerales.detalle_doctores?.length || 0}</Text>
                  <Text style={[styles.moduloKpiLabel, { color: c.muted }]}>Médicos recetando</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ASISTENTE PARA PREGUNTAS DE LA CLÍNICA */}
      <View style={[styles.consultorCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.consultorHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="help-circle-outline" size={20} color="#0D9488" />
            <Text style={[styles.consultorTitulo, { color: c.text }]}>Preguntas sobre la clínica</Text>
          </View>
          <Text style={[styles.consultorSub, { color: c.muted }]}>
            Consulta dudas sobre pacientes, citas, disponibilidad de consultorios o insumos médicos.
          </Text>
        </View>

        <View style={styles.sugerenciasRow}>
          {[
            "¿Cómo podemos agilizar la atención a los pacientes?",
            "¿Qué médico atendió más consultas en el periodo?",
            "¿Qué medicamentos necesitan reabastecerse pronto?",
          ].map((sug, i) => (
            <Pressable key={i} style={[styles.chipSug, { borderColor: c.border }]} onPress={() => enviarPreguntaIA(sug)}>
              <Text style={[styles.chipSugTexto, { color: c.text }]}>{sug}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.inputConsultaRow}>
          <TextInput
            value={preguntaIA}
            onChangeText={setPreguntaIA}
            placeholder="Escribe una pregunta sobre la clínica..."
            placeholderTextColor={c.muted}
            style={[styles.inputConsulta, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC", borderColor: c.border, color: c.text }]}
            onSubmitEditing={() => enviarPreguntaIA()}
          />
          <Pressable
            style={[styles.btnEnviarConsulta, { backgroundColor: c.primary }]}
            onPress={() => enviarPreguntaIA()}
            disabled={consultandoIA || !preguntaIA.trim()}
          >
            {consultandoIA ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="paper-plane-outline" size={17} color="#FFFFFF" />
            )}
          </Pressable>
        </View>

        {!!errorConsultor && <Text style={styles.errorConsultorTexto}>{errorConsultor}</Text>}

        {!!respuestaIA && (
          <View style={[styles.globoRespuesta, { backgroundColor: isDark ? "rgba(13,148,136,0.15)" : "#E6FFFA", borderColor: "#99F6E4" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Ionicons name="information-circle" size={15} color="#0D9488" />
              <Text style={styles.globoEmisor}>RESPUESTA PARA EL EQUIPO MÉDICO</Text>
            </View>
            <Text style={[styles.globoTexto, { color: c.text }]}>{respuestaIA}</Text>
          </View>
        )}
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, paddingBottom: 50 },
  header: { marginBottom: 16 },
  badgeEmpresarial: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  badgeEmpresarialTexto: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#B45309",
    letterSpacing: 0.6,
  },
  titulo: { fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  subtitulo: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  tabsScroll: { marginBottom: 16 },
  tabsContainer: { gap: 8 },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabTexto: { fontSize: 13, fontWeight: "700" },
  cardIA: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 16,
  },
  cardIAHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  iaTag: { flexDirection: "row", alignItems: "center", gap: 6 },
  iaTagTexto: { fontSize: 11, fontWeight: "800", color: "#0F766E", letterSpacing: 0.5 },
  btnRegenerar: { flexDirection: "row", alignItems: "center" },
  btnRegenerarTexto: { fontSize: 11.5, fontWeight: "700", color: "#0F766E" },
  scoreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  scoreCirculo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  scoreNumero: { fontSize: 26, fontWeight: "900" },
  scorePts: { fontSize: 10, fontWeight: "700", marginTop: -2 },
  puntoScore: { width: 8, height: 8, borderRadius: 4 },
  scoreEstado: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4 },
  resumenTexto: { fontSize: 13.5, lineHeight: 20, fontWeight: "500" },
  seccionSubtitulo: { fontSize: 13, fontWeight: "800", marginBottom: 10, letterSpacing: 0.2 },
  alertasGrid: { marginBottom: 14 },
  alertasFila: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  alertaCard: {
    flex: 1,
    minWidth: 160,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  alertaBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  alertaBadgeTexto: { fontSize: 9.5, fontWeight: "800" },
  alertaMetrica: { fontSize: 11.5, fontWeight: "800" },
  alertaTitulo: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  alertaDesc: { fontSize: 11.5, lineHeight: 16 },
  recsBox: { gap: 8 },
  recItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  recIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(13,148,136,0.12)", alignItems: "center", justifyContent: "center" },
  recTitulo: { fontSize: 13, fontWeight: "800" },
  areaTag: { backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  areaTagTexto: { fontSize: 9.5, fontWeight: "700" },
  recAccion: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  recImpacto: { fontSize: 11, fontWeight: "700", color: "#0F766E", marginTop: 4 },
  filtroCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  filtrosRapidosRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chipFiltro: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, backgroundColor: "rgba(0,0,0,0.02)" },
  chipTexto: { fontSize: 11.5, fontWeight: "600" },
  inputsFila: { flexDirection: "row", gap: 10, marginBottom: 12 },
  inputCol: { flex: 1 },
  labelInput: { fontSize: 11, fontWeight: "700", marginBottom: 4 },
  inputBox: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12.5 },
  accionesExportRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10 },
  btnFiltrar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnFiltrarTexto: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "700" },
  btnDescargaPrem: { flexDirection: "row", alignItems: "center", borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  btnDescargaPremTexto: { fontSize: 12, fontWeight: "700" },
  seccionTitulo: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  comparativaSection: { marginBottom: 16 },
  comparativaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  compCard: { flex: 1, minWidth: 160, borderRadius: 12, borderWidth: 1, padding: 12 },
  compIndicador: { fontSize: 11.5, fontWeight: "700" },
  compValorActual: { fontSize: 18, fontWeight: "900" },
  compValorAnt: { fontSize: 11 },
  trendBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  trendTexto: { fontSize: 10.5, fontWeight: "800" },
  modulosSection: { marginBottom: 16 },
  modulosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  moduloCard: { flex: 1, minWidth: 200, borderRadius: 12, borderWidth: 1, padding: 14 },
  moduloCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  moduloCardTitulo: { fontSize: 13.5, fontWeight: "800" },
  moduloKpiFila: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  moduloKpiNum: { fontSize: 17, fontWeight: "900" },
  moduloKpiLabel: { fontSize: 10.5, marginTop: 2 },
  consultorCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16 },
  consultorHeader: { marginBottom: 12 },
  consultorTitulo: { fontSize: 14.5, fontWeight: "800" },
  consultorSub: { fontSize: 12, marginTop: 2 },
  sugerenciasRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  chipSug: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: "rgba(0,0,0,0.02)" },
  chipSugTexto: { fontSize: 11, fontWeight: "600" },
  inputConsultaRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  inputConsulta: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
  btnEnviarConsulta: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  errorConsultorTexto: { color: "#DC2626", fontSize: 11.5, marginTop: 6 },
  globoRespuesta: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  globoEmisor: { fontSize: 10, fontWeight: "800", color: "#0F766E", letterSpacing: 0.5 },
  globoTexto: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  errorBox: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "rgba(220,38,38,0.1)", borderRadius: 10, marginTop: 10 },
  errorTexto: { color: "#DC2626", fontSize: 12.5, fontWeight: "600" },
});
