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

const ND = Platform.OS !== "web";

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
    pagerRef.current?.scrollTo({ x: i * pager.w, animated: true });
  };

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: ND,
        listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
          if (!pager.w) return;
          const i = Math.round(e.nativeEvent.contentOffset.x / pager.w);
          if (i !== tabRef.current) {
            tabRef.current = i;
            setTab(i);
          }
        },
      }),
    [pager.w],
  );

  useEffect(() => {
    if (pager.w)
      pagerRef.current?.scrollTo({
        x: tabRef.current * pager.w,
        animated: false,
      });
  }, [pager.w]);

  /* ---------- Lógica de contratos (intacta) ---------- */
  const [modalContrato, setModalContrato] = useState(false);
  const [contratoSeleccionado, setContratoSeleccionado] = useState<any | null>(
    null,
  );
  const [nombreDoctor, setNombreDoctor] = useState("");
  const [cargandoContrato, setCargandoContrato] = useState(false);
  const [errorContrato, setErrorContrato] = useState("");
  const [contratos, setContratos] = useState<any[]>([]);

  const obtenerSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Buenos días";
    if (hora < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  const abrirContrato = async () => {
    setModalContrato(true);
    setCargandoContrato(true);
    setErrorContrato("");
    setContratos([]);
    setContratoSeleccionado(null);
    try {
      if (!token) {
        setErrorContrato("Tu sesión ha expirado. Inicia sesión nuevamente.");
        return;
      }
      const respuesta = await api.get("/api/contratos/mi-contrato", {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      setNombreDoctor(usuario?.nombre?.trim() || "Médico");
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

  
  const descargarContrato = async (contrato: any) => {
    if (!contrato || contrato.id_PK == null || descargandoId !== null) {
      return;
    }

    const id = Number(contrato.id_PK);
    setDescargandoId(id);

    try {
      const html = generarHtmlContrato(
        contrato,
        nombreDoctor || "Médico"
      );

      if (Platform.OS === "web") {
        if (
          typeof window === "undefined" ||
          typeof document === "undefined"
        ) {
          throw new Error(
            "La descarga solo está disponible en el navegador."
          );
        }

        const modulo = await import("html2pdf.js");
        const html2pdf = modulo.default;

        // Leer el HTML completo del contrato.
        const documento = new DOMParser().parseFromString(
          html,
          "text/html"
        );

        // Copiar los estilos originales del contrato.
        const estilosTemporales: HTMLElement[] = [];

        documento.head
          .querySelectorAll('style, link[rel="stylesheet"]')
          .forEach((estilo) => {
            const copia = estilo.cloneNode(true) as HTMLElement;

            document.head.appendChild(copia);
            estilosTemporales.push(copia);
          });

        // Crear el contenedor que se convertirá en PDF.
        const contenedor = document.createElement("div");

        contenedor.innerHTML = documento.body.innerHTML;

        contenedor.style.width = "190mm";
        contenedor.style.maxWidth = "190mm";
        contenedor.style.padding = "0";
        contenedor.style.margin = "0 auto";
        contenedor.style.backgroundColor = "#FFFFFF";
        contenedor.style.color = "#000000";
        contenedor.style.overflow = "visible";

        // IMPORTANTE: mantenerlo dentro del documento.
        // No utilizar left: -10000px ni position: fixed.
        document.body.appendChild(contenedor);

        try {
          // Esperar a que estén disponibles las fuentes.
          if (document.fonts?.ready) {
            await document.fonts.ready;
          }

          // Misma configuración que funciona en administrador.
          const opcionesPdf = {
            margin: [12, 12, 12, 12],
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
            },

            jsPDF: {
              unit: "mm",
              format: "a4",
              orientation: "portrait",
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
          // Retirar el documento temporal.
          if (contenedor.parentNode) {
            contenedor.parentNode.removeChild(contenedor);
          }

          // Retirar los estilos temporales.
          estilosTemporales.forEach((estilo) => {
            estilo.remove();
          });
        }

        return;
      }

      // Android e iOS.
      const archivo = await Print.printToFileAsync({ html });

      const disponible = await Sharing.isAvailableAsync();

      if (!disponible) {
        throw new Error(
          "No está disponible la opción para compartir o guardar el PDF."
        );
      }

      await Sharing.shareAsync(archivo.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Guardar contrato PDF",
      });

    } catch (error) {
      console.error(
        "Error al descargar contrato:",
        error
      );

      console.error(
        "Detalles:",
        error instanceof Error ? error.message : error
      );

    } finally {
      setDescargandoId(null);
    }
  };

  /* ---------- Helper para páginas ---------- */
  const pagina = (key: string, children: React.ReactNode) => (
    <View key={key} style={{ width: pager.w, height: pager.h }}>
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: pad,
          paddingTop: 16,
          paddingBottom: 40,
        }}
      >
        <View style={{ width: "100%", maxWidth: 1100, alignSelf: "center" }}>
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
        {/* Cabecera fija: hero fusionado + tabs */}
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
          style={{ flex: 1, minHeight: 0, marginTop: 6 }}
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
              style={{ width: pager.w, height: pager.h }}
            >
              {/* TAB 1: Resumen + Accesos */}
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
                    style={{ flexDirection: "row", gap: 10, marginBottom: 4 }}
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
                      <View key={a.titulo} style={{ width: anchoAcceso }}>
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

              {/* TAB 2: Mi sala y horarios */}
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
                  {/* Empty state de respaldo si SalasDoctor no renderiza nada */}
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

      {/* Modal contratos (idéntico al anterior, con paleta del tema) */}
      <Modal
        visible={modalContrato}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setModalContrato(false);
          setContratoSeleccionado(null);
        }}
      >
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 16,
              backgroundColor: c.card,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 20, fontWeight: "700", color: c.primary }}
              >
                {contratoSeleccionado
                  ? `Contrato CT-${String(contratoSeleccionado.id_PK).padStart(4, "0")}`
                  : "Mis contratos"}
              </Text>
              <Text style={{ fontSize: 12, color: c.muted, marginTop: 3 }}>
                VITALIA · Documento contractual
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setModalContrato(false);
                setContratoSeleccionado(null);
              }}
              style={{
                backgroundColor: c.activeBg,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 10,
              }}
            >
              <Text
                style={{ color: c.primary, fontWeight: "600", fontSize: 14 }}
              >
                Cerrar ✕
              </Text>
            </Pressable>
          </View>

          {cargandoContrato ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 24,
              }}
            >
              <ActivityIndicator size="large" color={c.primary} />
              <Text style={{ marginTop: 14, color: c.muted, fontSize: 15 }}>
                Cargando contratos...
              </Text>
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
                <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  Regresar
                </Text>
              </Pressable>
            </View>
          ) : contratoSeleccionado ? (
            <View style={{ flex: 1, backgroundColor: c.bg }}>

              {/* Acciones dentro de la vista previa */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  gap: 12,
                }}
              >
                {/* Regresar al historial */}
                <Pressable
                  onPress={() => setContratoSeleccionado(null)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    borderRadius: 10,
                    backgroundColor: c.activeBg,
                  }}
                >
                  <Text style={{ color: c.primary, fontWeight: "700" }}>
                    ← Volver a mis contratos
                  </Text>
                </Pressable>

                {/* Descargar PDF */}
                <Pressable
                  onPress={() => descargarContrato(contratoSeleccionado)}
                  disabled={
                    !contratoSeleccionado ||
                    descargandoId !== null
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    backgroundColor: "#08BFA4",
                    paddingHorizontal: 16,
                    paddingVertical: 11,
                    borderRadius: 10,
                    opacity: descargandoId !== null ? 0.6 : 1,
                  }}
                >
                  {descargandoId === Number(contratoSeleccionado.id_PK) ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Download
                      size={19}
                      color="#FFFFFF"
                      strokeWidth={2.2}
                    />
                  )}

                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {descargandoId === Number(contratoSeleccionado.id_PK)
                      ? "Generando..."
                      : "Descargar PDF"}
                  </Text>
                </Pressable>
              </View>

              {/* Documento contractual */}
              <View style={{ flex: 1 }}>
                <DocumentoContrato
                  contrato={contratoSeleccionado}
                  nombreDoctor={nombreDoctor}
                />
              </View>

            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
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
                Selecciona un contrato para consultar sus condiciones, fechas,
                remuneración y estado.
              </Text>
              {contratos.length === 0 ? (
                <Glass
                  c={c}
                  radius={16}
                  style={{ padding: 24, alignItems: "center" }}
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
                contratos.map((contrato) => (
                  <Pressable
                    key={contrato.id_PK}
                    onPress={() => setContratoSeleccionado(contrato)}
                    style={({ pressed }) => ({
                      marginBottom: 12,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Glass c={c} radius={16} style={{ padding: 16 }}>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
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
                            {contrato.tipo_contrato || "Tipo no especificado"}
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
                ))
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}
