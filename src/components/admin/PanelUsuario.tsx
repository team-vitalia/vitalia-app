import { FontAwesome } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { solicitarEnlaceCorreo } from "../../services/recuperacionService";
import {
  actualizarDoctor,
  actualizarUsuario,
  CambiosDoctor,
  CambiosUsuario,
  nombreCompleto,
  permisosSobre,
  UsuarioFila,
} from "../../services/usuariosService";
import { authHeaders, mensajeError } from "../../services/util";
import { useTheme } from "../../theme/theme";
import EspecialidadSelector from "../EspecialidadSelector";
import SelectorFecha from "../SelectorFecha";
import QRRecuperacion from "../recuperacion/QRRecuperacion";
import {
  Avatar,
  Aviso,
  Boton,
  Campo,
  Chip,
  fechaLegible,
  Insignia,
  Pestanas,
  Selector,
} from "./ui";
import {
  CURP_LONGITUD,
  fechaDeCurp,
  hoyISO,
  normalizarCurp,
  normalizarRfc,
  vCorreo,
  vCosto,
  vCurp,
  vFecha,
  vNombrePersona,
  vRfc,
  vTelefono,
} from "./validaciones";

export type PestanaPanel = "detalle" | "editar" | "seguridad";

interface Props {
  usuario: UsuarioFila | null;
  pestanaInicial: PestanaPanel;
  onCerrar: () => void;
  onCambio: () => void;
}

const ROL_DOCTOR = 2;
const ROL_PACIENTE = 3;

/* ───────────────────────── NORMALIZACIÓN ───────────────────────── */

const normalizarMayusculasSinAcentos = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

const normalizarTelefonoInput = (v: string) => v.replace(/\D/g, "").slice(0, 10);
const normalizarCorreoInput = (v: string) => v.toLowerCase().replace(/\s/g, "");
const normalizarLicenciaInput = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

/* ───────────────────────── HELPERS ───────────────────────── */

function withAlpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h.split("").map((x) => x + x).join("")
      : h,
    16
  );
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const sombraFlotante = (c: ReturnType<typeof useTheme>) =>
  Platform.select({
    web: {
      boxShadow: `0 24px 80px ${withAlpha(c.glassShadow, 0.45)}, 0 8px 24px ${withAlpha(
        c.glassShadow,
        0.28
      )}`,
    } as any,
    default: {
      shadowColor: c.glassShadow,
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.35,
      shadowRadius: 40,
      elevation: 24,
    },
  });

/* ───────────────────────── COMPONENTE ───────────────────────── */

export default function PanelUsuario({
  usuario,
  pestanaInicial,
  onCerrar,
  onCambio,
}: Props) {
  const { width } = useWindowDimensions();
  const c = useTheme();
  const [pestana, setPestana] = useState<PestanaPanel>(pestanaInicial);

  useEffect(() => {
    if (usuario) setPestana(pestanaInicial);
  }, [usuario?.id_PK, pestanaInicial]);

  // Responsivo: móvil = sheet, tablet/desktop = modal flotante
  const esMovil = width < 720;
  const anchoModal = Math.min(width - 48, 780);

  return (
    <Modal
      visible={!!usuario}
      transparent
      animationType="fade"
      onRequestClose={onCerrar}
      statusBarTranslucent
    >
      <Pressable
        style={[
          s.fondo,
          {
            backgroundColor:
              c.mode === "dark" ? "rgba(0,0,0,0.7)" : "rgba(10,55,50,0.5)",
            justifyContent: esMovil ? "flex-end" : "center",
            padding: esMovil ? 0 : 24,
          },
        ]}
        onPress={onCerrar}
      >
        {usuario && (
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              s.modal,
              {
                backgroundColor: c.card,
                borderColor: c.glassBorder,
                width: esMovil ? "100%" : anchoModal,
                maxHeight: esMovil ? "92%" : Math.min(800, 720),
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderBottomLeftRadius: esMovil ? 0 : 24,
                borderBottomRightRadius: esMovil ? 0 : 24,
              },
              sombraFlotante(c),
            ]}
          >
            {esMovil && <View style={[s.asa, { backgroundColor: c.border }]} />}

            {/* Cabecera */}
            <View
              style={[
                s.cabecera,
                { borderBottomColor: c.glassBorder, backgroundColor: c.bgSoft },
              ]}
            >
              <Avatar nombre={nombreCompleto(usuario)} tam={48} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.nombre, { color: c.text }]} numberOfLines={1}>
                  {nombreCompleto(usuario)}
                </Text>
                <Text style={[s.correo, { color: c.muted }]} numberOfLines={1}>
                  {usuario.correo_electronico}
                </Text>
              </View>
              <Pressable
                onPress={onCerrar}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                style={({ pressed }) => [
                  s.cerrar,
                  {
                    backgroundColor: pressed ? c.hoverBg : c.tileBg,
                  },
                ]}
              >
                <FontAwesome name="times" size={18} color={c.muted} />
              </Pressable>
            </View>

            <Pestanas
              items={[
                { clave: "detalle" as PestanaPanel, etiqueta: "Detalle", icono: "eye" },
                { clave: "editar" as PestanaPanel, etiqueta: "Editar", icono: "pencil" },
                { clave: "seguridad" as PestanaPanel, etiqueta: "Seguridad", icono: "lock" },
              ]}
              activa={pestana}
              onChange={setPestana}
            />

            <ScrollView
              contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 28 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {pestana === "detalle" && <Detalle u={usuario} c={c} />}
              {pestana === "editar" && (
                <Editar u={usuario} c={c} onCambio={onCambio} onCerrar={onCerrar} />
              )}
              {pestana === "seguridad" && (
                <Seguridad u={usuario} c={c} onCambio={onCambio} />
              )}
            </ScrollView>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}

