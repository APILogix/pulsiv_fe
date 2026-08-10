/**
 * Route prefetching — Phase 13 ("prefetch next route").
 *
 * Every protected route element is `React.lazy`, which means the first click on
 * a sidebar item pays a network round-trip for its chunk. Hovering is a strong
 * intent signal that arrives 200–800ms before the click, so we spend it warming
 * the chunk. By the time the click lands the module is usually already in
 * memory and the route-shaped skeleton never has to appear at all.
 *
 * Rules:
 *  - specifiers must match `protected-routes.tsx` character-for-character, or
 *    Vite emits a second chunk and the prefetch warms the wrong file;
 *  - each key is fetched at most once per session;
 *  - work is deferred to idle time so a hover can never contend with the
 *    interaction that follows it;
 *  - prefetch is skipped on constrained connections (save-data / 2g).
 */

type Loader = () => Promise<unknown>;

/** Module entry points, keyed by the nav path that leads to them. */
const LOADERS: Record<string, Loader> = {
  "/dashboard": () => import("@/modules/dashboard/index"),
  "/dashboards": () => import("@/pages/dashboards/DashboardsOverview"),
  "/dashboards/executive": () => import("@/pages/dashboards/ExecutiveCommandCenter"),
  "/dashboards/performance": () => import("@/pages/dashboards/PerformanceDeepDive"),
  "/dashboards/errors": () => import("@/pages/dashboards/ErrorTriage"),
  "/dashboards/geo": () => import("@/pages/dashboards/GeoAnalytics"),
  "/dashboards/realtime": () => import("@/pages/dashboards/RealtimeTraffic"),
  "/dashboards/reports": () => import("@/pages/dashboards/ScheduledReportsPage"),

  "/observability": () => import("@/pages/observe/ExecutiveDashboard"),
  "/observability/requests": () => import("@/pages/observe/RequestsPage"),
  "/observability/errors": () => import("@/pages/observe/ErrorGroupsPage"),
  "/observability/error-groups": () => import("@/modules/error-groups/pages/ErrorGroupsListPage"),
  "/observability/service-health": () => import("@/pages/observe/ServiceHealthPage"),
  "/observability/traces": () => import("@/pages/observe/TracesPage"),
  "/observability/logs": () => import("@/pages/observe/LogsPage"),
  "/observability/metrics": () => import("@/pages/observe/MetricsPage"),

  "/services": () => import("@/pages/services/ServiceCatalogPage"),

  "/alerts": () => import("@/pages/act/AlertEventsPage"),
  "/alerts/rules": () => import("@/pages/act/AlertRulesPage"),
  "/alerts/escalations": () => import("@/pages/act/EscalationsPage"),

  "/automation": () => import("@/pages/automation/AutomationOverviewPage"),
  "/automation/workflows": () => import("@/pages/automation/AutomationWorkflowsPage"),
  "/automation/runs": () => import("@/pages/automation/AutomationRunsPage"),

  "/ingestion": () => import("@/pages/connections/ConnectionsOverview"),
  "/ingestion/keys": () => import("@/pages/connections/KeysTokensPage"),

  "/ai": () => import("@/pages/ai/AiOverviewPage"),
  "/ai/assistant": () => import("@/pages/ai/AiAssistantPage"),

  "/admin": () => import("@/pages/team/OrgProfilePage"),
  "/admin/team": () => import("@/pages/team/TeamPage"),
  "/admin/audit-logs": () => import("@/pages/team/AuditLogsPage"),

  "/billing": () => import("@/pages/billing/PlanPage"),
  "/billing/invoices": () => import("@/pages/billing/InvoicesPage"),

  "/connectors/integrations": () => import("@/pages/settings/IntegrationsPage"),
  "/connectors/webhooks": () => import("@/pages/settings/WebhooksPage"),

  "/projects": () => import("@/pages/workspaces/ProjectsPage"),
};

const warmed = new Set<string>();

function shouldPrefetch(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  const slow = connection.effectiveType ?? "";
  return !slow.includes("2g");
}

function schedule(task: () => void) {
  const idle = (
    window as Window & { requestIdleCallback?: (cb: IdleRequestCallback) => number }
  ).requestIdleCallback;
  if (idle) idle(() => task());
  else window.setTimeout(task, 120);
}

/**
 * Warm the chunk for a nav path. Falls back to the closest registered ancestor,
 * so `/observability/logs/abc` still warms the logs module.
 */
export function prefetchRoute(path: string) {
  if (!shouldPrefetch()) return;

  const key = resolveKey(path);
  if (!key || warmed.has(key)) return;
  warmed.add(key);

  schedule(() => {
    // A failed prefetch must never surface: the real navigation will retry and
    // can show the error boundary properly.
    void LOADERS[key]().catch(() => warmed.delete(key));
  });
}

function resolveKey(path: string): string | undefined {
  if (LOADERS[path]) return path;
  const segments = path.split("/").filter(Boolean);
  // Project routes live under /:orgSlug/projects — normalise to the shared key.
  if (segments[1] === "projects") return "/projects";
  while (segments.length > 0) {
    segments.pop();
    const candidate = `/${segments.join("/")}`;
    if (LOADERS[candidate]) return candidate;
  }
  return undefined;
}
