import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import {
  BarraCaducidad,
  BarrasConPorcentaje,
  CoberturaBarras,
  ColumnasConTendencia,
  PALETA,
  SparklineRelleno,
  nombreMes,
} from "../../components/Graficas";
import {
  Aviso,
  Boton,
  C,
  Cargando,
  Etiqueta,
  Opciones,
  PantallaC2,
  Tarjeta,
  Tono,
  Vacio,
} from "../../components/c2/ui";
import {
  AnalisisIA,
  PanelAnalitico,
  Prediccion,
  RiesgoStock,
  TipoArticulo,
  getAnalisisIA,
  getPanelAnalitico,
  getPrediccion,
} from "../../services/almacenService";
import { mensajeError } from "../../services/c2Service";

/* ============================================================
   Constantes
============================================================ */

const TONO_RIESGO: Record<RiesgoStock, Tono> = {
  agotado: "danger",
  critico: "danger",
  bajo: "warn",
  ok: "ok",
  sin_movimiento: "neutral",
};
const TEXTO_RIESGO: Record<RiesgoStock, string> = {
  agotado: "Agotado",
  critico: "Crítico",
  bajo: "Stock bajo",
  ok: "Suficiente",
  sin_movimiento: "Sin movimiento",
};
const TIPO_TEXTO: Record<TipoArticulo, string> = {
  medicamento: "Medicamento",
  insumo: "Insumo",
  equipo: "Equipo",
};

type TabInterna = "analisis" | "consumo" | "caducidad" | "pronostico";
const TABS: { key: TabInterna; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "analisis", label: "Análisis IA", icon: "sparkles-outline" },
  { key: "consumo", label: "Consumo", icon: "bar-chart-outline" },
  { key: "caducidad", label: "Caducidad", icon: "time-outline" },
  { key: "pronostico", label: "Pronóstico", icon: "trending-up-outline" },
];

const MAX_ANCHO = 1200; // límite para pantallas grandes

/* ============================================================
   Pantalla
============================================================ */