/* ───────────────────────── SUBCOMPONENTES UI ───────────────────────── */

/** Sección con título, icono y tarjeta de contenido. */
function Seccion({
  titulo,
  icono,
  c,
  children,
  tono = "primario",
}: {
  titulo: string;
  icono: React.ComponentProps<typeof FontAwesome>["name"];
  c: ReturnType<typeof useTheme>;
  children: React.ReactNode;
  tono?: "primario" | "ok" | "aviso" | "peligro";
}) {
  const color =
    tono === "ok"
      ? c.success
      : tono === "aviso"
        ? c.warning
        : tono === "peligro"
          ? c.error
          : c.primary;

  return (
    <View style={{ gap: 10 }}>
      <View style={s.seccionCab}>
        <View
          style={[s.seccionIcono, { backgroundColor: withAlpha(color, 0.14) }]}
        >
          <FontAwesome name={icono} size={13} color={color} />
        </View>
        <Text style={[s.seccionTitulo, { color: c.text }]}>{titulo}</Text>
        <View style={[s.seccionLinea, { backgroundColor: withAlpha(color, 0.2) }]} />
      </View>
      {children}
    </View>
  );
}

/** Tarjeta de dato con etiqueta + valor. */
function DatoCard({
  etiqueta,
  valor,
  icono,
  c,
  acento = false,
}: {
  etiqueta: string;
  valor: React.ReactNode;
  icono?: React.ComponentProps<typeof FontAwesome>["name"];
  c: ReturnType<typeof useTheme>;
  acento?: boolean;
}) {
  return (
    <View
      style={[
        s.datoCard,
        {
          backgroundColor: acento ? withAlpha(c.primary, 0.06) : c.bgSoft,
          borderColor: acento ? withAlpha(c.primary, 0.18) : c.border,
        },
      ]}
    >
      <View style={s.datoCab}>
        {icono && (
          <FontAwesome
            name={icono}
            size={11}
            color={acento ? c.primary : c.muted}
            style={{ marginRight: 6 }}
          />
        )}
        <Text
          style={[
            s.datoEtiqueta,
            { color: acento ? c.primary : c.muted },
          ]}
        >
          {etiqueta}
        </Text>
      </View>
      {typeof valor === "string" ? (
        <Text style={[s.datoValor, { color: c.text }]}>{valor}</Text>
      ) : (
        valor
      )}
    </View>
  );
}

/* ───────────────────────── DETALLE ───────────────────────── */

