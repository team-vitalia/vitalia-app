
interface ContratoPDF {
  id_PK: number;
  doctor_id_FK: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string | null;
  tipo_contrato: string | null;
  salario: number | string | null;
}

const escaparHTML = (valor: string) =>
  valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatoFecha = (fecha: string | null) => {
  if (!fecha) return "No especificada";

  const partes = fecha.slice(0, 10).split("-");

  if (partes.length !== 3) return escaparHTML(fecha);

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

export function generarHtmlContrato(
  contrato: ContratoPDF,
  nombreDoctor: string
): string {
  const folio = `CT-${String(contrato.id_PK).padStart(4, "0")}`;

  const salario = Number(contrato.salario ?? 0).toLocaleString(
    "es-MX",
    {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }
  );

  const estado = (contrato.estado || "No especificado")
    .replace(/_/g, " ")
    .replace(/\b\w/g, letra => letra.toUpperCase());

  const tipo = (contrato.tipo_contrato || "No especificado")
    .replace(/_/g, " ")
    .replace(/\b\w/g, letra => letra.toUpperCase());

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Contrato ${folio} - VITALIA</title>

<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }

  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #52645F;
    font-size: 11px;
    line-height: 1.65;
    background: #FFFFFF;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* CONTENEDOR DEL DOCUMENTO */
  .documento {
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    padding: 0;
    background: #FFFFFF;
    overflow-wrap: break-word;
    box-sizing: border-box;
  }

  /* ENCABEZADO */
  .encabezado {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    max-width: 100%;
    margin-bottom: 20px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .logo {
    flex: 0 0 45px;
    width: 45px;
    height: 45px;
    min-width: 45px;
    border-radius: 12px;
    background: #2A8C82;
    color: white;
    font-size: 28px;
    font-weight: bold;
    text-align: center;
    line-height: 45px;
  }

  .empresa {
    flex: 1 1 auto;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .empresa h1 {
    margin: 0;
    color: #245D57;
    font-size: 23px;
    letter-spacing: 2px;
  }

  .empresa p {
    margin: 2px 0;
    font-size: 9px;
    color: #718582;
  }

  .folio {
    flex: 0 0 auto;
    min-width: 0;
    text-align: right;
    color: #247F76;
    font-weight: bold;
    overflow-wrap: anywhere;
  }

  .linea {
    height: 2px;
    background: #2A8C82;
    margin-bottom: 24px;
  }

  /* TÍTULOS */
  h2 {
    text-align: center;
    font-size: 17px;
    line-height: 1.5;
    color: #263F3B;
    margin: 0 0 18px;
    break-after: avoid;
    page-break-after: avoid;
  }

  h3 {
    color: #247F76;
    font-size: 12px;
    margin-top: 24px;
    margin-bottom: 13px;
    padding-bottom: 7px;
    border-bottom: 1px solid #DCE8E5;
    break-after: avoid;
    page-break-after: avoid;
  }

  /* INTRODUCCIÓN */
  .introduccion {
    text-align: justify;
    margin: 0 0 10px;
    break-inside: auto;
    page-break-inside: auto;
  }

  /* CAMPOS */
  .campo {
    margin-bottom: 15px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .etiqueta {
    display: block;
    color: #81918D;
    font-size: 9px;
    font-weight: bold;
    margin-bottom: 4px;
  }

  .valor {
    color: #304C46;
    font-size: 12px;
    font-weight: bold;
    overflow-wrap: break-word;
  }

  /* COLUMNAS */
  .columnas {
    display: flex;
    width: 100%;
    max-width: 100%;
    gap: 16px;
    margin-bottom: 15px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .columna {
    flex: 1 1 0;
    width: 0;
    min-width: 0;
    overflow-wrap: break-word;
  }

  /* SALARIO */
  .salario {
    color: #247F76;
    font-size: 18px;
    font-weight: bold;
  }

  .nota {
    font-size: 9px;
    color: #71827D;
    margin-bottom: 0;
  }

  /* ESTADO */
  .estado {
    display: inline-block;
    background: #EAF5F2;
    border: 1px solid #CFE5DF;
    border-radius: 6px;
    padding: 5px 12px;
    color: #247F76;
    font-weight: bold;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* CLÁUSULAS */
  .clausula {
    text-align: justify;
    margin: 0 0 13px;
    break-inside: auto;
    page-break-inside: auto;
    overflow: visible;
    orphans: 2;
    widows: 2;
  }

  .clausula strong {
    color: #304C46;
  }

  /* PIE DEL DOCUMENTO */
  .pie {
    border-top: 1px solid #E2ECE9;
    padding-top: 13px;
    margin-top: 30px;
    text-align: center;
    color: #81918D;
    font-size: 9px;
  }

  .pie p {
    margin: 4px 0;
  }

  .aviso {
    font-size: 8px;
    font-weight: bold;
    margin-top: 8px;
  }

  /* IMPRESIÓN */
  @media print {
    html,
    body {
      width: 100%;
      margin: 0;
      padding: 0;
    }

    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .documento {
      overflow: visible;
    }

    .clausula,
    .introduccion {
      break-inside: auto;
      page-break-inside: auto;
    }
  }
</style>
</head>

<body>

<div class="documento">

  <div class="encabezado">
    <div class="logo">V</div>

    <div class="empresa">
      <h1>VITALIA</h1>
      <p>Tu salud, en un solo lugar.</p>
      <p><strong>GESTIÓN DE SERVICIOS MÉDICOS</strong></p>
    </div>

    <div class="folio">
      <small>FOLIO CONTRACTUAL</small><br>
      ${folio}
    </div>
  </div>

  <div class="linea"></div>

  <h2>
    CONTRATO DE PRESTACIÓN DE SERVICIOS
    PROFESIONALES MÉDICOS
  </h2>

  <p class="introduccion">
    El presente documento tiene por objeto establecer las condiciones
    generales registradas en el sistema VITALIA respecto de la relación
    contractual con el profesional médico identificado en los apartados
    siguientes. Su contenido constituye una referencia de las condiciones
    registradas y deberá ser revisado y formalizado por las partes para
    adquirir los efectos que legalmente correspondan.
  </p>

  <h3>I. IDENTIFICACIÓN DEL PROFESIONAL</h3>

  <div class="campo">
    <span class="etiqueta">NOMBRE COMPLETO DEL PROFESIONAL MÉDICO</span>
    <span class="valor">${escaparHTML(nombreDoctor)}</span>
  </div>

  <div class="columnas">
    <div class="columna campo">
      <span class="etiqueta">NÚMERO DE CONTRATO</span>
      <span class="valor">${folio}</span>
    </div>

    <div class="columna campo">
      <span class="etiqueta">MODALIDAD CONTRACTUAL</span>
      <span class="valor">${escaparHTML(tipo)}</span>
    </div>
  </div>

  <h3>II. CONDICIONES CONTRACTUALES</h3>

  <div class="columnas">
    <div class="columna campo">
      <span class="etiqueta">FECHA DE INICIO</span>
      <span class="valor">${formatoFecha(contrato.fecha_inicio)}</span>
    </div>

    <div class="columna campo">
      <span class="etiqueta">FECHA DE CONCLUSIÓN</span>
      <span class="valor">
        ${
          contrato.fecha_fin
            ? formatoFecha(contrato.fecha_fin)
            : "Vigencia sin fecha de conclusión registrada"
        }
      </span>
    </div>
  </div>

  <div class="campo">
    <span class="etiqueta">REMUNERACIÓN REGISTRADA</span>
    <div class="salario">${salario}</div>
    <p class="nota">
      La periodicidad y las condiciones de pago deberán establecerse
      expresamente en el instrumento contractual correspondiente.
    </p>
  </div>

  <div class="campo">
    <span class="etiqueta">ESTADO DEL CONTRATO EN EL SISTEMA</span>
    <span class="estado">${escaparHTML(estado)}</span>
  </div>

  <h3>III. DECLARACIONES GENERALES</h3>

  <p class="clausula">
    <strong>A. IDENTIFICACIÓN DE LAS PARTES.</strong>
    Para efectos del instrumento contractual definitivo, se deberá
    identificar plenamente al profesional médico y a la persona física
    o moral que actúe como parte contratante, incluyendo los datos
    necesarios para acreditar su identidad y, cuando corresponda,
    las facultades de su representante.
  </p>

  <p class="clausula">
    <strong>B. ALCANCE DE LOS SERVICIOS.</strong>
    Las funciones, responsabilidades, lugar de prestación de los servicios
    y demás condiciones operativas deberán definirse de manera expresa
    y acordarse por las partes antes de formalizar la relación contractual.
  </p>

  <h3>IV. CLÁUSULAS CONTRACTUALES</h3>

  <p class="clausula">
    <strong>PRIMERA. OBJETO.</strong>
    El objeto del contrato será establecer las bases y condiciones para
    la prestación de servicios profesionales médicos, de conformidad
    con las funciones, responsabilidades y obligaciones expresamente
    acordadas por las partes, así como con las disposiciones legales,
    sanitarias y éticas aplicables.
  </p>

  <p class="clausula">
    <strong>SEGUNDA. VIGENCIA.</strong>
    La vigencia será la indicada en el apartado de condiciones
    contractuales. Cuando no exista una fecha de conclusión registrada,
    esta circunstancia no deberá interpretarse, por sí sola, como una
    determinación de vigencia indefinida. La duración, renovación y
    terminación deberán establecerse expresamente en el instrumento
    definitivo.
  </p>

  <p class="clausula">
    <strong>TERCERA. REMUNERACIÓN Y PAGO.</strong>
    El importe consignado corresponde a la remuneración registrada
    en el sistema VITALIA. La periodicidad, los medios de pago, las fechas
    de cumplimiento, las retenciones y demás condiciones económicas,
    cuando procedan, deberán especificarse en el contrato formal suscrito
    por las partes.
  </p>

  <p class="clausula">
    <strong>CUARTA. OBLIGACIONES PROFESIONALES.</strong>
    El profesional médico deberá desempeñar las actividades que le
    correspondan con diligencia, responsabilidad y apego a los principios
    éticos de su profesión, así como cumplir las disposiciones sanitarias
    aplicables y las obligaciones que se establezcan en el instrumento
    contractual definitivo.
  </p>

  <p class="clausula">
    <strong>QUINTA. CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS.</strong>
    Las partes deberán proteger la información confidencial a la que
    tengan acceso con motivo de la relación contractual. En particular,
    deberá observarse el deber de confidencialidad respecto de los
    expedientes clínicos, los datos personales y la información de los
    pacientes, conforme a la normativa aplicable y a las medidas de
    seguridad correspondientes.
  </p>

  <p class="clausula">
    <strong>SEXTA. USO DE LOS SISTEMAS DE INFORMACIÓN.</strong>
    Cuando se autorice el acceso a VITALIA u otras herramientas
    institucionales, el profesional deberá utilizarlas exclusivamente
    para los fines autorizados, resguardar sus credenciales y evitar
    el acceso, divulgación o modificación no autorizados de la información.
  </p>

  <p class="clausula">
    <strong>SÉPTIMA. MODIFICACIONES.</strong>
    Toda modificación relativa a las condiciones contractuales deberá
    documentarse por escrito y contar con la aceptación de las partes,
    de conformidad con el procedimiento establecido en el contrato
    definitivo y la legislación aplicable.
  </p>

  <p class="clausula">
    <strong>OCTAVA. TERMINACIÓN.</strong>
    Las causas, los procedimientos y los efectos de la terminación de
    la relación contractual deberán definirse en el instrumento definitivo,
    respetando los derechos y obligaciones de las partes y las disposiciones
    legales que resulten aplicables.
  </p>

  <p class="clausula">
    <strong>NOVENA. ACEPTACIÓN Y FORMALIZACIÓN.</strong>
    Una vez revisado el contenido del presente documento, las partes
    deberán imprimirlo y suscribirlo físicamente para dejar constancia
    de su conformidad con las condiciones pactadas. La formalización
    del contrato estará sujeta a la revisión, aceptación y firma de las
    partes correspondientes. La visualización o descarga del documento
    en formato PDF no sustituye la firma física ni acredita, por sí sola,
    la formalización del contrato.
  </p>

  <div class="pie">
    <p>VITALIA · Gestión de servicios médicos</p>
    <p>Folio: ${folio}</p>
    <p class="aviso">
      DOCUMENTO INFORMATIVO GENERADO POR EL SISTEMA.
      SU FORMALIZACIÓN REQUIERE LA REVISIÓN Y ACEPTACIÓN DE LAS PARTES.
    </p>
  </div>

</div>

</body>
</html>`;
}
