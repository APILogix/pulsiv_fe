import { EnvironmentType } from "./api/types";

export interface EnvironmentTemplate {
  type: EnvironmentType;
  label: string;
  name: string;
  slug: string;
  color: string;
  description: string;
}

export const DEFAULT_ENVIRONMENTS: Record<EnvironmentType, EnvironmentTemplate> = {
  [EnvironmentType.PRODUCTION]: {
    type: EnvironmentType.PRODUCTION,
    label: "Production",
    name: "Production",
    slug: "production",
    color: "#16A34A",
    description: "Production telemetry",
  },
  [EnvironmentType.PRE_PRODUCTION]: {
    type: EnvironmentType.PRE_PRODUCTION,
    label: "Pre-production",
    name: "Pre-production",
    slug: "pre-production",
    color: "#EA580C",
    description: "Final validation before production deployment",
  },
  [EnvironmentType.STAGING]: {
    type: EnvironmentType.STAGING,
    label: "Staging",
    name: "Staging",
    slug: "staging",
    color: "#D97706",
    description: "Pre-production telemetry",
  },
  [EnvironmentType.PRE_STAGING]: {
    type: EnvironmentType.PRE_STAGING,
    label: "Pre-staging",
    name: "Pre-staging",
    slug: "pre-staging",
    color: "#CA8A04",
    description: "Integration validation before staging",
  },
  [EnvironmentType.DEVELOPMENT]: {
    type: EnvironmentType.DEVELOPMENT,
    label: "Development",
    name: "Development",
    slug: "development",
    color: "#2563EB",
    description: "Development telemetry",
  },
  [EnvironmentType.TESTING]: {
    type: EnvironmentType.TESTING,
    label: "Testing",
    name: "Testing",
    slug: "testing",
    color: "#7C3AED",
    description: "Quality assurance and automated testing telemetry",
  },
  [EnvironmentType.PREVIEW]: {
    type: EnvironmentType.PREVIEW,
    label: "Preview",
    name: "Preview",
    slug: "preview",
    color: "#DB2777",
    description: "Short-lived preview deployment telemetry",
  },
  [EnvironmentType.PRE_DEPLOYMENT]: {
    type: EnvironmentType.PRE_DEPLOYMENT,
    label: "Pre-deployment",
    name: "Pre-deployment",
    slug: "pre-deployment",
    color: "#0891B2",
    description: "Deployment candidate verification telemetry",
  },
  [EnvironmentType.CUSTOM]: {
    type: EnvironmentType.CUSTOM,
    label: "Custom",
    name: "",
    slug: "",
    color: "#64748B",
    description: "",
  },
};

export const ENVIRONMENT_TYPE_OPTIONS = Object.values(EnvironmentType).map((type) => ({
  value: type,
  label: DEFAULT_ENVIRONMENTS[type].label,
}));

export function environmentTypeLabel(type: EnvironmentType): string {
  return DEFAULT_ENVIRONMENTS[type].label;
}

export function environmentTemplate(type: EnvironmentType): EnvironmentTemplate {
  return DEFAULT_ENVIRONMENTS[type];
}