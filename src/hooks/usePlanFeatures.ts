import { useAuth, PlanActual } from "../context/AuthContext";

export interface PlanFeaturesResult {
  planActual: PlanActual;
  clinica: any;
  nombrePlan: string;
  canUseAI: () => boolean;
  canUseCalendar: () => boolean;
  canUseContracts?: () => boolean;
  canUseInventory?: () => boolean;
  canUseReports?: () => boolean;
  canUseAudit?: () => boolean;
  getFeatureRequirement?: (
    key: string
  ) => { allowed: boolean; planRequerido: string };
}

export function usePlanFeatures(): PlanFeaturesResult {
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

  const canUseContracts = (): boolean => {
    if (planActual?.incluye_contratos) {
      return true;
    }
    return planNombre === "empresarial";
  };

  const canUseInventory = (): boolean => {
    return planNombre === "profesional" || planNombre === "empresarial";
  };

  const canUseReports = (): boolean => {
    return planNombre === "profesional" || planNombre === "empresarial";
  };

  const canUseAudit = (): boolean => {
    return planNombre === "empresarial";
  };

  const getFeatureRequirement = (
    key: string
  ): { allowed: boolean; planRequerido: string } => {
    switch (key) {
      case "inventario":
        return { allowed: canUseInventory(), planRequerido: "Profesional" };
      case "reportes":
        return { allowed: canUseReports(), planRequerido: "Profesional" };
      case "auditoria":
        return { allowed: canUseAudit(), planRequerido: "Empresarial" };
      case "contratos":
        return { allowed: canUseContracts(), planRequerido: "Empresarial" };
      case "ia":
        return { allowed: canUseAI(), planRequerido: "Profesional" };
      default:
        return { allowed: true, planRequerido: "" };
    }
  };

  return {
    planActual,
    clinica,
    nombrePlan: planActual?.nombre_plan || "Básico",
    canUseAI,
    canUseCalendar,
    canUseContracts,
    canUseInventory,
    canUseReports,
    canUseAudit,
    getFeatureRequirement,
  };
}
