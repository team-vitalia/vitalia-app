import { Ionicons } from "@expo/vector-icons";
import { ComponentProps, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import {
  Aviso,
  Campo,
  Cargando,
  Etiqueta,
  ModalBase,
  Opciones,
  PantallaC2,
  Tarjeta,
  useC2Colors,
  Vacio,
  type Tono,
} from "../../components/c2/ui";
import { CrownSvg, UpgradeModal } from "../../components/UpgradeModal";
import { useAuth } from "../../context/AuthContext";
import {
  actualizarMedicamento,
  crearMedicamento,
  descargarPlantillaMedicamentos,
  eliminarMedicamento,
  exportarMedicamentos,
  getCatalogoMedicamentos,
  importarMedicamentos,
  Medicamento,
  ModoImportacion,
  ResultadoImportacion,
  TipoArticulo,
} from "../../services/almacenService";
import { mensajeError } from "../../services/c2Service";
import { elegirExcel, guardarArchivo, MIME_PDF, MIME_XLSX } from "../../utils/archivos";

type IconName = ComponentProps<typeof Ionicons>["name"];

const ND = Platform.OS !== "web";
const MAX_ERRORES_VISIBLES = 50;
const OPCIONES_POR_PAGINA = [10, 20, 50];
const ANCHO_COMPACTO = 640;

type FiltroTipo = TipoArticulo | "todos";

const FILTROS: { valor: FiltroTipo; etiqueta: string }[] = [
  { valor: "medicamento", etiqueta: "Medicamentos" },
  { valor: "insumo", etiqueta: "Insumos" },
  { valor: "equipo", etiqueta: "Equipo" },
  { valor: "todos", etiqueta: "Todos" },
];

const TIPOS: { valor: TipoArticulo; etiqueta: string; icono: IconName }[] = [
  { valor: "medicamento", etiqueta: "Medicamento", icono: "medkit-outline" },
  { valor: "insumo", etiqueta: "Insumo", icono: "bandage-outline" },
  { valor: "equipo", etiqueta: "Equipo", icono: "construct-outline" },
];

const iconoDeTipo = (t?: TipoArticulo): IconName =>
  TIPOS.find((x) => x.valor === (t ?? "medicamento"))?.icono ?? "medkit-outline";

const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function textoError(e: unknown, porDefecto: string): string {
  const err = e as { isAxiosError?: boolean; message?: string } | null;
  if (err?.isAxiosError) return mensajeError(e, porDefecto);
  return err instanceof Error && err.message ? err.message : porDefecto;
}

function estadoStock(m: Medicamento): { texto: string; tono: Tono } {
  const stock = m.stock_actual ?? 0;
  const minimo = m.stock_minimo ?? 0;
  if (stock <= 0) return { texto: "Sin existencias", tono: "danger" };
  if (minimo > 0 && stock <= minimo) return { texto: "Stock bajo", tono: "warn" };
  return { texto: "Disponible", tono: "ok" };
}

type TipoSweet = "pregunta" | "peligro" | "exito" | "error" | "info" | "cargando";

type SweetCfg = {
  tipo: TipoSweet;
  titulo: string;
  texto?: string;
  confirmar?: string;
  cancelar?: string;
  onConfirmar?: () => void;
  auto?: number;
};

function Sweet({ cfg, onCerrar }: { cfg: SweetCfg | null; onCerrar: () => void }) {
  const k = useC2Colors();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!cfg) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, friction: 6, tension: 90, useNativeDriver: ND }).start();
  }, [cfg?.tipo, cfg?.titulo, anim]);

  useEffect(() => {
    if (!cfg?.auto) return;
    const t = setTimeout(onCerrar, cfg.auto);
    return () => clearTimeout(t);
  }, [cfg, onCerrar]);

  if (!cfg) return null;

  const estilos: Record<TipoSweet, { icono: IconName; color: string; fondo: string }> = {
    pregunta: { icono: "help-circle-outline", color: k.aviso, fondo: k.avisoSuave },
    peligro: { icono: "trash-outline", color: k.peligro, fondo: k.peligroSuave },
    exito: { icono: "checkmark-circle", color: k.primario, fondo: k.primarioSuave },
    error: { icono: "close-circle", color: k.peligro, fondo: k.peligroSuave },
    info: { icono: "information-circle", color: k.info, fondo: k.infoSuave },
    cargando: { icono: "hourglass-outline", color: k.primario, fondo: k.primarioSuave },
  };
  const e = estilos[cfg.tipo];
  const cargando = cfg.tipo === "cargando";
  const conBotones = !cargando && !cfg.auto;
  const esPregunta = cfg.tipo === "pregunta" || cfg.tipo === "peligro";
  const textoSobrePrimario = k.isDark ? "#121212" : "#FFFFFF";
  const colorConfirmar = cfg.tipo === "peligro" || cfg.tipo === "error" ? k.peligro : k.primario;
  const textoConfirmar = cfg.tipo === "peligro" || cfg.tipo === "error" ? "#FFFFFF" : textoSobrePrimario;

  const escala = anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  const opacidad = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" });

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!cargando) onCerrar();
      }}
    >
      <View style={[s.sweetFondo, { backgroundColor: k.isDark ? "rgba(0,0,0,0.75)" : "rgba(10,30,27,0.5)" }]}>
        <Animated.View
          style={[
            s.sweetCaja,
            { backgroundColor: k.tarjeta, borderColor: k.borde, opacity: opacidad, transform: [{ scale: escala }] },
          ]}
        >
          <View style={[s.sweetIcono, { backgroundColor: e.fondo }]}>
            {cargando ? (
              <ActivityIndicator size="large" color={e.color} />
            ) : (
              <Ionicons name={e.icono} size={42} color={e.color} />
            )}
          </View>
          <Text style={[s.sweetTitulo, { color: k.texto }]}>{cfg.titulo}</Text>
          {!!cfg.texto && <Text style={[s.sweetTexto, { color: k.muted }]}>{cfg.texto}</Text>}

          {conBotones && (
            <View style={s.sweetBotones}>
              {esPregunta && (
                <Pressable
                  onPress={onCerrar}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    s.sweetBoton,
                    { backgroundColor: k.tarjeta, borderColor: k.borde, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={[s.sweetBotonTexto, { color: k.muted }]}>{cfg.cancelar || "Cancelar"}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => (cfg.onConfirmar ? cfg.onConfirmar() : onCerrar())}
                accessibilityRole="button"
                style={({ pressed }) => [
                  s.sweetBoton,
                  { backgroundColor: colorConfirmar, borderColor: colorConfirmar, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[s.sweetBotonTexto, { color: textoConfirmar }]}>
                  {cfg.confirmar || (esPregunta ? "Aceptar" : "Entendido")}
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

type VarianteBoton = "primario" | "secundario" | "suave" | "peligro";

function BotonIcono({
  texto,
  icono,
  onPress,
  variante = "secundario",
  deshabilitado = false,
  grow = false,
}: {
  texto: string;
  icono: IconName;
  onPress: () => void;
  variante?: VarianteBoton;
  deshabilitado?: boolean;
  grow?: boolean;
}) {
  const k = useC2Colors();
  const sobrePrimario = k.isDark ? "#121212" : "#FFFFFF";
  const paleta: Record<VarianteBoton, { fondo: string; texto: string; borde: string }> = {
    primario: { fondo: k.primario, texto: sobrePrimario, borde: k.primario },
    secundario: { fondo: k.tarjeta, texto: k.primario, borde: k.borde },
    suave: { fondo: k.primarioSuave, texto: k.primario, borde: k.primarioSuave },
    peligro: { fondo: k.peligroSuave, texto: k.peligro, borde: k.peligro },
  };
  const p = paleta[variante];
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={texto}
      style={({ pressed }) => [
        s.btn,
        grow && { flexGrow: 1, flexBasis: 150 },
        { backgroundColor: p.fondo, borderColor: p.borde },
        deshabilitado && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons name={icono} size={18} color={p.texto} />
      <Text style={[s.btnTexto, { color: p.texto }]} numberOfLines={1}>
        {texto}
      </Text>
    </Pressable>
  );
}

function BotonAccion({
  icono,
  etiqueta,
  tono,
  onPress,
  tam = 34,
}: {
  icono: IconName;
  etiqueta: string;
  tono: "info" | "primario" | "peligro";
  onPress: () => void;
  tam?: number;
}) {
  const k = useC2Colors();
  const mapa = {
    info: { fondo: k.infoSuave, color: k.info },
    primario: { fondo: k.primarioSuave, color: k.primario },
    peligro: { fondo: k.peligroSuave, color: k.peligro },
  }[tono];
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [
        { width: tam, height: tam, borderRadius: tam / 2, backgroundColor: mapa.fondo, alignItems: "center", justifyContent: "center" },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={icono} size={Math.round(tam * 0.52)} color={mapa.color} />
    </Pressable>
  );
}

export default function MedicamentosScreen() {
  const { planActual } = useAuth();
  const [modalUpgrade, setModalUpgrade] = useState(false);

  const plan = (planActual?.nombre_plan || "basico")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const tieneAcceso = plan === "profesional" || plan === "empresarial";

  return (
    <PantallaC2
      titulo="Medicamentos"
      subtitulo="Catálogo de la clínica: altas, edición, baja, importación y exportación"
      roles={[1, 6]}
    >
      {tieneAcceso ? (
        <Catalogo />
      ) : (
        <>
          <BloqueoPlan onVerPlanes={() => setModalUpgrade(true)} />
          <UpgradeModal
            visible={modalUpgrade}
            modulo="Medicamentos"
            planRequerido="Profesional"
            descripcion="El catálogo de medicamentos, el control de existencias y las alertas de caducidad están disponibles a partir del Plan Profesional. Actualiza tu suscripción para desbloquear el módulo de almacén."
            onClose={() => setModalUpgrade(false)}
          />
        </>
      )}
    </PantallaC2>
  );
}

function BloqueoPlan({ onVerPlanes }: { onVerPlanes: () => void }) {
  const k = useC2Colors();
  return (
    <Tarjeta style={{ alignItems: "center", paddingVertical: 28, gap: 12 }}>
      <CrownSvg size={36} color="#FBBF24" />
      <Etiqueta texto="FUNCIÓN EXCLUSIVA PLAN PROFESIONAL" tono="warn" />
      <Text style={[s.centrado, s.tituloBloqueo, { color: k.texto }]}>Catálogo de medicamentos</Text>
      <Text style={[s.centrado, { color: k.muted }]}>
        Administra el catálogo de fármacos, importa y exporta en Excel y obtén la lista en PDF.
      </Text>
      <BotonIcono texto="Ver planes de mejora" icono="sparkles-outline" variante="primario" onPress={onVerPlanes} />
    </Tarjeta>
  );
}

type Formulario = {
  nombre: string;
  principio_activo: string;
  presentacion: string;
  categoria: string;
  unidad_medida: string;
  stock_minimo: string;
  codigo_barras: string;
  descripcion: string;
  tipo_articulo: TipoArticulo;
  requiere_receta: boolean;
};

const FORM_VACIO: Formulario = {
  nombre: "",
  principio_activo: "",
  presentacion: "",
  categoria: "",
  unidad_medida: "",
  stock_minimo: "",
  codigo_barras: "",
  descripcion: "",
  tipo_articulo: "medicamento",
  requiere_receta: false,
};

function formularioDe(m: Medicamento): Formulario {
  return {
    nombre: m.nombre ?? "",
    principio_activo: m.principio_activo ?? "",
    presentacion: m.presentacion ?? "",
    categoria: m.categoria ?? "",
    unidad_medida: m.unidad_medida ?? "",
    stock_minimo: m.stock_minimo ? String(m.stock_minimo) : "",
    codigo_barras: m.codigo_barras ?? "",
    descripcion: m.descripcion ?? "",
    tipo_articulo: m.tipo_articulo ?? "medicamento",
    requiere_receta: !!m.requiere_receta,
  };
}

function validar(f: Formulario): string {
  if (!f.nombre.trim()) return "Escribe el nombre del medicamento.";
  if (f.nombre.trim().length > 200) return "El nombre admite máximo 200 caracteres.";
  if (f.principio_activo.trim().length > 200) return "El principio activo admite máximo 200 caracteres.";
  if (f.presentacion.trim().length > 100) return "La presentación admite máximo 100 caracteres.";
  if (f.categoria.trim().length > 100) return "La categoría admite máximo 100 caracteres.";
  if (f.unidad_medida.trim().length > 30) return "La unidad de medida admite máximo 30 caracteres.";
  if (f.codigo_barras.trim().length > 100) return "El código de barras admite máximo 100 caracteres.";
  if (f.stock_minimo.trim() && !/^\d+$/.test(f.stock_minimo.trim())) {
    return "El stock mínimo debe ser un número entero mayor o igual a 0.";
  }
  return "";
}

function Seccion({ titulo, icono, children }: { titulo: string; icono: IconName; children: ReactNode }) {
  const k = useC2Colors();
  return (
    <View style={[s.seccion, { borderColor: k.borde, backgroundColor: k.isDark ? "rgba(255,255,255,0.03)" : "#FBFEFD" }]}>
      <View style={s.seccionCabecera}>
        <Ionicons name={icono} size={15} color={k.primario} />
        <Text style={[s.seccionTitulo, { color: k.muted }]}>{titulo.toUpperCase()}</Text>
      </View>
      {children}
    </View>
  );
}

function FilaDato({ etiqueta, valor, mono = false }: { etiqueta: string; valor?: string | null; mono?: boolean }) {
  const k = useC2Colors();
  return (
    <View style={[s.filaDato, { borderBottomColor: k.borde }]}>
      <Text style={[s.filaDatoEtiqueta, { color: k.muted }]}>{etiqueta}</Text>
      <Text
        selectable
        style={[
          s.filaDatoValor,
          { color: valor ? k.texto : k.muted },
          mono && { fontVariant: ["tabular-nums"], letterSpacing: 0.4 },
        ]}
      >
        {valor || "—"}
      </Text>
    </View>
  );
}

function Mosaico({ titulo, valor, detalle, color }: { titulo: string; valor: string; detalle?: string; color: string }) {
  const k = useC2Colors();
  return (
    <View style={[s.mosaico, { backgroundColor: k.tarjeta, borderColor: k.borde }]}>
      <Text style={[s.mosaicoTitulo, { color: k.muted }]}>{titulo}</Text>
      <Text style={[s.mosaicoValor, { color }]} numberOfLines={1}>
        {valor}
      </Text>
      {!!detalle && (
        <Text style={[s.mosaicoDetalle, { color: k.muted }]} numberOfLines={1}>
          {detalle}
        </Text>
      )}
    </View>
  );
}

function Paginacion({
  pagina,
  paginas,
  total,
  desde,
  hasta,
  porPagina,
  compacto,
  onPagina,
  onPorPagina,
}: {
  pagina: number;
  paginas: number;
  total: number;
  desde: number;
  hasta: number;
  porPagina: number;
  compacto: boolean;
  onPagina: (p: number) => void;
  onPorPagina: (n: number) => void;
}) {
  const k = useC2Colors();
  if (total === 0) return null;

  const ini = Math.max(1, Math.min(pagina - 2, paginas - 4));
  const numeros = Array.from({ length: Math.min(5, paginas) }, (_, i) => ini + i);

  const Nav = ({ icono, destino, label }: { icono: IconName; destino: number; label: string }) => {
    const bloqueado = destino === pagina || destino < 1 || destino > paginas;
    return (
      <Pressable
        onPress={() => !bloqueado && onPagina(destino)}
        disabled={bloqueado}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[s.pagBtn, { borderColor: k.borde, backgroundColor: k.tarjeta }, bloqueado && { opacity: 0.4 }]}
      >
        <Ionicons name={icono} size={16} color={k.primario} />
      </Pressable>
    );
  };

  return (
    <View style={s.paginacion}>
      <Text style={[s.pagResumen, { color: k.muted }]}>
        Mostrando <Text style={{ color: k.texto, fontWeight: "700" }}>{desde}–{hasta}</Text> de{" "}
        <Text style={{ color: k.texto, fontWeight: "700" }}>{total}</Text>
      </Text>

      <View style={s.pagControles}>
        <Nav icono="play-skip-back-outline" destino={1} label="Primera página" />
        <Nav icono="chevron-back" destino={pagina - 1} label="Página anterior" />
        {compacto ? (
          <Text style={[s.pagResumen, { color: k.texto, fontWeight: "700", paddingHorizontal: 6 }]}>
            {pagina} / {paginas}
          </Text>
        ) : (
          numeros.map((n) => {
            const activo = n === pagina;
            return (
              <Pressable
                key={n}
                onPress={() => onPagina(n)}
                accessibilityRole="button"
                accessibilityLabel={`Página ${n}`}
                style={[
                  s.pagBtn,
                  { borderColor: activo ? k.primario : k.borde, backgroundColor: activo ? k.primario : k.tarjeta },
                ]}
              >
                <Text style={{ fontWeight: "700", fontSize: 13, color: activo ? (k.isDark ? "#121212" : "#FFFFFF") : k.muted }}>
                  {n}
                </Text>
              </Pressable>
            );
          })
        )}
        <Nav icono="chevron-forward" destino={pagina + 1} label="Página siguiente" />
        <Nav icono="play-skip-forward-outline" destino={paginas} label="Última página" />
      </View>

      <View style={s.pagPorPagina}>
        <Text style={[s.pagResumen, { color: k.muted }]}>Filas</Text>
        {OPCIONES_POR_PAGINA.map((n) => {
          const activo = n === porPagina;
          return (
            <Pressable
              key={n}
              onPress={() => onPorPagina(n)}
              accessibilityRole="button"
              style={[
                s.pagChip,
                { borderColor: activo ? k.primario : k.borde, backgroundColor: activo ? k.primarioSuave : k.tarjeta },
              ]}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: activo ? k.primario : k.muted }}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Catalogo() {
  const k = useC2Colors();
  const { width: anchoVentana } = useWindowDimensions();

  const [lista, setLista] = useState<Medicamento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<FiltroTipo>("medicamento");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [anchoTabla, setAnchoTabla] = useState(0);

  const [detalle, setDetalle] = useState<Medicamento | null>(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<Formulario>(FORM_VACIO);

  const [generando, setGenerando] = useState<"excel" | "pdf" | "plantilla" | null>(null);
  const [importAbierto, setImportAbierto] = useState(false);
  const [modo, setModo] = useState<ModoImportacion>("omitir");
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);

  const [sweet, setSweet] = useState<SweetCfg | null>(null);
  const cerrarSweet = useCallback(() => setSweet(null), []);

  const compacto = (anchoTabla || anchoVentana) < ANCHO_COMPACTO;

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(busqueda.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const peticion = useRef(0);
  const cargar = useCallback(async () => {
    const mia = ++peticion.current;
    setCargando(true);
    try {
      const datos = await getCatalogoMedicamentos(q, filtro === "todos" ? undefined : filtro);
      if (mia !== peticion.current) return;
      setLista(datos);
      setError("");
    } catch (e) {
      if (mia !== peticion.current) return;
      setError(textoError(e, "No se pudo cargar el catálogo de medicamentos."));
    } finally {
      if (mia === peticion.current) setCargando(false);
    }
  }, [q, filtro]);

  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;

  useEffect(() => {
    cargar();
  }, [cargar]);

  const total = lista.length;
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const paginaActual = Math.min(pagina, paginas);
  const inicio = (paginaActual - 1) * porPagina;
  const visibles = lista.slice(inicio, inicio + porPagina);
  const filtroActual = { q: q || undefined, tipo: filtro === "todos" ? undefined : filtro };

  const abrirAlta = () => {
    setEditandoId(null);
    setForm({ ...FORM_VACIO, tipo_articulo: filtro === "todos" ? "medicamento" : filtro });
    setFormAbierto(true);
  };

  const abrirEdicion = (m: Medicamento) => {
    setDetalle(null);
    setEditandoId(m.id_PK);
    setForm(formularioDe(m));
    setFormAbierto(true);
  };

  const cambiar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const ejecutarGuardado = async () => {
    const editando = editandoId;
    const datos = {
      nombre: form.nombre,
      principio_activo: form.principio_activo,
      presentacion: form.presentacion,
      categoria: form.categoria,
      unidad_medida: form.unidad_medida,
      codigo_barras: form.codigo_barras,
      descripcion: form.descripcion,
      tipo_articulo: form.tipo_articulo,
      requiere_receta: form.tipo_articulo === "medicamento" ? form.requiere_receta : false,
      stock_minimo: parseInt(form.stock_minimo, 10) || 0,
    };
    setSweet({
      tipo: "cargando",
      titulo: editando ? "Guardando cambios…" : "Registrando medicamento…",
      texto: "Un momento, por favor.",
    });
    try {
      if (editando) await actualizarMedicamento(editando, datos);
      else await crearMedicamento(datos);
      setFormAbierto(false);
      setError("");
      await cargarRef.current();
      setSweet({
        tipo: "exito",
        titulo: editando ? "¡Cambios guardados!" : "¡Medicamento registrado!",
        texto: `«${datos.nombre.trim()}» ${editando ? "se actualizó" : "se agregó al catálogo"} correctamente.`,
        auto: 1800,
      });
    } catch (e) {
      setSweet({
        tipo: "error",
        titulo: "No se pudo guardar",
        texto: textoError(e, "No se pudo guardar el medicamento."),
        confirmar: "Entendido",
      });
    }
  };

  const intentarGuardar = () => {
    const problema = validar(form);
    if (problema) {
      setSweet({ tipo: "error", titulo: "Revisa el formulario", texto: problema, confirmar: "Entendido" });
      return;
    }
    if (editandoId) {
      setSweet({
        tipo: "pregunta",
        titulo: "¿Guardar los cambios?",
        texto: `Se actualizará la información de «${form.nombre.trim()}».`,
        confirmar: "Sí, guardar",
        cancelar: "Cancelar",
        onConfirmar: ejecutarGuardado,
      });
    } else {
      ejecutarGuardado();
    }
  };

  const ejecutarBaja = async (m: Medicamento) => {
    setSweet({ tipo: "cargando", titulo: "Eliminando…", texto: "Un momento, por favor." });
    try {
      await eliminarMedicamento(m.id_PK);
      setDetalle(null);
      await cargarRef.current();
      setSweet({ tipo: "exito", titulo: "Medicamento eliminado", texto: `«${m.nombre}» ya no está en el catálogo.`, auto: 1800 });
    } catch (e) {
      setSweet({
        tipo: "error",
        titulo: "No se pudo eliminar",
        texto: textoError(e, "No se pudo eliminar el medicamento."),
        confirmar: "Entendido",
      });
    }
  };

  const pedirBaja = (m: Medicamento) =>
    setSweet({
      tipo: "peligro",
      titulo: "¿Seguro que deseas eliminar el medicamento?",
      texto: `«${m.nombre}» se eliminará del catálogo. Esta acción no se puede deshacer.`,
      confirmar: "Sí, eliminar",
      cancelar: "Cancelar",
      onConfirmar: () => ejecutarBaja(m),
    });

  const descargar = async (que: "excel" | "pdf" | "plantilla") => {
    const info = {
      excel: { nombre: "medicamentos.xlsx", cosa: "el Excel con la lista actual" },
      pdf: { nombre: "lista_medicamentos.pdf", cosa: "el PDF con la lista actual" },
      plantilla: { nombre: "plantilla_medicamentos.xlsx", cosa: "la plantilla de importación" },
    }[que];
    setGenerando(que);
    setSweet({ tipo: "cargando", titulo: "Descargando…", texto: `Generando ${info.cosa}. Espera un momento.` });
    try {
      if (que === "plantilla") {
        await guardarArchivo(info.nombre, await descargarPlantillaMedicamentos(), MIME_XLSX);
      } else if (que === "excel") {
        await guardarArchivo(info.nombre, await exportarMedicamentos("excel", filtroActual), MIME_XLSX);
      } else {
        await guardarArchivo(info.nombre, await exportarMedicamentos("pdf", filtroActual), MIME_PDF);
      }
      setSweet({
        tipo: "exito",
        titulo: "¡Descarga lista!",
        texto:
          Platform.OS === "web"
            ? `Se guardó ${info.nombre} en tus descargas.`
            : "El archivo está listo para guardarse o compartirse.",
        auto: 1800,
      });
    } catch (e) {
      setSweet({
        tipo: "error",
        titulo: "No se pudo descargar",
        texto: textoError(e, "No se pudo generar el archivo."),
        confirmar: "Entendido",
      });
    } finally {
      setGenerando(null);
    }
  };

  const abrirImportacion = () => {
    setResultado(null);
    setImportAbierto(true);
  };

  const elegirEImportar = async () => {
    setResultado(null);
    try {
      const archivo = await elegirExcel();
      if (!archivo) return;
      setImportando(true);
      setSweet({ tipo: "cargando", titulo: "Importando…", texto: `Procesando «${archivo.nombre}». Puede tardar unos segundos.` });
      const r = await importarMedicamentos(archivo.base64, modo);
      setResultado(r);
      if (r.creados || r.actualizados) await cargarRef.current();
      const resumen = `${r.creados} nuevo(s), ${r.actualizados} actualizado(s), ${r.omitidos} omitido(s).`;
      setSweet(
        r.errores.length === 0
          ? { tipo: "exito", titulo: "¡Importación completada!", texto: resumen, auto: 2200 }
          : {
              tipo: "info",
              titulo: "Importación con observaciones",
              texto: `${resumen} ${r.errores.length} fila(s) con error: revisa el detalle en la ventana.`,
              confirmar: "Entendido",
            }
      );
    } catch (e) {
      setSweet({
        tipo: "error",
        titulo: "No se pudo importar",
        texto: textoError(e, "No se pudo importar el archivo."),
        confirmar: "Entendido",
      });
    } finally {
      setImportando(false);
    }
  };

  const colorStock = (tono: Tono) =>
    tono === "danger" ? k.peligro : tono === "warn" ? k.aviso : k.primario;

  const encabezadoTabla = () => (
    <View style={[s.fila, s.encabezado, { backgroundColor: k.primarioSuave, borderColor: k.borde }]}>
      <Text style={[s.th, { color: k.primario, width: 56 }]}>ID</Text>
      {!compacto && <Text style={[s.th, { color: k.primario, width: 150 }]}>CÓDIGO DE BARRAS</Text>}
      <Text style={[s.th, { color: k.primario, flex: 1 }]}>MEDICAMENTO</Text>
      {!compacto && <Text style={[s.th, { color: k.primario, width: 110 }]}>TIPO</Text>}
      <Text style={[s.th, { color: k.primario, width: compacto ? 74 : 150 }]}>EXISTENCIAS</Text>
      <Text style={[s.th, { color: k.primario, width: compacto ? 112 : 124, textAlign: "center" }]}>ACCIONES</Text>
    </View>
  );

  const filaTabla = (m: Medicamento, i: number) => {
    const est = estadoStock(m);
    const tipo = m.tipo_articulo ?? "medicamento";
    const stock = m.stock_actual ?? 0;
    const tam = compacto ? 32 : 34;
    return (
      <Pressable
        key={m.id_PK}
        onPress={() => setDetalle(m)}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalle de ${m.nombre}`}
        style={({ pressed }) => [
          s.fila,
          s.filaDatos,
          {
            borderColor: k.borde,
            backgroundColor: pressed
              ? k.primarioSuave
              : i % 2 === 1
                ? k.isDark
                  ? "rgba(255,255,255,0.03)"
                  : "#F8FBFA"
                : k.tarjeta,
          },
        ]}
      >
        <Text style={[s.tdId, { color: k.muted, width: 56 }]}>#{m.id_PK}</Text>

        {!compacto && (
          <Text style={[s.tdMono, { color: m.codigo_barras ? k.texto : k.muted, width: 150 }]} numberOfLines={1}>
            {m.codigo_barras || "Sin código"}
          </Text>
        )}

        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[s.tdNombre, { color: k.texto }]} numberOfLines={2}>
            {m.nombre}
          </Text>
          {(!!m.presentacion || (compacto && !!m.codigo_barras)) && (
            <Text style={[s.tdSub, { color: k.muted }]} numberOfLines={1}>
              {compacto && m.codigo_barras ? `▮ ${m.codigo_barras}` : m.presentacion}
            </Text>
          )}
        </View>

        {!compacto && (
          <View style={{ width: 110, alignItems: "flex-start" }}>
            <Etiqueta texto={capitalizar(tipo)} tono="info" />
          </View>
        )}

        <View style={{ width: compacto ? 74 : 150 }}>
          <Text style={[s.tdStock, { color: colorStock(est.tono) }]}>
            {stock}
            {!compacto && m.unidad_medida ? <Text style={[s.tdSub, { color: k.muted }]}> {m.unidad_medida}</Text> : null}
          </Text>
          {compacto ? (
            <View style={[s.punto, { backgroundColor: colorStock(est.tono) }]} />
          ) : (
            <View style={{ alignSelf: "flex-start", marginTop: 2 }}>
              <Etiqueta texto={est.texto} tono={est.tono} />
            </View>
          )}
        </View>

        <View style={[s.acciones, { width: compacto ? 112 : 124 }]}>
          <BotonAccion icono="eye-outline" etiqueta={`Ver ${m.nombre}`} tono="info" tam={tam} onPress={() => setDetalle(m)} />
          <BotonAccion icono="create-outline" etiqueta={`Editar ${m.nombre}`} tono="primario" tam={tam} onPress={() => abrirEdicion(m)} />
          <BotonAccion icono="trash-outline" etiqueta={`Eliminar ${m.nombre}`} tono="peligro" tam={tam} onPress={() => pedirBaja(m)} />
        </View>
      </Pressable>
    );
  };

  const ocupado = generando !== null;

  return (
    <>
      {!!error && <Aviso tipo="error" texto={error} />}

      <Tarjeta style={{ gap: 14 }}>
        <View style={s.barra}>
          <View
            style={[
              s.buscador,
              { backgroundColor: k.inputBg, borderColor: k.borde },
              compacto ? { flexBasis: "100%" } : { flex: 1 },
            ]}
          >
            <Ionicons name="search-outline" size={18} color={k.muted} />
            <TextInput
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar por nombre, principio activo o código"
              placeholderTextColor={k.muted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={[s.buscadorInput, { color: k.texto }, Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null]}
            />
            {!!busqueda && (
              <Pressable onPress={() => setBusqueda("")} hitSlop={8} accessibilityLabel="Borrar búsqueda">
                <Ionicons name="close-circle" size={18} color={k.muted} />
              </Pressable>
            )}
          </View>
          <BotonIcono texto="Nuevo medicamento" icono="add-circle-outline" variante="primario" grow={compacto} onPress={abrirAlta} />
        </View>

        <Opciones
          opciones={FILTROS}
          valor={filtro}
          onChange={(v) => {
            setFiltro(v);
            setPagina(1);
          }}
        />

        <View style={[s.separador, { backgroundColor: k.borde }]} />

        <View style={{ gap: 8 }}>
          <View style={s.seccionCabecera}>
            <Ionicons name="swap-vertical-outline" size={15} color={k.primario} />
            <Text style={[s.seccionTitulo, { color: k.muted }]}>EXCEL Y PDF</Text>
          </View>
          <View style={s.barra}>
            <BotonIcono texto="Importar Excel" icono="cloud-upload-outline" variante="suave" grow onPress={abrirImportacion} />
            <BotonIcono
              texto="Exportar Excel"
              icono="download-outline"
              grow
              deshabilitado={ocupado}
              onPress={() => descargar("excel")}
            />
            <BotonIcono
              texto="Exportar PDF"
              icono="document-text-outline"
              grow
              deshabilitado={ocupado}
              onPress={() => descargar("pdf")}
            />
          </View>
          <Text style={[s.nota, { color: k.muted }]}>
            Las exportaciones respetan la búsqueda y el filtro actuales. Las existencias y los lotes se registran en «Entrada por código de barras».
          </Text>
        </View>
      </Tarjeta>

      <View
        onLayout={(e) => setAnchoTabla(e.nativeEvent.layout.width)}
        style={[s.tabla, { borderColor: k.borde, backgroundColor: k.tarjeta }]}
      >
        {cargando && lista.length === 0 ? (
          <Cargando />
        ) : lista.length === 0 ? (
          <Vacio texto={q ? "Ningún artículo coincide con la búsqueda." : "Aún no hay artículos en el catálogo."} />
        ) : (
          <>
            {encabezadoTabla()}
            {visibles.map((m, i) => filaTabla(m, i))}
          </>
        )}
      </View>

      <Paginacion
        pagina={paginaActual}
        paginas={paginas}
        total={total}
        desde={total ? inicio + 1 : 0}
        hasta={Math.min(inicio + porPagina, total)}
        porPagina={porPagina}
        compacto={compacto}
        onPagina={setPagina}
        onPorPagina={(n) => {
          setPorPagina(n);
          setPagina(1);
        }}
      />

      <ModalBase visible={!!detalle} titulo="Detalle del artículo" onClose={() => setDetalle(null)}>
        {detalle && <DetalleContenido m={detalle} />}
      </ModalBase>

      <ModalBase
        visible={formAbierto}
        titulo={editandoId ? "Editar medicamento" : "Nuevo medicamento"}
        onClose={() => setFormAbierto(false)}
      >
        <Seccion titulo="Tipo de artículo" icono="apps-outline">
          <View style={s.chips}>
            {TIPOS.map((t) => {
              const activo = form.tipo_articulo === t.valor;
              return (
                <Pressable
                  key={t.valor}
                  onPress={() => cambiar("tipo_articulo", t.valor)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  style={[
                    s.chipTipo,
                    { borderColor: activo ? k.primario : k.borde, backgroundColor: activo ? k.primarioSuave : k.tarjeta },
                  ]}
                >
                  <Ionicons name={t.icono} size={18} color={activo ? k.primario : k.muted} />
                  <Text style={{ fontWeight: "700", fontSize: 13, color: activo ? k.primario : k.muted }}>{t.etiqueta}</Text>
                </Pressable>
              );
            })}
          </View>
        </Seccion>

        <Seccion titulo="Información general" icono="document-text-outline">
          <Campo etiqueta="Nombre *" value={form.nombre} onChangeText={(t) => cambiar("nombre", t)} placeholder="Ej. Paracetamol" />
          <Campo etiqueta="Principio activo" value={form.principio_activo} onChangeText={(t) => cambiar("principio_activo", t)} placeholder="Ej. Paracetamol" />
          <Campo
            etiqueta="Presentación"
            value={form.presentacion}
            onChangeText={(t) => cambiar("presentacion", t)}
            placeholder="Ej. 500 mg, caja con 20 tabletas"
          />
          <Campo etiqueta="Descripción" value={form.descripcion} onChangeText={(t) => cambiar("descripcion", t)} multiline />
        </Seccion>

        <Seccion titulo="Clasificación" icono="pricetags-outline">
          <Campo etiqueta="Categoría" value={form.categoria} onChangeText={(t) => cambiar("categoria", t)} placeholder="Ej. Analgésico" />
          <Campo
            etiqueta="Unidad de medida"
            value={form.unidad_medida}
            onChangeText={(t) => cambiar("unidad_medida", t)}
            placeholder="Ej. caja, pieza, frasco"
          />
          {form.tipo_articulo === "medicamento" && (
            <View style={[s.interruptor, { borderColor: k.borde, backgroundColor: k.tarjeta }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.interruptorTitulo, { color: k.texto }]}>Requiere receta médica</Text>
                <Text style={[s.nota, { color: k.muted }]}>Solo se entregará con una receta activa.</Text>
              </View>
              <Switch
                value={form.requiere_receta}
                onValueChange={(v) => cambiar("requiere_receta", v)}
                trackColor={{ false: k.borde, true: k.primario }}
                thumbColor="#FFFFFF"
              />
            </View>
          )}
        </Seccion>

        <Seccion titulo="Inventario" icono="cube-outline">
          <Campo
            etiqueta="Código de barras"
            value={form.codigo_barras}
            onChangeText={(t) => cambiar("codigo_barras", t)}
            placeholder="Opcional (se usa al escanear la entrada)"
          />
          <Campo
            etiqueta="Stock mínimo"
            value={form.stock_minimo}
            onChangeText={(t) => cambiar("stock_minimo", t.replace(/[^0-9]/g, ""))}
            keyboardType="numeric"
            placeholder="0"
            ayuda="Alerta de reposición. 0 = usar el umbral general."
          />
        </Seccion>

        <View style={s.pieModal}>
          <BotonIcono texto="Cancelar" icono="close-outline" grow onPress={() => setFormAbierto(false)} />
          <BotonIcono
            texto={editandoId ? "Guardar cambios" : "Registrar"}
            icono="checkmark-circle-outline"
            variante="primario"
            grow
            onPress={intentarGuardar}
          />
        </View>
      </ModalBase>

      <ModalBase visible={importAbierto} titulo="Importar desde Excel" onClose={() => !importando && setImportAbierto(false)}>
        <Seccion titulo="Cómo funciona" icono="information-circle-outline">
          {[
            ["1", "Descarga la plantilla y llénala (una fila por medicamento)."],
            ["2", "Elige qué hacer con los que ya existen (mismo código de barras, o mismo nombre y presentación)."],
            ["3", "Sube el archivo .xlsx. Las filas válidas se guardan y las que tengan error se listan con su número de fila."],
          ].map(([n, t]) => (
            <View key={n} style={s.paso}>
              <View style={[s.pasoNumero, { backgroundColor: k.primarioSuave }]}>
                <Text style={{ color: k.primario, fontWeight: "800", fontSize: 12 }}>{n}</Text>
              </View>
              <Text style={[s.pasoTexto, { color: k.texto }]}>{t}</Text>
            </View>
          ))}
          <View style={{ marginTop: 4 }}>
            <BotonIcono
              texto="Descargar plantilla"
              icono="document-attach-outline"
              deshabilitado={ocupado || importando}
              onPress={() => descargar("plantilla")}
            />
          </View>
        </Seccion>

        <Seccion titulo="Si el medicamento ya existe" icono="git-compare-outline">
          <Opciones
            opciones={[
              { valor: "omitir", etiqueta: "Omitirlo" },
              { valor: "actualizar", etiqueta: "Actualizarlo" },
            ]}
            valor={modo}
            onChange={setModo}
          />
          <Text style={[s.nota, { color: k.muted }]}>
            {modo === "actualizar"
              ? "Se completan los datos con lo que traiga el archivo; las celdas vacías no borran nada."
              : "Los existentes se dejan sin cambios."}
          </Text>
        </Seccion>

        <View style={s.pieModal}>
          <BotonIcono texto="Cerrar" icono="close-outline" grow deshabilitado={importando} onPress={() => setImportAbierto(false)} />
          <BotonIcono
            texto="Elegir archivo e importar"
            icono="cloud-upload-outline"
            variante="primario"
            grow
            deshabilitado={importando}
            onPress={elegirEImportar}
          />
        </View>

        {resultado && (
          <View style={{ marginTop: 14, gap: 8 }}>
            <Aviso
              tipo={resultado.creados || resultado.actualizados ? "ok" : "info"}
              texto={`${resultado.total_filas} fila(s) leída(s): ${resultado.creados} nueva(s), ${resultado.actualizados} actualizada(s), ${resultado.omitidos} omitida(s), ${resultado.errores.length} con error.`}
            />
            {resultado.errores.slice(0, MAX_ERRORES_VISIBLES).map((er) => (
              <Text key={`${er.fila}-${er.mensaje}`} style={[s.nota, { color: k.peligro }]}>
                Fila {er.fila}: {er.mensaje}
              </Text>
            ))}
            {resultado.errores.length > MAX_ERRORES_VISIBLES && (
              <Text style={[s.nota, { color: k.muted }]}>
                …y {resultado.errores.length - MAX_ERRORES_VISIBLES} error(es) más.
              </Text>
            )}
          </View>
        )}
      </ModalBase>

      <Sweet cfg={sweet} onCerrar={cerrarSweet} />
    </>
  );
}

function DetalleContenido({ m }: { m: Medicamento }) {
  const k = useC2Colors();
  const est = estadoStock(m);
  const tipo = m.tipo_articulo ?? "medicamento";
  const stock = m.stock_actual ?? 0;
  const minimo = m.stock_minimo ?? 0;
  const colorEstado = est.tono === "danger" ? k.peligro : est.tono === "warn" ? k.aviso : k.primario;

  return (
    <>
      <View style={s.hero}>
        <View style={[s.heroIcono, { backgroundColor: k.primarioSuave }]}>
          <Ionicons name={iconoDeTipo(tipo)} size={30} color={k.primario} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.heroNombre, { color: k.texto }]}>{m.nombre}</Text>
          {!!m.presentacion && <Text style={[s.heroSub, { color: k.muted }]}>{m.presentacion}</Text>}
        </View>
      </View>
      <View style={[s.chips, { marginBottom: 14 }]}>
        <Etiqueta texto={capitalizar(tipo)} tono="info" />
        {tipo === "medicamento" && (
          <Etiqueta texto={m.requiere_receta ? "Con receta" : "Venta libre"} tono={m.requiere_receta ? "warn" : "neutral"} />
        )}
        <Etiqueta texto={est.texto} tono={est.tono} />
      </View>

      <Seccion titulo="Existencias" icono="cube-outline">
        <View style={s.mosaicos}>
          <Mosaico titulo="Disponible" valor={String(stock)} detalle={m.unidad_medida || "unidades"} color={colorEstado} />
          <Mosaico titulo="Stock mínimo" valor={String(minimo)} detalle={minimo ? "alerta de reposición" : "umbral general"} color={k.texto} />
        </View>
      </Seccion>

      <Seccion titulo="Identificación" icono="barcode-outline">
        <FilaDato etiqueta="ID" valor={`#${m.id_PK}`} mono />
        <FilaDato etiqueta="Código de barras" valor={m.codigo_barras} mono />
        <FilaDato etiqueta="Categoría" valor={m.categoria} />
        <FilaDato etiqueta="Unidad de medida" valor={m.unidad_medida} />
      </Seccion>

      <Seccion titulo="Composición" icono="flask-outline">
        <FilaDato etiqueta="Principio activo" valor={m.principio_activo} />
        <FilaDato etiqueta="Presentación" valor={m.presentacion} />
      </Seccion>

      <Seccion titulo="Descripción" icono="reader-outline">
        <Text style={[s.descripcion, { color: m.descripcion ? k.texto : k.muted }]}>
          {m.descripcion || "Sin descripción registrada."}
        </Text>
      </Seccion>
    </>
  );
}

const s = StyleSheet.create({
  centrado: { textAlign: "center" },
  tituloBloqueo: { fontSize: 20, fontWeight: "800" },
  nota: { fontSize: 12, lineHeight: 17 },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnTexto: { fontSize: 14, fontWeight: "700" },

  barra: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
  buscador: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    minWidth: 220,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  buscadorInput: { flex: 1, fontSize: 14, paddingVertical: 8 },
  separador: { height: 1 },

  seccion: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12, gap: 6 },
  seccionCabecera: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  seccionTitulo: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },

  tabla: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  fila: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  encabezado: { paddingVertical: 11, borderBottomWidth: 1 },
  filaDatos: { paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 60 },
  th: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.6 },
  tdId: { fontSize: 12, fontWeight: "700" },
  tdMono: { fontSize: 12.5, fontWeight: "600", letterSpacing: 0.3 },
  tdNombre: { fontSize: 14, fontWeight: "700" },
  tdSub: { fontSize: 11.5, marginTop: 2 },
  tdStock: { fontSize: 16, fontWeight: "800" },
  punto: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  acciones: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },

  paginacion: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4 },
  pagResumen: { fontSize: 12.5 },
  pagControles: { flexDirection: "row", alignItems: "center", gap: 6 },
  pagBtn: { minWidth: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  pagPorPagina: { flexDirection: "row", alignItems: "center", gap: 6 },
  pagChip: { minWidth: 34, height: 30, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },

  hero: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10 },
  heroIcono: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  heroNombre: { fontSize: 20, fontWeight: "800", lineHeight: 25 },
  heroSub: { fontSize: 13, marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  mosaicos: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mosaico: { flexGrow: 1, flexBasis: 130, borderWidth: 1, borderRadius: 12, padding: 12 },
  mosaicoTitulo: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  mosaicoValor: { fontSize: 28, fontWeight: "800", marginTop: 2 },
  mosaicoDetalle: { fontSize: 11.5, marginTop: 1 },
  filaDato: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  filaDatoEtiqueta: { fontSize: 12.5, fontWeight: "600", minWidth: 120 },
  filaDatoValor: { fontSize: 14, fontWeight: "600", flex: 1, textAlign: "right" },
  descripcion: { fontSize: 14, lineHeight: 21 },
  pieModal: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6, marginBottom: 4 },

  chipTipo: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  interruptor: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  interruptorTitulo: { fontSize: 14, fontWeight: "700" },
  paso: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 6 },
  pasoNumero: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pasoTexto: { flex: 1, fontSize: 13, lineHeight: 19 },

  sweetFondo: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  sweetCaja: { width: "100%", maxWidth: 400, borderRadius: 22, borderWidth: 1, padding: 24, alignItems: "center" },
  sweetIcono: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  sweetTitulo: { fontSize: 19, fontWeight: "800", textAlign: "center" },
  sweetTexto: { fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 8 },
  sweetBotones: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 20, alignSelf: "stretch" },
  sweetBoton: { flexGrow: 1, flexBasis: 120, minHeight: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  sweetBotonTexto: { fontSize: 14, fontWeight: "800" },
});