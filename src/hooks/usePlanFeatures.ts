import { useAuth, PlanActual } from "../context/AuthContext";

export interface PlanFeaturesResult {
  planActual: PlanActual;
  clinica: any;
  nombrePlan: string;
  isGratuito: boolean;
  canUseAI: () => boolean;
  canUseCalendar: () => boolean;
  canUseContracts: () => boolean;
  canUseInventory: () => boolean;
  canUseReports: () => boolean;
  canUseAudit: () => boolean;
  canUseSalas: () => boolean;
  canManagePersonal: () => boolean;
  getFeatureRequirement: (
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
  const isGratuito = planNombre === "gratuito";

  const canUseAI = (): boolean => {
    if (isGratuito) return false;
    if (planActual?.incluye_ia) return true;
    return planNombre === "profesional" || planNombre === "empresarial";
  };

  const canUseCalendar = (): boolean => {
    if (isGratuito) return false;
    if (planActual?.incluye_calendar) return true;
    return (
      planNombre === "clinica" ||
      planNombre === "profesional" ||
      planNombre === "empresarial"
    );
  };

  const canUseContracts = (): boolean => {
    if (isGratuito) return false;
    if (planActual?.incluye_contratos) return true;
    return planNombre === "empresarial";
  };

  const canUseInventory = (): boolean => {
    if (isGratuito) return false;
    return planNombre === "profesional" || planNombre === "empresarial";
  };

  const canUseReports = (): boolean => {
    if (isGratuito) return false;
    return planNombre === "profesional" || planNombre === "empresarial";
  };

  const canUseAudit = (): boolean => {
    if (isGratuito) return false;
    return planNombre === "empresarial";
  };

  const canUseSalas = (): boolean => {
    return !isGratuito;
  };

  const canManagePersonal = (): boolean => {
    return !isGratuito;
  };

  const getFeatureRequirement = (
    key: string
  ): { allowed: boolean; planRequerido: string } => {
    switch (key) {
      case "salas":
        return { allowed: canUseSalas(), planRequerido: "Básico" };
      case "personal":
      case "usuarios":
        return { allowed: canManagePersonal(), planRequerido: "Básico" };
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
      case "calendar":
        return { allowed: canUseCalendar(), planRequerido: "Clínica" };
      default:
        return { allowed: true, planRequerido: "" };
    }
  };

  return {
    planActual,
    clinica,
    nombrePlan: planActual?.nombre_plan || (isGratuito ? "Gratuito" : "Básico"),
    isGratuito,
    canUseAI,
    canUseCalendar,
    canUseContracts,
    canUseInventory,
    canUseReports,
    canUseAudit,
    canUseSalas,
    canManagePersonal,
    getFeatureRequirement,
  };
}
