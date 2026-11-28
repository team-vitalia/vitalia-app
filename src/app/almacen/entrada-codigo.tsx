import { Ionicons } from "@expo/vector-icons";

import { CameraView, useCameraPermissions } from "expo-camera";

import { useFocusEffect, useRouter } from "expo-router";

import { ComponentProps, ReactNode, RefObject, useCallback, useEffect, useRef, useState } from "react";

import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { Boton, Etiqueta, fechaHora, fechaValida, PantallaC2, soloFecha, Tarjeta, useC2Colors } from "../../components/c2/ui";
import SelectorFecha from "../../components/SelectorFecha";
import {
  buscarPorCodigoBarras,
  EntradaCodigoBarras,
  ProductoCodigoBarras,
  registrarEntradaPorCodigoBarras,
} from "../../services/almacenService";
import { mensajeError } from "../../services/c2Service";
import { sombra, sombraTexto } from "../../utils/sombra";

type IconName = ComponentProps<typeof Ionicons>["name"];
const ND = Platform.OS !== "web";

const TIPOS_CODIGO = [
  "ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "code93", "itf14", "datamatrix", "qr",
] as const;

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ============================================================
   Piezas visuales (iconos, transiciones y luz de acento)
\============================================================ */
/* Aparece con fundido y un leve desplazamiento. Cambia `key` para repetir la transición. */
function Aparece({ children, style }: { children: ReactNode; style?: object }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [a]);
  return (
    <Animated.View
      style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

type TipoBanner = "ok" | "error" | "warn";

function Banner({ tipo, titulo, texto, detalle, children }: {
  tipo: TipoBanner;
  titulo: string;
  texto?: string;
  detalle?: string;
  children?: ReactNode;
}) {
  const k = useC2Colors();
  const cfg: Record<TipoBanner, { icono: IconName; fondo: string; acento: string; texto: string }> = {
    ok: { icono: "checkmark-circle", fondo: k.primarioSuave, acento: k.primario, texto: k.isDark ? "#2DD4BF" : k.primario },
    error: { icono: "alert-circle", fondo: k.peligroSuave, acento: k.peligro, texto: k.isDark ? "#F87171" : k.peligro },
    warn: { icono: "alert-circle", fondo: k.avisoSuave, acento: k.aviso, texto: k.isDark ? "#FBBF24" : k.aviso },
  };
  const x = cfg[tipo];
  return (
    <Aparece>
      <View
        accessibilityRole="alert"
        style={[st.banner, { backgroundColor: x.fondo, borderColor: x.acento, ...sombra({ color: x.acento, x: 0, y: 4, opacity: 0.22, radius: 12 }) }]}
      >
        <View style={[st.bannerIcono, { backgroundColor: x.acento }]}>
          <Ionicons name={x.icono} size={22} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[st.bannerTitulo, { color: x.texto }]}>{titulo}</Text>
          {!!texto && <Text style={[st.bannerTexto, { color: k.texto }]}>{texto}</Text>}
          {!!detalle && <Text style={[st.bannerDetalle, { color: k.texto2 }]}>{detalle}</Text>}
          {children}
        </View>
      </View>
    </Aparece>
  );
}

function BotonIcono({ icono, onPress, etiqueta, relleno = false, deshabilitado = false }: {
  icono: IconName;
  onPress: () => void;
  etiqueta: string;
  relleno?: boolean;
  deshabilitado?: boolean;
}) {
  const k = useC2Colors();
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [
        st.botonIcono,
        {
          backgroundColor: relleno ? k.primario : k.tarjeta,
          borderColor: relleno ? k.primario : k.borde,
          opacity: deshabilitado ? 0.5 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      <Ionicons name={icono} size={20} color={relleno ? (k.isDark ? "#121212" : "#FFFFFF") : k.primario} />
    </Pressable>
  );
}

/* Campo de texto con etiqueta, foco resaltado y soporte de ref / Enter (los lectores envían Enter). */
function Entrada({
  etiqueta, value, onChangeText, inputRef, placeholder, keyboardType, onSubmitEditing, ayuda, icono, autoFocus, selectTextOnFocus,
}: {
  etiqueta?: string;
  value: string;
  onChangeText: (t: string) => void;
  inputRef?: RefObject<TextInput | null>;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  onSubmitEditing?: () => void;
  ayuda?: string;
  icono?: IconName;
  autoFocus?: boolean;
  selectTextOnFocus?: boolean;
}) {
  const k = useC2Colors();
  const [foco, setFoco] = useState(false);
  return (
    <View style={st.campo}>
      {!!etiqueta && <Text style={[st.campoEtiqueta, { color: k.muted }]}>{etiqueta}</Text>}
      <View
        style={[
          st.inputCaja,
          {
            backgroundColor: k.inputBg,
            borderColor: foco ? k.primario : k.borde,
            ...sombra({ color: k.c.glow, x: 0, y: 0, opacity: foco ? 0.35 : 0, radius: 8 }),
          },
        ]}
      >
        {!!icono && <Ionicons name={icono} size={18} color={foco ? k.primario : k.muted} style={{ marginRight: 8 }} />}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={k.muted}
          keyboardType={keyboardType}
          onSubmitEditing={onSubmitEditing}
          autoFocus={autoFocus}
          selectTextOnFocus={selectTextOnFocus}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFoco(true)}
          onBlur={() => setFoco(false)}
          style={[st.input, { color: k.texto }, Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null]}
        />
      </View>
      {!!ayuda && <Text style={[st.campoAyuda, { color: k.muted }]}>{ayuda}</Text>}
    </View>
  );
}

