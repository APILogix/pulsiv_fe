/**
 * Canonical Application Bootstrap Data Types
 */

export interface BootstrapOrganization {
  id: string;
  name: string;
  slug: string;
  role: string;
  isCurrent: boolean;
}

export interface BootstrapProject {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export interface BootstrapPlan {
  id: string;
  key: string;
  name: string;
}

export interface BootstrapBilling {
  plan: BootstrapPlan;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface BootstrapQuota {
  limit: number;
  used: number;
  remaining: number;
}

export interface BootstrapUsageMetric {
  limit: number;
  used: number;
  remaining: number;
  percentage: number;
}

export interface BootstrapUsage {
  monthlyEvents: BootstrapUsageMetric;
  aiCredits: BootstrapUsageMetric;
}

export interface BootstrapOwnedOrganization {
  id: string;
  name: string;
  slug: string;
  status: string;
}

/** Mirrors the backend rule: one owned, non-deleted organization per user. */
export interface BootstrapOrganizationCreation {
  allowed: boolean;
  ownedOrganization: BootstrapOwnedOrganization | null;
}

export interface BootstrapData {
  currentOrganizationId: string | null;
  /** Absent from older backends and from the synthesized fallback. */
  organizationCreation?: BootstrapOrganizationCreation;
  organizations: BootstrapOrganization[];
  projects: BootstrapProject[];
  billing: BootstrapBilling | null;
  features: Record<string, boolean>;
  integrations: Record<string, boolean>;
  quotas: Record<string, BootstrapQuota>;
  usage: BootstrapUsage;
}

export type BootstrapStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'refreshing'
  | 'offline'
  | 'error';
