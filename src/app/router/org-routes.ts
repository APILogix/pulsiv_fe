/**
 * Centralized, type-safe organization-scoped URL builders.
 *
 * ALL authenticated frontend URLs are scoped under `/:orgSlug/...`.
 * This helper provides a single canonical source of truth for constructing
 * and parsing organization-scoped application routes.
 */

export function orgPath(orgSlug: string | null | undefined, subPath?: string): string {
  const cleanSlug = (orgSlug ?? '').trim();
  const slugSegment = cleanSlug ? `/${cleanSlug}` : '';
  if (!subPath) return `${slugSegment}/dashboard`;
  const cleanSub = subPath.startsWith('/') ? subPath : `/${subPath}`;
  return `${slugSegment}${cleanSub}`;
}

export const orgRoutes = {
  /** Root dashboard: `/:orgSlug/dashboard` */
  dashboard: (orgSlug: string | null | undefined) => orgPath(orgSlug, '/dashboard'),

  /** Custom dashboards: `/:orgSlug/dashboards/...` */
  dashboards: (orgSlug: string | null | undefined, sub?: string) =>
    orgPath(orgSlug, sub ? `/dashboards/${sub.replace(/^\//, '')}` : '/dashboards'),

  /** Observability: `/:orgSlug/observability/...` */
  observability: (orgSlug: string | null | undefined, sub?: string) =>
    orgPath(orgSlug, sub ? `/observability/${sub.replace(/^\//, '')}` : '/observability'),

  /** Services: `/:orgSlug/services/...` */
  services: (orgSlug: string | null | undefined, sub?: string) =>
    orgPath(orgSlug, sub ? `/services/${sub.replace(/^\//, '')}` : '/services'),

  /** Projects list: `/:orgSlug/projects` */
  projects: (orgSlug: string | null | undefined) => orgPath(orgSlug, '/projects'),

  /** New project wizard: `/:orgSlug/projects/new` */
  newProject: (orgSlug: string | null | undefined) => orgPath(orgSlug, '/projects/new'),

  /** Project shell: `/:orgSlug/p/:publicId/...` */
  project: (orgSlug: string | null | undefined, publicId: string, segment?: string) => {
    const base = orgPath(orgSlug, `/p/${publicId}`);
    return segment ? `${base}/${segment.replace(/^\//, '')}` : base;
  },

  /** Project alerts: `/:orgSlug/p/:publicId/alerts` */
  projectAlerts: (orgSlug: string | null | undefined, publicId: string) =>
    orgRoutes.project(orgSlug, publicId, 'alerts'),

  /** Project alert routing: `/:orgSlug/p/:publicId/routes` */
  projectAlertRoutes: (orgSlug: string | null | undefined, publicId: string) =>
    orgRoutes.project(orgSlug, publicId, 'routes'),

  /** Project alert rules: `/:orgSlug/p/:publicId/alert-rules` */
  projectAlertRules: (orgSlug: string | null | undefined, publicId: string) =>
    orgRoutes.project(orgSlug, publicId, 'alert-rules'),

  /** Project connectors: `/:orgSlug/p/:publicId/connectors` */
  projectConnectors: (orgSlug: string | null | undefined, publicId: string) =>
    orgRoutes.project(orgSlug, publicId, 'connectors'),

  /** Global organization alerts: `/:orgSlug/alerts/...` */
  alerts: (orgSlug: string | null | undefined, sub?: string) =>
    orgPath(orgSlug, sub ? `/alerts/${sub.replace(/^\//, '')}` : '/alerts'),

  /** Automation: `/:orgSlug/automation/...` */
  automation: (orgSlug: string | null | undefined, sub?: string) =>
    orgPath(orgSlug, sub ? `/automation/${sub.replace(/^\//, '')}` : '/automation'),

  /** Ingestion: `/:orgSlug/ingestion/...` */
  ingestion: (orgSlug: string | null | undefined, sub?: string) =>
    orgPath(orgSlug, sub ? `/ingestion/${sub.replace(/^\//, '')}` : '/ingestion'),

  /** AI features: `/:orgSlug/ai/...` */
  ai: (orgSlug: string | null | undefined, sub?: string) =>
    orgPath(orgSlug, sub ? `/ai/${sub.replace(/^\//, '')}` : '/ai'),

  /** Admin / Team / Org settings: `/:orgSlug/admin/...` */
  admin: (orgSlug: string | null | undefined, sub?: string) =>
    orgPath(orgSlug, sub ? `/admin/${sub.replace(/^\//, '')}` : '/admin'),

  /** Billing: `/:orgSlug/billing/...` */
  billing: (orgSlug: string | null | undefined, sub?: string) =>
    orgPath(orgSlug, sub ? `/billing/${sub.replace(/^\//, '')}` : '/billing'),

  /** Connectors / Integrations: `/:orgSlug/connectors/...` */
  connectors: (orgSlug: string | null | undefined, sub?: string) =>
    orgPath(orgSlug, sub ? `/connectors/${sub.replace(/^\//, '')}` : '/connectors'),

  /** Settings: `/:orgSlug/settings/...` */
  settings: (orgSlug: string | null | undefined, sub?: string) =>
    orgPath(orgSlug, sub ? `/settings/${sub.replace(/^\//, '')}` : '/settings'),

  /** Account: `/:orgSlug/account/...` */
  account: (orgSlug: string | null | undefined, sub?: string) =>
    orgPath(orgSlug, sub ? `/account/${sub.replace(/^\//, '')}` : '/account'),
};
