import { Redirect } from "expo-router";

/**
 * «Salas por doctor» ya no es una pantalla aparte: ahora vive dentro de
 * «Salas y equipamiento» → pestaña «Calendario de uso». Esta ruta solo
 * redirige para no romper enlaces o favoritos antiguos.
 */
export default function SalasPorDoctorRedirect() {
  return <Redirect href={{ pathname: "/admin/salas", params: { vista: "calendario" } }} />;
}
