import React, { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../../context/AuthContext";
import type { PageMeta } from "../../services/c2Service";

/* ============================================================
   Paleta (misma que el resto de la app)
============================================================ */
export const C = {
  primario: "#247F76",
  primarioSuave: "#E2F4F0",
  titulo: "#173F3A",
  texto: "#26443F",
  texto2: "#667773",
  muted: "#82938F",
  borde: "#E4EEEB",
  fondo: "#F4FAF8",
  tarjeta: "#FFFFFF",
  peligro: "#D65A5A",
  peligroSuave: "#FFF5F5",
  aviso: "#B7791F",
  avisoSuave: "#FFF6E5",
  info: "#2B6CB0",
  infoSuave: "#E8F1FB",
};

/* ============================================================
   Acceso por rol: 1 = Administrador, 5 = Coordinador
============================================================ */
export function useAccesoC2() {
  const { usuario, token, cargando } = useAuth();
  const rolId = usuario?.rol_id ?? usuario?.rol_id_FK;
  return {
    token,
    cargando,
    hayUsuario: !!usuario,
    rolId,
    esAdmin: rolId === 1,
    esCoordinador: rolId === 5,
    permitido: rolId === 1 || rolId === 5,
  };
}

/* ============================================================
   Helpers
============================================================ */
export function fechaValida(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function soloFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function etiquetaEstado(valor: string | null | undefined): string {
  if (!valor) return "Sin estado";
  const t = valor.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* ============================================================
   Pantalla base (encabezado, volver y guarda de acceso)
============================================================ */
export function PantallaC2({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const acceso = useAccesoC2();

  const irInicio = () => {
    if (acceso.rolId === 5) router.replace("/coordinador");
    else router.replace("/admin");
  };

  const volver = () => {
    if (router.canGoBack()) router.back();
    else irInicio();
  };

  if (acceso.cargando || !acceso.hayUsuario) {
    return (
      <View style={s.centro}>
        <ActivityIndicator size="large" color={C.primario} />
      </View>
    );
  }

  if (!acceso.permitido) {
    return (
      <View style={s.centro}>
        <View style={s.restringido}>
          <Text style={s.restringidoTitulo}>Acceso restringido</Text>
          <Text style={s.restringidoTexto}>
            Esta sección es solo para administración y coordinación.
          </Text>
          <Boton
            texto="Ir a mi panel"
            onPress={() => {
              if (acceso.rolId === 2) router.replace("/doctor");
              else if (acceso.rolId === 3) router.replace("/paciente");
              else if (acceso.rolId === 4) router.replace("/recepcion");
              else router.replace("/login");
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.pantalla}
      contentContainerStyle={s.pantallaContenido}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={volver} style={s.volver}>
        <Text style={s.volverTexto}>← Volver</Text>
      </Pressable>
      <Text style={s.titulo}>{titulo}</Text>
      {!!subtitulo && <Text style={s.subtitulo}>{subtitulo}</Text>}
      {children}
    </ScrollView>
  );
}

/* ============================================================
   Componentes pequeños
============================================================ */
export type Tono = "ok" | "warn" | "danger" | "info" | "neutral";

const TONOS: Record<Tono, { fondo: string; texto: string }> = {
  ok: { fondo: C.primarioSuave, texto: C.primario },
  warn: { fondo: C.avisoSuave, texto: C.aviso },
  danger: { fondo: C.peligroSuave, texto: C.peligro },
  info: { fondo: C.infoSuave, texto: C.info },
  neutral: { fondo: "#EEF2F1", texto: C.texto2 },
};

export function Etiqueta({ texto, tono = "neutral" }: { texto: string; tono?: Tono }) {
  const t = TONOS[tono];
  return (
    <View style={[s.etiqueta, { backgroundColor: t.fondo }]}>
      <Text style={[s.etiquetaTexto, { color: t.texto }]}>{texto}</Text>
    </View>
  );
}

export function Aviso({ tipo, texto }: { tipo: "ok" | "error" | "info"; texto: string }) {
  const t = tipo === "ok" ? TONOS.ok : tipo === "error" ? TONOS.danger : TONOS.info;
  return (
    <View style={[s.aviso, { backgroundColor: t.fondo, borderColor: t.texto }]}>
      <Text style={[s.avisoTexto, { color: t.texto }]}>{texto}</Text>
    </View>
  );
}

export function Vacio({ texto }: { texto: string }) {
  return (
    <View style={s.vacio}>
      <Text style={s.vacioTexto}>{texto}</Text>
    </View>
  );
}

export function Cargando() {
  return <ActivityIndicator size="large" color={C.primario} style={{ marginVertical: 28 }} />;
}

export function Tarjeta({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[s.tarjeta, style]}>{children}</View>;
}

export function Boton({
  texto,
  onPress,
  variante = "primario",
  deshabilitado = false,
  cargando = false,
  pequeno = false,
}: {
  texto: string;
  onPress: () => void;
  variante?: "primario" | "secundario" | "peligro";
  deshabilitado?: boolean;
  cargando?: boolean;
  pequeno?: boolean;
}) {
  const estilos = {
    primario: { fondo: C.primario, texto: "#FFFFFF", borde: C.primario },
    secundario: { fondo: "#FFFFFF", texto: C.primario, borde: C.primario },
    peligro: { fondo: C.peligroSuave, texto: C.peligro, borde: C.peligro },
  }[variante];
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado || cargando}
      style={({ pressed }) => [
        s.boton,
        pequeno && s.botonPequeno,
        { backgroundColor: estilos.fondo, borderColor: estilos.borde },
        (deshabilitado || cargando) && { opacity: 0.55 },
        pressed && { opacity: 0.85 },
      ]}
    >
      {cargando ? (
        <ActivityIndicator size="small" color={estilos.texto} />
      ) : (
        <Text style={[s.botonTexto, pequeno && s.botonTextoPequeno, { color: estilos.texto }]}>{texto}</Text>
      )}
    </Pressable>
  );
}

export function Campo({
  etiqueta,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
  ayuda,
}: {
  etiqueta: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  ayuda?: string;
}) {
  return (
    <View style={s.campo}>
      <Text style={s.campoEtiqueta}>{etiqueta}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A8B6B2"
        keyboardType={keyboardType}
        multiline={multiline}
        style={[s.input, multiline && { minHeight: 80, textAlignVertical: "top" }]}
        autoCapitalize="none"
      />
      {!!ayuda && <Text style={s.campoAyuda}>{ayuda}</Text>}
    </View>
  );
}

export function Opciones<T extends string>({
  opciones,
  valor,
  onChange,
}: {
  opciones: { valor: T; etiqueta: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.opciones}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => onChange(o.valor)}
            style={[s.opcion, activo && s.opcionActiva]}
          >
            <Text style={[s.opcionTexto, activo && s.opcionTextoActivo]}>{o.etiqueta}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Paginador({
  meta,
  onCambiar,
}: {
  meta: PageMeta | null;
  onCambiar: (pagina: number) => void;
}) {
  if (!meta || meta.total === 0) return null;
  const pages = Math.max(meta.pages, 1);
  return (
    <View style={s.paginador}>
      <Boton
        texto="← Anterior"
        variante="secundario"
        pequeno
        deshabilitado={meta.page <= 1}
        onPress={() => onCambiar(meta.page - 1)}
      />
      <Text style={s.paginadorTexto}>
        Página {meta.page} de {pages} · {meta.total} registros
      </Text>
      <Boton
        texto="Siguiente →"
        variante="secundario"
        pequeno
        deshabilitado={meta.page >= pages}
        onPress={() => onCambiar(meta.page + 1)}
      />
    </View>
  );
}

export function ModalBase({
  visible,
  titulo,
  onClose,
  children,
}: {
  visible: boolean;
  titulo: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalFondo}>
        <View style={s.modalCaja}>
          <View style={s.modalCabecera}>
            <Text style={s.modalTitulo}>{titulo}</Text>
            <Pressable onPress={onClose} style={s.modalCerrar}>
              <Text style={s.modalCerrarTexto}>✕</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function ConfirmarModal({
  visible,
  titulo,
  mensaje,
  textoConfirmar = "Eliminar",
  cargando = false,
  onConfirmar,
  onCancelar,
}: {
  visible: boolean;
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  cargando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={s.modalFondo}>
        <View style={[s.modalCaja, { maxWidth: 420 }]}>
          <Text style={s.modalTitulo}>{titulo}</Text>
          <Text style={[s.vacioTexto, { textAlign: "left", marginVertical: 14 }]}>{mensaje}</Text>
          <View style={s.fila}>
            <Boton texto="Cancelar" variante="secundario" onPress={onCancelar} deshabilitado={cargando} />
            <Boton texto={textoConfirmar} variante="peligro" onPress={onConfirmar} cargando={cargando} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function Estadistica({ titulo, valor, tono = "ok" }: { titulo: string; valor: string | number; tono?: Tono }) {
  const t = TONOS[tono];
  return (
    <View style={[s.estadistica, { backgroundColor: t.fondo }]}>
      <Text style={[s.estadisticaValor, { color: t.texto }]}>{valor}</Text>
      <Text style={s.estadisticaTitulo}>{titulo}</Text>
    </View>
  );
}

export function Barra({ valor, maximo, color = C.primario }: { valor: number; maximo: number; color?: string }) {
  const pct = maximo > 0 ? Math.min(100, Math.max(2, (valor / maximo) * 100)) : 0;
  return (
    <View style={s.barraFondo}>
      <View style={[s.barraRelleno, { width: `${valor > 0 ? pct : 0}%`, backgroundColor: color }]} />
    </View>
  );
}

/* ============================================================
   Estilos
============================================================ */
const s = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.fondo, padding: 24 },
  restringido: { backgroundColor: C.tarjeta, borderRadius: 18, padding: 28, borderWidth: 1, borderColor: C.borde, maxWidth: 420, alignItems: "center" },
  restringidoTitulo: { fontSize: 18, fontWeight: "800", color: C.titulo, marginBottom: 8 },
  restringidoTexto: { fontSize: 13, color: C.texto2, textAlign: "center", marginBottom: 18 },
  pantalla: { flex: 1, backgroundColor: C.fondo },
  pantallaContenido: { padding: 24, paddingBottom: 60, maxWidth: 1100, width: "100%", alignSelf: "center" },
  volver: { alignSelf: "flex-start", paddingVertical: 6, marginBottom: 8 },
  volverTexto: { fontSize: 13, fontWeight: "700", color: C.primario },
  titulo: { fontSize: 26, fontWeight: "800", color: C.titulo },
  subtitulo: { fontSize: 13, color: C.muted, marginTop: 4, marginBottom: 18 },
  tarjeta: { backgroundColor: C.tarjeta, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.borde, marginBottom: 12 },
  etiqueta: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
  etiquetaTexto: { fontSize: 11, fontWeight: "800" },
  aviso: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  avisoTexto: { fontSize: 12, fontWeight: "700" },
  vacio: { backgroundColor: C.tarjeta, borderRadius: 16, borderWidth: 1, borderColor: C.borde, padding: 24, alignItems: "center", marginVertical: 8 },
  vacioTexto: { fontSize: 13, color: C.muted, textAlign: "center" },
  boton: { minHeight: 44, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  botonPequeno: { minHeight: 34, paddingHorizontal: 12, borderRadius: 10 },
  botonTexto: { fontSize: 13, fontWeight: "800" },
  botonTextoPequeno: { fontSize: 12 },
  campo: { marginBottom: 12, flex: 1, minWidth: 150 },
  campoEtiqueta: { fontSize: 11, fontWeight: "800", color: C.texto2, marginBottom: 5 },
  campoAyuda: { fontSize: 10, color: C.muted, marginTop: 3 },
  input: { borderWidth: 1, borderColor: "#D5E3DF", borderRadius: 12, backgroundColor: "#FBFEFD", paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: C.texto },
  opciones: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  opcion: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: "#D5E3DF", backgroundColor: "#FFFFFF" },
  opcionActiva: { backgroundColor: C.primario, borderColor: C.primario },
  opcionTexto: { fontSize: 12, fontWeight: "700", color: C.texto2 },
  opcionTextoActivo: { color: "#FFFFFF" },
  paginador: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 8 },
  paginadorTexto: { fontSize: 12, color: C.texto2, fontWeight: "600" },
  modalFondo: { flex: 1, backgroundColor: "rgba(10,30,27,0.45)", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCaja: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, width: "100%", maxWidth: 640, maxHeight: "92%" },
  modalCabecera: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  modalTitulo: { fontSize: 17, fontWeight: "800", color: C.titulo, flex: 1 },
  modalCerrar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F1F8F6", alignItems: "center", justifyContent: "center" },
  modalCerrarTexto: { fontSize: 14, color: C.texto2, fontWeight: "800" },
  fila: { flexDirection: "row", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" },
  estadistica: { flex: 1, minWidth: 130, borderRadius: 16, padding: 14 },
  estadisticaValor: { fontSize: 24, fontWeight: "900" },
  estadisticaTitulo: { fontSize: 11, color: C.texto2, fontWeight: "700", marginTop: 3 },
  barraFondo: { height: 8, borderRadius: 4, backgroundColor: "#E8F0EE", overflow: "hidden", flex: 1 },
  barraRelleno: { height: 8, borderRadius: 4 },
});