function Detalle({ u, c }: { u: UsuarioFila; c: ReturnType<typeof useTheme> }) {
  const activo = (u.estado ?? "").toLowerCase() === "activo";

  return (
    <View style={{ gap: 22 }}>
      {/* Resumen */}
      <View style={{ gap: 12 }}>
        <View style={s.insignias}>
          <Insignia texto={u.rol ?? "Sin rol"} tono="primario" c={c} />
          <Insignia
            texto={activo ? "Activo" : "Inactivo"}
            tono={activo ? "ok" : "peligro"}
            c={c}
          />
        </View>

        <View style={s.gridDatos}>
          <DatoCard
            c={c}
            icono="phone"
            etiqueta="Teléfono"
            valor={u.telefono || "—"}
          />
          <DatoCard
            c={c}
            icono="calendar"
            etiqueta="Fecha de alta"
            valor={fechaLegible(u.creado_en)}
          />
          <DatoCard
            c={c}
            icono="clock-o"
            etiqueta="Último acceso"
            valor={fechaLegible(u.ultimo_acceso, true)}
          />
        </View>
      </View>

      {u.rol_id_FK === ROL_DOCTOR && (
        <Seccion titulo="Perfil médico" icono="stethoscope" c={c} tono="ok">
          <View style={s.gridDatos}>
            <DatoCard
              c={c}
              icono="id-card"
              etiqueta="Licencia"
              valor={u.numero_licencia || "—"}
            />
            <DatoCard
              c={c}
              icono="file-text-o"
              etiqueta="RFC"
              valor={u.rfc || "—"}
            />
            <DatoCard
              c={c}
              icono="usd"
              etiqueta="Costo de consulta"
              valor={
                u.costo_consulta != null
                  ? `$${u.costo_consulta.toFixed(2)} MXN`
                  : "—"
              }
            />
          </View>
          <View
            style={[
              s.datoCard,
              { backgroundColor: c.bgSoft, borderColor: c.border },
            ]}
          >
            <View style={s.datoCab}>
              <FontAwesome
                name="stethoscope"
                size={11}
                color={c.muted}
                style={{ marginRight: 6 }}
              />
              <Text style={[s.datoEtiqueta, { color: c.muted }]}>
                Especialidades
              </Text>
            </View>
            {u.especialidades.length ? (
              <View style={s.insignias}>
                {u.especialidades.map((e) => (
                  <Insignia
                    key={e.id_PK}
                    texto={e.nombre}
                    tono="primario"
                    c={c}
                  />
                ))}
              </View>
            ) : (
              <Text style={[s.datoValor, { color: c.muted }]}>
                Sin especialidades asignadas
              </Text>
            )}
          </View>
        </Seccion>
      )}

      {u.rol_id_FK === ROL_PACIENTE && (
        <Seccion titulo="Ficha del paciente" icono="id-card-o" c={c} tono="ok">
          <View style={s.gridDatos}>
            <DatoCard
              c={c}
              icono="id-card-o"
              etiqueta="CURP"
              valor={u.curp || "—"}
            />
            <DatoCard
              c={c}
              icono="calendar"
              etiqueta="Fecha de nacimiento"
              valor={fechaLegible(u.fecha_nacimiento)}
            />
            <DatoCard
              c={c}
              icono="venus-mars"
              etiqueta="Género"
              valor={u.genero || "—"}
            />
          </View>
          <DatoCard
            c={c}
            icono="map-marker"
            etiqueta="Dirección"
            valor={u.direccion || "—"}
          />
        </Seccion>
      )}
    </View>
  );
}

/* ───────────────────────── EDITAR ───────────────────────── */