/* Marco de la cámara con línea de escaneo animada. */
function MarcoEscaneo() {
  const linea = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(linea, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
        Animated.timing(linea, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [linea]);

  const esquina = { borderColor: "#2DD4BF" };

  return (
    <View style={st.marcoContenedor}>
      <View style={[st.marco, { pointerEvents: "none" }]}>
        <View style={[st.esquina, st.esqTL, esquina]} />
        <View style={[st.esquina, st.esqTR, esquina]} />
        <View style={[st.esquina, st.esqBL, esquina]} />
        <View style={[st.esquina, st.esqBR, esquina]} />
        <Animated.View
          style={[
            st.lineaEscaneo,
            {
              transform: [
                {
                  translateY: linea.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 180], // se mueve dentro de la altura del marco
                  }),
                },
              ],
            },
          ]}
        />
      </View>
    </View>
  );
}

/* ============================================================
   Pantalla
\============================================================ */
type EntradaSesion = EntradaCodigoBarras & { hora: string };

export default function EntradaPorCodigoBarras() {
  const router = useRouter();
  const k = useC2Colors();
  const { width } = useWindowDimensions();
  const dosColumnas = width >= 900;

  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [producto, setProducto] = useState<ProductoCodigoBarras | null>(null);
  const [noEncontrado, setNoEncontrado] = useState<{ codigo: string; mensaje: string } | null>(null);
  const [error, setError] = useState("");

  const [cantidad, setCantidad] = useState("1");
  const [lote, setLote] = useState("");
  const [caducidad, setCaducidad] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [desdeGS1, setDesdeGS1] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [ultimo, setUltimo] = useState<EntradaCodigoBarras | null>(null);
  const [sesion, setSesion] = useState<EntradaSesion[]>([]);

  const [escaneando, setEscaneando] = useState(false);
  const [permiso, pedirPermiso] = useCameraPermissions();
  const lecturaBloqueada = useRef(false);

  const codigoRef = useRef<TextInput>(null);
  const cantidadRef = useRef<TextInput>(null);
  const loteRef = useRef<TextInput>(null);
  const pulso = useRef(new Animated.Value(1)).current;

  const enfocarCodigo = useCallback(() => {
    setTimeout(() => codigoRef.current?.focus(), 80);
  }, []);

  // Al entrar a la pantalla el cursor queda listo para el lector
  useFocusEffect(
    useCallback(() => {
      enfocarCodigo();
    }, [enfocarCodigo]),
  );

  const pulsar = () => {
    Animated.sequence([
      Animated.timing(pulso, { toValue: 1.08, duration: 110, useNativeDriver: ND }),
      Animated.timing(pulso, { toValue: 1, duration: 160, useNativeDriver: ND }),
    ]).start();
  };

  const limpiarFormulario = () => {
    setProducto(null);
    setCantidad("1");
    setLote("");
    setCaducidad("");
    setUbicacion("");
    setDesdeGS1(false);
  };

  /* ------------------------------------------------ buscar por código */
  const buscar = useCallback(
    async (crudo: string) => {
      const limpio = crudo.replace(/[\r\n\t]/g, "").trim();
      if (!limpio || buscando) return;
      setBuscando(true);
      setError("");
      setNoEncontrado(null);
      try {
        const p = await buscarPorCodigoBarras(limpio);
        setCodigo("");
        if (producto && producto.medicamento_id === p.medicamento_id) {
          // Mismo producto escaneado otra vez: suma una pieza sin perder lo capturado
          setCantidad((c) => String((parseInt(c, 10) || 0) + 1));
          pulsar();
        } else {
          setProducto(p);
          setUltimo(null);
          setCantidad("1");
          setLote(p.datos_gs1?.numero_lote ?? "");
          setCaducidad(p.datos_gs1?.fecha_vencimiento ?? "");
          setDesdeGS1(!!(p.datos_gs1?.numero_lote || p.datos_gs1?.fecha_vencimiento));
          setUbicacion(p.ubicacion_sugerida ?? "");
          setTimeout(() => cantidadRef.current?.focus(), 140);
        }
      } catch (e: any) {
        setCodigo("");
        if (e?.response?.status === 404) {
          setNoEncontrado({ codigo: limpio, mensaje: mensajeError(e, "No existe un producto con ese código.") });
        } else {
          setError(mensajeError(e, "No se pudo consultar el código de barras."));
        }
        enfocarCodigo();
      } finally {
        setBuscando(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buscando, producto, enfocarCodigo],
  );

  /* ------------------------------------------------ cámara */
  const abrirCamara = async () => {
    setError("");
    try {
      if (!permiso?.granted) {
        const r = await pedirPermiso();
        if (!r.granted) {
          setError("Sin permiso de cámara. Puedes usar un lector USB o Bluetooth, o escribir el código y presionar Enter.");
          return;
        }
      }
      lecturaBloqueada.current = false;
      setEscaneando(true);
    } catch (e) {
      console.error("VITALIA: Error solicitando permiso de cámara:", e);
      setError("No se pudo solicitar acceso a la cámara.");
    }
  };

  const alLeer = ({ data }: { data: string }) => {
    if (lecturaBloqueada.current || !data) return;
    lecturaBloqueada.current = true;
    setEscaneando(false);
    buscar(data);
  };

  /* ------------------------------------------------ confirmar entrada */
  const confirmar = async () => {
    if (!producto || guardando) return;
    setError("");
    const n = Number(cantidad);
    if (!Number.isInteger(n) || n <= 0) return setError("Escribe una cantidad entera mayor a 0.");
    if (producto.requiere_lote && (!lote.trim() || !caducidad)) {
      return setError("Para medicamentos captura el lote y la fecha de caducidad.");
    }
    if (caducidad && !fechaValida(caducidad)) return setError("La fecha de caducidad no es válida.");
    if (caducidad && caducidad < hoyISO()) {
      return setError("La caducidad ya pasó; no se puede dar entrada a producto vencido.");
    }
    setGuardando(true);
    try {
      const r = await registrarEntradaPorCodigoBarras({
        codigoBarras: producto.codigo_barras ?? "",
        cantidad: n,
        numeroLote: lote,
        fechaVencimiento: caducidad || null,
        ubicacion,
      });
      setUltimo(r);
      setSesion((prev) => [{ ...r, hora: new Date().toISOString() }, ...prev].slice(0, 10));
      limpiarFormulario();
      enfocarCodigo();
    } catch (e: any) {
      setError(mensajeError(e, "No se pudo registrar la entrada."));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarCantidad = (delta: number) => {
    const n = (parseInt(cantidad, 10) || 0) + delta;
    setCantidad(String(Math.max(1, n)));
  };

  const unidad = producto?.unidad_medida ?? "u.";

  /* ------------------------------------------------ UI */
  const panelEscaner = (
    <Tarjeta style={{ gap: 6 }}>
      <View style={st.tituloFila}>
        <View style={[st.tile, { backgroundColor: k.primarioSuave }]}>
          <Ionicons name="barcode-outline" size={20} color={k.primario} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[st.seccion, { color: k.titulo }]}>Escanear producto</Text>
          <Text style={[st.sub, { color: k.texto2 }]}>Lector USB o Bluetooth, cámara o escribe el código.</Text>
        </View>
      </View>
      <View style={st.filaCodigo}>
        <View style={{ flex: 1, minWidth: 180 }}>
          <Entrada
            value={codigo}
            onChangeText={setCodigo}
            inputRef={codigoRef}
            icono="scan-outline"
            placeholder="Apunta el lector aquí y dispara"
            onSubmitEditing={() => buscar(codigo)}
            autoFocus
          />
        </View>
        <View style={st.botonesCodigo}>
          <BotonIcono icono="search" etiqueta="Buscar código" onPress={() => buscar(codigo)} deshabilitado={buscando || !codigo.trim()} />
          <BotonIcono icono="camera-outline" etiqueta="Escanear con la cámara" onPress={abrirCamara} relleno />
        </View>
      </View>
      {buscando && <Text style={[st.sub, { color: k.primario }]}>Buscando producto...</Text>}
    </Tarjeta>
  );

  const panelProducto = producto && (
    <Aparece key={producto.medicamento_id}>
      <Tarjeta style={{ gap: 12 }}>
        <View style={st.tituloFila}>
          <View style={[st.tile, { backgroundColor: k.primarioSuave }]}>
            <Ionicons name={producto.tipo_articulo === "medicamento" ? "medkit-outline" : "cube-outline"} size={20} color={k.primario} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.producto, { color: k.titulo }]}>{producto.nombre}</Text>
            {!!producto.presentacion && <Text style={[st.sub, { color: k.texto2 }]}>{producto.presentacion}</Text>}
            <Text style={[st.sub, { color: k.muted }]}>Código {producto.codigo_barras}</Text>
          </View>
          <Pressable onPress={() => { limpiarFormulario(); enfocarCodigo(); }} accessibilityLabel="Descartar producto" hitSlop={8}>
            <Ionicons name="close-circle-outline" size={24} color={k.muted} />
          </Pressable>
        </View>

        <View style={st.etiquetas}>
          <Etiqueta texto={producto.tipo_articulo} tono="neutral" />
          <Etiqueta
            texto={`Existencia vigente: ${producto.stock_actual} ${unidad}`}
            tono={producto.stock_minimo && producto.stock_actual <= producto.stock_minimo ? "warn" : "info"}
          />
          {desdeGS1 && <Etiqueta texto="Lote y caducidad leídos del código" tono="ok" />}
        </View>

        {producto.lotes_recientes.length > 0 && (
          <View style={[st.lotes, { backgroundColor: k.fondo, borderColor: k.borde }]}>
            <Text style={[st.lotesTitulo, { color: k.muted }]}>Lotes recientes</Text>
            {producto.lotes_recientes.map((l) => (
              <View key={l.inventario_id} style={st.loteFila}>
                <Ionicons name="pricetag-outline" size={14} color={k.muted} />
                <Text style={[st.loteTexto, { color: k.texto }]} numberOfLines={1}>
                  {l.numero_lote ?? "Sin lote"} · cad. {soloFecha(l.fecha_vencimiento)} · {l.stock_actual} {unidad}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={st.filaCampos}>
          <View style={[st.campo, { minWidth: 200 }]}>
            <Text style={[st.campoEtiqueta, { color: k.muted }]}>Cantidad que ingresa</Text>
            <Animated.View style={[st.stepper, { transform: [{ scale: pulso }] }]}>
              <BotonIcono icono="remove" etiqueta="Restar una unidad" onPress={() => cambiarCantidad(-1)} />
              <View style={{ flex: 1 }}>
                <Entrada
                  value={cantidad}
                  onChangeText={(t) => setCantidad(t.replace(/[^0-9]/g, ""))}
                  inputRef={cantidadRef}
                  keyboardType="numeric"
                  onSubmitEditing={() => loteRef.current?.focus()}
                  selectTextOnFocus
                />
              </View>
              <BotonIcono icono="add" etiqueta="Sumar una unidad" onPress={() => cambiarCantidad(1)} relleno />
            </Animated.View>
            <Text style={[st.campoAyuda, { color: k.muted }]}>Escanear el mismo código otra vez suma una pieza.</Text>
          </View>

          <Entrada
            etiqueta={producto.requiere_lote ? "Lote (obligatorio)" : "Lote (opcional)"}
            value={lote}
            onChangeText={(t) => { setLote(t); setDesdeGS1(false); }}
            inputRef={loteRef}
            icono="pricetag-outline"
            placeholder="Ej. L2411A"
            onSubmitEditing={confirmar}
          />
        </View>

        <View style={st.filaCampos}>
          <View style={[st.campo, { minWidth: 200 }]}>
            <Text style={[st.campoEtiqueta, { color: k.muted }]}>
              {producto.requiere_lote ? "Caducidad (obligatoria)" : "Caducidad (opcional)"}
            </Text>
            <SelectorFecha value={caducidad} onChange={(f) => { setCaducidad(f); setDesdeGS1(false); }} placeholder="Seleccionar fecha" min={hoyISO()} />
          </View>
          <Entrada
            etiqueta="Ubicación (opcional)"
            value={ubicacion}
            onChangeText={setUbicacion}
            icono="location-outline"
            placeholder="Ej. Estante A1"
            onSubmitEditing={confirmar}
          />
        </View>

        <View style={st.acciones}>
          <Boton texto="Cancelar" variante="secundario" onPress={() => { limpiarFormulario(); setError(""); enfocarCodigo(); }} deshabilitado={guardando} />
          <Boton texto="Confirmar entrada" onPress={confirmar} cargando={guardando} />
        </View>
      </Tarjeta>
    </Aparece>
  );

  const panelSesion = (
    <Tarjeta style={{ gap: 8 }}>
      <View style={st.tituloFila}>
        <View style={[st.tile, { backgroundColor: k.infoSuave }]}>
          <Ionicons name="time-outline" size={20} color={k.info} />
        </View>
        <Text style={[st.seccion, { color: k.titulo, flex: 1 }]}>Entradas de esta sesión</Text>
        {sesion.length > 0 && <Etiqueta texto={`${sesion.length}`} tono="ok" />}
      </View>
      {sesion.length === 0 ? (
        <Text style={[st.sub, { color: k.muted, paddingVertical: 10 }]}>
          Aquí verás cada producto que agregues, con su lote y el stock resultante.
        </Text>
      ) : (
        sesion.map((e) => (
          <Aparece key={`${e.movimiento_id}-${e.hora}`}>
            <View style={[st.itemSesion, { borderColor: k.borde, backgroundColor: k.fondo }]}>
              <Ionicons name="checkmark-circle" size={20} color={k.primario} />
              <View style={{ flex: 1 }}>
                <Text style={[st.item, { color: k.texto }]} numberOfLines={1}>{e.medicamento}</Text>
                <Text style={[st.sub, { color: k.texto2 }]}>
                  +{e.cantidad_agregada} · Lote {e.numero_lote ?? "s/n"} · cad. {soloFecha(e.fecha_vencimiento)}
                </Text>
                <Text style={[st.sub, { color: k.muted }]}>
                  Stock total {e.stock_total} · {fechaHora(e.hora)}
                </Text>
              </View>
              <Etiqueta texto={e.lote_nuevo ? "Lote nuevo" : "Sumado"} tono={e.lote_nuevo ? "info" : "ok"} />
            </View>
          </Aparece>
        ))
      )}
      <Boton texto="Ver movimientos de inventario" variante="secundario" pequeno onPress={() => router.push("/almacen/movimientos")} />
    </Tarjeta>
  );

  return (
    <PantallaC2
      titulo="Entrada por código de barras"
      subtitulo="Escanea el producto, captura cantidad, lote y caducidad, y el stock se actualiza al instante"
      roles={[1, 6]}
    >
      {!!error && <Banner tipo="error" titulo="No se pudo completar" texto={error} />}

      {noEncontrado && (
        <Banner
          key={noEncontrado.codigo}
          tipo="warn"
          titulo="Código no encontrado"
          texto={noEncontrado.mensaje}
          detalle={`Código leído: ${noEncontrado.codigo}`}
        >
          <View style={st.acciones}>
            <Boton pequeno variante="secundario" texto="Escanear otro" onPress={() => { setNoEncontrado(null); enfocarCodigo(); }} />
            <Boton pequeno texto="Ir al catálogo" onPress={() => router.push("/admin/inventario")} />
          </View>
        </Banner>
      )}

      {ultimo && (
        <Banner
          key={ultimo.movimiento_id ?? ultimo.inventario_id}
          tipo="ok"
          titulo="Producto agregado"
          texto={`+${ultimo.cantidad_agregada} ${ultimo.unidad_medida ?? "u."} de ${ultimo.medicamento}`}
          detalle={
            `Lote ${ultimo.numero_lote ?? "sin lote"}` +
            (ultimo.fecha_vencimiento ? ` · caduca ${soloFecha(ultimo.fecha_vencimiento)}` : "") +
            ` · ${ultimo.lote_nuevo ? "lote nuevo" : "sumado al lote existente"}\n` +
            `Stock del lote: ${ultimo.stock_lote_anterior} → ${ultimo.stock_lote_nuevo} · Stock total vigente: ${ultimo.stock_total}`
          }
        />
      )}

      <View style={[st.layout, dosColumnas && st.layoutAncho]}>
        <View style={dosColumnas ? { flex: 3 } : undefined}>
          {panelEscaner}
          {panelProducto}
        </View>
        <View style={dosColumnas ? { flex: 2 } : undefined}>{panelSesion}</View>
      </View>

      <Modal
        visible={escaneando}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEscaneando(false)}
      >
        <View style={st.camaraFondo}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onCameraReady={() => {
              console.log("VITALIA: Vista previa de cámara trasera lista");
            }}
            onMountError={(e) => {
              console.error("VITALIA: Error al montar la cámara:", e);
              setError(e?.message || "No se pudo iniciar la cámara.");
              setEscaneando(false);
            }}
            onBarcodeScanned={alLeer}
            barcodeScannerSettings={{ barcodeTypes: [...TIPOS_CODIGO] }}
          />

          {/* Marco centrado sobre la cámara */}
          <View style={[st.camaraCentro, { pointerEvents: "none" }]}>
            <MarcoEscaneo />
          </View>

          {/* Texto flotante, SIN fondo, solo sombra */}
          <View style={[st.camaraTextoWrap, { pointerEvents: "none" }]}>
            <Text style={st.camaraTexto}>
              Centra el código de barras dentro del marco
            </Text>
          </View>

          {/* Botón Cancelar flotante abajo, con fondo solo en el botón */}
          <View style={st.camaraBotonWrap}>
            <Boton
              texto="Cancelar"
              variante="secundario"
              onPress={() => {
                setEscaneando(false);
                enfocarCodigo();
              }}
            />
          </View>
        </View>
      </Modal>

    </PantallaC2>
  );
}

const st = StyleSheet.create({
  layout: { gap: 0 },
  layoutAncho: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  tituloFila: { flexDirection: "row", alignItems: "center", gap: 10 },
  tile: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  seccion: { fontSize: 15, fontWeight: "800" },
  producto: { fontSize: 16, fontWeight: "800" },
  sub: { fontSize: 12.5 },
  item: { fontSize: 14, fontWeight: "700" },
  filaCodigo: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 10, marginTop: 8 },
  botonesCodigo: { flexDirection: "row", gap: 8 },
  botonIcono: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  campo: { flex: 1, minWidth: 150, marginBottom: 4 },
  campoEtiqueta: { fontSize: 11, fontWeight: "800", marginBottom: 5 },
  campoAyuda: { fontSize: 10, marginTop: 3 },
  inputCaja: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  input: { flex: 1, fontSize: 14, paddingVertical: 10 },
  filaCampos: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  etiquetas: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  lotes: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 },
  lotesTitulo: { fontSize: 11, fontWeight: "800", marginBottom: 2 },
  loteFila: { flexDirection: "row", alignItems: "center", gap: 6 },
  loteTexto: { fontSize: 12.5, flex: 1 },
  acciones: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", marginTop: 6 },
  itemSesion: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, borderWidth: 1 },
  banner: {
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  bannerIcono: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  bannerTitulo: { fontSize: 15, fontWeight: "800" },
  bannerTexto: { fontSize: 13.5, fontWeight: "700" },
  bannerDetalle: { fontSize: 12.5, lineHeight: 18 },

  // === CÁMARA ===
  camaraFondo: {
    flex: 1,
    backgroundColor: "#000",
  },
  camaraCentro: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  camaraTextoWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 130,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  camaraTexto: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    ...sombraTexto("rgba(0,0,0,0.95)", 0, 1, 4),
  },
  camaraBotonWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 40,
    alignItems: "center",
  },

  // === MARCO DE ESCANEO ===
  marcoContenedor: {
    width: 300,
    height: 200,
    maxWidth: "85%",
    alignItems: "center",
    justifyContent: "center",
  },
  marco: {
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden", // CRÍTICO: evita que la línea se salga y empuje el layout
  },
  esquina: {
    position: "absolute",
    width: 34,
    height: 34,
  },
  esqTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  esqTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  esqBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
  esqBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
  lineaEscaneo: {
    position: "absolute",
    top: 0,
    left: 10,
    right: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#2DD4BF",
    ...sombra({ color: "#2DD4BF", opacity: 0.9, radius: 8, x: 0, y: 0 }),
  },
});