import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { useNotifications } from "../../../context/NotificationsContext";
import { useGoogleCalendar } from "../../../context/CalendarContext";
import api from "../../../services/api";
import {
  Cola,
  listarColas,
  registrarLlegada,
} from "../../../services/colasService";
import SelectorFecha from "../../../components/SelectorFecha";

interface Cita {
  id_PK: number;
  paciente_id_FK: number | null;
  doctor_id_FK: number | null;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado: string | null;
  motivo: string | null;
  notas: string | null;
  creado_por: number | null;
  google_event_id?: string | null;
}

interface Paciente {
  id_PK: number;
  nombre: string;
  apellido: string;
}

interface Doctor {
  id_PK: number;
  nombre: string;
  especialidad?: string;
}

type FiltroTemporal = "todas" | "hoy" | "semana" | "fecha";

/**
 * Pantalla principal de gestión de citas en recepción con vista híbrida,
 * sincronización con Google Calendar, reprogramación y notificaciones en tiempo real.
 */
export default function CitasScreen() {
  const { token } = useAuth();
  const { messages } = useNotifications();
  const {
    isCalendarConnected,
    cargando: cargandoCalendar,
    conectarGoogle,
    desconectarGoogle,
  } = useGoogleCalendar();

  const [citas, setCitas] = useState<Cita[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [doctores, setDoctores] = useState<Doctor[]>([]);
  const [colas, setColas] = useState<Cola[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [filtroTiempo, setFiltroTiempo] = useState<FiltroTemporal>("todas");
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [disparandoRecordatorios, setDisparandoRecordatorios] = useState(false);

  const [modalLlegada, setModalLlegada] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null);
  const [prioridad, setPrioridad] = useState<"normal" | "urgente">("normal");
  const [registrando, setRegistrando] = useState(false);

  const [modalReprogramar, setModalReprogramar] = useState(false);
  const [citaAReprogramar, setCitaAReprogramar] = useState<Cita | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevaHoraInicio, setNuevaHoraInicio] = useState("");
  const [nuevaHoraFin, setNuevaHoraFin] = useState("");
  const [nuevoMotivo, setNuevoMotivo] = useState("");
  const [nuevasNotas, setNuevasNotas] = useState("");
  const [reprogramando, setReprogramando] = useState(false);

  const [modalEliminar, setModalEliminar] = useState(false);
  const [citaAEliminar, setCitaAEliminar] = useState<Cita | null>(null);
  const [eliminando, setEliminando] = useState(false);

  /**
   * Carga las citas, pacientes, doctores y estados de cola en paralelo desde el servidor.
   */
  const cargarDatos = async () => {
    if (!token) return;

    try {
      setCargando(true);
      setError("");

      const [
        respuestaCitas,
        respuestaPacientes,
        respuestaDoctores,
        respuestaColas,
      ] = await Promise.all([
        api.get<Cita[]>("/api/citas/", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get<Paciente[]>("/api/pacientes/", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get<Doctor[]>("/api/doctores/", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        listarColas(token),
      ]);

      setCitas(respuestaCitas.data);
      setPacientes(respuestaPacientes.data);
      setDoctores(respuestaDoctores.data);
      setColas(respuestaColas);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || "No se pudieron cargar los datos de las citas."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (token) {
      cargarDatos();
    }
  }, [token]);

  useEffect(() => {
    if (messages.length > 0) {
      cargarDatos();
    }
  }, [messages.length]);

  /**
   * Retorna el elemento en sala de espera asociado al identificador de cita proporcionado.
   */
  const obtenerColaDeCita = (citaId: number): Cola | undefined => {
    return colas.find((cola) => cola.cita_id_FK === citaId);
  };

  /**
   * Obtiene el nombre completo del paciente a partir de su ID.
   */
  const obtenerNombrePaciente = (pacienteId: number | null): string => {
    if (!pacienteId) return "—";
    const paciente = pacientes.find((p) => p.id_PK === pacienteId);
    if (!paciente) return `Paciente #${pacienteId}`;
    return `${paciente.nombre} ${paciente.apellido}`;
  };

  /**
   * Obtiene el nombre del médico a partir de su ID.
   */
  const obtenerNombreDoctor = (doctorId: number | null): string => {
    if (!doctorId) return "—";
    const doctor = doctores.find((d) => d.id_PK === doctorId);
    if (!doctor) return `Doctor #${doctorId}`;
    return doctor.nombre;
  };

  /**
   * Retorna la fecha de hoy en formato AAAA-MM-DD.
   */
  const obtenerFechaHoy = (): string => {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
  };

  /**
   * Retorna la fecha límite para el rango de días en formato AAAA-MM-DD.
   */
  const obtenerFechaLimite = (dias: number): string => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
  };

  /**
   * Filtra y ordena cronológicamente la lista de citas médicas.
   */
  const citasFiltradas = useMemo(() => {
    let resultado = [...citas];

    if (busqueda.trim()) {
      const termino = busqueda.trim().toLowerCase();
      resultado = resultado.filter((cita) => {
        const idMatch = cita.id_PK.toString().includes(termino);
        const pacienteMatch = obtenerNombrePaciente(cita.paciente_id_FK)
          .toLowerCase()
          .includes(termino);
        const doctorMatch = obtenerNombreDoctor(cita.doctor_id_FK)
          .toLowerCase()
          .includes(termino);
        return idMatch || pacienteMatch || doctorMatch;
      });
    }

    const hoyStr = obtenerFechaHoy();

    if (filtroTiempo === "hoy") {
      resultado = resultado.filter((cita) => cita.fecha === hoyStr);
    } else if (filtroTiempo === "semana") {
      const limiteStr = obtenerFechaLimite(7);
      resultado = resultado.filter((cita) => {
        if (!cita.fecha) return false;
        return cita.fecha >= hoyStr && cita.fecha <= limiteStr;
      });
    } else if (filtroTiempo === "fecha" && fechaFiltro) {
      resultado = resultado.filter((cita) => cita.fecha === fechaFiltro);
    }

    return resultado.sort((a, b) => {
      const fechaA = a.fecha || "9999-99-99";
      const fechaB = b.fecha || "9999-99-99";
      if (fechaA !== fechaB) {
        return fechaA.localeCompare(fechaB);
      }
      const horaA = a.hora_inicio || "00:00";
      const horaB = b.hora_inicio || "00:00";
      return horaA.localeCompare(horaB);
    });
  }, [citas, busqueda, filtroTiempo, fechaFiltro, pacientes, doctores]);

  /**
   * Dispara una prueba manual del sistema de recordatorios de citas próximas (CU-11).
   */
  const dispararRecordatorios = async () => {
    if (!token) return;

    try {
      setDisparandoRecordatorios(true);
      const res = await api.post("/api/citas/disparar-recordatorios", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert(
        "Recordatorios Verificados",
        res.data?.mensaje || "Se verificaron las citas próximas para enviar avisos."
      );
    } catch (err: any) {
      Alert.alert(
        "Error en Recordatorios",
        err?.response?.data?.detail || "No se pudo disparar la verificación de recordatorios."
      );
    } finally {
      setDisparandoRecordatorios(false);
    }
  };

  /**
   * Despliega la ventana modal para registrar la llegada del paciente a la sala de espera.
   */
  const abrirModalLlegada = (cita: Cita) => {
    const colaExistente = obtenerColaDeCita(cita.id_PK);

    if (colaExistente) {
      Alert.alert(
        "Cita ya registrada",
        `Turno: ${colaExistente.numero_cola}\nEstado: ${colaExistente.estado?.toUpperCase()}\nPrioridad: ${colaExistente.prioridad}`
      );
      return;
    }

    setCitaSeleccionada(cita);
    setPrioridad("normal");
    setModalLlegada(true);
  };

  /**
   * Confirma el registro de llegada del paciente en la cola de atención.
   */
  const confirmarLlegada = async () => {
    if (!citaSeleccionada) return;

    if (!token) {
      Alert.alert("Error", "No hay sesión activa.");
      return;
    }

    try {
      setRegistrando(true);
      const cola = await registrarLlegada(
        citaSeleccionada.id_PK,
        token,
        prioridad
      );

      setModalLlegada(false);
      const citaActual = citaSeleccionada;
      setCitaSeleccionada(null);
      await cargarDatos();

      Alert.alert(
        "Llegada registrada",
        `Cita #${citaActual.id_PK}\nTurno asignado: ${cola.numero_cola}\nPrioridad: ${cola.prioridad}`
      );
    } catch (err: any) {
      const detalle = err?.response?.data?.detail || "";
      const status = err?.response?.status;

      if (status === 400 && detalle.includes("ya tiene un turno")) {
        Alert.alert(
          "Cita ya registrada",
          "Esta cita ya cuenta con un turno registrado el día de hoy."
        );
      } else {
        Alert.alert(
          "Error al registrar llegada",
          detalle || "No se pudo registrar la llegada del paciente."
        );
      }
    } finally {
      setRegistrando(false);
    }
  };

  /**
   * Abre la ventana modal para reprogramar la fecha y hora de la cita médica (CU-07).
   */
  const abrirModalReprogramar = (cita: Cita) => {
    setCitaAReprogramar(cita);
    setNuevaFecha(cita.fecha || "");
    setNuevaHoraInicio(cita.hora_inicio ? cita.hora_inicio.slice(0, 5) : "");
    setNuevaHoraFin(cita.hora_fin ? cita.hora_fin.slice(0, 5) : "");
    setNuevoMotivo(cita.motivo || "");
    setNuevasNotas(cita.notas || "");
    setModalReprogramar(true);
  };

  /**
   * Envía la solicitud de reprogramación sincronizando con la base de datos y Google Calendar (CU-07, CU-12).
   */
  const confirmarReprogramacion = async () => {
    if (!token || !citaAReprogramar) return;

    if (!nuevaFecha.trim()) {
      Alert.alert("Falta información", "Selecciona una nueva fecha.");
      return;
    }

    if (!nuevaHoraInicio.trim()) {
      Alert.alert("Falta información", "Ingresa la hora de inicio.");
      return;
    }

    if (!nuevaHoraFin.trim()) {
      Alert.alert("Falta información", "Ingresa la hora de fin.");
      return;
    }

    try {
      setReprogramando(true);

      await api.put(
        `/api/citas/${citaAReprogramar.id_PK}/reprogramar`,
        {
          fecha: nuevaFecha.trim(),
          hora_inicio: nuevaHoraInicio.trim(),
          hora_fin: nuevaHoraFin.trim(),
          motivo: nuevoMotivo.trim() || null,
          notas: nuevasNotas.trim() || null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setModalReprogramar(false);
      const idReprogramada = citaAReprogramar.id_PK;
      setCitaAReprogramar(null);
      await cargarDatos();

      Alert.alert(
        "Cita reprogramada",
        `La cita #${idReprogramada} ha sido actualizada y sincronizada en Google Calendar con éxito.`
      );
    } catch (err: any) {
      Alert.alert(
        "Error al reprogramar",
        err?.response?.data?.detail || "No fue posible reprogramar la cita médica."
      );
    } finally {
      setReprogramando(false);
    }
  };

  /**
   * Abre el modal de confirmación para eliminar o cancelar la cita médica (CU-08).
   */
  const abrirModalEliminar = (cita: Cita) => {
    setCitaAEliminar(cita);
    setModalEliminar(true);
  };

  /**
   * Ejecuta la eliminación de la cita en la base de datos y Google Calendar (CU-08).
   */
  const confirmarEliminar = async () => {
    if (!token || !citaAEliminar) return;

    try {
      setEliminando(true);

      await api.delete(`/api/citas/${citaAEliminar.id_PK}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setModalEliminar(false);
      const idEliminado = citaAEliminar.id_PK;
      setCitaAEliminar(null);
      await cargarDatos();

      Alert.alert(
        "Cita eliminada",
        `La cita #${idEliminado} fue cancelada y removida de Google Calendar.`
      );
    } catch (err: any) {
      const detalle = err?.response?.data?.detail || "";
      const status = err?.response?.status;

      setModalEliminar(false);
      setCitaAEliminar(null);

      if (status === 400 && detalle.includes("turno")) {
        Alert.alert(
          "Acción bloqueada",
          "Esta cita ya cuenta con un turno registrado en la cola de atención."
        );
      } else if (status === 403) {
        Alert.alert(
          "Permisos insuficientes",
          "No dispones de los permisos necesarios para eliminar citas."
        );
      } else {
        Alert.alert(
          "Error al eliminar",
          detalle || "No fue posible eliminar la cita médica."
        );
      }
    } finally {
      setEliminando(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ENCABEZADO */}
      <View style={styles.header}>
        <View>
          <Text style={styles.smallTitle}>RECEPCIÓN</Text>
          <Text style={styles.title}>Citas Médicas</Text>
          <Text style={styles.subtitle}>
            Consulta, programa y sincroniza la agenda de consultas.
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.remindersButton}
            onPress={dispararRecordatorios}
            disabled={disparandoRecordatorios}
          >
            {disparandoRecordatorios ? (
              <ActivityIndicator size="small" color="#247F76" />
            ) : (
              <View style={styles.buttonInner}>
                <FontAwesome name="bell" size={13} color="#247F76" style={styles.buttonIcon} />
                <Text style={styles.remindersButtonText}>Recordatorios</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={styles.waitingButton}
            onPress={() => router.push("/recepcion/cola")}
          >
            <View style={styles.buttonInner}>
              <FontAwesome name="list-ol" size={13} color="#247F76" style={styles.buttonIcon} />
              <Text style={styles.waitingButtonText}>Lista de espera</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.newAppointmentButton}
            onPress={() => router.push("/recepcion/citas/crear")}
          >
            <View style={styles.buttonInner}>
              <FontAwesome name="plus" size={13} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.newAppointmentText}>Nueva cita</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* VINCULACIÓN CON GOOGLE CALENDAR */}
      <View style={styles.calendarIntegrationCard}>
        <View style={styles.calendarIntegrationLeft}>
          <FontAwesome name="calendar" size={16} color="#247F76" style={{ marginRight: 10 }} />
          <View>
            <Text style={styles.calendarIntegrationTitle}>Google Calendar</Text>
            <Text style={styles.calendarIntegrationStatus}>
              {isCalendarConnected
                ? "Cuenta conectada. Sincronización activa para citas médicas."
                : "No conectada. Se sincronizará si el médico asignado tiene cuenta vinculada."}
            </Text>
          </View>
        </View>

        <View style={styles.calendarIntegrationRight}>
          {cargandoCalendar ? (
            <ActivityIndicator size="small" color="#247F76" />
          ) : isCalendarConnected ? (
            <Pressable style={styles.unlinkSmallBtn} onPress={desconectarGoogle}>
              <FontAwesome name="chain-broken" size={11} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.unlinkSmallBtnText}>Desvincular</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.linkSmallBtn} onPress={conectarGoogle}>
              <FontAwesome name="google" size={12} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.linkSmallBtnText}>Vincular cuenta</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* BUSCADOR */}
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={15} color="#8A9A98" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por ID, paciente o doctor..."
          placeholderTextColor="#8A9A98"
        />
        {busqueda ? (
          <Pressable
            style={styles.clearButton}
            onPress={() => setBusqueda("")}
          >
            <FontAwesome name="times" size={14} color="#82938F" />
          </Pressable>
        ) : null}
      </View>

      {/* VISTA HÍBRIDA: FILTROS DE FECHA */}
      <View style={styles.filtersWrapper}>
        <View style={styles.filterChipsRow}>
          <Pressable
            style={[
              styles.filterChip,
              filtroTiempo === "todas" && styles.filterChipActive,
            ]}
            onPress={() => setFiltroTiempo("todas")}
          >
            <FontAwesome
              name="calendar"
              size={12}
              color={filtroTiempo === "todas" ? "#FFFFFF" : "#56726D"}
              style={styles.chipIcon}
            />
            <Text
              style={[
                styles.filterChipText,
                filtroTiempo === "todas" && styles.filterChipTextActive,
              ]}
            >
              Todas
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              filtroTiempo === "hoy" && styles.filterChipActive,
            ]}
            onPress={() => setFiltroTiempo("hoy")}
          >
            <FontAwesome
              name="clock-o"
              size={12}
              color={filtroTiempo === "hoy" ? "#FFFFFF" : "#56726D"}
              style={styles.chipIcon}
            />
            <Text
              style={[
                styles.filterChipText,
                filtroTiempo === "hoy" && styles.filterChipTextActive,
              ]}
            >
              Hoy
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              filtroTiempo === "semana" && styles.filterChipActive,
            ]}
            onPress={() => setFiltroTiempo("semana")}
          >
            <FontAwesome
              name="calendar-check-o"
              size={12}
              color={filtroTiempo === "semana" ? "#FFFFFF" : "#56726D"}
              style={styles.chipIcon}
            />
            <Text
              style={[
                styles.filterChipText,
                filtroTiempo === "semana" && styles.filterChipTextActive,
              ]}
            >
              Próximos 7 días
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              filtroTiempo === "fecha" && styles.filterChipActive,
            ]}
            onPress={() => {
              if (filtroTiempo !== "fecha") {
                setFiltroTiempo("fecha");
                if (!fechaFiltro) setFechaFiltro(obtenerFechaHoy());
              }
            }}
          >
            <FontAwesome
              name="filter"
              size={12}
              color={filtroTiempo === "fecha" ? "#FFFFFF" : "#56726D"}
              style={styles.chipIcon}
            />
            <Text
              style={[
                styles.filterChipText,
                filtroTiempo === "fecha" && styles.filterChipTextActive,
              ]}
            >
              Por fecha
            </Text>
          </Pressable>
        </View>

        {filtroTiempo === "fecha" && (
          <View style={styles.datePickerContainer}>
            <View style={{ flex: 1, maxWidth: 300 }}>
              <SelectorFecha
                value={fechaFiltro}
                onChange={setFechaFiltro}
                placeholder="Seleccionar día de agenda"
              />
            </View>
          </View>
        )}
      </View>

      {/* RESUMEN DE CITAS */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryNumber}>{citasFiltradas.length}</Text>
          <Text style={styles.summaryText}>
            {filtroTiempo === "todas"
              ? "Citas registradas"
              : filtroTiempo === "hoy"
              ? "Citas programadas para hoy"
              : filtroTiempo === "semana"
              ? "Citas en los próximos 7 días"
              : `Citas para ${fechaFiltro || "la fecha seleccionada"}`}
          </Text>
        </View>
        <FontAwesome name="calendar" size={38} color="#A7DFD6" />
      </View>

      {/* LISTADO DE CITAS */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Agenda Cronológica</Text>
        <Pressable style={styles.refreshButton} onPress={cargarDatos}>
          <FontAwesome name="refresh" size={13} color="#247F76" style={{ marginRight: 6 }} />
          <Text style={styles.refreshButtonText}>Actualizar</Text>
        </Pressable>
      </View>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#247F76" />
          <Text style={styles.loadingText}>Cargando citas...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>No se pudieron cargar las citas</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={cargarDatos}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : citasFiltradas.length === 0 ? (
        <View style={styles.emptyCard}>
          <FontAwesome name="calendar-times-o" size={42} color="#8A9A98" style={{ marginBottom: 14 }} />
          <Text style={styles.emptyTitle}>No hay citas para mostrar</Text>
          <Text style={styles.emptyText}>
            {busqueda
              ? "No se encontraron coincidencias para la búsqueda actual."
              : "No hay citas programadas con el filtro seleccionado."}
          </Text>
        </View>
      ) : (
        citasFiltradas.map((cita) => {
          const cola = obtenerColaDeCita(cita.id_PK);
          const registrada = !!cola;
          const atendida = cola?.estado === "atendido";
          const tieneGoogleCalendar = !!cita.google_event_id;

          return (
            <View
              key={cita.id_PK}
              style={[styles.citaCard, atendida && styles.citaCardAtendida]}
            >
              {/* ENCABEZADO DE TARJETA */}
              <View style={styles.citaHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.citaTitleRow}>
                    <Text style={styles.citaTitle}>Cita #{cita.id_PK}</Text>
                    {tieneGoogleCalendar ? (
                      <View style={styles.googleBadge}>
                        <FontAwesome name="calendar-check-o" size={11} color="#17685F" style={{ marginRight: 5 }} />
                        <Text style={styles.googleBadgeText}>Google Calendar</Text>
                      </View>
                    ) : (
                      <View style={styles.localBadge}>
                        <FontAwesome name="calendar-o" size={11} color="#687F7B" style={{ marginRight: 5 }} />
                        <Text style={styles.localBadgeText}>Local</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.dateTimeRow}>
                    <FontAwesome name="calendar" size={12} color="#82938F" style={{ marginRight: 6 }} />
                    <Text style={styles.citaDate}>
                      {cita.fecha || "Sin fecha"} · {cita.hora_inicio || "—"} a{" "}
                      {cita.hora_fin || "—"}
                    </Text>
                  </View>
                </View>

                <View style={styles.headerRight}>
                  <View style={styles.status}>
                    <Text style={styles.statusText}>
                      {cita.estado || "programada"}
                    </Text>
                  </View>

                  {/* BOTÓN REPROGRAMAR (CU-07) */}
                  {!atendida && (
                    <Pressable
                      style={styles.rescheduleButton}
                      onPress={() => abrirModalReprogramar(cita)}
                    >
                      <FontAwesome name="calendar-plus-o" size={14} color="#247F76" />
                    </Pressable>
                  )}

                  {/* BOTÓN ELIMINAR (CU-08) */}
                  {!registrada && (
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => abrirModalEliminar(cita)}
                    >
                      <FontAwesome name="trash" size={15} color="#D65A5A" />
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              {/* DATOS DEL PACIENTE */}
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <FontAwesome name="user" size={12} color="#247F76" style={styles.infoIcon} />
                  <Text style={styles.infoLabel}>Paciente:</Text>
                </View>
                <Text style={styles.infoValue}>
                  {obtenerNombrePaciente(cita.paciente_id_FK)}
                </Text>
              </View>

              {/* DATOS DEL DOCTOR */}
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <FontAwesome name="user-md" size={13} color="#247F76" style={styles.infoIcon} />
                  <Text style={styles.infoLabel}>Doctor:</Text>
                </View>
                <Text style={styles.infoValue}>
                  {obtenerNombreDoctor(cita.doctor_id_FK)}
                </Text>
              </View>

              {/* MOTIVO */}
              {cita.motivo && (
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelContainer}>
                    <FontAwesome name="stethoscope" size={12} color="#247F76" style={styles.infoIcon} />
                    <Text style={styles.infoLabel}>Motivo:</Text>
                  </View>
                  <Text style={styles.infoValue}>{cita.motivo}</Text>
                </View>
              )}

              {/* NOTAS */}
              {cita.notas && (
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelContainer}>
                    <FontAwesome name="file-text-o" size={12} color="#247F76" style={styles.infoIcon} />
                    <Text style={styles.infoLabel}>Notas:</Text>
                  </View>
                  <Text style={styles.infoValue}>{cita.notas}</Text>
                </View>
              )}

              {/* BANNERS DE ESTADO */}
              {atendida ? (
                <View style={styles.attendedBanner}>
                  <View style={styles.attendedHeader}>
                    <FontAwesome name="check-circle" size={15} color="#17685F" style={{ marginRight: 6 }} />
                    <Text style={styles.attendedBannerTitle}>PACIENTE ATENDIDO</Text>
                  </View>
                  <View style={styles.registeredInfoRow}>
                    <Text style={styles.attendedInfo}>
                      Turno: {cola?.numero_cola || "—"}
                    </Text>
                    {cola?.numero_consultorio && (
                      <Text style={styles.attendedInfo}>
                        Consultorio: {cola.numero_consultorio}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.attendedNote}>
                    Hora de llegada:{" "}
                    {cola?.hora_registro
                      ? new Date(cola.hora_registro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : "—"}
                  </Text>
                </View>
              ) : registrada ? (
                <View style={styles.registeredBanner}>
                  <View style={styles.registeredHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <FontAwesome name="check" size={13} color="#247F76" style={{ marginRight: 6 }} />
                      <Text style={styles.registeredText}>LLEGADA REGISTRADA</Text>
                    </View>
                    <View style={styles.queueStatusBadge}>
                      <FontAwesome
                        name={cola?.estado === "llamado" ? "bell" : "clock-o"}
                        size={11}
                        color={cola?.estado === "llamado" ? "#C77C0A" : "#31534D"}
                        style={{ marginRight: 5 }}
                      />
                      <Text
                        style={[
                          styles.registeredEstado,
                          cola?.estado === "llamado" && styles.registeredEstadoLlamado,
                        ]}
                      >
                        {cola?.estado === "llamado" ? "LLAMADO" : "EN ESPERA"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.registeredInfoRow}>
                    <Text style={styles.registeredInfo}>
                      <Text style={styles.registeredInfoLabel}>Turno: </Text>
                      {cola?.numero_cola || "—"}
                    </Text>
                    {cola?.numero_consultorio && (
                      <Text style={styles.registeredInfo}>
                        <Text style={styles.registeredInfoLabel}>Consultorio: </Text>
                        {cola.numero_consultorio}
                      </Text>
                    )}
                    <Text style={styles.registeredInfo}>
                      <Text style={styles.registeredInfoLabel}>Prioridad: </Text>
                      {cola?.prioridad || "normal"}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.actionsFooterRow}>
                  <Pressable
                    style={styles.arrivalButton}
                    onPress={() => abrirModalLlegada(cita)}
                  >
                    <FontAwesome name="check" size={13} color="#FFFFFF" style={{ marginRight: 7 }} />
                    <Text style={styles.arrivalButtonText}>Registrar llegada</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })
      )}

      {/* MODAL DE REGISTRAR LLEGADA */}
      <Modal
        visible={modalLlegada}
        transparent
        animationType="fade"
        onRequestClose={() => setModalLlegada(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Registrar llegada</Text>
            <Text style={styles.modalSubtitle}>
              Cita #{citaSeleccionada?.id_PK} · {obtenerNombrePaciente(citaSeleccionada?.paciente_id_FK ?? null)}
            </Text>

            <Text style={styles.modalLabel}>Prioridad de atención</Text>
            <View style={styles.priorityRow}>
              <Pressable
                style={[
                  styles.priorityBtn,
                  prioridad === "normal" && styles.priorityBtnActive,
                ]}
                onPress={() => setPrioridad("normal")}
              >
                <Text
                  style={[
                    styles.priorityText,
                    prioridad === "normal" && styles.priorityTextActive,
                  ]}
                >
                  Normal
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.priorityBtn,
                  prioridad === "urgente" && styles.priorityBtnUrgent,
                ]}
                onPress={() => setPrioridad("urgente")}
              >
                <Text
                  style={[
                    styles.priorityText,
                    prioridad === "urgente" && styles.priorityTextActive,
                  ]}
                >
                  Urgente
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[
                styles.confirmButton,
                registrando && styles.confirmButtonDisabled,
              ]}
              onPress={confirmarLlegada}
              disabled={registrando}
            >
              {registrando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirmar llegada</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setModalLlegada(false)}
              disabled={registrando}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL DE REPROGRAMAR CITA (CU-07) */}
      <Modal
        visible={modalReprogramar}
        transparent
        animationType="fade"
        onRequestClose={() => setModalReprogramar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 460 }]}>
            <View style={styles.modalHeaderIconContainer}>
              <FontAwesome name="calendar-plus-o" size={26} color="#247F76" />
            </View>

            <Text style={styles.modalTitle}>Reprogramar Cita</Text>
            <Text style={styles.modalSubtitle}>
              Cita #{citaAReprogramar?.id_PK} · {obtenerNombrePaciente(citaAReprogramar?.paciente_id_FK ?? null)}
            </Text>

            <Text style={styles.modalLabel}>Nueva Fecha</Text>
            <View style={{ marginBottom: 14 }}>
              <SelectorFecha
                value={nuevaFecha}
                onChange={setNuevaFecha}
                placeholder="Seleccionar nueva fecha"
              />
            </View>

            <View style={styles.modalTimeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Hora Inicio</Text>
                <TextInput
                  style={styles.modalInput}
                  value={nuevaHoraInicio}
                  onChangeText={setNuevaHoraInicio}
                  placeholder="10:00"
                  placeholderTextColor="#8A9A98"
                  maxLength={5}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Hora Fin</Text>
                <TextInput
                  style={styles.modalInput}
                  value={nuevaHoraFin}
                  onChangeText={setNuevaHoraFin}
                  placeholder="10:30"
                  placeholderTextColor="#8A9A98"
                  maxLength={5}
                />
              </View>
            </View>

            <Text style={styles.modalLabel}>Motivo (opcional)</Text>
            <TextInput
              style={[styles.modalInput, { marginBottom: 14 }]}
              value={nuevoMotivo}
              onChangeText={setNuevoMotivo}
              placeholder="Motivo de la consulta"
              placeholderTextColor="#8A9A98"
            />

            <View style={styles.syncHintBox}>
              <FontAwesome name="calendar-check-o" size={13} color="#247F76" style={{ marginRight: 6 }} />
              <Text style={styles.syncHintText}>
                La actualización se sincronizará automáticamente en Google Calendar.
              </Text>
            </View>

            <Pressable
              style={[
                styles.confirmButton,
                reprogramando && styles.confirmButtonDisabled,
              ]}
              onPress={confirmarReprogramacion}
              disabled={reprogramando}
            >
              {reprogramando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Guardar Reprogramación</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setModalReprogramar(false)}
              disabled={reprogramando}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL DE ELIMINAR CITA (CU-08) */}
      <Modal
        visible={modalEliminar}
        transparent
        animationType="fade"
        onRequestClose={() => setModalEliminar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.deleteIconContainer}>
              <FontAwesome name="trash" size={28} color="#D65A5A" />
            </View>

            <Text style={styles.modalTitle}>Cancelar y Eliminar Cita</Text>
            <Text style={styles.modalSubtitle}>
              ¿Deseas cancelar definitivamente la cita #{citaAEliminar?.id_PK}?
            </Text>

            <Text style={styles.deleteWarning}>
              Esta acción eliminará el evento de Google Calendar y no se puede deshacer.
            </Text>

            <Pressable
              style={[
                styles.deleteConfirmButton,
                eliminando && styles.confirmButtonDisabled,
              ]}
              onPress={confirmarEliminar}
              disabled={eliminando}
            >
              {eliminando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteConfirmText}>Sí, cancelar cita</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setModalEliminar(false)}
              disabled={eliminando}
            >
              <Text style={styles.cancelButtonText}>Volver</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FAF8" },

  content: {
    padding: 30,
    paddingBottom: 50,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 12,
  },

  smallTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#2A8C82",
    marginBottom: 5,
  },

  title: { fontSize: 30, fontWeight: "900", color: "#173F3A" },

  subtitle: { fontSize: 13, color: "#82938F", marginTop: 4 },

  headerActions: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },

  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
  },

  buttonIcon: {
    marginRight: 6,
  },

  remindersButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D3E4E0",
  },

  remindersButtonText: {
    color: "#247F76",
    fontSize: 12,
    fontWeight: "800",
  },

  waitingButton: {
    backgroundColor: "#E7F5F2",
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#247F76",
  },

  waitingButtonText: {
    color: "#247F76",
    fontSize: 12,
    fontWeight: "800",
  },

  newAppointmentButton: {
    backgroundColor: "#247F76",
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
  },

  newAppointmentText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DCE8E4",
  },

  searchIcon: { marginRight: 8 },

  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: "#173F3A",
  },

  clearButton: { padding: 6 },

  filtersWrapper: {
    marginBottom: 20,
  },

  filterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDE8E5",
  },

  filterChipActive: {
    backgroundColor: "#247F76",
    borderColor: "#247F76",
  },

  chipIcon: {
    marginRight: 6,
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#56726D",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },

  datePickerContainer: {
    marginTop: 12,
  },

  summaryCard: {
    backgroundColor: "#247F76",
    borderRadius: 20,
    padding: 22,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryLeft: {
    flex: 1,
  },

  summaryNumber: { fontSize: 32, fontWeight: "900", color: "#FFFFFF" },

  summaryText: { fontSize: 13, color: "#DCEFEB", marginTop: 4 },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#173F3A",
  },

  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#E7F5F2",
    borderRadius: 8,
  },

  refreshButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#247F76",
  },

  center: { alignItems: "center", paddingVertical: 50 },

  loadingText: { marginTop: 12, color: "#82938F", fontSize: 13 },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 35,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4EEEB",
  },

  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#26443F" },

  emptyText: {
    fontSize: 12,
    color: "#879691",
    marginTop: 6,
    textAlign: "center",
  },

  errorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 25,
    borderWidth: 1,
    borderColor: "#E4EEEB",
  },

  errorTitle: { fontSize: 15, fontWeight: "800", color: "#8A4B4B" },

  errorText: { fontSize: 12, color: "#879691", marginTop: 6 },

  retryButton: {
    marginTop: 18,
    backgroundColor: "#247F76",
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "flex-start",
  },

  retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

  citaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E4EEEB",
  },

  citaCardAtendida: {
    backgroundColor: "#F4FAF8",
    borderColor: "#BBE4DC",
  },

  citaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  citaTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  citaTitle: { fontSize: 15, fontWeight: "800", color: "#26443F" },

  googleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E2F6F2",
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },

  googleBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#17685F",
  },

  localBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F5F4",
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },

  localBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#687F7B",
  },

  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  citaDate: { fontSize: 12, color: "#82938F" },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  status: {
    backgroundColor: "#E2F4F0",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  statusText: { fontSize: 11, fontWeight: "700", color: "#247F76", textTransform: "capitalize" },

  rescheduleButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#EAF6F3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BEE0D8",
  },

  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#FFF0EF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E8A3A3",
  },

  divider: {
    height: 1,
    backgroundColor: "#E8F0EE",
    marginVertical: 14,
  },

  infoRow: {
    flexDirection: "row",
    marginBottom: 7,
    alignItems: "flex-start",
  },

  infoLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 100,
  },

  infoIcon: {
    marginRight: 6,
  },

  infoLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#31534D",
  },

  infoValue: {
    fontSize: 12,
    color: "#566C68",
    flex: 1,
    flexWrap: "wrap",
  },

  actionsFooterRow: {
    marginTop: 10,
  },

  arrivalButton: {
    flexDirection: "row",
    backgroundColor: "#247F76",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  arrivalButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  registeredBanner: {
    marginTop: 12,
    backgroundColor: "#E7F5F2",
    borderRadius: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: "#247F76",
  },

  registeredHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 6,
  },

  registeredText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#247F76",
    letterSpacing: 0.5,
  },

  queueStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
  },

  registeredEstado: {
    fontSize: 11,
    fontWeight: "800",
    color: "#31534D",
  },

  registeredEstadoLlamado: { color: "#C77C0A" },

  registeredInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  registeredInfo: {
    fontSize: 12,
    fontWeight: "700",
    color: "#31534D",
  },

  registeredInfoLabel: { color: "#82938F", fontWeight: "700" },

  attendedBanner: {
    marginTop: 12,
    backgroundColor: "#DCEFEB",
    borderRadius: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: "#247F76",
  },

  attendedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  attendedBannerTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#17685F",
    letterSpacing: 0.5,
  },

  attendedInfo: {
    fontSize: 12,
    fontWeight: "800",
    color: "#17685F",
  },

  attendedNote: {
    fontSize: 11,
    color: "#31534D",
    fontWeight: "600",
    marginTop: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 35, 32, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  modalBox: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
  },

  modalHeaderIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#E2F4F0",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#173F3A",
    textAlign: "center",
  },

  modalSubtitle: {
    fontSize: 13,
    color: "#82938F",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 18,
  },

  modalLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#31534D",
    marginBottom: 6,
  },

  modalTimeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },

  modalInput: {
    height: 46,
    backgroundColor: "#FBFDFC",
    borderWidth: 1,
    borderColor: "#DCE8E5",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#294F49",
  },

  syncHintBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E7F5F2",
    borderRadius: 10,
    padding: 10,
    marginBottom: 18,
  },

  syncHintText: {
    fontSize: 11,
    color: "#247F76",
    fontWeight: "600",
    flex: 1,
  },

  priorityRow: { flexDirection: "row", gap: 10, marginBottom: 20 },

  priorityBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE8E4",
    alignItems: "center",
  },

  priorityBtnActive: {
    backgroundColor: "#E7F5F2",
    borderColor: "#247F76",
  },

  priorityBtnUrgent: {
    backgroundColor: "#FFF0EF",
    borderColor: "#D65A5A",
  },

  priorityText: { fontSize: 13, fontWeight: "700", color: "#58716C" },

  priorityTextActive: { color: "#173F3A" },

  confirmButton: {
    backgroundColor: "#247F76",
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: "center",
  },

  confirmButtonDisabled: { opacity: 0.65 },

  confirmButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },

  cancelButton: { paddingVertical: 12, alignItems: "center" },

  cancelButtonText: { color: "#647572", fontSize: 13, fontWeight: "700" },

  deleteIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF0EF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8A3A3",
  },

  deleteWarning: {
    fontSize: 12,
    color: "#D65A5A",
    textAlign: "center",
    fontWeight: "700",
    marginBottom: 18,
    marginTop: 4,
    lineHeight: 16,
  },

  deleteConfirmButton: {
    backgroundColor: "#D65A5A",
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: "center",
  },

  deleteConfirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  calendarIntegrationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D8EAE4",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },

  calendarIntegrationLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 240,
  },

  calendarIntegrationTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#173F3A",
  },

  calendarIntegrationStatus: {
    fontSize: 11,
    color: "#6A827D",
    marginTop: 2,
  },

  calendarIntegrationRight: {
    flexDirection: "row",
    alignItems: "center",
  },

  linkSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#247F76",
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 9,
  },

  linkSmallBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  unlinkSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D65A5A",
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 9,
  },

  unlinkSmallBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
});