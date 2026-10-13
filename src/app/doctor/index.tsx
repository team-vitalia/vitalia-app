import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  ActivityIndicator,
  Modal,
} from "react-native";

import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

import { useState } from "react";
import DocumentoContrato from "../../components/DocumentoContrato";
import api from "../../services/api";

export default function DoctorScreen() {
  const router = useRouter();
  const { usuario, token } = useAuth();

  const [modalContrato, setModalContrato] = useState(false);
  const [contratoSeleccionado, setContratoSeleccionado] =
  useState<any | null>(null);
  const [nombreDoctor, setNombreDoctor] = useState("");
  const [cargandoContrato, setCargandoContrato] = useState(false);
  const [errorContrato, setErrorContrato] = useState("");
  const [contratos, setContratos] = useState<any[]>([]);
  const obtenerSaludo = () => {
    const hora = new Date().getHours();

    if (hora < 12) {
      return "Buenos días";
    }

    if (hora < 19) {
      return "Buenas tardes";
    }

    return "Buenas noches";
  };

  
  const abrirContrato = async () => {
    setModalContrato(true);
    setCargandoContrato(true);
    setErrorContrato("");
    setContratos([]);
    setContratoSeleccionado(null);

    try {
      if (!token) {
        setErrorContrato(
          "Tu sesión ha expirado. Inicia sesión nuevamente."
        );
        return;
      }

      const respuesta = await api.get("/api/contratos/mi-contrato", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const listaContratos = Array.isArray(respuesta.data)
        ? respuesta.data
        : respuesta.data
          ? [respuesta.data]
          : [];

      if (listaContratos.length === 0) {
        setErrorContrato("No tienes contratos registrados.");
        return;
      }

      // Ordenar todos los contratos del más reciente al más antiguo.
      const contratosOrdenados = [...listaContratos].sort(
        (a, b) => Number(b.id_PK) - Number(a.id_PK)
      );

      // Guardar todos los contratos para mostrarlos en una lista.
      setContratos(contratosOrdenados);

      // Guardar el nombre del médico.
      setNombreDoctor(usuario?.nombre?.trim() || "Médico");

    } catch (err: any) {
      console.error(
        "Error al consultar mis contratos:",
        err?.response?.status,
        err?.response?.data ?? err?.message
      );

      const detalle = err?.response?.data?.detail;

      setErrorContrato(
        typeof detalle === "string"
          ? detalle
          : "No fue posible consultar tus contratos."
      );
    } finally {
      setCargandoContrato(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >

      {/* =========================
          ENCABEZADO
      ========================== */}

      <View style={styles.header}>

        <View style={styles.headerInfo}>

          <Text style={styles.greeting}>
            {obtenerSaludo()}
          </Text>

          <Text style={styles.name}>
            {usuario?.nombre || "Doctor"}
          </Text>

          <Text style={styles.role}>
            Doctor
          </Text>

        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {usuario?.nombre?.charAt(0)?.toUpperCase() || "D"}
          </Text>
        </View>

      </View>


      {/* =========================
          TARJETA PRINCIPAL
      ========================== */}

      <View style={styles.welcomeCard}>

        <View style={styles.welcomeContent}>

          <Text style={styles.welcomeSmall}>
            VITALIA
          </Text>

          <Text style={styles.welcomeTitle}>
            Panel clínico
          </Text>

          <Text style={styles.welcomeDescription}>
            Gestiona tus pacientes, consultas y
            actividades clínicas desde un solo lugar.
          </Text>

        </View>

        <View style={styles.decorCircle}>
          <Text style={styles.decorIcon}>
            +
          </Text>
        </View>

      </View>


      {/* =========================
          RESUMEN
      ========================== */}

      <Text style={styles.sectionTitle}>
        Resumen de hoy
      </Text>

      <View style={styles.cardsRow}>

        <View style={styles.infoCard}>

          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>
              ◷
            </Text>
          </View>

          <Text style={styles.cardNumber}>
            0
          </Text>

          <Text style={styles.cardLabel}>
            Consultas programadas
          </Text>

        </View>


        <View style={styles.infoCard}>

          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>
              ◉
            </Text>
          </View>

          <Text style={styles.cardNumber}>
            0
          </Text>

          <Text style={styles.cardLabel}>
            Pacientes en atención
          </Text>

        </View>

      </View>


      {/* =========================
          ACCESOS RÁPIDOS
      ========================== */}

      <Text style={styles.sectionTitle}>
        Accesos rápidos
      </Text>


      <Pressable
        style={({ pressed }) => [
          styles.actionCard,
          pressed && styles.actionCardPressed,
        ]}
        onPress={() => router.push("/doctor/consultas")}
      >

        <View style={styles.actionIcon}>
          <Text style={styles.actionIconText}>
            ◷
          </Text>
        </View>

        <View style={styles.actionInfo}>

          <Text style={styles.actionTitle}>
            Mis consultas
          </Text>

          <Text style={styles.actionDescription}>
            Consulta tus citas y pacientes programados.
          </Text>

        </View>

        <Text style={styles.actionArrow}>
          →
        </Text>

      </Pressable>


      <Pressable
        style={({ pressed }) => [
          styles.actionCard,
          pressed && styles.actionCardPressed,
        ]}
        onPress={() => router.push("/doctor/pacientes")}
      >

        <View style={styles.actionIcon}>
          <Text style={styles.actionIconText}>
            ◎
          </Text>
        </View>

        <View style={styles.actionInfo}>

          <Text style={styles.actionTitle}>
            Mis pacientes
          </Text>

          <Text style={styles.actionDescription}>
            Consulta la información de los pacientes asignados.
          </Text>

        </View>

        <Text style={styles.actionArrow}>
          →
        </Text>

      </Pressable>


      <Pressable
        style={({ pressed }) => [
          styles.actionCard,
          pressed && styles.actionCardPressed,
        ]}
      >

        <View style={styles.actionIcon}>
          <Text style={styles.actionIconText}>
            +
          </Text>
        </View>

        <View style={styles.actionInfo}>

          <Text style={styles.actionTitle}>
            Expedientes clínicos
          </Text>

          <Text style={styles.actionDescription}>
            Accede y consulta los expedientes de tus pacientes.
          </Text>

        </View>

        <Text style={styles.actionArrow}>
          →
        </Text>

      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.actionCard,
          pressed && styles.actionCardPressed,
        ]}
        onPress={() => router.push("/doctor/perfil")}
      >
        <View style={styles.actionIcon}>
          <Text style={styles.actionIconText}>✎</Text>
        </View>

        <View style={styles.actionInfo}>
          <Text style={styles.actionTitle}>
            Mi perfil profesional
          </Text>

          <Text style={styles.actionDescription}>
            Consulta y edita tu licencia, costo y especialidades.
          </Text>
        </View>

        <Text style={styles.actionArrow}>→</Text>
      </Pressable>

      <Pressable style={styles.actionCard} onPress={() => router.push("/doctor/evaluar-interacciones")}>
              <View style={styles.actionIcon}><Text style={styles.actionIconText}>💊</Text></View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Evaluador de Interacciones</Text>
                <Text style={styles.actionDescription}>Verifica incompatibilidades farmacológicas entre medicamentos.</Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.actionCard,
          pressed && styles.actionCardPressed,
        ]}
        onPress={abrirContrato}
      >
        <View style={styles.actionIcon}>
          <Text style={styles.actionIconText}>▤</Text>
        </View>

        <View style={styles.actionInfo}>
          <Text style={styles.actionTitle}>
            Mis contratos
          </Text>

          <Text style={styles.actionDescription}>
            Consulta y visualiza tus contratos profesionales.
          </Text>
        </View>

        <Text style={styles.actionArrow}>→</Text>
      </Pressable>


      {/* =========================
          INFORMACIÓN
      ========================== */}

      <View style={styles.notice}>

        <View style={styles.noticeIcon}>
          <Text style={styles.noticeIconText}>
            ✓
          </Text>
        </View>

        <View style={styles.noticeContent}>

          <Text style={styles.noticeTitle}>
            Sistema listo
          </Text>

          <Text style={styles.noticeText}>
            Tu sesión está activa y protegida.
          </Text>

        </View>

      </View>


      {/* =========================
          FOOTER
      ========================== */}

      <View style={styles.footer}>

        <View style={styles.footerLine} />

        <Text style={styles.footerText}>
          VITALIA · Gestión clínica inteligente
        </Text>

      </View>
      
      <Modal
        visible={modalContrato}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setModalContrato(false);
          setContratoSeleccionado(null);
        }}
      >
        <View style={styles.container}>
          {/* ENCABEZADO */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 16,
              backgroundColor: "#FFFFFF",
              borderBottomWidth: 1,
              borderBottomColor: "#E2ECEA",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#247F76",
                }}
              >
                {contratoSeleccionado
                  ? `Contrato CT-${String(
                      contratoSeleccionado.id_PK
                    ).padStart(4, "0")}`
                  : "Mis contratos"}
              </Text>

              <Text
                style={{
                  fontSize: 12,
                  color: "#718581",
                  marginTop: 3,
                }}
              >
                VITALIA · Documento contractual
              </Text>
            </View>

            <Pressable
              onPress={() => {
                setModalContrato(false);
                setContratoSeleccionado(null);
              }}
              style={{
                backgroundColor: "#EAF5F3",
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  color: "#247F76",
                  fontWeight: "600",
                  fontSize: 14,
                }}
              >
                Cerrar ✕
              </Text>
            </Pressable>
          </View>

          {/* CONTENIDO */}
          {cargandoContrato ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 24,
              }}
            >
              <ActivityIndicator size="large" color="#247F76" />

              <Text
                style={{
                  marginTop: 14,
                  color: "#526965",
                  fontSize: 15,
                }}
              >
                Cargando contratos...
              </Text>
            </View>
          ) : errorContrato ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 28,
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: "#A83228",
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                No se pudieron mostrar los contratos
              </Text>

              <Text
                style={{
                  color: "#526965",
                  textAlign: "center",
                  fontSize: 14,
                  lineHeight: 21,
                }}
              >
                {errorContrato}
              </Text>

              <Pressable
                onPress={() => setModalContrato(false)}
                style={{
                  marginTop: 20,
                  backgroundColor: "#247F76",
                  paddingHorizontal: 22,
                  paddingVertical: 12,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontWeight: "600",
                  }}
                >
                  Regresar
                </Text>
              </Pressable>
            </View>
          ) : contratoSeleccionado ? (
            /* DOCUMENTO SELECCIONADO */
            <View style={{ flex: 1, backgroundColor: "#F4F8F7" }}>
              <Pressable
                onPress={() => setContratoSeleccionado(null)}
                style={{
                  alignSelf: "flex-start",
                  marginHorizontal: 16,
                  marginTop: 12,
                  marginBottom: 4,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: "#DDF3EF",
                }}
              >
                <Text
                  style={{
                    color: "#247F76",
                    fontWeight: "700",
                  }}
                >
                  ← Volver a mis contratos
                </Text>
              </Pressable>

              <View style={{ flex: 1 }}>
                <DocumentoContrato
                  contrato={contratoSeleccionado}
                  nombreDoctor={nombreDoctor}
                />
              </View>
            </View>
          ) : (
            /* LISTA DE CONTRATOS */
            <ScrollView
              contentContainerStyle={{
                padding: 20,
                paddingBottom: 40,
              }}
              showsVerticalScrollIndicator={false}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: "#173F3A",
                  marginBottom: 6,
                }}
              >
                Historial de contratos
              </Text>

              <Text
                style={{
                  fontSize: 14,
                  color: "#718581",
                  lineHeight: 21,
                  marginBottom: 20,
                }}
              >
                Selecciona un contrato para consultar sus condiciones,
                fechas, remuneración y estado.
              </Text>

              {contratos.length === 0 ? (
                <View
                  style={{
                    padding: 24,
                    borderRadius: 16,
                    backgroundColor: "#FFFFFF",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#E2ECEA",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      color: "#526965",
                      textAlign: "center",
                    }}
                  >
                    No tienes contratos registrados.
                  </Text>
                </View>
              ) : (
                contratos.map((contrato) => (
                  <Pressable
                    key={contrato.id_PK}
                    onPress={() => setContratoSeleccionado(contrato)}
                    style={({ pressed }) => ({
                      backgroundColor: "#FFFFFF",
                      borderRadius: 16,
                      padding: 18,
                      marginBottom: 14,
                      borderWidth: 1,
                      borderColor: "#DCEAE6",
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 13,
                          backgroundColor: "#E2F4F0",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 13,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 22,
                            color: "#247F76",
                          }}
                        >
                          ▤
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "800",
                            color: "#26443F",
                          }}
                        >
                          Contrato CT-
                          {String(contrato.id_PK).padStart(4, "0")}
                        </Text>

                        <Text
                          style={{
                            fontSize: 12,
                            color: "#718581",
                            marginTop: 4,
                          }}
                        >
                          {contrato.tipo_contrato || "Tipo no especificado"}
                        </Text>
                      </View>

                      <Text
                        style={{
                          fontSize: 22,
                          color: "#247F76",
                        }}
                      >
                        →
                      </Text>
                    </View>

                    <View
                      style={{
                        height: 1,
                        backgroundColor: "#E8F0ED",
                        marginVertical: 15,
                      }}
                    />

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#81918D",
                            marginBottom: 5,
                          }}
                        >
                          Fecha de inicio
                        </Text>

                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: "#304C46",
                          }}
                        >
                          {contrato.fecha_inicio
                            ? String(contrato.fecha_inicio).slice(0, 10)
                            : "No especificada"}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#81918D",
                            marginBottom: 5,
                          }}
                        >
                          Estado
                        </Text>

                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "700",
                            color:
                              String(contrato.estado).toLowerCase() === "vigente"
                                ? "#247F76"
                                : "#526965",
                          }}
                        >
                          {contrato.estado || "No especificado"}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={{
                        marginTop: 15,
                        color: "#247F76",
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      Ver documento completo
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

    </ScrollView>
    
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F4FAF8",
  },

  content: {
    padding: 30,
    paddingBottom: 50,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },

  /* =========================
     HEADER
  ========================== */

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  headerInfo: {
    flex: 1,
  },

  greeting: {
    fontSize: 14,
    color: "#82938F",
    marginBottom: 3,
  },

  name: {
    fontSize: 28,
    fontWeight: "800",
    color: "#173F3A",
  },

  role: {
    fontSize: 13,
    color: "#2A8C82",
    fontWeight: "600",
    marginTop: 4,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#DDF3EF",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#247F76",
  },

  /* =========================
     TARJETA PRINCIPAL
  ========================== */

  welcomeCard: {
    minHeight: 190,

    borderRadius: 24,

    backgroundColor: "#247F76",

    paddingHorizontal: 30,
    paddingVertical: 28,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    overflow: "hidden",

    shadowColor: "#247F76",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.18,
    shadowRadius: 18,

    elevation: 6,
  },

  welcomeContent: {
    flex: 1,
    maxWidth: 600,
  },

  welcomeSmall: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#BDE5DF",
    marginBottom: 5,
  },

  welcomeTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  welcomeDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: "#DCEFEB",
    marginTop: 8,
    maxWidth: 520,
  },

  decorCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,

    backgroundColor: "rgba(255,255,255,0.10)",

    justifyContent: "center",
    alignItems: "center",

    marginLeft: 20,
  },

  decorIcon: {
    fontSize: 70,
    fontWeight: "200",
    color: "rgba(255,255,255,0.55)",
  },

  /* =========================
     SECCIONES
  ========================== */

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#173F3A",

    marginTop: 30,
    marginBottom: 14,
  },

  /* =========================
     TARJETAS RESUMEN
  ========================== */

  cardsRow: {
    flexDirection: "row",
    gap: 15,
  },

  infoCard: {
    flex: 1,

    minHeight: 125,

    backgroundColor: "#FFFFFF",

    borderRadius: 18,

    padding: 18,

    borderWidth: 1,
    borderColor: "#E4EEEB",
  },

  cardIcon: {
    width: 36,
    height: 36,

    borderRadius: 11,

    backgroundColor: "#E2F4F0",

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 12,
  },

  cardIconText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#247F76",
  },

  cardNumber: {
    fontSize: 21,
    fontWeight: "800",
    color: "#173F3A",
  },

  cardLabel: {
    fontSize: 11,
    color: "#8A9B98",
    marginTop: 4,
  },

  /* =========================
     ACCIONES
  ========================== */

  actionCard: {
    minHeight: 82,

    backgroundColor: "#FFFFFF",

    borderRadius: 18,

    paddingHorizontal: 18,
    paddingVertical: 15,

    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#E4EEEB",

    marginBottom: 12,
  },

  actionCardPressed: {
    transform: [
      {
        scale: 0.98,
      },
    ],

    opacity: 0.85,
  },

  actionIcon: {
    width: 46,
    height: 46,

    borderRadius: 14,

    backgroundColor: "#E2F4F0",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 14,
  },

  actionIconText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#247F76",
  },

  actionInfo: {
    flex: 1,
  },

  actionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#26443F",
  },

  actionDescription: {
    fontSize: 11,
    color: "#879691",
    marginTop: 4,
  },

  actionArrow: {
    fontSize: 22,
    color: "#247F76",
    marginLeft: 10,
  },

  /* =========================
     AVISO
  ========================== */

  notice: {
    marginTop: 18,

    backgroundColor: "#F0F8F6",

    borderRadius: 16,

    padding: 15,

    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#DCEEEA",
  },

  noticeIcon: {
    width: 38,
    height: 38,

    borderRadius: 12,

    backgroundColor: "#DDF3EF",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 12,
  },

  noticeIconText: {
    color: "#247F76",
    fontSize: 17,
    fontWeight: "800",
  },

  noticeContent: {
    flex: 1,
  },

  noticeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#31534D",
  },

  noticeText: {
    fontSize: 11,
    color: "#82938F",
    marginTop: 3,
  },

  /* =========================
     FOOTER
  ========================== */

  footer: {
    alignItems: "center",
    marginTop: 35,
  },

  footerLine: {
    width: 60,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#CDE8E3",
    marginBottom: 10,
  },

  footerText: {
    fontSize: 10,
    color: "#9AA9A6",
    letterSpacing: 0.5,
  },

});