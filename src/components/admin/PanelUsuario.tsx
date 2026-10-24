import { FontAwesome } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
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
  permisosSobre,
  UsuarioFila
} from "../../services/usuariosService";
import { authHeaders, mensajeError } from "../../services/util";
import { useTheme } from "../../theme/theme";
import EspecialidadSelector from "../EspecialidadSelector";
import QRRecuperacion from "../recuperacion/QRRecuperacion";
import {
  Avatar,
  Aviso,
  Boton,
  Campo,
  fechaLegible,
  Insignia,
  Pestanas,
  Selector
} from "./ui";
import { vCorreo, vCosto, vNombre, vTelefono } from "./validaciones";

export type PestanaPanel = "detalle" | "editar" | "seguridad";

interface Props {
  usuario: UsuarioFila | null;
  pestanaInicial: PestanaPanel;
  onCerrar: () => void;
  onCambio: () => void;
}

const ROL_DOCTOR = 2;
const ROL_PACIENTE = 3;

export default function PanelUsuario({
  usuario,
  pestanaInicial,
  onCerrar,
  onCambio,
}: Props) {
  const { width } = useWindowDimensions();
  const c = useTheme(); // tema adaptativo (claro/oscuro)
  const [pestana, setPestana] = useState<PestanaPanel>(pestanaInicial);

  useEffect(() => {
    if (usuario) setPestana(pestanaInicial);
  }, [usuario?.id_PK, pestanaInicial]);

  const drawer = width >= 820;

  return (
    <Modal
      visible={!!usuario}
      transparent
      animationType="fade"
      onRequestClose={onCerrar}
    >
      <View
        style={[
          s.fondo,
          {
            backgroundColor:
              c.mode === "dark"
                ? "rgba(0,0,0,0.65)"
                : "rgba(23,63,58,0.45)",
          },
          drawer && { alignItems: "flex-end" },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCerrar}
          accessibilityLabel="Cerrar panel"
        />

        {usuario && (
          <View
            style={[
              s.hoja,
              { backgroundColor: c.card },
              drawer ? s.hojaDrawer : s.hojaCompleta,
            ]}
          >
            {/* Cabecera */}
            <View style={[s.cabecera, { borderBottomColor: c.glassBorder }]}>
              <Avatar nombre={usuario.nombre} tam={44} />

              <View style={{ flex: 1 }}>
                <Text style={[s.nombre, { color: c.text }]} numberOfLines={1}>
                  {usuario.nombre}
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
                style={[s.cerrar, { backgroundColor: c.tileBg }]}
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
              contentContainerStyle={{ padding: 20, gap: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              {pestana === "detalle" && <Detalle u={usuario} c={c} />}
              {pestana === "editar" && (
                <Editar u={usuario} c={c} onCambio={onCambio} onCerrar={onCerrar} />
              )}
              {pestana === "seguridad" && <Seguridad u={usuario} c={c} onCambio={onCambio} />}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

/* ───────────────────────── DETALLE ───────────────────────── */

/**
 * Tarjeta de dato mejorada: fondo tile, borde sutil, etiqueta arriba y valor grande.
 */
function Dato({
  etiqueta,
  valor,
  c,
  icono,
}: {
  etiqueta: string;
  valor: React.ReactNode;
  c: ReturnType<typeof useTheme>;
  icono?: any;
}) {
  return (
    <View
      style={[
        s.datoCard,
        { backgroundColor: c.tileBg, borderColor: c.glassBorder },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
        {icono && (
          <FontAwesome
            name={icono}
            size={11}
            color={c.muted}
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={[s.datoEtiqueta, { color: c.muted }]}>{etiqueta}</Text>
      </View>
      {typeof valor === "string" ? (
        <Text style={[s.datoValor, { color: c.text }]}>{valor}</Text>
      ) : (
        valor
      )}
    </View>
  );
}

function Detalle({ u, c }: { u: UsuarioFila; c: ReturnType<typeof useTheme> }) {
  const activo = (u.estado ?? "").toLowerCase() === "activo";

  return (
    <View style={{ gap: 4 }}>
      <View style={s.insignias}>
        <Insignia texto={u.rol ?? "Sin rol"} tono="primario" />
        <Insignia texto={activo ? "Activo" : "Inactivo"} tono={activo ? "ok" : "peligro"} />
      </View>

      <Dato c={c} icono="phone" etiqueta="Teléfono" valor={u.telefono || "—"} />
      <Dato c={c} icono="calendar" etiqueta="Fecha de alta" valor={fechaLegible(u.creado_en)} />
      <Dato c={c} icono="clock-o" etiqueta="Último acceso" valor={fechaLegible(u.ultimo_acceso, true)} />

      {u.rol_id_FK === ROL_DOCTOR && (
        <>
          <Text style={[s.subtitulo, { color: c.primary }]}>Perfil médico</Text>
          <Dato c={c} icono="id-card" etiqueta="Licencia" valor={u.numero_licencia || "—"} />
          <Dato
            c={c}
            icono="usd"
            etiqueta="Costo de consulta"
            valor={u.costo_consulta != null ? `$${u.costo_consulta.toFixed(2)} MXN` : "—"}
          />
          <Dato
            c={c}
            icono="stethoscope"
            etiqueta="Especialidades"
            valor={
              u.especialidades.length ? (
                <View style={s.insignias}>
                  {u.especialidades.map((e) => (
                    <Insignia key={e.id_PK} texto={e.nombre} tono="primario" />
                  ))}
                </View>
              ) : (
                <Text style={[s.datoValor, { color: c.text }]}>Sin especialidades asignadas</Text>
              )
            }
          />
        </>
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
      nombre: u.nombre,
      correo: u.correo_electronico,
      telefono: u.telefono ?? "",
      rolId: u.rol_id_FK,
      licencia: u.numero_licencia ?? "",
      costo: u.costo_consulta != null ? String(u.costo_consulta) : "",
      esp: u.especialidades.map((e) => e.id_PK).sort((a, b) => a - b),
    }),
    [u]
  );

  const [nombre, setNombre] = useState(original.nombre);
  const [correo, setCorreo] = useState(original.correo);
  const [telefono, setTelefono] = useState(original.telefono);
  const [rolId, setRolId] = useState<number | null>(original.rolId);
  const [licencia, setLicencia] = useState(original.licencia);
  const [costo, setCosto] = useState(original.costo);
  const [esp, setEsp] = useState<number[]>(original.esp);

  const [roles, setRoles] = useState<{ id_PK: number; nombre: string }[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [intento, setIntento] = useState(false);
  const [mensaje, setMensaje] = useState<{
    tipo: "ok" | "error" | "aviso";
    texto: string;
  } | null>(null);

  useEffect(() => {
    setNombre(original.nombre);
    setCorreo(original.correo);
    setTelefono(original.telefono);
    setRolId(original.rolId);
    setLicencia(original.licencia);
    setCosto(original.costo);
    setEsp(original.esp);
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
      !(rolActor === 5 && (r.id_PK === 1 || r.id_PK === 5) && r.id_PK !== original.rolId)
  );

  const errores = {
    nombre: vNombre(nombre),
    correo: vCorreo(correo),
    telefono: vTelefono(telefono),
    licencia: esDoctor && !licencia.trim() ? "Ingresa el número de licencia." : "",
    costo: esDoctor ? vCosto(costo) : "",
    esp: esDoctor && esp.length === 0 ? "Selecciona al menos una especialidad." : "",
  };

  const hayErrores = Object.values(errores).some(Boolean);
  const espOrdenadas = [...esp].sort((a, b) => a - b);

  const cambiosCuenta: CambiosUsuario = {};
  if (nombre.trim() !== original.nombre) cambiosCuenta.nombre = nombre.trim();
  if (correo.trim().toLowerCase() !== original.correo.toLowerCase())
    cambiosCuenta.correo_electronico = correo.trim().toLowerCase();
  if (telefono.trim() !== original.telefono) cambiosCuenta.telefono = telefono.trim() || null;
  if (rolId !== null && rolId !== original.rolId) cambiosCuenta.rol_id_FK = rolId;

  const cambiosMedico: CambiosDoctor = {};
  if (esDoctor) {
    if (licencia.trim() !== original.licencia) cambiosMedico.numero_licencia = licencia.trim();
    if (costo.trim() !== original.costo) cambiosMedico.costo_consulta = Number(costo);
    if (JSON.stringify(espOrdenadas) !== JSON.stringify(original.esp))
      cambiosMedico.especialidad_ids = espOrdenadas;
  }

  const hayCambiosCuenta = Object.keys(cambiosCuenta).length > 0;
  const hayCambiosMedico = Object.keys(cambiosMedico).length > 0;
  const sucio = hayCambiosCuenta || hayCambiosMedico;

  const descartar = () => {
    setNombre(original.nombre);
    setCorreo(original.correo);
    setTelefono(original.telefono);
    setRolId(original.rolId);
    setLicencia(original.licencia);
    setCosto(original.costo);
    setEsp(original.esp);
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
      />
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <Text style={[s.subtitulo, { color: c.primary }]}>Datos de la cuenta</Text>

      <Campo
        etiqueta="Nombre completo"
        valor={nombre}
        onChange={setNombre}
        requerido
        error={errores.nombre}
        mostrarError={intento}
        autoCapitalize="words"
        icono="user"
      />
      <Campo
        etiqueta="Correo electrónico"
        valor={correo}
        onChange={setCorreo}
        requerido
        error={errores.correo}
        mostrarError={intento}
        teclado="email-address"
        icono="envelope-o"
      />
      <Campo
        etiqueta="Teléfono"
        valor={telefono}
        onChange={setTelefono}
        error={errores.telefono}
        mostrarError={intento}
        teclado="phone-pad"
        icono="phone"
        ayuda="Opcional"
      />

      {tienePerfilClinico ? (
        <View style={{ gap: 6 }}>
          <Text style={[s.datoEtiqueta, { color: c.muted }]}>Rol</Text>
          <Insignia texto={u.rol ?? "—"} tono="primario" />
          <Text style={[s.ayuda, { color: c.muted }]}>
            El rol no se puede cambiar porque la cuenta tiene un perfil clínico asociado.
          </Text>
        </View>
      ) : (
        <Selector
          etiqueta="Rol"
          valor={rolId !== null ? String(rolId) : ""}
          opciones={rolesCambiables.map((r) => ({ valor: String(r.id_PK), etiqueta: r.nombre }))}
          onChange={(v) => setRolId(Number(v))}
          icono="id-badge"
        />
      )}

      {esDoctor && (
        <>
          <Text style={[s.subtitulo, { color: c.primary, marginTop: 6 }]}>Perfil médico</Text>
          <EspecialidadSelector valor={esp} onChange={setEsp} error={errores.esp} mostrarError={intento} />
          <Campo
            etiqueta="Número de licencia"
            valor={licencia}
            onChange={setLicencia}
            requerido
            error={errores.licencia}
            mostrarError={intento}
            autoCapitalize="characters"
            icono="certificate"
          />
          <Campo
            etiqueta="Costo de consulta (MXN)"
            valor={costo}
            onChange={setCosto}
            requerido
            error={errores.costo}
            mostrarError={intento}
            teclado="decimal-pad"
            icono="usd"
          />
        </>
      )}

      {mensaje && <Aviso tipo={mensaje.tipo} texto={mensaje.texto} onCerrar={() => setMensaje(null)} />}

      <View style={[s.barraAcciones, { borderTopColor: c.glassBorder }]}>
        <Text
          style={[
            s.ayuda,
            { color: sucio ? c.warning : c.muted, fontWeight: sucio ? "700" : "500" },
          ]}
        >
          {sucio ? "● Cambios sin guardar" : "Sin cambios"}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Boton
            texto="Descartar"
            variante="fantasma"
            chico
            deshabilitado={!sucio || guardando}
            onPress={descartar}
          />
          <Boton
            texto="Guardar cambios"
            icono="save"
            chico
            deshabilitado={!sucio || guardando}
            cargando={guardando}
            onPress={guardar}
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
  const [correoMsg, setCorreoMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

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
      setEspera(typeof respuesta.espera_segundos === "number" ? respuesta.espera_segundos : 60);
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

  return (
    <View style={{ gap: 18 }}>
      <Text style={[s.subtitulo, { color: c.primary }]}>Recuperación de contraseña</Text>

      {!permisos.puedeEditar ? (
        <Aviso
          tipo="aviso"
          texto="Como coordinador no puedes restablecer la contraseña de administradores ni de otros coordinadores."
        />
      ) : !activo ? (
        <Aviso tipo="aviso" texto="Activa la cuenta para poder restablecer su contraseña." />
      ) : (
        <>
          {/* QR */}
          <View style={[s.bloque, { backgroundColor: c.tileBg, borderColor: c.glassBorder }]}>
            <View style={s.bloqueCab}>
              <FontAwesome name="qrcode" size={16} color={c.primary} />
              <Text style={[s.bloqueTitulo, { color: c.text }]}>Código QR</Text>
            </View>
            <Text style={[s.ayuda, { color: c.muted }]}>
              Para entregarlo en persona. El usuario lo escanea desde la pantalla de recuperación.
            </Text>
            <QRRecuperacion usuarioId={u.id_PK} token={token} c={c} />
          </View>

          {/* Enlace por correo */}
          <View style={[s.bloque, { backgroundColor: c.tileBg, borderColor: c.glassBorder }]}>
            <View style={s.bloqueCab}>
              <FontAwesome name="envelope-o" size={15} color={c.primary} />
              <Text style={[s.bloqueTitulo, { color: c.text }]}>Enlace por correo</Text>
            </View>
            <Text style={[s.ayuda, { color: c.muted }]}>
              Se enviará un enlace para restablecer la contraseña a {u.correo_electronico}. Al abrirlo, la persona
              podrá establecer una contraseña nueva.
            </Text>
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
            />
            {correoMsg && <Aviso tipo={correoMsg.tipo} texto={correoMsg.texto} />}
          </View>
        </>
      )}
    </View>
  );
}

/* ───────────────────────── ESTILOS ───────────────────────── */

const s = StyleSheet.create({
  fondo: { flex: 1, justifyContent: "flex-end" },
  hoja: { overflow: "hidden" },
  hojaDrawer: {
    width: 520,
    height: "100%",
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  hojaCompleta: {
    width: "100%",
    height: "94%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 20,
    paddingBottom: 14,
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
  insignias: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  subtitulo: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 8,
  },

  // Tarjetas de dato (Detalle)
  datoCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  datoEtiqueta: { fontSize: 11.5, fontWeight: "700" },
  datoValor: { fontSize: 15, fontWeight: "700" },

  ayuda: { fontSize: 12.5, lineHeight: 18 },
  barraAcciones: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bloque: {
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  bloqueCab: { flexDirection: "row", alignItems: "center", gap: 10 },
  bloqueTitulo: { flex: 1, fontSize: 14.5, fontWeight: "800" },
});