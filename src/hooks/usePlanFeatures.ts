import { useAuth, PlanActual } from "../context/AuthContext";

export function usePlanFeatures() {
  const { planActual, clinica } = useAuth();

  const normalizarNombre = (nombre: string): string => {
    return nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  const planNombre = normalizarNombre(planActual?.nombre_plan || "basico");

  const canUseAI = (): boolean => {
    if (planActual?.incluye_ia) {
      return true;
    }
    return planNombre === "profesional" || planNombre === "empresarial";
  };

  const canUseCalendar = (): boolean => {
    if (planActual?.incluye_calendar) {
      return true;
    }
    return (
      planNombre === "clinica" ||
      planNombre === "profesional" ||
      planNombre === "empresarial"
    );
  };

  return {
    planActual,
    clinica,
    nombrePlan: planActual?.nombre_plan || "Básico",
    canUseAI,
    canUseCalendar,
  };
}
