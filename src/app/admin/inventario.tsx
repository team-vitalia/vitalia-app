import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { UpgradeModal, CrownSvg } from "../../components/UpgradeModal";
import {
  actualizarLoteInventario,
  eliminarLoteInventario,
  eliminarMedicamento,
  getInventario,
  getMedicamentosAlmacen,
  getMovimientosInventario,
  registrarLoteInventario,
  registrarMedicamento,
  registrarMovimientoInventario,
  type LoteData,
  type LoteInventario,
  type Medicamento,
  type MovimientoInventario,
  type TipoMovimiento,
} from "../../services/almacenService";

type Vista = "lotes" | "movimientos" | "catalogo";
type ModalMode = "lote" | "medicamento" | "editar-lote" | "movimiento";
type Confirmacion = { tipo: "lote" | "medicamento"; id: number; nombre: string } | null;

const FECHA_HOY = new Date().toISOString().slice(0, 10);
const NORMALIZAR = (texto?: string) =>
  (texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function validarFecha(fecha: string): boolean {
  if (!fecha) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const parsed = new Date(`${fecha}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === fecha;
}

function estadoCaducidad(fecha: string | null): { label: string; tone: "danger" | "warning" | "success" } | null {
  if (!fecha) return null;
  const hoy = new Date(`${FECHA_HOY}T00:00:00`);
  const vencimiento = new Date(`${fecha.slice(0, 10)}T00:00:00`);
  const dias = Math.ceil((vencimiento.getTime() - hoy.getTime()) / 86400000);
  if (dias < 0) return { label: "Vencido", tone: "danger" };
  if (dias <= 30) return { label: dias === 0 ? "Vence hoy" : `Vence en ${dias} días`, tone: "warning" };
  return { label: "Vigente", tone: "success" };
}

export default function ControlInventarioScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { usuario, clinica, planActual } = useAuth();
  const rolId = usuario?.rol_id ?? usuario?.rol_id_FK;
  const rolAlmacen = rolId === 6 || NORMALIZAR(usuario?.rol_nombre) === "almacen";
  const planNormalizado = NORMALIZAR(planActual?.nombre_plan || "basico");
  const tieneAccesoInventario =
    (rolId === 1 || rolAlmacen) &&
    (planNormalizado === "profesional" || planNormalizado === "empresarial");

  const [vista, setVista] = useState<Vista>(() =>
    tab === "movimientos" || tab === "catalogo" ? tab : "lotes",
  );
  const [inventario, setInventario] = useState<LoteInventario[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("lote");
  const [modalUpgradeVisible, setModalUpgradeVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmacion, setConfirmacion] = useState<Confirmacion>(null);

  const [medSeleccionado, setMedSeleccionado] = useState<number | null>(null);
  const [loteEditando, setLoteEditando] = useState<LoteInventario | null>(null);
  const [loteSeleccionado, setLoteSeleccionado] = useState<LoteInventario | null>(null);
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimiento>("entrada");
  const [numeroLote, setNumeroLote] = useState("");
  const [stockActual, setStockActual] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [fechaRecepcion, setFechaRecepcion] = useState(FECHA_HOY);
  const [precioVenta, setPrecioVenta] = useState("");
  const [cantidadMovimiento, setCantidadMovimiento] = useState("");
  const [motivoMovimiento, setMotivoMovimiento] = useState("");

  const [nombreMedicamento, setNombreMedicamento] = useState("");
  const [principioActivo, setPrincipioActivo] = useState("");
  const [presentacion, setPresentacion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [requiereReceta, setRequiereReceta] = useState(false);

  const cargarDatos = useCallback(async () => {
    if (!tieneAccesoInventario) {
      setCargando(false);
      return;
    }
    setCargando(true);
    setErrorCarga("");
    try {
      const [lotes, meds, historial] = await Promise.all([
        getInventario(clinica?.id),
        getMedicamentosAlmacen(clinica?.id),
        getMovimientosInventario(clinica?.id),
      ]);
      const clinicaId = clinica?.id;
      setInventario(
        clinicaId
          ? lotes.filter((lote) => Number(lote.clinica_id_FK) === Number(clinicaId))
          : lotes,
      );
      setMedicamentos(
        clinicaId
          ? meds.filter((medicamento) => Number(medicamento.clinica_id_FK) === Number(clinicaId))
          : meds,
      );
      setMovimientos(
        clinicaId
          ? historial.filter((movimiento) => Number(movimiento.clinica_id_FK) === Number(clinicaId))
          : historial,
      );
    } catch (error: any) {
      const mensaje =
        error?.response?.data?.detail || "No se pudo cargar el inventario de la clínica.";
      setErrorCarga(mensaje);
    } finally {
      setCargando(false);
    }
  }, [clinica, tieneAccesoInventario]);

  useFocusEffect(
    useCallback(() => {
      void cargarDatos();
    }, [cargarDatos]),
  );

  const medicamentosPorId = useMemo(
    () => new Map(medicamentos.map((medicamento) => [Number(medicamento.id_PK), medicamento])),
    [medicamentos],
  );
  const lotesConMedicamento = (lote: LoteInventario | null | undefined) =>
    lote?.medicamento || (lote ? medicamentosPorId.get(Number(lote.medicamento_id_FK)) : undefined);
  const stockBajo = inventario.filter((lote) => lote.stock_actual <= 10).length;
  const lotesCaducidad = inventario.filter((lote) => {
    const estado = estadoCaducidad(lote.fecha_vencimiento);
    return estado?.tone === "danger" || estado?.tone === "warning";
  }).length;

  const volverAlPanel = () => {
    if (router.canGoBack()) router.back();
    else router.replace(rolAlmacen ? "/almacen" : "/admin");
  };

  const limpiarLote = () => {
    setNumeroLote("");
    setStockActual("");
    setUbicacion("");
    setFechaVencimiento("");
    setFechaRecepcion(FECHA_HOY);
    setPrecioVenta("");
    setMedSeleccionado(null);
    setLoteEditando(null);
  };

  const abrirLoteNuevo = () => {
    limpiarLote();
    setModalMode("lote");
    setModalVisible(true);
  };

  const iniciarEdicionLote = (lote: LoteInventario) => {
    setLoteEditando(lote);
    setMedSeleccionado(lote.medicamento_id_FK);
    setNumeroLote(lote.numero_lote || "");
    setStockActual(String(lote.stock_actual ?? 0));
    setUbicacion(lote.ubicacion || "");
    setFechaVencimiento(lote.fecha_vencimiento || "");
    setFechaRecepcion(lote.fecha_recepcion || "");
    setPrecioVenta(lote.precio_venta === null ? "" : String(lote.precio_venta));
    setModalMode("editar-lote");
    setModalVisible(true);
  };

  const handleGuardarLote = async () => {
    const stock = Number(stockActual);
    if (!medSeleccionado || !numeroLote.trim() || !stockActual.trim() || !Number.isInteger(stock) || stock < 0) {
      setErrorCarga("Selecciona medicamento y lote; el stock debe ser un entero igual o mayor a cero.");
      return;
    }
    if (!validarFecha(fechaVencimiento) || !validarFecha(fechaRecepcion)) {
      setErrorCarga("Las fechas deben tener el formato AAAA-MM-DD y ser válidas.");
      return;
    }
    const datosLote: LoteData = {
      medicamento_id_FK: medSeleccionado,
      numero_lote: numeroLote.trim(),
      stock_actual: loteEditando?.stock_actual ?? stock,
      ubicacion: ubicacion.trim() || null,
      fecha_vencimiento: fechaVencimiento || null,
      fecha_recepcion: fechaRecepcion || null,
      precio_venta: precioVenta.trim() ? Number(precioVenta) : null,
      proveedor_id_FK: loteEditando?.proveedor_id_FK ?? null,
    };
    if (datosLote.precio_venta !== null && (!Number.isFinite(datosLote.precio_venta) || datosLote.precio_venta < 0)) {
      setErrorCarga("El precio debe ser un valor válido mayor o igual a cero.");
      return;
    }
    try {
      setGuardando(true);
      setErrorCarga("");
      if (loteEditando) await actualizarLoteInventario(loteEditando.id_PK, datosLote);
      else await registrarLoteInventario(datosLote);
      setModalVisible(false);
      limpiarLote();
      await cargarDatos();
    } catch (error: any) {
      setErrorCarga(error?.response?.data?.detail || "No se pudo guardar el lote.");
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarMedicamento = async () => {
    if (nombreMedicamento.trim().length < 2) {
      setErrorCarga("Escribe un nombre de medicamento de al menos dos caracteres.");
      return;
    }
    try {
      setGuardando(true);
      setErrorCarga("");
      const nuevo = await registrarMedicamento({
        nombre: nombreMedicamento.trim(),
        principio_activo: principioActivo,
        presentacion,
        categoria,
        codigo_barras: codigoBarras,
        descripcion,
        requiere_receta: requiereReceta,
      });
      setNombreMedicamento("");
      setPrincipioActivo("");
      setPresentacion("");
      setCategoria("");
      setCodigoBarras("");
      setDescripcion("");
      setRequiereReceta(false);
      setMedicamentos((actuales) =>
        [...actuales, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );
      setMedSeleccionado(nuevo.id_PK);
      setModalMode("lote");
    } catch (error: any) {
      setErrorCarga(error?.response?.data?.detail || "No se pudo guardar el medicamento.");
    } finally {
      setGuardando(false);
    }
  };

  const abrirMovimiento = (lote: LoteInventario, tipo: TipoMovimiento) => {
    setLoteSeleccionado(lote);
    setTipoMovimiento(tipo);
    setCantidadMovimiento("");
    setMotivoMovimiento("");
    setModalMode("movimiento");
    setModalVisible(true);
  };

  const guardarMovimiento = async () => {
    const cantidad = Number(cantidadMovimiento);
    if (!loteSeleccionado || !Number.isInteger(cantidad) || cantidad <= 0) {
      setErrorCarga("Ingresa una cantidad entera mayor a cero.");
      return;
    }
    if (tipoMovimiento !== "entrada" && cantidad > loteSeleccionado.stock_actual) {
      setErrorCarga("La cantidad supera las existencias disponibles del lote.");
      return;
    }
    if (tipoMovimiento === "dispensacion" && motivoMovimiento.trim().length < 2) {
      setErrorCarga("Indica el paciente o folio de receta para registrar la dispensación.");
      return;
    }
    try {
      setGuardando(true);
      setErrorCarga("");
      await registrarMovimientoInventario({
        inventario_id_FK: loteSeleccionado.id_PK,
        tipo: tipoMovimiento,
        cantidad,
        motivo: motivoMovimiento.trim() || undefined,
      });
      setModalVisible(false);
      setLoteSeleccionado(null);
      await cargarDatos();
    } catch (error: any) {
      setErrorCarga(error?.response?.data?.detail || "No se pudo registrar el movimiento.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarSeleccionado = async () => {
    if (!confirmacion) return;
    try {
      setGuardando(true);
      setErrorCarga("");
      if (confirmacion.tipo === "lote") await eliminarLoteInventario(confirmacion.id);
      else await eliminarMedicamento(confirmacion.id);
      setConfirmacion(null);
      await cargarDatos();
    } catch (error: any) {
      setConfirmacion(null);
      setErrorCarga(error?.response?.data?.detail || "No se pudo eliminar el registro.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarVista = (seleccion: Vista) => setVista(seleccion);

  if (!tieneAccesoInventario) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Almacén e inventario</Text>
        <View style={styles.premiumCard}>
          <CrownSvg size={36} color="#FBBF24" />
          <Text style={styles.premiumTitle}>Módulo de almacén</Text>
          <Text style={styles.subtitle}>
            La gestión de inventario requiere un usuario de Almacén o Administrador y el plan Profesional.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => setModalUpgradeVisible(true)}>
            <Text style={styles.primaryButtonText}>Ver planes</Text>
          </Pressable>
        </View>
        <UpgradeModal
          visible={modalUpgradeVisible}
          modulo="Almacén e Inventario"
          planRequerido="Profesional"
          descripcion="El control de lotes, caducidades y movimientos está disponible a partir del Plan Profesional."
          onClose={() => setModalUpgradeVisible(false)}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={volverAlPanel} accessibilityRole="button" style={styles.backButton}>
        <Text style={styles.backText}>← Volver al panel</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>ALMACÉN · {clinica?.nombre_comercial || "MI CLÍNICA"}</Text>
        <Text style={styles.title}>Inventario y farmacia</Text>
        <Text style={styles.subtitle}>Lotes, fechas de caducidad, existencias y trazabilidad de dispensaciones.</Text>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricNumber}>{inventario.length}</Text>
          <Text style={styles.metricLabel}>Lotes</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricNumber, styles.warningText]}>{stockBajo}</Text>
          <Text style={styles.metricLabel}>Stock bajo</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricNumber, styles.dangerText]}>{lotesCaducidad}</Text>
          <Text style={styles.metricLabel}>Caducados/próximos</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.primaryButton} onPress={abrirLoteNuevo} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>＋ Registrar lote / entrada</Text>
        </Pressable>
        <Pressable
          style={styles.outlineButton}
          onPress={() => {
            setModalMode("medicamento");
            setModalVisible(true);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.outlineButtonText}>＋ Medicamento</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {([
          ["lotes", "Lotes"],
          ["movimientos", "Entradas y salidas"],
          ["catalogo", "Medicamentos"],
        ] as const).map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.tab, vista === key && styles.tabActive]}
            onPress={() => cambiarVista(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: vista === key }}
          >
            <Text style={[styles.tabText, vista === key && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {errorCarga ? <Text style={styles.error}>{errorCarga}</Text> : null}
      {cargando ? (
        <ActivityIndicator size="large" color="#0F766E" style={{ marginTop: 24 }} />
      ) : vista === "lotes" ? (
        inventario.length ? (
          inventario.map((lote) => {
            const medicamento = lotesConMedicamento(lote);
            const caducidad = estadoCaducidad(lote.fecha_vencimiento);
            return (
              <View key={lote.id_PK} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardHeading}>
                    <Text style={styles.cardTitle}>{medicamento?.nombre || `Medicamento #${lote.medicamento_id_FK}`}</Text>
                    <Text style={styles.cardSub}>Lote {lote.numero_lote || "sin número"}</Text>
                  </View>
                  <Text style={[styles.badge, lote.stock_actual <= 10 ? styles.badgeWarning : styles.badgeSuccess]}>
                    {lote.stock_actual <= 10 ? "Stock bajo" : "Disponible"}
                  </Text>
                </View>
                <View style={styles.details}>
                  <Text style={styles.detail}>Existencias: <Text style={styles.strong}>{lote.stock_actual} unidades</Text></Text>
                  <Text style={styles.detail}>Caducidad: <Text style={styles.strong}>{lote.fecha_vencimiento || "Sin fecha"}</Text></Text>
                  {lote.ubicacion ? <Text style={styles.detail}>Ubicación: {lote.ubicacion}</Text> : null}
                </View>
                {caducidad ? (
                  <Text style={[styles.expiry, caducidad.tone === "danger" ? styles.dangerText : caducidad.tone === "warning" ? styles.warningText : styles.successText]}>
                    {caducidad.label}
                  </Text>
                ) : null}
                <View style={styles.cardActions}>
                  <Pressable style={styles.smallButton} onPress={() => abrirMovimiento(lote, "entrada")}>
                    <Text style={styles.smallButtonText}>＋ Entrada</Text>
                  </Pressable>
                  <Pressable style={styles.smallButton} onPress={() => abrirMovimiento(lote, "salida")}>
                    <Text style={styles.smallButtonText}>− Salida</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.smallButton, styles.dispenseButton, caducidad?.tone === "danger" && styles.disabledButton]}
                    onPress={() => abrirMovimiento(lote, "dispensacion")}
                    disabled={caducidad?.tone === "danger"}
                    accessibilityState={{ disabled: caducidad?.tone === "danger" }}
                  >
                    <Text style={[styles.smallButtonText, styles.dispenseText]}>Dispensar</Text>
                  </Pressable>
                  <Pressable style={styles.iconButton} onPress={() => iniciarEdicionLote(lote)} accessibilityLabel="Editar lote">
                    <Ionicons name="create-outline" size={18} color="#247F76" />
                  </Pressable>
                  <Pressable
                    style={styles.iconButton}
                    onPress={() => setConfirmacion({ tipo: "lote", id: lote.id_PK, nombre: lote.numero_lote || `#${lote.id_PK}` })}
                    accessibilityLabel="Retirar lote"
                  >
                    <Ionicons name="trash-outline" size={18} color="#B42318" />
                  </Pressable>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.empty}>No hay lotes activos para esta clínica.</Text>
        )
      ) : vista === "movimientos" ? (
        movimientos.length ? (
          movimientos.map((movimiento) => (
            <View key={movimiento.id_PK} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardHeading}>
                  <Text style={styles.cardTitle}>{movimiento.tipo} · {movimiento.medicamento_nombre || "Medicamento"}</Text>
                  <Text style={styles.cardSub}>Lote {movimiento.numero_lote || "sin número"} · {movimiento.creado_en ? new Date(movimiento.creado_en).toLocaleString() : ""}</Text>
                </View>
                <Text style={[styles.movementAmount, movimiento.tipo.toLowerCase().includes("entrada") ? styles.successText : styles.warningText]}>
                  {movimiento.tipo.toLowerCase().includes("entrada") ? "+" : "−"}{movimiento.cantidad}
                </Text>
              </View>
              {movimiento.motivo ? <Text style={styles.detail}>Referencia: {movimiento.motivo}</Text> : null}
              <Text style={styles.detail}>Stock: {movimiento.stock_anterior ?? "—"} → {movimiento.stock_nuevo ?? "—"} · {movimiento.usuario_nombre || "Usuario"}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Aún no hay entradas, salidas ni dispensaciones.</Text>
        )
      ) : medicamentos.length ? (
        medicamentos.map((medicamento) => (
          <View key={medicamento.id_PK} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardHeading}>
                <Text style={styles.cardTitle}>{medicamento.nombre}</Text>
                <Text style={styles.cardSub}>{medicamento.presentacion || medicamento.principio_activo || "Sin presentación registrada"}</Text>
              </View>
              <Pressable
                style={styles.iconButton}
                onPress={() => setConfirmacion({ tipo: "medicamento", id: medicamento.id_PK, nombre: medicamento.nombre })}
                accessibilityLabel={`Eliminar ${medicamento.nombre}`}
              >
                <Ionicons name="trash-outline" size={18} color="#B42318" />
              </Pressable>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>El catálogo de medicamentos está vacío.</Text>
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => !guardando && setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalCard} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {errorCarga ? <Text style={styles.error}>{errorCarga}</Text> : null}
            {modalMode === "lote" || modalMode === "editar-lote" ? (
              <>
                <Text style={styles.modalTitle}>{modalMode === "editar-lote" ? "Editar datos del lote" : "Registrar lote / entrada"}</Text>
                <Text style={styles.label}>Medicamento</Text>
                {medicamentos.length ? (
                  <View style={styles.medOptions}>
                    {medicamentos.map((medicamento) => (
                      <Pressable
                        key={medicamento.id_PK}
                        disabled={modalMode === "editar-lote"}
                        style={[
                          styles.medOption,
                          medSeleccionado === medicamento.id_PK && styles.medOptionActive,
                          modalMode === "editar-lote" && styles.disabledButton,
                        ]}
                        onPress={() => setMedSeleccionado(medicamento.id_PK)}
                      >
                        <Text style={[styles.medOptionText, medSeleccionado === medicamento.id_PK && styles.medOptionTextActive]}>{medicamento.nombre}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Pressable style={styles.outlineButton} onPress={() => setModalMode("medicamento")}>
                    <Text style={styles.outlineButtonText}>Primero agrega un medicamento</Text>
                  </Pressable>
                )}
                {modalMode === "lote" ? (
                  <Pressable style={styles.textLink} onPress={() => setModalMode("medicamento")}>
                    <Text style={styles.textLinkLabel}>＋ Crear medicamento nuevo</Text>
                  </Pressable>
                ) : null}
                <Text style={styles.label}>Número de lote *</Text>
                <TextInput
                  style={styles.input}
                  value={numeroLote}
                  onChangeText={setNumeroLote}
                  placeholder="Ej. LOT-2026-A"
                  editable={modalMode !== "editar-lote"}
                />
                <Text style={styles.label}>Stock inicial *</Text>
                <TextInput style={styles.input} value={stockActual} onChangeText={setStockActual} keyboardType="numeric" editable={modalMode !== "editar-lote"} placeholder="0" />
                {modalMode === "editar-lote" ? <Text style={styles.helper}>El stock solo cambia mediante una entrada o salida para conservar la trazabilidad.</Text> : null}
                <Text style={styles.label}>Fecha de caducidad (AAAA-MM-DD)</Text>
                <TextInput style={styles.input} value={fechaVencimiento} onChangeText={setFechaVencimiento} placeholder="2027-12-31" />
                <Text style={styles.label}>Fecha de recepción (AAAA-MM-DD)</Text>
                <TextInput style={styles.input} value={fechaRecepcion} onChangeText={setFechaRecepcion} placeholder="2026-01-15" />
                <Text style={styles.label}>Ubicación</Text>
                <TextInput style={styles.input} value={ubicacion} onChangeText={setUbicacion} placeholder="Estante A1" />
                <Text style={styles.label}>Precio (opcional)</Text>
                <TextInput style={styles.input} value={precioVenta} onChangeText={setPrecioVenta} keyboardType="decimal-pad" placeholder="0.00" />
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelButton} onPress={() => setModalVisible(false)} disabled={guardando}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </Pressable>
                  <Pressable style={styles.primaryButton} onPress={handleGuardarLote} disabled={guardando}>
                    <Text style={styles.primaryButtonText}>{guardando ? "Guardando..." : "Guardar lote"}</Text>
                  </Pressable>
                </View>
              </>
            ) : modalMode === "movimiento" ? (
              <>
                <Text style={styles.modalTitle}>{tipoMovimiento === "entrada" ? "Registrar entrada" : tipoMovimiento === "salida" ? "Registrar salida" : "Dispensar medicamento"}</Text>
                <Text style={styles.helper}>
                  {loteSeleccionado
                    ? `${lotesConMedicamento(loteSeleccionado)?.nombre || "Medicamento"} · Lote ${loteSeleccionado.numero_lote || "sin número"} · Disponible: ${loteSeleccionado.stock_actual}`
                    : "Selecciona un lote para registrar el movimiento."}
                </Text>
                <Text style={styles.label}>Cantidad *</Text>
                <TextInput style={styles.input} value={cantidadMovimiento} onChangeText={setCantidadMovimiento} keyboardType="numeric" placeholder="Cantidad" />
                <Text style={styles.label}>{tipoMovimiento === "dispensacion" ? "Paciente o folio de receta *" : "Motivo / referencia (opcional)"}</Text>
                <TextInput style={styles.input} value={motivoMovimiento} onChangeText={setMotivoMovimiento} placeholder="Referencia para auditoría" maxLength={255} />
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelButton} onPress={() => setModalVisible(false)} disabled={guardando}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </Pressable>
                  <Pressable style={styles.primaryButton} onPress={guardarMovimiento} disabled={guardando}>
                    <Text style={styles.primaryButtonText}>{guardando ? "Guardando..." : "Confirmar movimiento"}</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Nuevo medicamento</Text>
                <Text style={styles.label}>Nombre *</Text>
                <TextInput style={styles.input} value={nombreMedicamento} onChangeText={setNombreMedicamento} placeholder="Paracetamol" maxLength={200} />
                <Text style={styles.label}>Principio activo</Text>
                <TextInput style={styles.input} value={principioActivo} onChangeText={setPrincipioActivo} placeholder="Paracetamol" maxLength={200} />
                <Text style={styles.label}>Presentación</Text>
                <TextInput style={styles.input} value={presentacion} onChangeText={setPresentacion} placeholder="500 mg, caja con 20 tabletas" maxLength={100} />
                <Text style={styles.label}>Categoría</Text>
                <TextInput style={styles.input} value={categoria} onChangeText={setCategoria} placeholder="Analgésico" maxLength={100} />
                <Text style={styles.label}>Código de barras</Text>
                <TextInput style={styles.input} value={codigoBarras} onChangeText={setCodigoBarras} maxLength={100} />
                <Text style={styles.label}>Descripción</Text>
                <TextInput style={[styles.input, styles.multiline]} value={descripcion} onChangeText={setDescripcion} multiline textAlignVertical="top" />
                <Text style={styles.label}>¿Requiere receta?</Text>
                <View style={styles.choiceRow}>
                  {[false, true].map((value) => (
                    <Pressable key={String(value)} style={[styles.choice, requiereReceta === value && styles.choiceActive]} onPress={() => setRequiereReceta(value)}>
                      <Text style={[styles.choiceText, requiereReceta === value && styles.choiceTextActive]}>{value ? "Sí" : "No"}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelButton} onPress={() => setModalVisible(false)} disabled={guardando}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </Pressable>
                  <Pressable style={styles.primaryButton} onPress={handleGuardarMedicamento} disabled={guardando}>
                    <Text style={styles.primaryButtonText}>{guardando ? "Guardando..." : "Guardar medicamento"}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={!!confirmacion} transparent animationType="fade" onRequestClose={() => setConfirmacion(null)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Ionicons name="warning-outline" size={32} color="#B42318" />
            <Text style={styles.confirmTitle}>{confirmacion?.tipo === "lote" ? "Retirar lote" : "Eliminar medicamento"}</Text>
            <Text style={styles.confirmText}>
              {confirmacion?.tipo === "lote"
                ? `¿Retirar el lote ${confirmacion.nombre}? Solo se permite si no tiene existencias. El historial de movimientos se conserva.`
                : `¿Eliminar ${confirmacion?.nombre}? Solo es posible si no está vinculado a lotes, recetas o interacciones.`}
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={() => setConfirmacion(null)} disabled={guardando}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={eliminarSeleccionado} disabled={guardando}>
                <Text style={styles.primaryButtonText}>{guardando ? "Procesando..." : "Eliminar"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FAF8" },
  content: { padding: 18, paddingBottom: 44, width: "100%", maxWidth: 1050, alignSelf: "center" },
  backButton: { marginBottom: 12, alignSelf: "flex-start", paddingVertical: 6 },
  backText: { color: "#247F76", fontWeight: "700" },
  header: { marginBottom: 14 },
  eyebrow: { fontSize: 11, letterSpacing: 1, fontWeight: "800", color: "#247F76" },
  title: { fontSize: 25, fontWeight: "800", color: "#173F3A", marginTop: 5 },
  subtitle: { fontSize: 13, lineHeight: 20, color: "#71817E", marginTop: 5 },
  metrics: { flexDirection: "row", gap: 9, marginBottom: 14 },
  metric: { flex: 1, minWidth: 90, backgroundColor: "#FFFFFF", borderColor: "#E4EEEB", borderWidth: 1, borderRadius: 13, padding: 12 },
  metricNumber: { fontSize: 22, fontWeight: "800", color: "#173F3A" },
  metricLabel: { fontSize: 10, color: "#71817E", marginTop: 4 },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  primaryButton: { minHeight: 44, backgroundColor: "#0F766E", borderRadius: 10, paddingHorizontal: 15, paddingVertical: 11, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  outlineButton: { minHeight: 44, borderWidth: 1, borderColor: "#0F766E", borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  outlineButtonText: { color: "#0F766E", fontWeight: "700", fontSize: 13 },
  tabs: { flexDirection: "row", backgroundColor: "#E7F0ED", padding: 4, borderRadius: 12, marginBottom: 14, gap: 3 },
  tab: { flex: 1, minHeight: 40, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  tabActive: { backgroundColor: "#FFFFFF" },
  tabText: { color: "#657773", fontSize: 11, fontWeight: "700", textAlign: "center" },
  tabTextActive: { color: "#0F766E" },
  error: { color: "#B42318", backgroundColor: "#FCECEC", padding: 11, borderRadius: 9, marginBottom: 12, fontSize: 13 },
  card: { backgroundColor: "#FFFFFF", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E4EEEB", marginBottom: 10 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardHeading: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#173F3A" },
  cardSub: { fontSize: 11, color: "#82938F", marginTop: 3 },
  details: { flexDirection: "row", flexWrap: "wrap", columnGap: 18, rowGap: 4, marginTop: 10 },
  detail: { fontSize: 12, color: "#526360", marginTop: 5 },
  strong: { fontWeight: "800", color: "#173F3A" },
  badge: { fontSize: 10, fontWeight: "800", overflow: "hidden", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  badgeSuccess: { color: "#247F76", backgroundColor: "#E2F4F0" },
  badgeWarning: { color: "#B7791F", backgroundColor: "#FFF4D8" },
  expiry: { fontSize: 11, fontWeight: "800", marginTop: 8 },
  successText: { color: "#247F76" },
  warningText: { color: "#B7791F" },
  dangerText: { color: "#B42318" },
  cardActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 13, borderTopWidth: 1, borderTopColor: "#EDF2F0", paddingTop: 10 },
  smallButton: { borderWidth: 1, borderColor: "#C9DFD9", borderRadius: 8, minHeight: 34, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  smallButtonText: { color: "#247F76", fontSize: 11, fontWeight: "700" },
  dispenseButton: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  disabledButton: { opacity: 0.45 },
  dispenseText: { color: "#FFFFFF" },
  iconButton: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#F4FAF8" },
  movementAmount: { fontSize: 16, fontWeight: "800" },
  empty: { color: "#82938F", fontStyle: "italic", paddingVertical: 20, textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(10,25,22,0.55)", justifyContent: "center", padding: 14 },
  modalCard: { maxHeight: "92%", width: "100%", maxWidth: 600, alignSelf: "center", backgroundColor: "#FFFFFF", borderRadius: 18 },
  modalContent: { padding: 18 },
  modalTitle: { fontSize: 19, fontWeight: "800", color: "#173F3A", marginBottom: 15 },
  label: { fontSize: 12, fontWeight: "700", color: "#526360", marginBottom: 5, marginTop: 8 },
  input: { minHeight: 42, borderWidth: 1, borderColor: "#DCE8E4", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 9, color: "#173F3A", fontSize: 14 },
  multiline: { minHeight: 78 },
  helper: { color: "#71817E", fontSize: 12, lineHeight: 18, marginBottom: 8 },
  medOptions: { maxHeight: 145, flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  medOption: { borderWidth: 1, borderColor: "#DCE8E4", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  medOptionActive: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  medOptionText: { color: "#526360", fontSize: 12 },
  medOptionTextActive: { color: "#FFFFFF", fontWeight: "700" },
  textLink: { alignSelf: "flex-start", paddingVertical: 7 },
  textLinkLabel: { color: "#0F766E", fontSize: 12, fontWeight: "700" },
  choiceRow: { flexDirection: "row", gap: 8, marginTop: 7 },
  choice: { minWidth: 54, borderWidth: 1, borderColor: "#DCE8E4", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  choiceActive: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  choiceText: { color: "#526360", fontWeight: "700" },
  choiceTextActive: { color: "#FFFFFF" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 18 },
  cancelButton: { minHeight: 42, justifyContent: "center", alignItems: "center", paddingHorizontal: 13, borderRadius: 9, backgroundColor: "#EAF0EE" },
  cancelButtonText: { color: "#526360", fontWeight: "700", fontSize: 12 },
  premiumCard: { margin: 20, backgroundColor: "#FFFFFF", padding: 26, borderRadius: 18, alignItems: "center", gap: 12 },
  premiumTitle: { color: "#173F3A", fontSize: 20, fontWeight: "800" },
  confirmOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "rgba(10,25,22,0.55)" },
  confirmCard: { width: "100%", maxWidth: 420, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 20, alignItems: "center" },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#173F3A", marginTop: 10 },
  confirmText: { fontSize: 13, lineHeight: 20, color: "#60736F", textAlign: "center", marginTop: 8 },
  deleteButton: { minHeight: 42, justifyContent: "center", alignItems: "center", paddingHorizontal: 15, borderRadius: 9, backgroundColor: "#B42318" },
});
