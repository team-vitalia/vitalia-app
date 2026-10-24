import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import {
  AccionCard,
  FondoLuces,
  Footer,
  HeroSaludo,
  Notice,
  SectionTitle,
  TabsBar,
  type TabItem,
} from "../../components/DashboardUI";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/theme";

const ND = Platform.OS !== "web";
type IconName = ComponentProps<typeof Ionicons>["name"];

const TABS_COORD: TabItem[] = [
  { key: "resumen", label: "Resumen", icon: "speedometer-outline" },
  { key: "accesos", label: "Accesos", icon: "flash-outline" },
];

type Acceso = { ruta: string; icon: IconName; titulo: string; descripcion: string };

const ACCESOS: Acceso[] = [
  { ruta: "/admin/salas", icon: "business-outline", titulo: "Salas y equipamiento", descripcion: "Consulta y gestiona salas, su estado y los equipos de cada una." },
  { ruta: "/admin/reportes", icon: "bar-chart-outline", titulo: "Reportes", descripcion: "Ocupación, citas por doctor, tiempos de espera, inventario y recetas." },
  { ruta: "/admin/auditoria", icon: "receipt-outline", titulo: "Auditoría", descripcion: "Revisa quién cambió qué y cuándo en el sistema." },
  { ruta: "/admin/usuarios", icon: "people-outline", titulo: "Gestión de usuarios", descripcion: "Administra médicos, pacientes y personal de recepción." },
  { ruta: "/admin/especialidades", icon: "medkit-outline", titulo: "Especialidades médicas", descripcion: "Mantén actualizado el catálogo de especialidades." },
  { ruta: "/admin/doctores/salas", icon: "calendar-outline", titulo: "Salas por doctor", descripcion: "Asigna salas y horarios de uso a cada médico." },
  { ruta: "/admin/doctores", icon: "document-text-outline", titulo: "Médicos y contratos", descripcion: "Perfiles de médicos y consulta de contratos." },
];

export default function CoordinadorScreen() {
  const router = useRouter();
  const { usuario } = useAuth();
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

  const saludo = () => {
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
              saludo={saludo()}
              nombre={usuario?.nombre || "Coordinador"}
              rol="Coordinación operativa"
            />
            <TabsBar
              c={c}
              esc={esc}
              tabs={TABS_COORD}
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
                    Resumen operativo
                  </SectionTitle>
                  <Notice c={c} esc={esc} icon="shield-checkmark-outline" titulo="Sesión segura" texto="Tu acceso de coordinación está activo y protegido." />
                  <Footer c={c} esc={esc} />
                </>
              )}

              {pagina(
                "accesos",
                <>
                  <SectionTitle c={c} esc={esc} icon="flash-outline" color={c.primary}>
                    Accesos rápidos
                  </SectionTitle>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                    {ACCESOS.map((a) => (
                      <View key={a.ruta} style={{ width: anchoAcceso }}>
                        <AccionCard
                          c={c}
                          esc={esc}
                          icon={a.icon}
                          color={c.primary}
                          titulo={a.titulo}
                          descripcion={a.descripcion}
                          onPress={() => router.push(a.ruta as any)}
                        />
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