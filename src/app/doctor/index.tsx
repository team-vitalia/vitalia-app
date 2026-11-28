
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { Download } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import {
  AccionCard,
  EmptyState,
  FondoLuces,
  Footer,
  Glass,
  HeroSaludo,
  InfoCard,
  Notice,
  SectionTitle,
  TabsBar,
  type TabItem,
} from "../../components/DashboardUI";
import DocumentoContrato from "../../components/DocumentoContrato";
import SalasDoctor from "../../components/SalasDoctor";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { useTheme } from "../../theme/theme";
import { generarHtmlContrato } from "../../utils/contratoPdf";
declare const require: (id: string) => any;

const ND = Platform.OS !== "web";
const TAM_PAGINA = [10, 25, 50];

const TABS_DOCTOR: TabItem[] = [
  { key: "resumen", label: "Resumen", icon: "speedometer-outline" },
  { key: "salas", label: "Mi sala y horarios", icon: "calendar-outline" },
];

export default function DoctorScreen() {
  const router = useRouter();
  const { usuario, token } = useAuth();
  const c = useTheme();
  const { width } = useWindowDimensions();

  const [descargandoId, setDescargandoId] = useState<number | null>(null);

  const { pad, esc, cols } = useMemo(() => {
    const esc = width < 560 ? 1 : width < 900 ? 1.06 : 1.12;
    const pad = width < 400 ? 14 : width < 560 ? 18 : width < 1024 ? 26 : 34;
    const cols = width < 560 ? 1 : 2;

    return { pad, esc, cols };
  }, [width]);

  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.quad),
      useNativeDriver: ND,
    }).start();
  }, []);

  /* ---------- Tabs con pager horizontal ---------- */
  const [pager, setPager] = useState({ w: 0, h: 0 });
  const [tab, setTab] = useState(0);

  const tabRef = useRef(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const pagerRef = useRef<any>(null);

  const irATab = (i: number) => {
    tabRef.current = i;
    setTab(i);
    pagerRef.current?.scrollTo({
      x: i * pager.w,
      animated: true,
    });
  };

  const onScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        {
          useNativeDriver: ND,
          listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            if (!pager.w) return;

            const i = Math.round(
              e.nativeEvent.contentOffset.x / pager.w,
            );

            if (i !== tabRef.current) {
              tabRef.current = i;
              setTab(i);
            }
          },
        },
      ),
    [pager.w],
  );

  const obtenerNombreCompleto = () => {
    if (usuario?.nombre_completo?.trim()) {
      return usuario.nombre_completo.trim();
    }

    return [
      usuario?.nombre,
      usuario?.apellido_paterno,
      usuario?.apellido_materno,
    ]
      .filter(
        (parte) =>
          typeof parte === "string" && parte.trim().length > 0,
      )
      .map((parte) => parte!.trim())
      .join(" ") || "Médico";
  };

  useEffect(() => {
    if (pager.w) {
      pagerRef.current?.scrollTo({
        x: tabRef.current * pager.w,
        animated: false,
      });
    }
  }, [pager.w]);

  /* ---------- Contratos ---------- */
  const [modalContrato, setModalContrato] = useState(false);
  const [contratoSeleccionado, setContratoSeleccionado] =
    useState<any | null>(null);
  const [nombreDoctor, setNombreDoctor] = useState("");
  const [cargandoContrato, setCargandoContrato] = useState(false);
  const [errorContrato, setErrorContrato] = useState("");
  const [contratos, setContratos] = useState<any[]>([]);

  /* ---------- Paginación de contratos ---------- */
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  const totalPaginas = Math.max(
    1,
    Math.ceil(contratos.length / porPagina),
  );

  const paginaSegura = Math.min(paginaActual, totalPaginas);

  const desde =
    contratos.length === 0
      ? 0
      : (paginaSegura - 1) * porPagina + 1;

  const hasta = Math.min(
    paginaSegura * porPagina,
    contratos.length,
  );

  const contratosPaginados = useMemo(() => {
    const inicio = (paginaSegura - 1) * porPagina;

    return contratos.slice(inicio, inicio + porPagina);
  }, [contratos, paginaSegura, porPagina]);

  const paginasVisibles = Array.from(
    { length: totalPaginas },
    (_, i) => i + 1,
  );

  const obtenerSaludo = () => {
    const hora = new Date().getHours();

    if (hora < 12) return "Buenos días";
    if (hora < 19) return "Buenas tardes";

    return "Buenas noches";
  };

  const abrirContrato = async () => {
    setPaginaActual(1);
    setPorPagina(10);

    setModalContrato(true);
    setCargandoContrato(true);
    setErrorContrato("");
    setContratos([]);
    setContratoSeleccionado(null);

    try {
      if (!token) {
        setErrorContrato(
          "Tu sesión ha expirado. Inicia sesión nuevamente.",
        );
        return;
      }

      const respuesta = await api.get(
        "/api/contratos/mi-contrato",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = respuesta.data;

      const listaContratos = Array.isArray(data)
        ? data
        : Array.isArray(data?.contratos)
          ? data.contratos
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.resultados)
              ? data.resultados
              : data?.id_PK != null
                ? [data]
                : [];

      if (listaContratos.length === 0) {
        setErrorContrato("No tienes contratos registrados.");
        return;
      }

      const contratosOrdenados = [...listaContratos].sort(
        (a, b) => Number(b.id_PK) - Number(a.id_PK),
      );

      setContratos(contratosOrdenados);
      setNombreDoctor(obtenerNombreCompleto());
    } catch (err: any) {
      const detalle = err?.response?.data?.detail;

      setErrorContrato(
        typeof detalle === "string"
          ? detalle
          : "No fue posible consultar tus contratos.",
      );
    } finally {
      setCargandoContrato(false);
    }
  };

  /* ---------- Descargar contrato ---------- */
  
  const descargarContrato = async (contrato: any) => {
    if (
      !contrato ||
      contrato.id_PK == null ||
      descargandoId !== null
    ) {
      return;
    }

    const id = Number(contrato.id_PK);
    setDescargandoId(id);

    try {
      const html = generarHtmlContrato(
        contrato,
        nombreDoctor || "Médico",
      );

      if (Platform.OS === "web") {
        if (
          typeof window === "undefined" ||
          typeof document === "undefined"
        ) {
          throw new Error(
            "La descarga solo está disponible en el navegador.",
          );
        }

        const modulo = require("html2pdf.js");
        const html2pdf = modulo.default || modulo;

        const documento = new DOMParser().parseFromString(
          html,
          "text/html",
        );

        const estilosTemporales: HTMLElement[] = [];

        documento.head
          .querySelectorAll('style, link[rel="stylesheet"]')
          .forEach((estilo) => {
            const copia = estilo.cloneNode(true) as HTMLElement;
            document.head.appendChild(copia);
            estilosTemporales.push(copia);
          });

        const contenedor = document.createElement("div");

        contenedor.innerHTML = documento.body.innerHTML;

        Object.assign(contenedor.style, {
          width: "190mm",
          maxWidth: "190mm",
          minWidth: "0",
          boxSizing: "border-box",
          padding: "0",
          margin: "0 auto",
          backgroundColor: "#FFFFFF",
          color: "#000000",
          overflow: "visible",
          position: "relative",
        });

        document.body.appendChild(contenedor);

        try {
          if (document.fonts?.ready) {
            await document.fonts.ready;
          }

          // Esperar a que el navegador calcule las dimensiones.
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve());
          });

          const anchoReal = contenedor.getBoundingClientRect().width;

          // Detectar elementos que exceden el ancho del documento.
          const elementosDesbordados = Array.from(
            contenedor.querySelectorAll<HTMLElement>("*"),
          )
            .map((elemento) => ({
              elemento,
              rect: elemento.getBoundingClientRect(),
            }))
            .filter(
              ({ rect }) =>
                rect.right >
                contenedor.getBoundingClientRect().right + 1,
            );

          if (elementosDesbordados.length > 0) {
            console.warn(
              "Elementos que exceden el ancho del PDF:",
              elementosDesbordados.map(({ elemento }) => ({
                elemento: elemento.tagName,
                clase: elemento.className,
                ancho: elemento.getBoundingClientRect().width,
              })),
            );
          }

          console.log("Ancho del contenedor PDF:", anchoReal);
          console.log(
            "Ancho de contenido:",
            contenedor.scrollWidth,
          );

          const opcionesPdf = {
            margin: [10, 10, 10, 10],
            filename: `Contrato-${id}.pdf`,

            image: {
              type: "jpeg",
              quality: 0.98,
            },

            html2canvas: {
              scale: 2,
              useCORS: true,
              backgroundColor: "#FFFFFF",
              logging: false,
              scrollX: 0,
              scrollY: 0,
              windowWidth: document.documentElement.clientWidth,
            },

            jsPDF: {
              unit: "mm",
              format: "a4",
              orientation: "portrait",
              compress: true,
            },

            pagebreak: {
              mode: ["css", "legacy"],
              avoid: [
                ".encabezado",
                ".campo",
                ".columnas",
                ".pie",
                "h3",
              ],
            },
          };

          await html2pdf()
            .set(opcionesPdf as any)
            .from(contenedor)
            .save();
        } finally {
          contenedor.remove();

          estilosTemporales.forEach((estilo) => {
            estilo.remove();
          });
        }

        return;
      }

      // Android e iOS
      const archivo = await Print.printToFileAsync({
        html,
        width: 595.28,
        height: 841.89,
        margins: {
          top: 28,
          bottom: 28,
          left: 28,
          right: 28,
        },
      });

      const disponible = await Sharing.isAvailableAsync();

      if (!disponible) {
        throw new Error(
          "No está disponible la opción para compartir o guardar el PDF.",
        );
      }

      await Sharing.shareAsync(archivo.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Guardar contrato PDF",
      });
    } catch (error) {
      console.error("Error al descargar contrato:", error);

      console.error(
        "Detalles:",
        error instanceof Error ? error.message : error,
      );
    } finally {
      setDescargandoId(null);
    }
  };

  /* ---------- Helper para páginas ---------- */
  const pagina = (key: string, children: React.ReactNode) => (
    <View
      key={key}
      style={{
        width: pager.w,
        height: pager.h,
      }}
    >
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: pad,
          paddingTop: 16,
          paddingBottom: 40,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 1100,
            alignSelf: "center",
          }}
        >
          {children}
        </View>
      </ScrollView>
    </View>
  );

  const anchoAcceso = cols === 1 ? "100%" : "48.5%";

  const accesos = [
    {
      icon: "time-outline" as const,
      color: c.info,
      titulo: "Mis consultas",
      desc: "Consulta tus citas y pacientes programados.",
      onPress: () => router.push("/doctor/consultas"),
    },
    {
      icon: "people-outline" as const,
      color: c.success,
      titulo: "Mis pacientes",
      desc: "Consulta la información de los pacientes asignados.",
      onPress: () => router.push("/doctor/pacientes"),
    },
    {
      icon: "document-text-outline" as const,
      color: c.primary,
      titulo: "Expedientes clínicos",
      desc: "Accede y consulta los expedientes de tus pacientes.",
      onPress: () => router.push("/doctor/pacientes"),
    },
    {
      icon: "create-outline" as const,
      color: c.warning,
      titulo: "Mi perfil profesional",
      desc: "Consulta y edita tu licencia, costo y especialidades.",
      onPress: () => router.push("/doctor/perfil"),
    },
    {
      icon: "medkit-outline" as const,
      color: c.info,
      titulo: "Evaluador de Interacciones",
      desc: "Verifica incompatibilidades farmacológicas entre medicamentos.",
      onPress: () => router.push("/doctor/evaluar-interacciones"),
    },
    {
      icon: "document-outline" as const,
      color: c.primary,
      titulo: "Mis contratos",
      desc: "Consulta y visualiza tus contratos profesionales.",
      onPress: abrirContrato,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FondoLuces c={c} />

      <Animated.View style={{ flex: 1, opacity: fade }}>
        {/* Cabecera fija */}
        <View
          style={{
            paddingHorizontal: pad,
            paddingTop: 14,
            alignItems: "center",
          }}
        >
          <View style={{ width: "100%", maxWidth: 1100 }}>
            <HeroSaludo
              c={c}
              esc={esc}
              saludo={obtenerSaludo()}
              nombre={usuario?.nombre || "Doctor"}
              rol="Doctor"
            />

            <TabsBar
              c={c}
              esc={esc}
              tabs={TABS_DOCTOR}
              activa={tab}
              scrollX={scrollX}
              anchoPagina={pager.w}
              mostrarIconos={width >= 440}
              onSelect={irATab}
            />
          </View>
        </View>

        {/* Páginas */}
        <View
          style={{
            flex: 1,
            minHeight: 0,
            marginTop: 6,
          }}
          onLayout={(e) =>
            setPager({
              w: e.nativeEvent.layout.width,
              h: e.nativeEvent.layout.height,
            })
          }
        >
          {pager.w > 0 && pager.h > 0 && (
            <Animated.ScrollView
              ref={pagerRef}
              horizontal
              pagingEnabled
              bounces={false}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={onScroll}
              style={{
                width: pager.w,
                height: pager.h,
              }}
            >
              {/* TAB 1: Resumen */}
              {pagina(
                "resumen",
                <>
                  <SectionTitle
                    c={c}
                    esc={esc}
                    icon="speedometer-outline"
                    color={c.info}
                  >
                    Resumen de hoy
                  </SectionTitle>

                  <View
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      marginBottom: 4,
                    }}
                  >
                    <InfoCard
                      c={c}
                      esc={esc}
                      icon="time-outline"
                      color={c.info}
                      valor={0}
                      label="Consultas programadas"
                    />

                    <InfoCard
                      c={c}
                      esc={esc}
                      icon="people-outline"
                      color={c.success}
                      valor={0}
                      label="Pacientes en atención"
                    />
                  </View>

                  <SectionTitle
                    c={c}
                    esc={esc}
                    icon="flash-outline"
                    color={c.primary}
                  >
                    Accesos rápidos
                  </SectionTitle>

                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                    }}
                  >
                    {accesos.map((a) => (
                      <View
                        key={a.titulo}
                        style={{ width: anchoAcceso }}
                      >
                        <AccionCard
                          c={c}
                          esc={esc}
                          icon={a.icon}
                          color={a.color}
                          titulo={a.titulo}
                          descripcion={a.desc}
                          onPress={a.onPress}
                        />
                      </View>
                    ))}
                  </View>

                  <Notice
                    c={c}
                    esc={esc}
                    icon="shield-checkmark-outline"
                    titulo="Sistema listo"
                    texto="Tu sesión está activa y protegida."
                  />

                  <Footer c={c} esc={esc} />
                </>,
              )}

              {/* TAB 2: Salas y horarios */}
              {pagina(
                "salas",
                <>
                  <SectionTitle
                    c={c}
                    esc={esc}
                    icon="business-outline"
                    color={c.success}
                  >
                    Mi sala y horarios
                  </SectionTitle>

                  <SalasDoctor />

                  <EmptyState
                    c={c}
                    esc={esc}
                    icon="calendar-outline"
                    titulo="Sin horarios asignados"
                    texto="Cuando el administrador te asigne una sala o un horario, aparecerá aquí automáticamente."
                  />

                  <Footer c={c} esc={esc} />
                </>,
              )}
            </Animated.ScrollView>
          )}
        </View>
      </Animated.View>

      {/* Modal de contratos */}
      <Modal
        visible={modalContrato}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={false}
        onRequestClose={() => {
          if (contratoSeleccionado) {
            setContratoSeleccionado(null);
          } else {
            setModalContrato(false);
          }
        }}
      >
        <SafeAreaProvider>
          <SafeAreaView
            edges={["top", "bottom"]}
            style={{
              flex: 1,
              backgroundColor: c.bg,
            }}
          >
            {/* Encabezado del modal */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: width < 400 ? 14 : 20,
                paddingVertical: 12,
                backgroundColor: c.card,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
                gap: 12,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontSize: width < 400 ? 17 : 20,
                    fontWeight: "700",
                    color: c.primary,
                    flexShrink: 1,
                  }}
                  numberOfLines={1}
                >
                  {contratoSeleccionado
                    ? "Vista previa del contrato"
                    : "Mis contratos"}
                </Text>

                <Text
                  style={{
                    fontSize: 12,
                    color: c.muted,
                    marginTop: 4,
                  }}
                  numberOfLines={1}
                >
                  {contratoSeleccionado
                    ? `Contrato CT-${String(
                        contratoSeleccionado.id_PK,
                      ).padStart(4, "0")} · VITALIA`
                    : "VITALIA · Documentos contractuales"}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {/* Descargar PDF */}
                {contratoSeleccionado && (
                  <Pressable
                    onPress={() =>
                      descargarContrato(contratoSeleccionado)
                    }
                    disabled={descargandoId !== null}
                    accessibilityRole="button"
                    accessibilityLabel="Descargar contrato PDF"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      backgroundColor: "#08BFA4",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: descargandoId !== null ? 0.6 : 1,
                    }}
                  >
                    {descargandoId ===
                    Number(contratoSeleccionado.id_PK) ? (
                      <ActivityIndicator
                        color="#FFFFFF"
                        size="small"
                      />
                    ) : (
                      <Download
                        size={20}
                        color="#FFFFFF"
                        strokeWidth={2.2}
                      />
                    )}
                  </Pressable>
                )}

                {/* Volver o cerrar */}
                <Pressable
                  onPress={() => {
                    if (contratoSeleccionado) {
                      setContratoSeleccionado(null);
                    } else {
                      setModalContrato(false);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    contratoSeleccionado
                      ? "Volver a mis contratos"
                      : "Cerrar contratos"
                  }
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: c.activeBg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={
                      contratoSeleccionado
                        ? "arrow-back"
                        : "close"
                    }
                    size={22}
                    color={c.primary}
                  />
                </Pressable>
              </View>
            </View>

            {/* Contenido del modal */}
            {cargandoContrato ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 24,
                }}
              >
                <Ionicons
                  name="document-text-outline"
                  size={22}
                  color={c.primary}
                />

                <Text
                  style={{
                    marginTop: 10,
                    color: c.muted,
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  Consultando contratos y documentos disponibles…
                </Text>

                <View
                  style={{
                    width: "100%",
                    maxWidth: 360,
                    gap: 8,
                    marginTop: 14,
                  }}
                >
                  <View
                    style={{
                      height: 12,
                      width: "72%",
                      borderRadius: 6,
                      backgroundColor: c.border,
                    }}
                  />

                  <View
                    style={{
                      height: 42,
                      width: "100%",
                      borderRadius: 10,
                      backgroundColor: c.border,
                      opacity: 0.65,
                    }}
                  />
                </View>
              </View>
            ) : errorContrato ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 28,
                }}
              >
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "700",
                    color: c.error,
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  No se pudieron mostrar los contratos
                </Text>

                <Text
                  style={{
                    color: c.muted,
                    textAlign: "center",
                    fontSize: 14,
                    lineHeight: 21,
                  }}
                >
                  {errorContrato}
                </Text>

                <Pressable
                  onPress={() => setModalContrato(false)}
                  style={{
                    marginTop: 20,
                    backgroundColor: c.primary,
                    paddingHorizontal: 22,
                    paddingVertical: 12,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontWeight: "600",
                    }}
                  >
                    Regresar
                  </Text>
                </Pressable>
              </View>
            ) : contratoSeleccionado ? (
              <View
                style={{
                  flex: 1,
                  backgroundColor: c.bg,
                }}
              >
                <View style={{ flex: 1 }}>
                  <DocumentoContrato
                    contrato={contratoSeleccionado}
                    nombreDoctor={nombreDoctor}
                  />
                </View>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={{
                  padding: 20,
                  paddingBottom: 40,
                }}
                showsVerticalScrollIndicator={false}
              >
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "800",
                    color: c.text,
                    marginBottom: 6,
                  }}
                >
                  Historial de contratos
                </Text>

                <Text
                  style={{
                    fontSize: 14,
                    color: c.muted,
                    lineHeight: 21,
                    marginBottom: 20,
                  }}
                >
                  Selecciona un contrato para consultar sus condiciones,
                  fechas, remuneración y estado.
                </Text>

                {contratos.length === 0 ? (
                  <Glass
                    c={c}
                    radius={16}
                    style={{
                      padding: 24,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        color: c.muted,
                        textAlign: "center",
                      }}
                    >
                      No tienes contratos registrados.
                    </Text>
                  </Glass>
                ) : (
                  <>
                    {/* Tarjetas de contratos de la página actual */}
                    {contratosPaginados.map((contrato) => (
                      <Pressable
                        key={contrato.id_PK}
                        onPress={() =>
                          setContratoSeleccionado(contrato)
                        }
                        style={({ pressed }) => ({
                          marginBottom: 12,
                          opacity: pressed ? 0.85 : 1,
                        })}
                      >
                        <Glass
                          c={c}
                          radius={16}
                          style={{ padding: 16 }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <View
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                backgroundColor: c.activeBg,
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 12,
                              }}
                            >
                              <Ionicons
                                name="document-text-outline"
                                size={20}
                                color={c.primary}
                              />
                            </View>

                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  fontSize: 15,
                                  fontWeight: "800",
                                  color: c.text,
                                }}
                              >
                                Contrato CT-
                                {String(contrato.id_PK).padStart(4, "0")}
                              </Text>

                              <Text
                                style={{
                                  fontSize: 12,
                                  color: c.muted,
                                  marginTop: 3,
                                }}
                              >
                                {contrato.tipo_contrato ||
                                  "Tipo no especificado"}
                              </Text>
                            </View>

                            <Ionicons
                              name="chevron-forward"
                              size={18}
                              color={c.muted}
                            />
                          </View>
                        </Glass>
                      </Pressable>
                    ))}

                    
                    {/* Paginación al final de la lista */}
                    <View
                      style={{
                        marginTop: 10,
                        marginBottom: 15,
                        paddingTop: 18,
                        paddingBottom: 10,
                        borderTopWidth: 1,
                        borderTopColor: c.border,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "nowrap",
                        gap: 8,
                      }}
                    >
                      {/* Información de registros */}
                      <Text
                        style={{
                          fontSize: 11,
                          color: c.muted,
                          flexShrink: 0,
                        }}
                      >
                        Mostrando {desde}–{hasta} de {contratos.length} contratos
                      </Text>

                      {/* Navegación de páginas */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          flexShrink: 0,
                        }}
                      >
                        <Pressable
                          disabled={paginaSegura <= 1}
                          onPress={() => setPaginaActual(paginaSegura - 1)}
                          style={{
                            width: 30,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: c.activeBg,
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: paginaSegura <= 1 ? 0.4 : 1,
                          }}
                        >
                          <Ionicons name="chevron-back" size={16} color={c.primary} />
                        </Pressable>

                        {paginasVisibles.map((p) => (
                          <Pressable
                            key={p}
                            onPress={() => setPaginaActual(p)}
                            style={{
                              minWidth: 30,
                              height: 32,
                              paddingHorizontal: 6,
                              borderRadius: 8,
                              backgroundColor:
                                p === paginaSegura ? c.primary : c.activeBg,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "700",
                                color: p === paginaSegura ? "#FFFFFF" : c.text,
                              }}
                            >
                              {p}
                            </Text>
                          </Pressable>
                        ))}

                        <Pressable
                          disabled={paginaSegura >= totalPaginas}
                          onPress={() => setPaginaActual(paginaSegura + 1)}
                          style={{
                            width: 30,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: c.activeBg,
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: paginaSegura >= totalPaginas ? 0.4 : 1,
                          }}
                        >
                          <Ionicons name="chevron-forward" size={16} color={c.primary} />
                        </Pressable>
                      </View>

                      {/* Registros por página */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          flexShrink: 0,
                        }}
                      >
                        <Text style={{ fontSize: 11, color: c.muted }}>
                          Filas:
                        </Text>

                        {TAM_PAGINA.map((n) => (
                          <Pressable
                            key={n}
                            onPress={() => {
                              setPorPagina(n);
                              setPaginaActual(1);
                            }}
                            style={{
                              paddingHorizontal: 7,
                              paddingVertical: 6,
                              borderRadius: 7,
                              backgroundColor:
                                porPagina === n ? c.primary : c.activeBg,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color: porPagina === n ? "#FFFFFF" : c.text,
                              }}
                            >
                              {n}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>
            )}
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}
