import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import CitasPaciente, { CitaPaciente, esProxima } from "../../components/CitasPaciente";
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
import { useTheme } from "../../theme/theme";

const ND = Platform.OS !== "web";

const TABS_PACIENTE: TabItem[] = [
  { key: "resumen", label: "Resumen", icon: "speedometer-outline" },
  { key: "citas", label: "Mis citas", icon: "calendar-outline" },
];

export default function PacienteScreen() {
  const router = useRouter();
  const { usuario, token } = useAuth();
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

  const [citas, setCitas] = useState<CitaPaciente[]>([]);
  const [errorCitas, setErrorCitas] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .get("/api/citas/mis-citas", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setCitas(r.data))
      .catch((e) => setErrorCitas(e?.response?.data?.detail || "No se pudieron cargar tus citas."));
  }, [token]);

  const obtenerSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Buenos días";
    if (hora < 19) return "Buenas tardes";
    return "Buenas noches";
  };

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
              nombre={usuario?.nombre || "Paciente"}
              rol="Paciente"
              kicker="VITALIA · PORTAL DEL PACIENTE"
              titulo="Tu salud, en un solo lugar"
              descripcion="Consulta tus citas, información clínica y seguimiento de atención de manera sencilla."
            />
            <TabsBar
              c={c}
              esc={esc}
              tabs={TABS_PACIENTE}
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
                    Mi resumen
                  </SectionTitle>
                  <View style={{ flexDirection: "row", gap: 10, marginBottom: 4 }}>
                    <InfoCard c={c} esc={esc} icon="time-outline" color={c.info} valor={citas.filter(esProxima).length} label="Próximas citas" />
                    <InfoCard c={c} esc={esc} icon="checkmark-circle-outline" color={c.success} valor="Activo" label="Estado de cuenta" />
                  </View>

                  <SectionTitle c={c} esc={esc} icon="flash-outline" color={c.primary}>
                    Accesos rápidos
                  </SectionTitle>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                    <View style={{ width: anchoAcceso }}>
                      <AccionCard c={c} esc={esc} icon="time-outline" color={c.info} titulo="Mis citas" descripcion="Consulta tus próximas citas y horarios de atención." onPress={() => irATab(1)} />
                    </View>
                    <View style={{ width: anchoAcceso }}>
                      <AccionCard c={c} esc={esc} icon="document-text-outline" color={c.primary} titulo="Mi expediente" descripcion="Consulta la información disponible de tu expediente clínico." />
                    </View>
                    <View style={{ width: anchoAcceso }}>
                      <AccionCard c={c} esc={esc} icon="checkmark-circle-outline" color={c.success} titulo="Mi seguimiento" descripcion="Consulta información relacionada con tu atención." />
                    </View>
                  </View>

                  <Notice c={c} esc={esc} icon="shield-checkmark-outline" titulo="Tu información está protegida" texto="VITALIA mantiene tu sesión activa y segura." />
                  <Footer c={c} esc={esc} />
                </>
              )}

              {pagina(
                "citas",
                <>
                  <SectionTitle c={c} esc={esc} icon="calendar-outline" color={c.primary}>
                    Mis citas
                  </SectionTitle>
                  {!!errorCitas && (
                    <Glass c={c} radius={12} style={{ padding: 12, marginBottom: 10, borderColor: c.error }}>
                      <Text style={{ color: c.error, fontSize: 12, fontWeight: "700" }}>{errorCitas}</Text>
                    </Glass>
                  )}
                  <CitasPaciente citas={citas} />
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