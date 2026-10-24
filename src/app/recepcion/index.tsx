import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
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
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { listarColas } from "../../services/colasService";
import { useTheme } from "../../theme/theme";

const ND = Platform.OS !== "web";

const TABS_RECEPCION: TabItem[] = [
  { key: "resumen", label: "Resumen", icon: "speedometer-outline" },
  { key: "accesos", label: "Accesos", icon: "flash-outline" },
];

export default function RecepcionScreen() {
  const { usuario, token, cargando: cargandoAuth } = useAuth();
  const rolId = usuario?.rol_id ?? usuario?.rol_id_FK;
  const c = useTheme();
  const { width } = useWindowDimensions();

  const { pad, esc, cols } = useMemo(() => {
    const esc = width < 560 ? 1 : width < 900 ? 1.06 : 1.12;
    const pad = width < 400 ? 14 : width < 560 ? 18 : width < 1024 ? 26 : 34;
    const cols = width < 560 ? 1 : 2;
    return { pad, esc, cols };
  }, [width]);

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start();
  }, []);

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
    [pager.w]
  );

  useEffect(() => {
    if (pager.w) pagerRef.current?.scrollTo({ x: tabRef.current * pager.w, animated: false });
  }, [pager.w]);

  /* ---------- Métricas (intacto) ---------- */
  const [totalCitasHoy, setTotalCitasHoy] = useState(0);
  const [totalEnEspera, setTotalEnEspera] = useState(0);
  const [cargandoMetricas, setCargandoMetricas] = useState(true);

  const obtenerSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Buenos días";
    if (hora < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  const obtenerFechaHoy = (): string => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  };

  const cargarMetricas = async () => {
    if (!token) return;
    try {
      setCargandoMetricas(true);
      const [resCitas, listaColas] = await Promise.all([
        api.get<any[]>("/api/citas/", { headers: { Authorization: `Bearer ${token}` } }),
        listarColas(token),
      ]);
      const hoyStr = obtenerFechaHoy();
      const citasHoy = resCitas.data.filter((c) => c.fecha === hoyStr);
      const enEspera = listaColas.filter((col) => col.estado === "esperando" || col.estado === "llamado");
      setTotalCitasHoy(citasHoy.length);
      setTotalEnEspera(enEspera.length);
    } catch {
      setTotalCitasHoy(0);
      setTotalEnEspera(0);
    } finally {
      setCargandoMetricas(false);
    }
  };

  useEffect(() => {
    if (token && rolId === 4) cargarMetricas();
  }, [token, rolId]);

  if (!cargandoAuth && rolId !== 4) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <FondoLuces c={c} />
        <Glass c={c} radius={22} style={{ width: "100%", maxWidth: 480, padding: 32, alignItems: "center" }}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: c.errorBg, justifyContent: "center", alignItems: "center", marginBottom: 20 }}>
            <Ionicons name="lock-closed" size={32} color={c.error} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: "900", color: c.text, marginBottom: 10, textAlign: "center" }}>
            Acceso Restringido
          </Text>
          <Text style={{ fontSize: 14, color: c.muted, textAlign: "center", lineHeight: 22, marginBottom: 26 }}>
            El panel de recepción está reservado exclusivamente para el personal autorizado con rol de Recepción.
          </Text>
          <Pressable
            onPress={() => {
              if (rolId === 1) router.replace("/admin");
              else if (rolId === 2) router.replace("/doctor");
              else if (rolId === 3) router.replace("/paciente");
              else router.replace("/login");
            }}
            style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.primary, paddingVertical: 13, paddingHorizontal: 22, borderRadius: 14 }}
          >
            <Ionicons name="arrow-back" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800" }}>Volver a mi Panel Principal</Text>
          </Pressable>
        </Glass>
      </View>
    );
  }

  const pagina = (key: string, children: React.ReactNode) => (
    <View key={key} style={{ width: pager.w, height: pager.h }}>
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: pad, paddingTop: 16, paddingBottom: 40 }}
      >
        <View style={{ width: "100%", maxWidth: 1100, alignSelf: "center" }}>{children}</View>
      </ScrollView>
    </View>
  );

  const anchoAcceso = cols === 1 ? "100%" : "48.5%";

  const accesos = [
    { icon: "calendar-outline" as const, color: c.info, titulo: "Agenda de Citas", desc: "Consulta la agenda cronológica, reprograma fechas y sincroniza con Google Calendar.", onPress: () => router.push("/recepcion/citas") },
    { icon: "calendar-number-outline" as const, color: c.success, titulo: "Agendar Nueva Cita", desc: "Registra una nueva cita médica y envía confirmación automática por correo.", onPress: () => router.push("/recepcion/citas/crear") },
    { icon: "list-outline" as const, color: c.warning, titulo: "Sala de Espera", desc: "Gestiona la llegada de pacientes y asigna turnos de atención prioritarios.", onPress: () => router.push("/recepcion/cola") },
    { icon: "checkmark-circle-outline" as const, color: c.primary, titulo: "Historial de Atenciones", desc: "Visualiza las consultas concluidas y pacientes atendidos el día de hoy.", onPress: () => router.push("/recepcion/cola/atendidas") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FondoLuces c={c} />
      <Animated.View style={{ flex: 1, opacity: fade }}>
        <View style={{ paddingHorizontal: pad, paddingTop: 14, alignItems: "center" }}>
          <View style={{ width: "100%", maxWidth: 1100 }}>
            <HeroSaludo
              c={c}
              esc={esc}
              saludo={obtenerSaludo()}
              nombre={usuario?.nombre || "Recepción"}
              rol="Personal de Recepción"
            />
            <TabsBar
              c={c}
              esc={esc}
              tabs={TABS_RECEPCION}
              activa={tab}
              scrollX={scrollX}
              anchoPagina={pager.w}
              mostrarIconos={width >= 440}
              onSelect={irATab}
            />
          </View>
        </View>

        <View
          style={{ flex: 1, minHeight: 0, marginTop: 6 }}
          onLayout={(e) => setPager({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
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
              {pagina(
                "resumen",
                <>
                  <SectionTitle c={c} esc={esc} icon="speedometer-outline" color={c.info}>
                    Resumen de hoy
                  </SectionTitle>
                  <View style={{ flexDirection: "row", gap: 10, marginBottom: 4 }}>
                    <InfoCard c={c} esc={esc} icon="calendar-outline" color={c.info} valor={totalCitasHoy} label="Citas programadas para hoy" loading={cargandoMetricas} />
                    <InfoCard c={c} esc={esc} icon="people-outline" color={c.success} valor={totalEnEspera} label="Pacientes en sala de espera" loading={cargandoMetricas} />
                  </View>
                  <Notice c={c} esc={esc} icon="shield-checkmark-outline" titulo="Recepción Activa y Segura" texto="El sistema está conectado con alertas en tiempo real y sincronización SMTP." />
                  <Footer c={c} esc={esc} />
                </>
              )}

              {pagina(
                "accesos",
                <>
                  <SectionTitle c={c} esc={esc} icon="flash-outline" color={c.primary}>
                    Accesos directos
                  </SectionTitle>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                    {accesos.map((a) => (
                      <View key={a.titulo} style={{ width: anchoAcceso }}>
                        <AccionCard c={c} esc={esc} icon={a.icon} color={a.color} titulo={a.titulo} descripcion={a.desc} onPress={a.onPress} />
                      </View>
                    ))}
                  </View>
                  <Footer c={c} esc={esc} />
                </>
              )}
            </Animated.ScrollView>
          )}
        </View>
      </Animated.View>
    </View>
  );
}