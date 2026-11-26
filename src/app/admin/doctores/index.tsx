
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type Theme } from "../../../theme/theme";

import * as Print from "expo-print";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { Download } from "lucide-react-native";
import DocumentoContrato from "../../../components/DocumentoContrato";
import SelectorFecha from "../../../components/SelectorFecha";
import { CrownSvg, UpgradeModal } from "../../../components/UpgradeModal";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";
import { generarHtmlContrato } from "../../../utils/contratoPdf";

interface Doctor {
  id_PK: number;
  nombre?: string;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  nombre_completo?: string;

  usuario?: {
    nombre?: string;
    apellido_paterno?: string | null;
    apellido_materno?: string | null;
    nombre_completo?: string;
  };
}

interface Contrato {
  id_PK: number;
  doctor_id_FK: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string | null;
  tipo_contrato: string | null;
  salario: number | string | null;
  url_documento: string | null;
}

interface FormularioContrato {
  doctor_id_FK: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  tipo_contrato: string;
  salario: string;
}

const formularioInicial: FormularioContrato = {
  doctor_id_FK: "",
  fecha_inicio: "",
  fecha_fin: "",
  estado: "Activo",
  tipo_contrato: "",
  salario: "",
};

const TIPOS_CONTRATO = [
  "Indefinido",
  "Temporal",
  "Por honorarios",
  "Medio tiempo",
  "Otro",
];

