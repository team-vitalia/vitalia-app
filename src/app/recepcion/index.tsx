import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";

export default function RecepcionScreen() {
  const { usuario } = useAuth();

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
            {usuario?.nombre || "Recepción"}
          </Text>

          <Text style={styles.role}>
            Recepción
          </Text>

        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {usuario?.nombre?.charAt(0)?.toUpperCase() || "R"}
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
            Panel de recepción
          </Text>

          <Text style={styles.welcomeDescription}>
            Organiza la atención de pacientes, citas y
            procesos de recepción desde un solo lugar.
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
            Citas programadas
          </Text>

        </View>


        <View style={styles.infoCard}>

          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>
              ◎
            </Text>
          </View>

          <Text style={styles.cardNumber}>
            0
          </Text>

          <Text style={styles.cardLabel}>
            Pacientes en espera
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
      >

        <View style={styles.actionIcon}>
          <Text style={styles.actionIconText}>
            ◷
          </Text>
        </View>

        <View style={styles.actionInfo}>

          <Text style={styles.actionTitle}>
            Citas
          </Text>

          <Text style={styles.actionDescription}>
            Consulta y administra las citas de los pacientes.
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
            ◎
          </Text>
        </View>

        <View style={styles.actionInfo}>

          <Text style={styles.actionTitle}>
            Pacientes
          </Text>

          <Text style={styles.actionDescription}>
            Consulta y gestiona la información de los pacientes.
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
            Nueva atención
          </Text>

          <Text style={styles.actionDescription}>
            Registra y canaliza la atención de un paciente.
          </Text>

        </View>

        <Text style={styles.actionArrow}>
          →
        </Text>

      </Pressable>


      {/* =========================
          AVISO
      ========================== */}

      <View style={styles.notice}>

        <View style={styles.noticeIcon}>
          <Text style={styles.noticeIconText}>
            ✓
          </Text>
        </View>

        <View style={styles.noticeContent}>

          <Text style={styles.noticeTitle}>
            Recepción activa
          </Text>

          <Text style={styles.noticeText}>
            El sistema está listo para gestionar la atención.
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
    fontSize: 30,
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
     RESUMEN
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