function Editar({
  u,
  c,
  onCambio,
  onCerrar,
}: {
  u: UsuarioFila;
  c: ReturnType<typeof useTheme>;
  onCambio: () => void;
  onCerrar: () => void;
}) {
  const { token, usuario: actor } = useAuth();
  const rolActor = actor?.rol_id ?? actor?.rol_id_FK;
  const permisos = permisosSobre(u, rolActor, actor?.id ?? actor?.id_PK);

  const esDoctor = u.rol_id_FK === ROL_DOCTOR;
  const tienePerfilClinico = esDoctor || u.rol_id_FK === ROL_PACIENTE;

  const original = useMemo(
    () => ({
      nombre: normalizarMayusculasSinAcentos(u.nombre ?? ""),
      apellidoPaterno: normalizarMayusculasSinAcentos(u.apellido_paterno ?? ""),
      apellidoMaterno: normalizarMayusculasSinAcentos(u.apellido_materno ?? ""),
      rfc: normalizarRfc(u.rfc ?? ""),
      correo: normalizarCorreoInput(u.correo_electronico ?? ""),
      telefono: normalizarTelefonoInput(u.telefono ?? ""),
      rolId: u.rol_id_FK,
      licencia: normalizarLicenciaInput(u.numero_licencia ?? ""),
      costo: u.costo_consulta != null ? String(u.costo_consulta) : "",
      esp: u.especialidades.map((e) => e.id_PK).sort((a, b) => a - b),
      curp: normalizarCurp(u.curp ?? ""),
      fechaNacimiento: u.fecha_nacimiento ?? "",
      genero: u.genero ?? "",
      direccion: normalizarMayusculasSinAcentos(u.direccion ?? ""),
    }),
    [u]
  );

  const [nombre, setNombre] = useState(original.nombre);
  const [apellidoPaterno, setApellidoPaterno] = useState(original.apellidoPaterno);
  const [apellidoMaterno, setApellidoMaterno] = useState(original.apellidoMaterno);
  const [rfc, setRfc] = useState(original.rfc);
  const [correo, setCorreo] = useState(original.correo);
  const [telefono, setTelefono] = useState(original.telefono);
  const [rolId, setRolId] = useState<number | null>(original.rolId);
  const [licencia, setLicencia] = useState(original.licencia);
  const [costo, setCosto] = useState(original.costo);
  const [esp, setEsp] = useState<number[]>(original.esp);
  const [curp, setCurp] = useState(original.curp);
  const [fechaNacimiento, setFechaNacimiento] = useState(original.fechaNacimiento);
  const [genero, setGenero] = useState(original.genero);
  const [direccion, setDireccion] = useState(original.direccion);

  const [roles, setRoles] = useState<{ id_PK: number; nombre: string }[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [intento, setIntento] = useState(false);
  const [mensaje, setMensaje] = useState<{
    tipo: "ok" | "error" | "aviso";
    texto: string;
  } | null>(null);

  useEffect(() => {
    setNombre(original.nombre);
    setApellidoPaterno(original.apellidoPaterno);
    setApellidoMaterno(original.apellidoMaterno);
    setRfc(original.rfc);
    setCorreo(original.correo);
    setTelefono(original.telefono);
    setRolId(original.rolId);
    setLicencia(original.licencia);
    setCosto(original.costo);
    setEsp(original.esp);
    setCurp(original.curp);
    setFechaNacimiento(original.fechaNacimiento);
    setGenero(original.genero);
    setDireccion(original.direccion);
    setIntento(false);
  }, [original]);

  useEffect(() => {
    if (!token) return;
    api
      .get("/api/roles/", authHeaders(token))
      .then((r) => setRoles(r.data))
      .catch(() => undefined);
  }, [token]);

  const rolesCambiables = roles.filter(
    (r) =>
      r.id_PK !== ROL_DOCTOR &&
      r.id_PK !== ROL_PACIENTE &&
      !(
        rolActor === 5 &&
        (r.id_PK === 1 || r.id_PK === 5) &&
        r.id_PK !== original.rolId
      )
  );

  const errores = {
    nombre: vNombrePersona(nombre, "El nombre"),
    apellidoPaterno: vNombrePersona(
      apellidoPaterno,
      "El apellido paterno",
      u.rol_id_FK === ROL_PACIENTE || !!original.apellidoPaterno
    ),
    apellidoMaterno: vNombrePersona(apellidoMaterno, "El apellido materno", false),
    rfc: esDoctor && rfc.trim() ? vRfc(rfc) : "",
    correo: vCorreo(correo),
    telefono: vTelefono(telefono),
    licencia: esDoctor && !licencia.trim() ? "Ingresa el número de licencia." : "",
    costo: esDoctor ? vCosto(costo) : "",
    esp: esDoctor && esp.length === 0 ? "Selecciona al menos una especialidad." : "",
    curp: u.rol_id_FK === ROL_PACIENTE ? vCurp(curp) : "",
    fechaNacimiento:
      u.rol_id_FK === ROL_PACIENTE
        ? !fechaNacimiento
          ? "La fecha de nacimiento es obligatoria."
          : vFecha(fechaNacimiento) ||
            (fechaDeCurp(curp) && fechaDeCurp(curp) !== fechaNacimiento
              ? "La fecha no coincide con la CURP."
              : "")
        : "",
    genero: u.rol_id_FK === ROL_PACIENTE && !genero ? "Selecciona el género." : "",
  };

  const hayErrores = Object.values(errores).some(Boolean);
  const espOrdenadas = [...esp].sort((a, b) => a - b);

  const cambiosCuenta: CambiosUsuario = {};
  if (nombre.trim() !== original.nombre) cambiosCuenta.nombre = nombre.trim();
  if (apellidoPaterno.trim() !== original.apellidoPaterno)
    cambiosCuenta.apellido_paterno = apellidoPaterno.trim() || null;
  if (apellidoMaterno.trim() !== original.apellidoMaterno)
    cambiosCuenta.apellido_materno = apellidoMaterno.trim() || null;
  if (correo !== original.correo) cambiosCuenta.correo_electronico = correo;
  if (telefono !== original.telefono) cambiosCuenta.telefono = telefono || null;
  if (rolId !== null && rolId !== original.rolId) cambiosCuenta.rol_id_FK = rolId;

  if (u.rol_id_FK === ROL_PACIENTE) {
    if (normalizarCurp(curp) !== original.curp) cambiosCuenta.curp = normalizarCurp(curp);
    if (fechaNacimiento !== original.fechaNacimiento)
      cambiosCuenta.fecha_nacimiento = fechaNacimiento;
    if (genero !== original.genero) cambiosCuenta.genero = genero;
    if (direccion.trim() !== original.direccion)
      cambiosCuenta.direccion = direccion.trim() || null;
  }

  const cambiosMedico: CambiosDoctor = {};
  if (esDoctor) {
    if (licencia.trim() !== original.licencia)
      cambiosMedico.numero_licencia = licencia.trim();
    if (normalizarRfc(rfc) !== original.rfc)
      cambiosMedico.rfc = normalizarRfc(rfc) || null;
    if (costo.trim() !== original.costo)
      cambiosMedico.costo_consulta = Number(costo);
    if (JSON.stringify(espOrdenadas) !== JSON.stringify(original.esp))
      cambiosMedico.especialidad_ids = espOrdenadas;
  }

  const hayCambiosCuenta = Object.keys(cambiosCuenta).length > 0;
  const hayCambiosMedico = Object.keys(cambiosMedico).length > 0;
  const sucio = hayCambiosCuenta || hayCambiosMedico;

  const descartar = () => {
    setNombre(original.nombre);
    setApellidoPaterno(original.apellidoPaterno);
    setApellidoMaterno(original.apellidoMaterno);
    setRfc(original.rfc);
    setCorreo(original.correo);
    setTelefono(original.telefono);
    setRolId(original.rolId);
    setLicencia(original.licencia);
    setCosto(original.costo);
    setEsp(original.esp);
    setCurp(original.curp);
    setFechaNacimiento(original.fechaNacimiento);
    setGenero(original.genero);
    setDireccion(original.direccion);
    setIntento(false);
    setMensaje(null);
  };

  const guardar = async () => {
    setIntento(true);
    setMensaje(null);
    if (hayErrores) {
      setMensaje({ tipo: "error", texto: "Revisa los campos marcados en rojo." });
      return;
    }
    setGuardando(true);
    let cuentaGuardada = false;
    try {
      if (hayCambiosCuenta) {
        await actualizarUsuario(u.id_PK, cambiosCuenta, token);
        cuentaGuardada = true;
      }
      if (hayCambiosMedico && u.doctor_id) {
        await actualizarDoctor(u.doctor_id, cambiosMedico, token);
      }
      setMensaje({ tipo: "ok", texto: "Cambios guardados correctamente." });
      onCambio();
    } catch (e) {
      const base = mensajeError(e, "No se pudieron guardar los cambios.");
      if (cuentaGuardada) onCambio();
      setMensaje({
        tipo: "error",
        texto: cuentaGuardada
          ? `Los datos de la cuenta sí se guardaron, pero el perfil médico no: ${base}`
          : base,
      });
    } finally {
      setGuardando(false);
    }
  };

  if (!permisos.puedeEditar) {
    return (
      <Aviso
        tipo="aviso"
        texto="Como coordinador no puedes modificar cuentas de administradores ni de otros coordinadores."
        c={c}
      />
    );
  }

  return (
    <View style={{ gap: 22 }}>
      <Seccion titulo="Datos de la cuenta" icono="user" c={c}>
        <View style={{ gap: 12 }}>
          <Campo
            etiqueta="Nombre(s)"
            valor={nombre}
            onChange={(v) => setNombre(normalizarMayusculasSinAcentos(v))}
            requerido
            error={errores.nombre}
            mostrarError={intento}
            autoCapitalize="characters"
            icono="user"
            c={c}
          />
          <View style={s.gridDos}>
            <Campo
              etiqueta="Apellido paterno"
              valor={apellidoPaterno}
              onChange={(v) => setApellidoPaterno(normalizarMayusculasSinAcentos(v))}
              requerido={u.rol_id_FK === ROL_PACIENTE}
              error={errores.apellidoPaterno}
              mostrarError={intento}
              autoCapitalize="characters"
              c={c}
            />
            <Campo
              etiqueta="Apellido materno"
              valor={apellidoMaterno}
              onChange={(v) => setApellidoMaterno(normalizarMayusculasSinAcentos(v))}
              error={errores.apellidoMaterno}
              mostrarError={intento}
              autoCapitalize="characters"
              ayuda="Opcional"
              c={c}
            />
          </View>
          <Campo
            etiqueta="Correo electrónico"
            valor={correo}
            onChange={(v) => setCorreo(normalizarCorreoInput(v))}
            requerido
            error={errores.correo}
            mostrarError={intento}
            teclado="email-address"
            autoCapitalize="none"
            icono="envelope-o"
            c={c}
          />
          <Campo
            etiqueta="Teléfono"
            valor={telefono}
            onChange={(v) => setTelefono(normalizarTelefonoInput(v))}
            error={errores.telefono}
            mostrarError={intento}
            teclado="phone-pad"
            maxLength={10}
            icono="phone"
            ayuda="Opcional, 10 dígitos"
            c={c}
          />

          {tienePerfilClinico ? (
            <View style={{ gap: 6 }}>
              <Text style={[s.datoEtiqueta, { color: c.muted }]}>Rol</Text>
              <Insignia texto={u.rol ?? "—"} tono="primario" c={c} />
              <Text style={[s.ayuda, { color: c.muted }]}>
                El rol no se puede cambiar porque la cuenta tiene un perfil clínico asociado.
              </Text>
            </View>
          ) : (
            <Selector
              etiqueta="Rol"
              valor={rolId !== null ? String(rolId) : ""}
              opciones={rolesCambiables.map((r) => ({
                valor: String(r.id_PK),
                etiqueta: r.nombre,
              }))}
              onChange={(v) => setRolId(Number(v))}
              icono="id-badge"
              c={c}
            />
          )}
        </View>
      </Seccion>

      {esDoctor && (
        <Seccion titulo="Perfil médico" icono="stethoscope" c={c} tono="ok">
          <View style={{ gap: 12 }}>
            <EspecialidadSelector
              valor={esp}
              onChange={setEsp}
              error={errores.esp}
              mostrarError={intento}
            />
            <View style={s.gridDos}>
              <Campo
                etiqueta="Número de licencia"
                valor={licencia}
                onChange={(v) => setLicencia(normalizarLicenciaInput(v))}
                requerido
                error={errores.licencia}
                mostrarError={intento}
                autoCapitalize="characters"
                icono="certificate"
                c={c}
              />
              <Campo
                etiqueta="RFC"
                valor={rfc}
                onChange={(v) => setRfc(normalizarRfc(v))}
                error={errores.rfc}
                mostrarError={intento}
                autoCapitalize="characters"
                icono="file-text-o"
                maxLength={13}
                ayuda="12 o 13 caracteres"
                c={c}
              />
            </View>
            <Campo
              etiqueta="Costo de consulta (MXN)"
              valor={costo}
              onChange={setCosto}
              requerido
              error={errores.costo}
              mostrarError={intento}
              teclado="decimal-pad"
              icono="usd"
              c={c}
            />
          </View>
        </Seccion>
      )}

      {u.rol_id_FK === ROL_PACIENTE && (
        <Seccion titulo="Ficha del paciente" icono="id-card-o" c={c} tono="ok">
          <View style={{ gap: 12 }}>
            <View style={s.gridDos}>
              <Campo
                etiqueta="CURP"
                valor={curp}
                onChange={(v) => setCurp(normalizarCurp(v))}
                requerido
                error={errores.curp}
                mostrarError={intento || curp.length >= CURP_LONGITUD}
                autoCapitalize="characters"
                maxLength={CURP_LONGITUD}
                icono="id-card-o"
                c={c}
              />
              <View style={{ gap: 6 }}>
                <Text style={[s.datoEtiqueta, { color: c.muted }]}>
                  Fecha de nacimiento *
                </Text>
                <SelectorFecha
                  value={fechaNacimiento}
                  onChange={setFechaNacimiento}
                  max={hoyISO()}
                  placeholder="Fecha de nacimiento"
                />
              </View>
            </View>
            {!!(intento && errores.fechaNacimiento) && (
              <Text style={{ color: c.error, fontSize: 12 }}>
                {errores.fechaNacimiento}
              </Text>
            )}
            {!!(
              fechaNacimiento &&
              fechaDeCurp(curp) &&
              fechaDeCurp(curp) !== fechaNacimiento
            ) && (
              <Text style={{ color: c.error, fontSize: 12 }}>
                La fecha de nacimiento no coincide con la CURP.
              </Text>
            )}

            <View style={{ gap: 8 }}>
              <Text style={[s.datoEtiqueta, { color: c.muted }]}>Género *</Text>
              <View style={s.chipsFila}>
                {["Femenino", "Masculino", "Otro"].map((g) => (
                  <Chip
                    key={g}
                    texto={g}
                    activo={genero === g}
                    onPress={() => setGenero(g)}
                    c={c}
                  />
                ))}
              </View>
              {!!(intento && errores.genero) && (
                <Text style={{ color: c.error, fontSize: 12 }}>{errores.genero}</Text>
              )}
            </View>

            <Campo
              etiqueta="Dirección"
              valor={direccion}
              onChange={(v) => setDireccion(normalizarMayusculasSinAcentos(v))}
              autoCapitalize="characters"
              icono="map-marker"
              multilinea
              ayuda="Calle, número exterior e interior, colonia, CP, municipio y estado. Ejemplo: AV. REFORMA, #123, INT. 4, COL. CENTRO, CP 06000, CUAUHTÉMOC, CIUDAD DE MÉXICO"
              c={c}
            />
          </View>
        </Seccion>
      )}

      {mensaje && (
        <Aviso
          tipo={mensaje.tipo}
          texto={mensaje.texto}
          onCerrar={() => setMensaje(null)}
          c={c}
        />
      )}

      {/* Barra de acciones flotante */}
      <View
        style={[
          s.barraAcciones,
          { borderTopColor: c.glassBorder, backgroundColor: c.bgSoft },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={[
              s.puntoEstado,
              { backgroundColor: sucio ? c.warning : c.success },
            ]}
          />
          <Text
            style={[
              s.ayuda,
              {
                color: sucio ? c.warning : c.muted,
                fontWeight: sucio ? "700" : "500",
              },
            ]}
          >
            {sucio ? "Cambios sin guardar" : "Sin cambios"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Boton
            texto="Descartar"
            variante="fantasma"
            chico
            deshabilitado={!sucio || guardando}
            onPress={descartar}
            c={c}
          />
          <Boton
            texto="Guardar cambios"
            icono="save"
            chico
            deshabilitado={!sucio || guardando}
            cargando={guardando}
            onPress={guardar}
            c={c}
          />
        </View>
      </View>
    </View>
  );
}

/* ───────────────────────── SEGURIDAD ───────────────────────── */

function Seguridad({
  u,
  c,
  onCambio,
}: {
  u: UsuarioFila;
  c: ReturnType<typeof useTheme>;
  onCambio: () => void;
}) {
  const { token, usuario: actor } = useAuth();
  const rolActor = actor?.rol_id ?? actor?.rol_id_FK;
  const permisos = permisosSobre(u, rolActor, actor?.id ?? actor?.id_PK);
  const activo = (u.estado ?? "").toLowerCase() === "activo";

  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);
  const [correoMsg, setCorreoMsg] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);

  useEffect(() => {
    setCorreoMsg(null);
    setEspera(0);
  }, [u.id_PK]);

  useEffect(() => {
    if (espera <= 0) return;
    const id = setTimeout(() => setEspera((e) => e - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  const enviarEnlace = async () => {
    if (enviando || espera > 0) return;
    try {
      setEnviando(true);
      setCorreoMsg(null);
      const respuesta = await solicitarEnlaceCorreo(u.correo_electronico);
      setEspera(
        typeof respuesta.espera_segundos === "number"
          ? respuesta.espera_segundos
          : 60
      );
      setCorreoMsg({
        tipo: "ok",
        texto:
          respuesta.mensaje ||
          `Se ha procesado la solicitud de recuperación para ${u.correo_electronico}. Revisa tu bandeja de entrada y la carpeta de spam.`,
      });
    } catch (e) {
      setCorreoMsg({
        tipo: "error",
        texto: mensajeError(e, "No se pudo enviar el enlace de recuperación."),
      });
    } finally {
      setEnviando(false);
    }
  };

  if (!permisos.puedeEditar) {
    return (
      <Aviso
        tipo="aviso"
        texto="Como coordinador no puedes restablecer la contraseña de administradores ni de otros coordinadores."
        c={c}
      />
    );
  }

  if (!activo) {
    return (
      <Aviso
        tipo="aviso"
        texto="Activa la cuenta para poder restablecer su contraseña."
        c={c}
      />
    );
  }

  return (
    <View style={{ gap: 20 }}>
      <Seccion titulo="Recuperación de contraseña" icono="lock" c={c} tono="aviso">
        <View
          style={[
            s.bloque,
            { backgroundColor: c.bgSoft, borderColor: c.border },
          ]}
        >
          <View style={s.bloqueCab}>
            <View
              style={[s.bloqueIcono, { backgroundColor: withAlpha(c.primary, 0.14) }]}
            >
              <FontAwesome name="qrcode" size={16} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.bloqueTitulo, { color: c.text }]}>Código QR</Text>
              <Text style={[s.ayuda, { color: c.muted }]}>
                Para entregarlo en persona. El usuario lo escanea desde la pantalla
                de recuperación.
              </Text>
            </View>
          </View>
          <QRRecuperacion usuarioId={u.id_PK} token={token} c={c} />
        </View>

        <View
          style={[
            s.bloque,
            { backgroundColor: c.bgSoft, borderColor: c.border },
          ]}
        >
          <View style={s.bloqueCab}>
            <View
              style={[s.bloqueIcono, { backgroundColor: withAlpha(c.info, 0.14) }]}
            >
              <FontAwesome name="envelope-o" size={15} color={c.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.bloqueTitulo, { color: c.text }]}>
                Enlace por correo
              </Text>
              <Text style={[s.ayuda, { color: c.muted }]}>
                Se enviará un enlace para restablecer la contraseña a{" "}
                {u.correo_electronico}. Al abrirlo, la persona podrá establecer una
                contraseña nueva.
              </Text>
            </View>
          </View>
          <Boton
            texto={
              enviando
                ? "Enviando enlace..."
                : espera > 0
                  ? `Reenviar en ${espera}s`
                  : "Enviar enlace al correo"
            }
            icono="paper-plane"
            variante="secundario"
            chico
            deshabilitado={enviando || espera > 0}
            cargando={enviando}
            onPress={enviarEnlace}
            c={c}
          />
          {correoMsg && <Aviso tipo={correoMsg.tipo} texto={correoMsg.texto} c={c} />}
        </View>
      </Seccion>
    </View>
  );
}

/* ───────────────────────── ESTILOS ───────────────────────── */

const s = StyleSheet.create({
  fondo: {
    flex: 1,
    alignItems: "center",
  },
  modal: {
    overflow: "hidden",
    borderWidth: 1,
  },
  asa: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
  },
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
  },
  nombre: { fontSize: 17, fontWeight: "800" },
  correo: { fontSize: 13 },
  cerrar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  insignias: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  /* Secciones */
  seccionCab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  seccionIcono: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  seccionTitulo: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  seccionLinea: {
    flex: 1,
    height: 1,
    marginLeft: 4,
  },

  /* Grid datos */
  gridDatos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridDos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  chipsFila: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  /* DatoCard */
  datoCard: {
    flexGrow: 1,
    flexBasis: 200,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  datoCab: {
    flexDirection: "row",
    alignItems: "center",
  },
  datoEtiqueta: { fontSize: 11.5, fontWeight: "700" },
  datoValor: { fontSize: 15, fontWeight: "700" },
  ayuda: { fontSize: 12.5, lineHeight: 18 },

  /* Barra de acciones */
  barraAcciones: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 4,
    marginTop: 4,
    borderTopWidth: 1,
    borderRadius: 12,
  },
  puntoEstado: { width: 8, height: 8, borderRadius: 4 },

  /* Bloque seguridad */
  bloque: {
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  bloqueCab: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  bloqueIcono: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bloqueTitulo: { fontSize: 14.5, fontWeight: "800", marginBottom: 2 },
});