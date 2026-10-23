
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

interface Contrato {
  id_PK: number;
  doctor_id_FK: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string | null;
  tipo_contrato: string | null;
  salario: number | string | null;
}

interface Props {
  contrato: Contrato;
  nombreDoctor: string;
}

export default function DocumentoContrato({
  contrato,
  nombreDoctor,
}: Props) {
  const formatoFecha = (fecha: string | null) => {
    if (!fecha) return "No especificada";

    const partes = fecha.slice(0, 10).split("-");

    if (partes.length !== 3) return fecha;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  const salario = Number(
    contrato.salario ?? 0
  ).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });

  const estadoContrato = (contrato.estado || "No especificado")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());

  const tipoContrato = (contrato.tipo_contrato || "No especificado")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());

  return (
    <ScrollView
      style={styles.fondo}
      contentContainerStyle={styles.contenido}
    >
      <View style={styles.hoja}>
        {/* ENCABEZADO INSTITUCIONAL */}
        <View style={styles.encabezado}>
          <View style={styles.logo}>
            <Text style={styles.logoTexto}>V</Text>
          </View>

          <View style={styles.encabezadoTexto}>
            <Text style={styles.nombreEmpresa}>VITALIA</Text>
            <Text style={styles.lema}>
              Tu salud, en un solo lugar.
            </Text>
            <Text style={styles.subtituloEmpresa}>
              GESTIÓN DE SERVICIOS MÉDICOS
            </Text>
          </View>

          <View style={styles.folio}>
            <Text style={styles.folioEtiqueta}>
              FOLIO CONTRACTUAL
            </Text>
            <Text style={styles.folioNumero}>
              CT-{String(contrato.id_PK).padStart(4, "0")}
            </Text>
          </View>
        </View>

        <View style={styles.linea} />

        {/* TÍTULO */}
        <Text style={styles.titulo}>
          CONTRATO DE PRESTACIÓN DE SERVICIOS
          PROFESIONALES MÉDICOS
        </Text>

        <Text style={styles.introduccion}>
          El presente documento tiene por objeto establecer
          las condiciones generales registradas en el sistema
          VITALIA respecto de la relación contractual con el
          profesional médico identificado en los apartados
          siguientes. Su contenido constituye una referencia
          de las condiciones registradas y deberá ser revisado
          y formalizado por las partes para adquirir los
          efectos que legalmente correspondan.
        </Text>

        {/* I. DATOS DEL PROFESIONAL */}
        <Text style={styles.seccion}>
          I. IDENTIFICACIÓN DEL PROFESIONAL
        </Text>

        <View style={styles.campo}>
          <Text style={styles.etiqueta}>
            NOMBRE COMPLETO DEL PROFESIONAL MÉDICO
          </Text>
          <Text style={styles.valor}>{nombreDoctor}</Text>
        </View>

        <View style={styles.dosColumnas}>
          <View style={styles.columna}>
            <Text style={styles.etiqueta}>
              NÚMERO DE CONTRATO
            </Text>
            <Text style={styles.valor}>
              CT-{String(contrato.id_PK).padStart(4, "0")}
            </Text>
          </View>

          <View style={styles.columna}>
            <Text style={styles.etiqueta}>
              MODALIDAD CONTRACTUAL
            </Text>
            <Text style={styles.valor}>
              {tipoContrato}
            </Text>
          </View>
        </View>

        {/* II. CONDICIONES */}
        <Text style={styles.seccion}>
          II. CONDICIONES CONTRACTUALES
        </Text>

        <View style={styles.dosColumnas}>
          <View style={styles.columna}>
            <Text style={styles.etiqueta}>
              FECHA DE INICIO
            </Text>
            <Text style={styles.valor}>
              {formatoFecha(contrato.fecha_inicio)}
            </Text>
          </View>

          <View style={styles.columna}>
            <Text style={styles.etiqueta}>
              FECHA DE CONCLUSIÓN
            </Text>
            <Text style={styles.valor}>
              {contrato.fecha_fin
                ? formatoFecha(contrato.fecha_fin)
                : "Vigencia sin fecha de conclusión registrada"}
            </Text>
          </View>
        </View>

        <View style={styles.campo}>
          <Text style={styles.etiqueta}>
            REMUNERACIÓN REGISTRADA
          </Text>
          <Text style={styles.salario}>{salario}</Text>
          <Text style={styles.nota}>
            La periodicidad y las condiciones de pago deberán
            establecerse expresamente en el instrumento
            contractual correspondiente.
          </Text>
        </View>

        <View style={styles.campo}>
          <Text style={styles.etiqueta}>
            ESTADO DEL CONTRATO EN EL SISTEMA
          </Text>
          <View style={styles.estadoContenedor}>
            <Text style={styles.estadoTexto}>
              {estadoContrato}
            </Text>
          </View>
        </View>

        {/* III. DECLARACIONES */}
        <Text style={styles.seccion}>
          III. DECLARACIONES GENERALES
        </Text>

        <Text style={styles.clausula}>
          <Text style={styles.negrita}>
            A. IDENTIFICACIÓN DE LAS PARTES.{" "}
          </Text>
          Para efectos del instrumento contractual definitivo,
          se deberá identificar plenamente al profesional
          médico y a la persona física o moral que actúe como
          parte contratante, incluyendo los datos necesarios
          para acreditar su identidad y, cuando corresponda,
          las facultades de su representante.
        </Text>

        <Text style={styles.clausula}>
          <Text style={styles.negrita}>
            B. ALCANCE DE LOS SERVICIOS.{" "}
          </Text>
          Las funciones, responsabilidades, lugar de
          prestación de los servicios y demás condiciones
          operativas deberán definirse de manera expresa
          y acordarse por las partes antes de formalizar
          la relación contractual.
        </Text>

        {/* IV. CLÁUSULAS */}
        <Text style={styles.seccion}>
          IV. CLÁUSULAS CONTRACTUALES
        </Text>

        <Text style={styles.clausula}>
          <Text style={styles.negrita}>
            PRIMERA. OBJETO.{" "}
          </Text>
          El objeto del contrato será establecer las bases y
          condiciones para la prestación de servicios
          profesionales médicos, de conformidad con las
          funciones, responsabilidades y obligaciones
          expresamente acordadas por las partes, así como
          con las disposiciones legales, sanitarias y éticas
          aplicables.
        </Text>

        <Text style={styles.clausula}>
          <Text style={styles.negrita}>
            SEGUNDA. VIGENCIA.{" "}
          </Text>
          La vigencia será la indicada en el apartado de
          condiciones contractuales. Cuando no exista una
          fecha de conclusión registrada, esta circunstancia
          no deberá interpretarse, por sí sola, como una
          determinación de vigencia indefinida. La duración,
          renovación y terminación deberán establecerse
          expresamente en el instrumento definitivo.
        </Text>

        <Text style={styles.clausula}>
          <Text style={styles.negrita}>
            TERCERA. REMUNERACIÓN Y PAGO.{" "}
          </Text>
          El importe consignado corresponde a la remuneración
          registrada en el sistema VITALIA. La periodicidad,
          los medios de pago, las fechas de cumplimiento,
          las retenciones y demás condiciones económicas,
          cuando procedan, deberán especificarse en el
          contrato formal suscrito por las partes.
        </Text>

        <Text style={styles.clausula}>
          <Text style={styles.negrita}>
            CUARTA. OBLIGACIONES PROFESIONALES.{" "}
          </Text>
          El profesional médico deberá desempeñar las
          actividades que le correspondan con diligencia,
          responsabilidad y apego a los principios éticos
          de su profesión, así como cumplir las disposiciones
          sanitarias aplicables y las obligaciones que se
          establezcan en el instrumento contractual definitivo.
        </Text>

        <Text style={styles.clausula}>
          <Text style={styles.negrita}>
            QUINTA. CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS.{" "}
          </Text>
          Las partes deberán proteger la información
          confidencial a la que tengan acceso con motivo
          de la relación contractual. En particular, deberá
          observarse el deber de confidencialidad respecto
          de los expedientes clínicos, los datos personales
          y la información de los pacientes, conforme a la
          normativa aplicable y a las medidas de seguridad
          correspondientes.
        </Text>

        <Text style={styles.clausula}>
          <Text style={styles.negrita}>
            SEXTA. USO DE LOS SISTEMAS DE INFORMACIÓN.{" "}
          </Text>
          Cuando se autorice el acceso a VITALIA u otras
          herramientas institucionales, el profesional deberá
          utilizarlas exclusivamente para los fines
          autorizados, resguardar sus credenciales y evitar
          el acceso, divulgación o modificación no autorizados
          de la información.
        </Text>

        <Text style={styles.clausula}>
          <Text style={styles.negrita}>
            SÉPTIMA. MODIFICACIONES.{" "}
          </Text>
          Toda modificación relativa a las condiciones
          contractuales deberá documentarse por escrito
          y contar con la aceptación de las partes, de
          conformidad con el procedimiento establecido
          en el contrato definitivo y la legislación aplicable.
        </Text>

        <Text style={styles.clausula}>
          <Text style={styles.negrita}>
            OCTAVA. TERMINACIÓN.{" "}
          </Text>
          Las causas, los procedimientos y los efectos de
          la terminación de la relación contractual deberán
          definirse en el instrumento definitivo, respetando
          los derechos y obligaciones de las partes y las
          disposiciones legales que resulten aplicables.
        </Text>

        
        <Text style={styles.clausula}>
        <Text style={styles.negrita}>
            NOVENA. ACEPTACIÓN Y FORMALIZACIÓN.{" "}
        </Text>
        Una vez revisado el contenido del presente documento,
        las partes deberán imprimirlo y suscribirlo físicamente
        para dejar constancia de su conformidad con las
        condiciones pactadas. La formalización del contrato
        estará sujeta a la revisión, aceptación y firma de las
        partes correspondientes. La visualización o descarga
        del documento en formato PDF no sustituye la firma
        física ni acredita, por sí sola, la formalización
        del contrato.
        </Text>

        {/* PIE DE PÁGINA */}
        <View style={styles.pie}>
          <Text style={styles.pieTexto}>
            VITALIA · Gestión de servicios médicos
          </Text>
          <Text style={styles.pieTexto}>
            Folio: CT-{String(contrato.id_PK).padStart(4, "0")}
          </Text>
          <Text style={styles.aviso}>
            DOCUMENTO INFORMATIVO GENERADO POR EL SISTEMA.
            SU FORMALIZACIÓN REQUIERE LA REVISIÓN Y ACEPTACIÓN
            DE LAS PARTES.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: "#E8EFED",
  },
  contenido: {
    padding: 18,
    alignItems: "center",
  },
  hoja: {
    width: "100%",
    maxWidth: 760,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 28,
    paddingVertical: 32,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#DDE5E2",
  },
  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  logo: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#2A8C82",
    alignItems: "center",
    justifyContent: "center",
  },
  logoTexto: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  encabezadoTexto: {
    flex: 1,
  },
  nombreEmpresa: {
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#245D57",
  },
  lema: {
    fontSize: 10,
    color: "#718582",
    marginTop: 3,
  },
  subtituloEmpresa: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#247F76",
    marginTop: 5,
  },
  folio: {
    alignItems: "flex-end",
    maxWidth: 115,
  },
  folioEtiqueta: {
    fontSize: 8,
    letterSpacing: 1,
    color: "#7A8D88",
    textAlign: "right",
  },
  folioNumero: {
    fontSize: 12,
    fontWeight: "800",
    color: "#247F76",
    marginTop: 5,
  },
  linea: {
    height: 2,
    backgroundColor: "#2A8C82",
    marginBottom: 24,
  },
  titulo: {
    fontSize: 17,
    fontWeight: "900",
    color: "#263F3B",
    textAlign: "center",
    lineHeight: 25,
  },
  introduccion: {
    fontSize: 11,
    lineHeight: 19,
    color: "#52645F",
    textAlign: "justify",
    marginTop: 14,
    marginBottom: 10,
  },
  seccion: {
    fontSize: 12,
    fontWeight: "900",
    color: "#247F76",
    marginTop: 23,
    marginBottom: 13,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#DCE8E5",
  },
  campo: {
    marginBottom: 16,
  },
  dosColumnas: {
    flexDirection: "row",
    gap: 18,
    marginBottom: 14,
  },
  columna: {
    flex: 1,
    minWidth: 0,
  },
  etiqueta: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: "#81918D",
    marginBottom: 6,
  },
  valor: {
    fontSize: 12,
    fontWeight: "700",
    color: "#304C46",
    lineHeight: 19,
  },
  salario: {
    fontSize: 18,
    fontWeight: "900",
    color: "#247F76",
  },
  nota: {
    fontSize: 9,
    color: "#71827D",
    lineHeight: 15,
    marginTop: 5,
  },
  estadoContenedor: {
    alignSelf: "flex-start",
    backgroundColor: "#EAF5F2",
    borderWidth: 1,
    borderColor: "#CFE5DF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  estadoTexto: {
    fontSize: 11,
    fontWeight: "800",
    color: "#247F76",
  },
  clausula: {
    fontSize: 11,
    lineHeight: 19,
    color: "#52645F",
    textAlign: "justify",
    marginBottom: 13,
  },
  negrita: {
    fontWeight: "900",
    color: "#304C46",
  },
  textoFirmas: {
    fontSize: 11,
    color: "#687975",
    lineHeight: 19,
    marginBottom: 36,
    textAlign: "justify",
  },
  firmas: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 35,
  },
  firma: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },
  lineaFirma: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#879994",
    marginBottom: 10,
  },
  firmaNombre: {
    fontSize: 10,
    fontWeight: "700",
    color: "#304C46",
    textAlign: "center",
    lineHeight: 16,
  },
  firmaRol: {
    fontSize: 8,
    color: "#81918D",
    marginTop: 5,
    letterSpacing: 0.7,
    textAlign: "center",
  },
  datosFormalizacion: {
    marginTop: 8,
    marginBottom: 30,
  },
  lineaLugarFecha: {
    borderBottomWidth: 1,
    borderBottomColor: "#879994",
    height: 22,
  },
  pie: {
    borderTopWidth: 1,
    borderTopColor: "#E2ECE9",
    paddingTop: 13,
    gap: 5,
  },
  pieTexto: {
    fontSize: 9,
    color: "#81918D",
    textAlign: "center",
  },
  aviso: {
    fontSize: 8,
    fontWeight: "700",
    color: "#71827D",
    lineHeight: 14,
    textAlign: "center",
    marginTop: 7,
  },
});