export default function ContratosScreen() {
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { token, planActual } = useAuth();
  const [modalUpgradeVisible, setModalUpgradeVisible] = useState(false);
  const [descargandoId, setDescargandoId] = useState<number | null>(null);

  const planNormalizado = (planActual?.nombre_plan || "basico")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const tieneAccesoContratos =
    !!planActual?.incluye_contratos || planNormalizado === "empresarial";

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [doctores, setDoctores] = useState<Doctor[]>([]);
  const [busquedaDoctor, setBusquedaDoctor] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<
    "Todos" | "Activo" | "Pendiente" | "Finalizado"
  >("Todos");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [otroTipoContrato, setOtroTipoContrato] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [contratoEditar, setContratoEditar] =
    useState<number | null>(null);

  const [formulario, setFormulario] =
    useState<FormularioContrato>(formularioInicial);

  const [documentoVisible, setDocumentoVisible] = useState(false);
  const [contratoDocumento, setContratoDocumento] =
    useState<Contrato | null>(null);

  const [alerta, setAlerta] = useState({
    visible: false,
    titulo: "",
    mensaje: "",
    exito: false,
  });

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const mostrarAlerta = (
    titulo: string,
    mensaje: string,
    exito = false
  ) => {
    setAlerta({
      visible: true,
      titulo,
      mensaje,
      exito,
    });
  };

  const abrirDocumento = (contrato: Contrato) => {
    setContratoDocumento(contrato);
    setDocumentoVisible(true);
  };

  const extraerLista = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.resultados)) return data.resultados;
    if (Array.isArray(data?.doctores)) return data.doctores;
    if (Array.isArray(data?.contratos)) return data.contratos;
    return [];
  };

  const cargarDatos = useCallback(async () => {
    if (!token) {
      setCargando(false);
      return;
    }

    if (!tieneAccesoContratos) {
      setCargando(false);
      setModalUpgradeVisible(true);
      return;
    }

    setCargando(true);

    try {
      const encabezados = {
        Authorization: `Bearer ${token}`,
      };

      const [respuestaContratos, respuestaDoctores] =
        await Promise.all([
          api.get("/api/contratos/", {
            headers: encabezados,
          }),
          api.get("/api/doctores/", {
            headers: encabezados,
          }),
        ]);

      setContratos(extraerLista(respuestaContratos.data));
      setDoctores(extraerLista(respuestaDoctores.data));
    } catch (error: any) {
      console.error(
        "Error al cargar contratos:",
        error?.response?.data ?? error?.message
      );

      mostrarAlerta(
        "No se pudieron cargar los datos",
        error?.response?.data?.detail ??
          "Verifica tu sesión y que los endpoints de contratos y doctores estén disponibles."
      );
    } finally {
      setCargando(false);
    }
  }, [token, tieneAccesoContratos]);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  const actualizarCampo = (
    campo: keyof FormularioContrato,
    valor: string
  ) => {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  };

  const abrirNuevo = () => {
    setContratoEditar(null);
    setFormulario(formularioInicial);
    setOtroTipoContrato("");
    setBusquedaDoctor("");
    setModalVisible(true);
  };

  const abrirEdicion = (contrato: Contrato) => {
    setContratoEditar(contrato.id_PK);

    const tipoRegistrado = contrato.tipo_contrato ?? "";
    const tipoConocido = TIPOS_CONTRATO.includes(tipoRegistrado);

    setFormulario({
      doctor_id_FK: String(contrato.doctor_id_FK),
      fecha_inicio: contrato.fecha_inicio ?? "",
      fecha_fin: contrato.fecha_fin ?? "",
      estado: contrato.estado ?? "",
      tipo_contrato: tipoConocido ? tipoRegistrado : "Otro",
      salario:
        contrato.salario == null
          ? ""
          : String(contrato.salario),
    });

    setOtroTipoContrato(
      tipoConocido ? "" : tipoRegistrado
    );

    setModalVisible(true);
  };

  const guardarContrato = async () => {
    const inicio = formulario.fecha_inicio.trim();
    const fin = formulario.fecha_fin.trim();

    const tipo =
      formulario.tipo_contrato === "Otro"
        ? otroTipoContrato.trim()
        : formulario.tipo_contrato.trim();

    const estado = formulario.estado.trim();
    const salarioTexto = formulario.salario.trim();

    if (
      !formulario.doctor_id_FK ||
      !inicio ||
      !tipo ||
      !estado ||
      !salarioTexto
    ) {
      mostrarAlerta(
        "Campos obligatorios",
        "Selecciona un médico y completa la fecha de inicio, el tipo de contrato, el estado y el salario."
      );
      return;
    }

    const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;

    if (
      !formatoFecha.test(inicio) ||
      (fin !== "" && !formatoFecha.test(fin))
    ) {
      mostrarAlerta(
        "Formato de fecha incorrecto",
        "Utiliza el formato AAAA-MM-DD. Por ejemplo: 2026-10-09."
      );
      return;
    }

    const fechaInicio = new Date(`${inicio}T00:00:00Z`);
    const fechaFin = fin
      ? new Date(`${fin}T00:00:00Z`)
      : null;

    if (
      Number.isNaN(fechaInicio.getTime()) ||
      fechaInicio.toISOString().slice(0, 10) !== inicio ||
      (fechaFin &&
        (Number.isNaN(fechaFin.getTime()) ||
          fechaFin.toISOString().slice(0, 10) !== fin))
    ) {
      mostrarAlerta(
        "Fecha inválida",
        "Verifica que las fechas existan en el calendario."
      );
      return;
    }

    if (fin && fin < inicio) {
      mostrarAlerta(
        "Fechas incorrectas",
        "La fecha de fin no puede ser anterior a la fecha de inicio."
      );
      return;
    }

    const salario = Number(salarioTexto);

    if (!Number.isFinite(salario) || salario < 0) {
      mostrarAlerta(
        "Salario inválido",
        "Ingresa un salario válido, igual o mayor que cero."
      );
      return;
    }

    const datos = {
      doctor_id_FK: Number(formulario.doctor_id_FK),
      fecha_inicio: inicio,
      fecha_fin: fin || null,
      estado,
      tipo_contrato: tipo,
      salario,
    };

    setGuardando(true);

    try {
      if (contratoEditar !== null) {
        const { doctor_id_FK, ...datosActualizar } = datos;

        await api.put(
          `/api/contratos/${contratoEditar}`,
          datosActualizar,
          { headers }
        );

        mostrarAlerta(
          "Contrato actualizado",
          "Los cambios se guardaron correctamente.",
          true
        );
      } else {
        await api.post("/api/contratos/", datos, {
          headers,
        });

        mostrarAlerta(
          "Contrato registrado",
          "El contrato se registró correctamente.",
          true
        );
      }

      setModalVisible(false);
      setFormulario(formularioInicial);
      setContratoEditar(null);
      setOtroTipoContrato("");

      await cargarDatos();
    } catch (error: any) {
      console.error(
        "Error al guardar contrato:",
        error?.response?.data ?? error?.message
      );

      const detalle = error?.response?.data?.detail;

      const mensaje = Array.isArray(detalle)
        ? detalle.map((item: any) => item.msg).join("\n")
        : typeof detalle === "string"
          ? detalle
          : "No fue posible guardar el contrato. Verifica los datos y tus permisos.";

      mostrarAlerta("Error al guardar", mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const nombreDoctor = (id: number): string => {
    const doctor = doctores.find(
      (item) => item.id_PK === id
    );

    if (!doctor) {
      return `Médico #${id}`;
    }

    const usuario = doctor.usuario;

    const nombreCompleto =
      usuario?.nombre_completo ||
      doctor.nombre_completo;

    if (nombreCompleto?.trim()) {
      return nombreCompleto.trim();
    }

    const nombre = usuario?.nombre || doctor.nombre || "";

    const apellidoPaterno =
      usuario?.apellido_paterno ?? doctor.apellido_paterno ?? "";

    const apellidoMaterno =
      usuario?.apellido_materno ?? doctor.apellido_materno ?? "";

    return [
      nombre,
      apellidoPaterno,
      apellidoMaterno
    ]
      .filter((parte) => parte.trim() !== "")
      .join(" ") || `Médico #${id}`;
  };

  const normalizarTexto = (texto: string) =>
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  
  const doctoresFiltrados = useMemo(() => {
  const texto = normalizarTexto(busquedaDoctor);

  return doctores.filter((doctor) =>
    normalizarTexto(nombreDoctor(doctor.id_PK))
      .includes(texto)
  );
}, [doctores, busquedaDoctor]);

  const contratosFiltrados = useMemo(() => {
    const textoBusqueda = normalizarTexto(busqueda);

    return contratos
      .filter((contrato) => {
        const nombre = nombreDoctor(contrato.doctor_id_FK);
        const tipo = contrato.tipo_contrato ?? "";
        const estado = contrato.estado ?? "";
        const numero = String(contrato.id_PK);

        const coincideBusqueda =
          textoBusqueda === "" ||
          normalizarTexto(nombre).includes(textoBusqueda) ||
          normalizarTexto(tipo).includes(textoBusqueda) ||
          normalizarTexto(estado).includes(textoBusqueda) ||
          numero.includes(textoBusqueda);

        const coincideEstado =
          filtroEstado === "Todos" ||
          normalizarTexto(estado) ===
            normalizarTexto(filtroEstado);

        return coincideBusqueda && coincideEstado;
      })
      .sort((a, b) => b.id_PK - a.id_PK);
  }, [contratos, busqueda, filtroEstado]);

  const totalContratos = contratos.length;

  const totalActivos = contratos.filter(
    (contrato) =>
      normalizarTexto(contrato.estado ?? "") === "activo"
  ).length;

  const totalPendientes = contratos.filter(
    (contrato) =>
      normalizarTexto(contrato.estado ?? "") === "pendiente"
  ).length;

  const totalFinalizados = contratos.filter(
    (contrato) =>
      normalizarTexto(contrato.estado ?? "") === "finalizado"
  ).length;

  const descargarContrato = async (contrato: Contrato) => {
    try {
      setDescargandoId(contrato.id_PK);

      const html = generarHtmlContrato(
        contrato,
        nombreDoctor(contrato.doctor_id_FK)
      );

      
  if (Platform.OS === "web") {
    if (
      typeof window === "undefined" ||
      typeof document === "undefined"
    ) {
      throw new Error("La descarga solo está disponible en el navegador.");
    }

    const html2pdf = (await import("html2pdf.js")).default;

    // Leer el HTML completo del contrato.
    const documento = new DOMParser().parseFromString(
      html,
      "text/html"
    );

    // Crear el contenedor que se convertirá en PDF.
    const contenedor = document.createElement("div");

    contenedor.innerHTML = documento.body.innerHTML;

    contenedor.style.width = "186mm";
    contenedor.style.maxWidth = "186mm";
    contenedor.style.padding = "0";
    contenedor.style.margin = "0 auto";
    contenedor.style.backgroundColor = "#FFFFFF";
    contenedor.style.color = "#000000";
    contenedor.style.overflow = "visible";

    // Copiar los estilos originales del contrato.
    const estilosTemporales: HTMLElement[] = [];

    documento.head
      .querySelectorAll('style, link[rel="stylesheet"]')
      .forEach((estilo) => {
        const copia = estilo.cloneNode(true) as HTMLElement;

        document.head.appendChild(copia);
        estilosTemporales.push(copia);
      });
    
    contenedor.style.width = "190mm";
    contenedor.style.padding = "0";
    contenedor.style.margin = "0 auto";
    contenedor.style.backgroundColor = "#FFFFFF";
    contenedor.style.color = "#000000";

    // Evitar cortes innecesarios dentro de los elementos.
    contenedor.style.setProperty("overflow", "visible");

    document.body.appendChild(contenedor);

    try {
      // Esperar a que estén disponibles las fuentes.
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      // Configuración de generación del PDF.
      const opcionesPdf = {
        margin: [12, 12, 12, 12],
        filename: `Contrato-${contrato.id_PK}.pdf`,

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
      document.body.removeChild(contenedor);

      // Retirar los estilos temporales.
      estilosTemporales.forEach((estilo) => {
        estilo.remove();
      });
    }

    return;
  }

      // Android e iOS.
      const resultado = await Print.printToFileAsync({ html });

      const disponible = await Sharing.isAvailableAsync();

      if (!disponible) {
        mostrarAlerta("Aviso", "No está disponible compartir el PDF.");
        return;
      }

      await Sharing.shareAsync(resultado.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Guardar contrato PDF",
      });
    } catch (error) {
      console.error("Error al generar contrato:", error);
      mostrarAlerta("Error", "No se pudo generar el PDF del contrato.");
    } finally {
      setDescargandoId(null);
    }
  };

  if (!tieneAccesoContratos) {
    return (
      <View style={styles.contenedor}>
        <View style={styles.encabezado}>
          <Text style={styles.titulo}>Contratos médicos</Text>
          <Text style={styles.subtitulo}>
            Administra la contratación y condiciones legales de los médicos de tu clínica.
          </Text>
        </View>

        <View style={styles.premiumBannerWrapper}>
          <View style={styles.premiumCard}>
            <View style={styles.premiumIconContainer}>
              <CrownSvg size={36} color="#FBBF24" />
            </View>

            <View style={styles.badgePremium}>
              <Text style={styles.badgePremiumTexto}>
                FUNCIÓN EXCLUSIVA PLAN EMPRESARIAL
              </Text>
            </View>

            <Text style={styles.premiumTitulo}>
              Gestión de Contratos Médicos
            </Text>

            <Text style={styles.premiumDescripcion}>
              Formaliza y gestiona las relaciones contractuales, honorarios, vigencias y documentación legal de tu equipo médico en una sola plataforma segura y auditada.
            </Text>

            <Pressable
              style={styles.botonDesbloquear}
              onPress={() => setModalUpgradeVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Ver planes de mejora"
            >
              <Text style={styles.botonDesbloquearTexto}>
                Ver planes de mejora
              </Text>
            </Pressable>
          </View>
        </View>

        <UpgradeModal
          visible={modalUpgradeVisible}
          modulo="Gestión de Contratos"
          planRequerido="Empresarial"
          descripcion="La gestión de contratos laborales y de honorarios para tu cuerpo médico es exclusiva del Plan Empresarial. Actualiza tu plan para desbloquear la generación de documentos legales, control de salarios y acuerdos profesionales."
          onClose={() => setModalUpgradeVisible(false)}
        />
      </View>
    );
  }

  const renderContrato = ({
    item,
  }: {
    item: Contrato;
  }) => (
    <View style={styles.tarjeta}>
      <View style={styles.tarjetaEncabezado}>
        <View style={styles.flex}>
          <Text style={styles.nombreDoctor}>
            {nombreDoctor(item.doctor_id_FK)}
          </Text>

          <Text style={styles.idContrato}>
            Contrato #{item.id_PK}
          </Text>
        </View>

        <View
          style={[
            styles.estadoBadge,
            item.estado?.toLowerCase() === "activo"
              ? styles.estadoActivo
              : styles.estadoOtro,
          ]}
        >
          <Text style={styles.estadoTexto}>
            {item.estado ?? "Sin estado"}
          </Text>
        </View>
      </View>

      <View style={styles.divisor} />

      <Text style={styles.detalle}>
        Tipo: {item.tipo_contrato ?? "No especificado"}
      </Text>

      <Text style={styles.detalle}>
        Inicio: {item.fecha_inicio ?? "No especificada"}
      </Text>

      <Text style={styles.detalle}>
        Fin: {item.fecha_fin ?? "Sin fecha de fin"}
      </Text>

      <Text style={styles.salario}>
        Salario: $
        {Number(item.salario ?? 0).toLocaleString("es-MX", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </Text>

      <Pressable
        style={styles.botonDocumento}
        onPress={() => abrirDocumento(item)}
      >
        <Text style={styles.botonDocumentoTexto}>
          Ver documento
        </Text>
      </Pressable>

      <Pressable
        style={styles.botonEditar}
        onPress={() => abrirEdicion(item)}
      >
        <Text style={styles.botonEditarTexto}>
          Editar contrato
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.contenedor}>
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>
          Contratos médicos
        </Text>

        <Text style={styles.subtitulo}>
          Administra la contratación de los médicos de VITALIA.
        </Text>

        <Pressable
          style={styles.botonNuevo}
          onPress={abrirNuevo}
        >
          <Text style={styles.botonNuevoTexto}>
            + Registrar contrato
          </Text>
        </Pressable>
      </View>

      {cargando ? (
          <ActivityIndicator
            size="large"
            color="#2A8C82"
            style={styles.cargando}
          />
        ) : (
          <FlatList
            data={contratosFiltrados}
            keyExtractor={(item) => String(item.id_PK)}
            renderItem={renderContrato}
            contentContainerStyle={styles.lista}
            refreshing={cargando}
            onRefresh={cargarDatos}
            ListHeaderComponent={
              <View>
                {/* RESUMEN */}
                <View style={styles.resumenGrid}>
                  <View style={styles.resumenCard}>
                    <Text style={styles.resumenNumero}>{totalContratos}</Text>
                    <Text style={styles.resumenLabel}>Total contratos</Text>
                  </View>

                  <View style={styles.resumenCard}>
                    <Text style={[styles.resumenNumero, { color: "#16A085" }]}>
                      {totalActivos}
                    </Text>
                    <Text style={styles.resumenLabel}>Activos</Text>
                  </View>

                  <View style={styles.resumenCard}>
                    <Text style={[styles.resumenNumero, { color: "#D99A25" }]}>
                      {totalPendientes}
                    </Text>
                    <Text style={styles.resumenLabel}>Pendientes</Text>
                  </View>

                  <View style={styles.resumenCard}>
                    <Text style={[styles.resumenNumero, { color: c.muted }]}>
                      {totalFinalizados}
                    </Text>
                    <Text style={styles.resumenLabel}>Finalizados</Text>
                  </View>
                </View>

                {/* BUSCADOR */}
                <View style={styles.buscador}>
                  <Text style={styles.iconoBusqueda}>⌕</Text>

                  <TextInput
                    style={styles.inputBusqueda}
                    value={busqueda}
                    onChangeText={setBusqueda}
                    placeholder="Buscar médico, contrato o tipo..."
                    placeholderTextColor={c.muted}
                    autoCorrect={false}
                  />

                  {busqueda.length > 0 && (
                    <Pressable
                      onPress={() => setBusqueda("")}
                      style={styles.limpiarBusqueda}
                    >
                      <Text style={styles.limpiarBusquedaTexto}>Limpiar</Text>
                    </Pressable>
                  )}
                </View>

                {/* FILTROS */}
                <Text style={styles.tituloFiltros}>Filtrar contratos</Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filtros}
                >
                  {(
                    [
                      "Todos",
                      "Activo",
                      "Pendiente",
                      "Finalizado",
                    ] as const
                  ).map((estado) => (
                    <Pressable
                      key={estado}
                      onPress={() => setFiltroEstado(estado)}
                      style={[
                        styles.filtroBoton,
                        filtroEstado === estado && styles.filtroBotonActivo,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filtroTexto,
                          filtroEstado === estado && styles.filtroTextoActivo,
                        ]}
                      >
                        {estado}
                        {estado === "Todos" && ` (${totalContratos})`}
                        {estado === "Activo" && ` (${totalActivos})`}
                        {estado === "Pendiente" && ` (${totalPendientes})`}
                        {estado === "Finalizado" && ` (${totalFinalizados})`}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* RESULTADOS */}
                <View style={styles.resultadosHeader}>
                  <Text style={styles.resultadosTitulo}>
                    {filtroEstado === "Finalizado"
                      ? "Historial de contratos"
                      : "Listado de contratos"}
                  </Text>

                  <Text style={styles.resultadosCantidad}>
                    {contratosFiltrados.length} resultado
                    {contratosFiltrados.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.vacio}>
                <Text style={styles.vacioTitulo}>
                  {contratos.length === 0
                    ? "No hay contratos registrados"
                    : "No se encontraron contratos"}
                </Text>

                <Text style={styles.vacioTexto}>
                  {contratos.length === 0
                    ? "Registra un contrato para comenzar."
                    : "Prueba con otro nombre, número de contrato o filtro."}
                </Text>

                {(busqueda !== "" || filtroEstado !== "Todos") && (
                  <Pressable
                    style={styles.limpiarFiltros}
                    onPress={() => {
                      setBusqueda("");
                      setFiltroEstado("Todos");
                    }}
                  >
                    <Text style={styles.limpiarFiltrosTexto}>
                      Limpiar filtros
                    </Text>
                  </Pressable>
                )}
              </View>
            }
          />
        )}

      {/* MODAL PARA REGISTRAR Y EDITAR */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.fondoModal}>
          <View style={styles.modal}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitulo}>
                {contratoEditar !== null
                  ? "Editar contrato"
                  : "Registrar contrato"}
              </Text>

              <Text style={styles.etiqueta}>
                Médico *
              </Text>

              {contratoEditar !== null ? (
                <View style={styles.doctorSeleccionado}>
                  <Text style={styles.doctorSeleccionadoTexto}>
                    {nombreDoctor(
                      Number(formulario.doctor_id_FK)
                    )}
                  </Text>
                </View>
              ) : (
                <View>
                  {/* BUSCADOR DE MÉDICOS */}
                  <TextInput
                    style={styles.input}
                    value={busquedaDoctor}
                    onChangeText={setBusquedaDoctor}
                    placeholder="Buscar médico por nombre o apellido..."
                    placeholderTextColor={c.muted}
                    autoCorrect={false}
                    autoCapitalize="words"
                  />

                  {/* LISTA DE MÉDICOS */}
                  <View style={styles.listaDoctores}>
                    {doctores.length === 0 ? (
                      <Text style={styles.aviso}>
                        No hay médicos disponibles. Verifica el
                        endpoint GET /api/doctores/.
                      </Text>
                    ) : doctoresFiltrados.length === 0 ? (
                      <Text style={styles.aviso}>
                        No se encontraron médicos con ese nombre.
                      </Text>
                    ) : (
                      doctoresFiltrados.map((doctor) => (
                        <Pressable
                          key={doctor.id_PK}
                          style={[
                            styles.opcionDoctor,
                            formulario.doctor_id_FK ===
                              String(doctor.id_PK)
                              ? styles.opcionDoctorActiva
                              : null,
                          ]}
                          onPress={() => {
                            actualizarCampo(
                              "doctor_id_FK",
                              String(doctor.id_PK)
                            );

                            setBusquedaDoctor("");
                          }}
                        >
                          <Text
                            style={[
                              styles.opcionDoctorTexto,
                              formulario.doctor_id_FK ===
                                String(doctor.id_PK)
                                ? styles.opcionDoctorTextoActivo
                                : null,
                            ]}
                          >
                            {nombreDoctor(doctor.id_PK)}
                          </Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                </View>
              )}

              <Text style={styles.etiqueta}>
                Fecha de inicio *
              </Text>

              <SelectorFecha
                value={formulario.fecha_inicio}
                onChange={(fecha) =>
                  actualizarCampo("fecha_inicio", fecha)
                }
                placeholder="Seleccionar fecha de inicio"
              />

              <Text style={styles.etiqueta}>
                Fecha de fin (opcional)
              </Text>

              <SelectorFecha
                value={formulario.fecha_fin}
                onChange={(fecha) =>
                  actualizarCampo("fecha_fin", fecha)
                }
                placeholder="Seleccionar fecha de fin (opcional)"
              />

              <Text style={styles.etiqueta}>
                Tipo de contrato *
              </Text>

              <View style={styles.opcionesEstado}>
                {TIPOS_CONTRATO.map((tipo) => (
                  <Pressable
                    key={tipo}
                    style={[
                      styles.opcionEstado,
                      formulario.tipo_contrato === tipo
                        ? styles.opcionEstadoActiva
                        : null,
                    ]}
                    onPress={() => {
                      actualizarCampo("tipo_contrato", tipo);

                      if (tipo !== "Otro") {
                        setOtroTipoContrato("");
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.opcionEstadoTexto,
                        formulario.tipo_contrato === tipo
                          ? styles.opcionEstadoTextoActivo
                          : null,
                      ]}
                    >
                      {tipo}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {formulario.tipo_contrato === "Otro" && (
                <TextInput
                  style={styles.input}
                  value={otroTipoContrato}
                  onChangeText={setOtroTipoContrato}
                  placeholder="Especifica el tipo de contrato"
                  placeholderTextColor="#8A9A98"
                  maxLength={100}
                />
              )}

              <Text style={styles.etiqueta}>
                Estado *
              </Text>

              <View style={styles.opcionesEstado}>
                {["Activo", "Pendiente", "Finalizado"].map(
                  (estado) => (
                    <Pressable
                      key={estado}
                      style={[
                        styles.opcionEstado,
                        formulario.estado === estado
                          ? styles.opcionEstadoActiva
                          : null,
                      ]}
                      onPress={() =>
                        actualizarCampo("estado", estado)
                      }
                    >
                      <Text
                        style={[
                          styles.opcionEstadoTexto,
                          formulario.estado === estado
                            ? styles.opcionEstadoTextoActivo
                            : null,
                        ]}
                      >
                        {estado}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>

              <Text style={styles.etiqueta}>
                Salario * (MXN)
              </Text>

              <TextInput
                style={styles.input}
                value={formulario.salario}
                onChangeText={(valor) => {
                  const numerico = valor
                    .replace(/,/g, ".")
                    .replace(/[^\d.]/g, "")
                    .replace(/(\..*)\./g, "$1")
                    .replace(/^(\d*\.\d{0,2}).*$/, "$1");

                  actualizarCampo("salario", numerico);
                }}
                keyboardType="decimal-pad"
                placeholder="15000.00"
                placeholderTextColor="#8A9A98"
              />

              <Pressable
                style={[
                  styles.botonGuardar,
                  guardando && styles.botonDeshabilitado,
                ]}
                onPress={guardarContrato}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.botonGuardarTexto}>
                    {contratoEditar !== null
                      ? "Guardar cambios"
                      : "Registrar contrato"}
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={styles.botonCancelar}
                onPress={() => setModalVisible(false)}
                disabled={guardando}
              >
                <Text style={styles.botonCancelarTexto}>
                  Cancelar
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      
      {/* MODAL DE DOCUMENTO VISUAL, SIN PDF */}
      <Modal
        visible={documentoVisible}
        animationType="slide"
        statusBarTranslucent={false}
        onRequestClose={() => setDocumentoVisible(false)}
      >
        <SafeAreaView
          style={styles.contenedorDocumento}
          edges={["top", "bottom"]}
        >
          {/* ENCABEZADO */}
          <View style={styles.encabezadoDocumento}>
            <View style={styles.infoDocumento}>
              <Text style={styles.tituloDocumento}>
                Vista previa del contrato
              </Text>

              <Text style={styles.subtituloDocumento}>
                {contratoDocumento
                  ? `Contrato #${contratoDocumento.id_PK} · ${nombreDoctor(
                      contratoDocumento.doctor_id_FK
                    )}`
                  : ""}
              </Text>
            </View>

            <View style={styles.accionesDocumento}>
              <Pressable
                style={[
                  styles.botonDescargar,
                  descargandoId !== null && styles.botonDeshabilitado,
                ]}
                onPress={() => {
                  if (contratoDocumento && descargandoId === null) {
                    descargarContrato(contratoDocumento);
                  }
                }}
                disabled={!contratoDocumento || descargandoId !== null}
              >
                {descargandoId === contratoDocumento?.id_PK ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Download size={20} color="#FFFFFF" />
                )}
              </Pressable>

              <Pressable
                style={styles.botonCerrarDocumento}
                onPress={() => setDocumentoVisible(false)}
              >
                <Text style={styles.botonCerrarDocumentoTexto}>
                  Cerrar
                </Text>
              </Pressable>
            </View>
          </View>

          {/* DOCUMENTO */}
          {contratoDocumento && (
            <DocumentoContrato
              contrato={contratoDocumento}
              nombreDoctor={nombreDoctor(
                contratoDocumento.doctor_id_FK
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* MODAL DE ALERTAS */}
      <Modal
        visible={alerta.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setAlerta((actual) => ({
            ...actual,
            visible: false,
          }))
        }
      >
        <View style={styles.fondoModal}>
          <View style={styles.modalAlerta}>
            <View
              style={[
                styles.iconoAlerta,
                alerta.exito
                  ? styles.iconoExito
                  : styles.iconoError,
              ]}
            >
              <Text style={styles.iconoAlertaTexto}>
                {alerta.exito ? "Operación correcta" : "Atención"}
              </Text>
            </View>

            <Text style={styles.alertaTitulo}>
              {alerta.titulo}
            </Text>

            <Text style={styles.alertaMensaje}>
              {alerta.mensaje}
            </Text>

            <Pressable
              style={styles.botonGuardar}
              onPress={() =>
                setAlerta((actual) => ({
                  ...actual,
                  visible: false,
                }))
              }
            >
              <Text style={styles.botonGuardarTexto}>
                Entendido
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (c: Theme) => {
  const isDark = c.mode === "dark";
  return StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: c.bg,
  },
  encabezado: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "800",
    color: c.text,
  },
  subtitulo: {
    fontSize: 14,
    color: c.muted,
    marginTop: 7,
    lineHeight: 21,
  },
  botonNuevo: {
    backgroundColor: c.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 18,
  },
  botonNuevoTexto: {
    color: isDark ? "#121212" : "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  lista: {
    paddingHorizontal: 18,
    paddingBottom: 30,
    flexGrow: 1,
  },
  tarjeta: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  tarjetaEncabezado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  nombreDoctor: {
    fontSize: 17,
    fontWeight: "800",
    color: c.text,
  },
  idContrato: {
    color: c.muted,
    fontSize: 12,
    marginTop: 4,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  estadoActivo: {
    backgroundColor: isDark ? "rgba(8,191,164,0.18)" : "#DDF5E9",
  },
  estadoOtro: {
    backgroundColor: isDark ? "rgba(251,191,36,0.18)" : "#F1EBDD",
  },
  estadoTexto: {
    color: isDark ? "#2DD4BF" : "#426B60",
    fontSize: 11,
    fontWeight: "700",
  },
  divisor: {
    height: 1,
    backgroundColor: c.border,
    marginVertical: 13,
  },
  detalle: {
    color: c.muted,
    fontSize: 14,
    marginBottom: 7,
  },
  salario: {
    color: c.primary,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 5,
  },
  botonEditar: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: c.primary,
    borderRadius: 9,
    paddingHorizontal: 15,
    paddingVertical: 9,
    marginTop: 15,
  },
  botonEditarTexto: {
    color: c.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  cargando: {
    marginTop: 45,
  },
  vacio: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 55,
  },
  vacioTitulo: {
    color: c.text,
    fontSize: 17,
    fontWeight: "700",
  },
  vacioTexto: {
    color: c.muted,
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  fondoModal: {
    flex: 1,
    backgroundColor: isDark ? "rgba(0, 0, 0, 0.75)" : "rgba(16, 39, 35, 0.48)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modal: {
    backgroundColor: c.card,
    borderRadius: 20,
    padding: 22,
    width: "100%",
    maxWidth: 560,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: c.border,
  },
  modalTitulo: {
    fontSize: 22,
    fontWeight: "800",
    color: c.text,
    marginBottom: 20,
  },
  etiqueta: {
    color: c.muted,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
    marginTop: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: c.text,
    backgroundColor: isDark ? "#1E2631" : "#FBFDFC",
    fontSize: 14,
  },
  listaDoctores: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: c.card,
  },
  opcionDoctor: {
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  opcionDoctorActiva: {
    backgroundColor: isDark ? "rgba(8,191,164,0.18)" : "#E0F3EF",
  },
  opcionDoctorTexto: {
    color: c.muted,
    fontSize: 14,
  },
  opcionDoctorTextoActivo: {
    color: c.primary,
    fontWeight: "800",
  },
  doctorSeleccionado: {
    padding: 13,
    borderRadius: 10,
    backgroundColor: isDark ? "rgba(8,191,164,0.18)" : "#E0F3EF",
  },
  doctorSeleccionadoTexto: {
    color: c.primary,
    fontWeight: "700",
  },
  aviso: {
    padding: 12,
    color: c.warning,
    fontSize: 13,
  },
  opcionesEstado: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  opcionEstado: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 9,
    backgroundColor: c.card,
  },
  opcionEstadoActiva: {
    backgroundColor: isDark ? "rgba(8,191,164,0.18)" : "#DDF3EE",
    borderColor: c.primary,
  },
  opcionEstadoTexto: {
    color: c.muted,
    fontSize: 12,
  },
  opcionEstadoTextoActivo: {
    color: c.primary,
    fontWeight: "800",
  },
  botonGuardar: {
    backgroundColor: c.primary,
    paddingVertical: 14,
    borderRadius: 11,
    alignItems: "center",
    marginTop: 24,
  },
  botonGuardarTexto: {
    color: isDark ? "#121212" : "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonCancelar: {
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 5,
  },
  botonCancelarTexto: {
    color: c.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  modalAlerta: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: c.card,
    borderRadius: 22,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: c.border,
  },
  iconoAlerta: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  iconoExito: {
    backgroundColor: isDark ? "rgba(8,191,164,0.18)" : "#DDF5E9",
  },
  iconoError: {
    backgroundColor: isDark ? "rgba(248,113,113,0.18)" : "#FCE8E6",
  },
  iconoAlertaTexto: {
    fontSize: 29,
    fontWeight: "800",
    color: c.primary,
  },
  alertaTitulo: {
    fontSize: 20,
    fontWeight: "800",
    color: c.text,
    textAlign: "center",
  },
  alertaMensaje: {
    fontSize: 14,
    lineHeight: 21,
    color: c.muted,
    textAlign: "center",
    marginTop: 10,
  },
  botonDocumento: {
    alignSelf: "flex-start",
    backgroundColor: isDark ? "rgba(8,191,164,0.18)" : "#E0F3EF",
    borderWidth: 1,
    borderColor: c.primary,
    borderRadius: 9,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 12,
  },
  botonDocumentoTexto: {
    color: c.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  contenedorDocumento: {
    flex: 1,
    backgroundColor: c.bg,
  },
  tituloDocumento: {
    color: c.text,
    fontSize: 18,
    fontWeight: "800",
    flexShrink: 1,
  },

  subtituloDocumento: {
    color: c.muted,
    fontSize: 12,
    marginTop: 5,
    flexShrink: 1,
  },
  botonCerrarDocumento: {
    backgroundColor: c.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9,
  },
  botonCerrarDocumentoTexto: {
    color: isDark ? "#121212" : "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  premiumBannerWrapper: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: "center",
  },
  premiumCard: {
    width: "100%",
    maxWidth: 580,
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 36,
    paddingHorizontal: 26,
    alignItems: "center",
  },
  premiumIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.35)",
  },
  badgePremium: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderColor: "rgba(251, 191, 36, 0.35)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  badgePremiumTexto: {
    color: "#B45309",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  premiumTitulo: {
    fontSize: 22,
    fontWeight: "800",
    color: c.text,
    textAlign: "center",
    marginBottom: 10,
  },
  premiumDescripcion: {
    fontSize: 14,
    lineHeight: 22,
    color: c.muted,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  botonDesbloquear: {
    backgroundColor: c.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  botonDesbloquearTexto: {
    color: isDark ? "#121212" : "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  
  infoDocumento: {
    flex: 1,
    minWidth: 0,
  },

  encabezadoDocumento: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: c.card,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    zIndex: 10,
  },

  accionesDocumento: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },

  botonDescargar: {
    backgroundColor: "#08BFA4",
    borderRadius: 9,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
    // RESUMEN DE CONTRATOS
  resumenGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },

  resumenCard: {
    flexGrow: 1,
    flexBasis: "46%",
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 15,
    minHeight: 90,
    justifyContent: "center",
  },

  resumenNumero: {
    color: c.text,
    fontSize: 25,
    fontWeight: "800",
  },

  resumenLabel: {
    color: c.muted,
    fontSize: 12,
    marginTop: 5,
    fontWeight: "600",
  },

  // BUSCADOR
  buscador: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    minHeight: 48,
    marginBottom: 18,
  },

  iconoBusqueda: {
    color: c.muted,
    fontSize: 24,
    marginRight: 10,
  },

  inputBusqueda: {
    flex: 1,
    color: c.text,
    fontSize: 14,
    paddingVertical: 10,
    outlineStyle: "none" as any,
  },

  limpiarBusqueda: {
    padding: 7,
    marginLeft: 5,
  },

  limpiarBusquedaTexto: {
    color: c.muted,
    fontSize: 16,
    fontWeight: "700",
  },

  // FILTROS
  tituloFiltros: {
    fontSize: 14,
    fontWeight: "700",
    color: c.text,
    marginBottom: 10,
  },

  filtros: {
    gap: 8,
    paddingBottom: 5,
  },

  filtroBoton: {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },

  filtroBotonActivo: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },

  filtroTexto: {
    color: c.muted,
    fontSize: 12,
    fontWeight: "600",
  },

  filtroTextoActivo: {
    color: isDark ? "#121212" : "#FFFFFF",
    fontWeight: "800",
  },

  // RESULTADOS E HISTORIAL
  resultadosHeader: {
    marginTop: 22,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },

  resultadosTitulo: {
    color: c.text,
    fontSize: 17,
    fontWeight: "800",
  },

  resultadosCantidad: {
    color: c.muted,
    fontSize: 12,
  },

  limpiarFiltros: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: c.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },

  limpiarFiltrosTexto: {
    color: c.primary,
    fontSize: 13,
    fontWeight: "700",
  },
});
};