export default function AnaliticaAlmacen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Breakpoints simples y alineados con el resto de la app
  const esMovil = width < 640;
  const esTablet = width >= 640 && width < 1024;
  const esDesktop = width >= 1024;

  const [horizonte, setHorizonte] = useState<"15" | "30" | "60">("30");
  const [tipo, setTipo] = useState<"todos" | TipoArticulo>("todos");
  const [panel, setPanel] = useState<PanelAnalitico | null>(null);
  const [pred, setPred] = useState<Prediccion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [analisis, setAnalisis] = useState<AnalisisIA | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [tab, setTab] = useState<TabInterna>("analisis");

  const tipoApi = tipo === "todos" ? undefined : tipo;

  const cargar = useCallback(async () => {
    setCargando(true);
    setAnalisis(null);
    try {
      const [p, pr] = await Promise.all([
        getPanelAnalitico(6),
        getPrediccion(Number(horizonte), tipoApi),
      ]);
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
      setTab("analisis");
    } catch (e) {
      setError(mensajeError(e, "No se pudo generar el análisis."));
    } finally {
      setAnalizando(false);
    }
  };

  /* ---------- Derivados ---------- */

  const cad = panel?.caducidad_unidades;
  const reposicion = useMemo(
    () =>
      (pred?.items ?? []).filter(
        (i) =>
          ["agotado", "critico", "bajo"].includes(i.riesgo) || i.excedente_por_vencer > 0
      ),
    [pred]
  );

  const kpis = useMemo(() => {
    const enRiesgo = reposicion.length;
    const vencidos = cad?.vencido ?? 0;
    const porVencer = cad?.por_vencer_30 ?? 0;
    return { enRiesgo, vencidos, porVencer };
  }, [reposicion, cad]);

  /* ---------- Estilos derivados del breakpoint ---------- */

  const kpiCols = esMovil ? 1 : esTablet ? 3 : 3;
  const kpiGap = 10;
  const kpiWidth = `${100 / kpiCols}%` as `${number}%`;

  const contenido2Col = esDesktop;

  /* ---------- Render ---------- */

  return (
    <PantallaC2
      titulo="Analítica y predicción"
      subtitulo="Consumo, caducidades y qué se va a necesitar"
      roles={[1, 5, 6]}
    >
      <View style={[s.contenedor, { maxWidth: MAX_ANCHO }]}>
        {/* ===== Filtros en una fila en desktop, apilados en móvil ===== */}
        <View style={[s.filtrosFila, esDesktop && { flexDirection: "row", alignItems: "center" }]}>
          <View style={[s.filtroBloque, esDesktop && { flex: 1 }]}>
            <Opciones
              valor={horizonte}
              onChange={setHorizonte}
              opciones={[
                { valor: "15", etiqueta: "Próx. 15 días" },
                { valor: "30", etiqueta: "Próx. 30 días" },
                { valor: "60", etiqueta: "Próx. 60 días" },
              ]}
            />
          </View>
          <View style={[s.filtroBloque, esDesktop && { flex: 1, marginLeft: 12 }]}>
            <Opciones
              valor={tipo}
              onChange={setTipo}
              opciones={[
                { valor: "todos", etiqueta: "Todo" },
                { valor: "medicamento", etiqueta: "Medicamentos" },
                { valor: "insumo", etiqueta: "Insumos" },
              ]}
            />
          </View>
        </View>

        {!!error && <Aviso tipo="error" texto={error} />}

        {/* ===== KPIs: grid responsive de 1 / 3 columnas ===== */}
        <View style={[s.kpiGrid, { marginHorizontal: -kpiGap / 2 }]}>
          <View style={{ width: kpiWidth, padding: kpiGap / 2 }}>
            <KpiMini
              icon="alert-circle-outline"
              label="Artículos en riesgo"
              valor={kpis.enRiesgo}
              color={C.peligro}
              onPress={() => setTab("pronostico")}
            />
          </View>
          <View style={{ width: kpiWidth, padding: kpiGap / 2 }}>
            <KpiMini
              icon="skull-outline"
              label="Unidades vencidas"
              valor={kpis.vencidos}
              color={C.peligro}
              onPress={() => setTab("caducidad")}
            />
          </View>
          <View style={{ width: kpiWidth, padding: kpiGap / 2 }}>
            <KpiMini
              icon="time-outline"
              label="Vencen en 30 días"
              valor={kpis.porVencer}
              color={C.aviso}
              onPress={() => setTab("caducidad")}
            />
          </View>
        </View>

        {/* ===== Tabs internas: full width en desktop ===== */}
        <TabsInternas activa={tab} onSelect={setTab} conAnalisis={!!analisis} esDesktop={esDesktop} />

        {cargando && !panel ? (
          <Cargando mensaje="Preparando consumo, caducidades y proyección de demanda…" />
        ) : (
          <>
            {/* ============================================================
                TAB: ANÁLISIS IA
            ============================================================ */}
            {tab === "analisis" && (
              <>
                {!analisis ? (
                  <Tarjeta style={{ gap: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={s.iconoIA}>
                        <Ionicons name="sparkles" size={22} color="#FFFFFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.tituloIA}>Análisis inteligente de abastecimiento</Text>
                        <Text style={s.subIA}>
                          La IA redacta alertas y recomendaciones accionables a partir de los
                          números calculados. Solo recibe datos de inventario, nunca de pacientes.
                        </Text>
                      </View>
                    </View>

                    <View style={{ gap: 6, marginTop: 4 }}>
                      <Bullet texto="Detecta artículos en riesgo de agotarse y sugiere cuánto pedir." />
                      <Bullet texto="Avisa de unidades que caducarán antes de usarse." />
                      <Bullet texto="Prioriza por severidad: crítico, atención e info." />
                    </View>

                    <View style={{ alignSelf: esMovil ? "stretch" : "flex-start", marginTop: 4 }}>
                      <Boton
                        texto="Generar análisis con IA"
                        onPress={analizar}
                        cargando={analizando}
                      />
                    </View>
                  </Tarjeta>
                ) : (
                  <AnalisisPanel
                    analisis={analisis}
                    analizando={analizando}
                    dosColumnas={contenido2Col}
                    onRegenerar={analizar}
                    onIrCaducidades={() => router.push("/almacen/caducidades" as any)}
                    onIrInventario={() => router.push("/admin/inventario" as any)}
                  />
                )}
              </>
            )}

            {/* ============================================================
                TAB: CONSUMO
            ============================================================ */}
            {tab === "consumo" && panel && (
              <View style={[contenido2Col ? s.grid2 : undefined, { gap: 12 }]}>
                <View style={contenido2Col ? { flex: 3 } : undefined}>
                  <Tarjeta style={{ gap: 10 }}>
                    <Text style={s.titulo}>Consumo mensual (unidades)</Text>
                    <Text style={s.sub}>
                      Últimos seis meses, separado por medicamentos e insumos.
                    </Text>
                    <ColumnasConTendencia
                      descripcion="Consumo mensual de medicamentos e insumos en los últimos seis meses"
                      datos={panel.consumo_mensual.map((m) => ({
                        etiqueta: nombreMes(m.mes),
                        valores: [m.medicamentos, m.insumos],
                      }))}
                      series={[
                        { nombre: "Medicamentos", color: PALETA.medicamentos },
                        { nombre: "Insumos", color: PALETA.insumos },
                      ]}
                    />
                  </Tarjeta>
                </View>

                <View style={contenido2Col ? { flex: 2 } : undefined}>
                  <Tarjeta style={{ gap: 10 }}>
                    <Text style={s.titulo}>Más consumidos (últimos 90 días)</Text>
                    {panel.top_consumo_90d.length === 0 ? (
                      <Vacio texto="Aún no hay consumos registrados." />
                    ) : (
                      <BarrasConPorcentaje
                        descripcion="Los diez artículos más consumidos en los últimos 90 días, con porcentaje del total"
                        datos={panel.top_consumo_90d.map((t) => ({
                          etiqueta: t.nombre,
                          valor: t.unidades,
                          color:
                            t.tipo_articulo === "medicamento"
                              ? PALETA.medicamentos
                              : PALETA.insumos,
                        }))}
                      />
                    )}
                  </Tarjeta>
                </View>
              </View>
            )}

            {/* ============================================================
                TAB: CADUCIDAD
            ============================================================ */}
            {tab === "caducidad" && cad && (
              <Tarjeta style={{ gap: 10 }}>
                <Text style={s.titulo}>Estado de caducidad (unidades en existencia)</Text>
                <Text style={s.sub}>
                  Distribución del stock según su fecha de caducidad. Lo urgente se resalta en rojo.
                </Text>
                <BarraCaducidad
                  descripcion="Unidades en existencia según su fecha de caducidad"
                  segmentos={[
                    { nombre: "Vencido", valor: cad.vencido, color: PALETA.vencido },
                    { nombre: "Vence en 30 días", valor: cad.por_vencer_30, color: PALETA.porVencer30 },
                    { nombre: "Vence en 31-90 días", valor: cad.por_vencer_90, color: PALETA.porVencer90 },
                    { nombre: "Vigente", valor: cad.vigente, color: PALETA.vigente },
                    { nombre: "Sin caducidad", valor: cad.sin_fecha, color: PALETA.sinFecha },
                  ]}
                />
              </Tarjeta>
            )}

            {/* ============================================================
                TAB: PRONÓSTICO
            ============================================================ */}
            {tab === "pronostico" && pred && (
              <>
                <View style={[contenido2Col ? s.grid2 : undefined, { gap: 12 }]}>
                  <View style={contenido2Col ? { flex: 1 } : undefined}>
                    <Tarjeta style={{ gap: 10 }}>
                      <Text style={s.titulo}>
                        Lo que más se ocupará en los próximos {pred.horizonte_dias} días
                      </Text>
                      {pred.mas_demandados.length === 0 ? (
                        <Vacio texto="Aún no hay historial suficiente para pronosticar." />
                      ) : (
                        <BarrasConPorcentaje
                          descripcion="Artículos con mayor demanda esperada"
                          datos={pred.mas_demandados.map((d) => ({
                            etiqueta: d.nombre,
                            valor: d.pronostico_horizonte,
                            color:
                              d.tipo_articulo === "medicamento"
                                ? PALETA.medicamentos
                                : PALETA.insumos,
                          }))}
                        />
                      )}
                      <Text style={s.meta}>{pred.nota}</Text>
                    </Tarjeta>
                  </View>

                  <View style={contenido2Col ? { flex: 1 } : undefined}>
                    <Tarjeta style={{ gap: 10 }}>
                      <Text style={s.titulo}>Cobertura vs horizonte</Text>
                      <Text style={s.sub}>
                        Días que alcanza la existencia actual frente al horizonte de{" "}
                        {pred.horizonte_dias} días.
                      </Text>
                      {reposicion.length === 0 ? (
                        <Vacio texto="No hay artículos en riesgo con la demanda esperada." />
                      ) : (
                        <CoberturaBarras
                          descripcion="Días de cobertura de cada artículo frente al horizonte"
                          horizonte={pred.horizonte_dias}
                          items={reposicion.map((i) => ({
                            nombre: i.nombre,
                            coberturaDias: i.cobertura_dias,
                            color:
                              i.riesgo === "agotado" || i.riesgo === "critico"
                                ? PALETA.vencido
                                : i.riesgo === "bajo"
                                ? PALETA.porVencer30
                                : PALETA.vigente,
                          }))}
                        />
                      )}
                    </Tarjeta>
                  </View>
                </View>

                <Text style={s.seccion}>Reposición sugerida</Text>
                {reposicion.length === 0 ? (
                  <Vacio texto="No hay artículos en riesgo con la demanda esperada." />
                ) : (
                  <View style={[s.listaCards, contenido2Col && s.listaCards2Col]}>
                    {reposicion.map((i) => (
                      <View
                        key={i.medicamento_id}
                        style={contenido2Col ? { width: "50%", paddingRight: 6 } : undefined}
                      >
                        <CardReposicion item={i} />
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </View>
    </PantallaC2>
  );
}

/* ============================================================
   Subcomponentes
============================================================ */

function KpiMini({
  icon,
  label,
  valor,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  valor: number;
  color: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={{ width: "100%" }}
    >
      <Tarjeta style={{ padding: 14, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              backgroundColor: color + "22",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={icon} size={16} color={color} />
          </View>
          <Text style={{ fontSize: 11.5, color: C.muted, fontWeight: "700", flex: 1 }} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text style={{ fontSize: 26, fontWeight: "900", color: C.titulo, marginTop: 2 }}>{valor}</Text>
      </Tarjeta>
    </Pressable>
  );
}

function TabsInternas({
  activa,
  onSelect,
  conAnalisis,
  esDesktop,
}: {
  activa: TabInterna;
  onSelect: (t: TabInterna) => void;
  conAnalisis: boolean;
  esDesktop: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: 8,
        paddingVertical: 4,
        flexGrow: esDesktop ? 1 : 0,
      }}
    >
      {TABS.map((t) => {
        const on = activa === t.key;
        const mostrarBadge = t.key === "analisis" && conAnalisis;
        return (
          <Pressable
            key={t.key}
            onPress={() => onSelect(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 999,
              backgroundColor: on ? C.primario : C.tarjeta,
              borderWidth: 1,
              borderColor: on ? C.primario : C.borde,
              flexGrow: esDesktop ? 1 : 0,
            }}
          >
            <Ionicons name={t.icon} size={15} color={on ? "#FFFFFF" : C.primario} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: on ? "#FFFFFF" : C.titulo,
              }}
            >
              {t.label}
            </Text>
            {mostrarBadge && (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: on ? "#FFFFFF" : C.info,
                }}
              />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Bullet({ texto }: { texto: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <Ionicons name="checkmark-circle" size={15} color={C.primario} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, fontSize: 12.5, color: C.texto, lineHeight: 18 }}>{texto}</Text>
    </View>
  );
}

function AnalisisPanel({
  analisis,
  analizando,
  dosColumnas,
  onRegenerar,
  onIrCaducidades,
  onIrInventario,
}: {
  analisis: AnalisisIA;
  analizando: boolean;
  dosColumnas: boolean;
  onRegenerar: () => void;
  onIrCaducidades: () => void;
  onIrInventario: () => void;
}) {
  const esIA = analisis.origen === "ia";
  const accent = esIA ? C.primario : C.muted;

  return (
    <>
      {/* Encabezado con acciones */}
      <Tarjeta style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={esIA ? "sparkles" : "calculator"} size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, minWidth: 200 }}>
            <Text style={{ fontSize: 16, fontWeight: "900", color: C.titulo }}>
              {esIA ? "Análisis generado con IA" : "Análisis por reglas"}
            </Text>
            <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {analisis.articulos_analizados} artículos analizados · solo datos de inventario
            </Text>
          </View>
          <Pressable
            onPress={onRegenerar}
            disabled={analizando}
            accessibilityRole="button"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: C.primarioSuave,
              opacity: analizando ? 0.6 : 1,
            }}
          >
            {analizando ? (
              <ActivityIndicator size="small" color={accent} />
            ) : (
              <Ionicons name="refresh" size={14} color={accent} />
            )}
            <Text style={{ fontSize: 12, fontWeight: "800", color: accent }}>
              {analizando ? "Analizando…" : "Volver a analizar"}
            </Text>
          </Pressable>
        </View>

        {!!analisis.aviso && <Aviso tipo="info" texto={analisis.aviso} />}
      </Tarjeta>

      {/* Contenido en 1 o 2 columnas según ancho */}
      <View style={[dosColumnas ? s.grid2 : undefined, { gap: 12 }]}>
        {/* Columna izquierda: resumen + observaciones */}
        <View style={dosColumnas ? { flex: 2 } : { gap: 12 }}>
          <View
            style={{
              borderRadius: 16,
              padding: 16,
              backgroundColor: C.primarioSuave,
              borderLeftWidth: 4,
              borderLeftColor: accent,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "900", color: accent, letterSpacing: 0.8, marginBottom: 6 }}>
              RESUMEN
            </Text>
            <Text style={{ fontSize: 14.5, color: C.titulo, lineHeight: 22, fontWeight: "600" }}>
              {analisis.resumen}
            </Text>
          </View>

          {!!analisis.observaciones && (
            <Text style={{ fontSize: 11.5, color: C.muted, fontStyle: "italic", lineHeight: 16 }}>
              {analisis.observaciones}
            </Text>
          )}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Boton texto="Ir a caducidades" variante="secundario" onPress={onIrCaducidades} />
            <Boton texto="Ir a inventario" variante="secundario" onPress={onIrInventario} />
          </View>
        </View>

        {/* Columna derecha: alertas + recomendaciones */}
        <View style={dosColumnas ? { flex: 3, gap: 12 } : { gap: 12 }}>
          {analisis.alertas.length > 0 && (
            <>
              <Text style={s.seccion}>Alertas detectadas</Text>
              <View style={{ gap: 8 }}>
                {analisis.alertas.map((a, i) => (
                  <AlertaAnalisis key={i} articulo={a.articulo} detalle={a.detalle} />
                ))}
              </View>
            </>
          )}

          {analisis.recomendaciones.length > 0 && (
            <>
              <Text style={s.seccion}>Recomendaciones</Text>
              <Tarjeta style={{ gap: 10 }}>
                {analisis.recomendaciones.map((r, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: C.primario,
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 1,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "900", color: "#FFFFFF" }}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 13.5, color: C.texto, lineHeight: 19 }}>{r}</Text>
                  </View>
                ))}
              </Tarjeta>
            </>
          )}
        </View>
      </View>
    </>
  );
}

function AlertaAnalisis({ articulo, detalle }: { articulo: string; detalle: string }) {
  const texto = `${articulo} ${detalle}`.toLowerCase();
  const critico =
    /agotad|vencid|cr[ií]tic|urgent|inmediat|caduc/.test(texto) && !/por vencer/.test(texto);
  const atencion = /por vencer|bajo|reabast|excedente|pr[oó]xim/.test(texto);
  const color = critico ? C.peligro : atencion ? C.aviso : C.primario;
  const icono = critico ? "alert-circle" : atencion ? "warning" : "information-circle";
  const etiqueta = critico ? "CRÍTICO" : atencion ? "ATENCIÓN" : "INFO";

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        padding: 14,
        borderRadius: 14,
        backgroundColor: color + "10",
        borderWidth: 1,
        borderColor: color + "40",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          backgroundColor: color + "22",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icono as any} size={18} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: 999,
              backgroundColor: color + "22",
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: "900", color, letterSpacing: 0.6 }}>
              {etiqueta}
            </Text>
          </View>
          <Text style={{ fontSize: 12.5, fontWeight: "900", color: C.titulo, flex: 1 }} numberOfLines={2}>
            {articulo}
          </Text>
        </View>
        <Text style={{ fontSize: 12.5, color: C.texto, lineHeight: 18 }}>{detalle}</Text>
      </View>
    </View>
  );
}

function CardReposicion({ item: i }: { item: Prediccion["items"][number] }) {
  return (
    <Tarjeta style={{ gap: 8, marginBottom: 12 }}>
      <View style={s.fila}>
        <Text style={[s.titulo, { flex: 1 }]}>{i.nombre}</Text>
        <Etiqueta texto={TEXTO_RIESGO[i.riesgo]} tono={TONO_RIESGO[i.riesgo]} />
      </View>
      <Text style={s.meta}>
        {TIPO_TEXTO[i.tipo_articulo]} · existencia {i.stock_vigente} {i.unidad_medida ?? "u."}
        {i.cobertura_dias !== null ? ` · alcanza ~${i.cobertura_dias} días` : ""}
      </Text>

      <View style={{ flexDirection: "row", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <SparklineRelleno
          serie={i.serie_semanal}
          color={i.tipo_articulo === "medicamento" ? PALETA.medicamentos : PALETA.insumos}
          width={120}
          height={38}
        />
        <View style={{ flex: 1, minWidth: 180 }}>
          <Text style={s.cuerpo}>
            Demanda esperada: <Text style={s.negrita}>{i.pronostico_horizonte}</Text>
            {i.tendencia_pct !== null
              ? `  (${i.tendencia_pct > 0 ? "▲" : "▼"} ${Math.abs(i.tendencia_pct)}% vs. periodo previo)`
              : ""}
          </Text>
          {i.sugerido_pedir > 0 && (
            <Text style={[s.cuerpo, { color: C.primario }]}>
              Pedir sugerido:{" "}
              <Text style={s.negrita}>
                {i.sugerido_pedir} {i.unidad_medida ?? "u."}
              </Text>
            </Text>
          )}
          {i.excedente_por_vencer > 0 && (
            <Text style={[s.cuerpo, { color: C.aviso }]}>
              {i.excedente_por_vencer} u. vencerán antes de usarse
            </Text>
          )}
        </View>
      </View>

      <Text style={s.meta}>
        Confianza {i.confianza.replace("_", " ")}
        {i.error_backtest_pct !== null ? ` · error típico ${i.error_backtest_pct}%` : ""}
      </Text>
    </Tarjeta>
  );
}

/* ============================================================
   Estilos
============================================================ */

const s = StyleSheet.create({
  contenedor: { width: "100%", alignSelf: "center", gap: 12 },
  filtrosFila: { gap: 10 },
  filtroBloque: { minWidth: 0 },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap" },

  grid2: { flexDirection: "row", alignItems: "flex-start" },

  listaCards: { flexDirection: "column" },
  listaCards2Col: { flexDirection: "row", flexWrap: "wrap", marginRight: -6 },

  titulo: { fontSize: 15, fontWeight: "800", color: C.titulo },
  tituloIA: { fontSize: 16, fontWeight: "900", color: C.titulo },
  seccion: { fontSize: 14, fontWeight: "900", color: C.titulo, marginTop: 6 },
  sub: { fontSize: 12.5, color: C.texto2 },
  subIA: { fontSize: 12.5, color: C.texto2, marginTop: 2, lineHeight: 18 },
  cuerpo: { fontSize: 13.5, color: C.texto, lineHeight: 19 },
  negrita: { fontWeight: "800" },
  meta: { fontSize: 11.5, color: C.muted },
  fila: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  iconoIA: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.primario,
    alignItems: "center",
    justifyContent: "center",
  },
});