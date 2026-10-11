
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { useFocusEffect } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";

interface Doctor {
  id_PK: number;
  nombre?: string;
  nombre_completo?: string;
  usuario?: {
    nombre?: string;
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
  url_documento: string;
}

const formularioInicial: FormularioContrato = {
  doctor_id_FK: "",
  fecha_inicio: "",
  fecha_fin: "",
  estado: "Activo",
  tipo_contrato: "",
  salario: "",
  url_documento: "",
};

export default function ContratosScreen() {
  const { token } = useAuth();

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [doctores, setDoctores] = useState<Doctor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [contratoEditar, setContratoEditar] =
    useState<number | null>(null);

  const [formulario, setFormulario] =
    useState<FormularioContrato>(formularioInicial);

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

    setCargando(true);

    try {
        const headers = {
        Authorization: `Bearer ${token}`,
        };

        const [respuestaContratos, respuestaDoctores] =
        await Promise.all([
            api.get("/api/contratos/", { headers }),
            api.get("/api/doctores/", { headers }),
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
    }, [token]);

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
    setModalVisible(true);
  };

  const abrirEdicion = (contrato: Contrato) => {
    setContratoEditar(contrato.id_PK);

    setFormulario({
      doctor_id_FK: String(contrato.doctor_id_FK),
      fecha_inicio: contrato.fecha_inicio ?? "",
      fecha_fin: contrato.fecha_fin ?? "",
      estado: contrato.estado ?? "",
      tipo_contrato: contrato.tipo_contrato ?? "",
      salario:
        contrato.salario == null
          ? ""
          : String(contrato.salario),
      url_documento: contrato.url_documento ?? "",
    });

    setModalVisible(true);
  };

  const guardarContrato = async () => {
    const inicio = formulario.fecha_inicio.trim();
    const fin = formulario.fecha_fin.trim();
    const tipo = formulario.tipo_contrato.trim();
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


    //CHECAR BIEN FORMATO DE CONTRATO, TAMBIEN PARA FIRMARLO DIGITAL, OBVIAMENTE LA FIRMA SOLO SE GUARDARA EN EL PDF, NO EN BD
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

  const nombreDoctor = (id: number) => {
    const doctor = doctores.find((item) => item.id_PK === id);

    return (
      doctor?.nombre_completo ??
      doctor?.nombre ??
      doctor?.usuario?.nombre ??
      `Médico #${id}`
    );
  };

  const renderContrato = ({ item }: { item: Contrato }) => (
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

      {item.url_documento ? (
        <Text style={styles.documento} numberOfLines={2}>
          Documento: {item.url_documento}
        </Text>
      ) : null}

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
        <Text style={styles.titulo}>Contratos médicos</Text>

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
          data={contratos}
          keyExtractor={(item) => String(item.id_PK)}
          renderItem={renderContrato}
          contentContainerStyle={styles.lista}
          refreshing={cargando}
          onRefresh={cargarDatos}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={styles.vacioTitulo}>
                No hay contratos registrados
              </Text>

              <Text style={styles.vacioTexto}>
                Registra un contrato para comenzar.
              </Text>
            </View>
          }
        />
      )}

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
                <View style={styles.listaDoctores}>
                  {doctores.length === 0 ? (
                    <Text style={styles.aviso}>
                      No hay médicos disponibles. Verifica el
                      endpoint GET /api/doctores/.
                    </Text>
                  ) : (
                    doctores.map((doctor) => (
                      <Pressable
                        key={doctor.id_PK}
                        style={[
                          styles.opcionDoctor,
                          formulario.doctor_id_FK ===
                          String(doctor.id_PK)
                            ? styles.opcionDoctorActiva
                            : null,
                        ]}
                        onPress={() =>
                          actualizarCampo(
                            "doctor_id_FK",
                            String(doctor.id_PK)
                          )
                        }
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
                          {doctor.nombre_completo ??
                            doctor.nombre ??
                            doctor.usuario?.nombre ??
                            `Médico #${doctor.id_PK}`}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              )}

              <Text style={styles.etiqueta}>
                Fecha de inicio * (AAAA-MM-DD)
              </Text>

              <TextInput
                style={styles.input}
                value={formulario.fecha_inicio}
                onChangeText={(v) =>
                  actualizarCampo("fecha_inicio", v)
                }
                placeholder="2026-10-09"
                placeholderTextColor="#8A9A98"
                autoCapitalize="none"
              />

              <Text style={styles.etiqueta}>
                Fecha de fin (opcional)
              </Text>

              <TextInput
                style={styles.input}
                value={formulario.fecha_fin}
                onChangeText={(v) =>
                  actualizarCampo("fecha_fin", v)
                }
                placeholder="2027-10-09"
                placeholderTextColor="#8A9A98"
                autoCapitalize="none"
              />

              <Text style={styles.etiqueta}>
                Tipo de contrato *
              </Text>

              <TextInput
                style={styles.input}
                value={formulario.tipo_contrato}
                onChangeText={(v) =>
                  actualizarCampo("tipo_contrato", v)
                }
                placeholder="Indefinido, temporal..."
                placeholderTextColor="#8A9A98"
              />

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
                onChangeText={(v) =>
                  actualizarCampo("salario", v)
                }
                placeholder="15000.00"
                placeholderTextColor="#8A9A98"
                keyboardType="decimal-pad"
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
                {alerta.exito ? "✓" : "!"}
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

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#F4F8F7",
  },
  encabezado: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "800",
    color: "#245D57",
  },
  subtitulo: {
    fontSize: 14,
    color: "#718582",
    marginTop: 7,
    lineHeight: 21,
  },
  botonNuevo: {
    backgroundColor: "#2A8C82",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 18,
  },
  botonNuevoTexto: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  lista: {
    paddingHorizontal: 18,
    paddingBottom: 30,
    flexGrow: 1,
  },
  tarjeta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2ECE9",
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
    color: "#285B55",
  },
  idContrato: {
    color: "#879894",
    fontSize: 12,
    marginTop: 4,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  estadoActivo: {
    backgroundColor: "#DDF5E9",
  },
  estadoOtro: {
    backgroundColor: "#F1EBDD",
  },
  estadoTexto: {
    color: "#426B60",
    fontSize: 11,
    fontWeight: "700",
  },
  divisor: {
    height: 1,
    backgroundColor: "#E9EFED",
    marginVertical: 13,
  },
  detalle: {
    color: "#637773",
    fontSize: 14,
    marginBottom: 7,
  },
  salario: {
    color: "#247F76",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 5,
  },
  documento: {
    color: "#507E77",
    fontSize: 12,
    marginTop: 8,
  },
  botonEditar: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#2A8C82",
    borderRadius: 9,
    paddingHorizontal: 15,
    paddingVertical: 9,
    marginTop: 15,
  },
  botonEditarTexto: {
    color: "#247F76",
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
    color: "#315F58",
    fontSize: 17,
    fontWeight: "700",
  },
  vacioTexto: {
    color: "#81928E",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  fondoModal: {
    flex: 1,
    backgroundColor: "rgba(16, 39, 35, 0.48)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    width: "100%",
    maxWidth: 560,
    maxHeight: "90%",
  },
  modalTitulo: {
    fontSize: 22,
    fontWeight: "800",
    color: "#245D57",
    marginBottom: 20,
  },
  etiqueta: {
    color: "#456660",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
    marginTop: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DCE8E5",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: "#294F49",
    backgroundColor: "#FBFDFC",
    fontSize: 14,
  },
  listaDoctores: {
    borderWidth: 1,
    borderColor: "#DCE8E5",
    borderRadius: 10,
    overflow: "hidden",
  },
  opcionDoctor: {
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F0",
  },
  opcionDoctorActiva: {
    backgroundColor: "#E0F3EF",
  },
  opcionDoctorTexto: {
    color: "#46635E",
    fontSize: 14,
  },
  opcionDoctorTextoActivo: {
    color: "#247F76",
    fontWeight: "800",
  },
  doctorSeleccionado: {
    padding: 13,
    borderRadius: 10,
    backgroundColor: "#E0F3EF",
  },
  doctorSeleccionadoTexto: {
    color: "#247F76",
    fontWeight: "700",
  },
  aviso: {
    padding: 12,
    color: "#8A6450",
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
    borderColor: "#DCE8E5",
    borderRadius: 9,
  },
  opcionEstadoActiva: {
    backgroundColor: "#DDF3EE",
    borderColor: "#2A8C82",
  },
  opcionEstadoTexto: {
    color: "#627772",
    fontSize: 12,
  },
  opcionEstadoTextoActivo: {
    color: "#247F76",
    fontWeight: "800",
  },
  botonGuardar: {
    backgroundColor: "#2A8C82",
    paddingVertical: 14,
    borderRadius: 11,
    alignItems: "center",
    marginTop: 24,
  },
  botonGuardarTexto: {
    color: "#FFFFFF",
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
    color: "#718580",
    fontSize: 14,
    fontWeight: "700",
  },
  modalAlerta: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 25,
    alignItems: "center",
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
    backgroundColor: "#DDF5E9",
  },
  iconoError: {
    backgroundColor: "#FCE8E6",
  },
  iconoAlertaTexto: {
    fontSize: 29,
    fontWeight: "800",
    color: "#287C70",
  },
  alertaTitulo: {
    fontSize: 20,
    fontWeight: "800",
    color: "#285B55",
    textAlign: "center",
  },
  alertaMensaje: {
    fontSize: 14,
    lineHeight: 21,
    color: "#71827E",
    textAlign: "center",
    marginTop: 10,
  },
});
