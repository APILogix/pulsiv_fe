import type { ComponentType } from "react";
import { useLocation } from "react-router";

import {
  AiConversationSkeleton,
  AiOverviewSkeleton,
  AlertsSkeleton,
  AuditSkeleton,
  AuthCardSkeleton,
  BillingSkeleton,
  DashboardGallerySkeleton,
  DashboardSkeleton,
  DetailSkeleton,
  ErrorGroupsSkeleton,
  ExplorerTableSkeleton,
  GenericPageSkeleton,
  GeoSkeleton,
  IntegrationsSkeleton,
  KeysSkeleton,
  ListSkeleton,
  LogsSkeleton,
  MembersSkeleton,
  MetricsSkeleton,
  ProjectOverviewSkeleton,
  ProjectsSkeleton,
  RemoteConfigSkeleton,
  RulesSkeleton,
  ServiceHealthSkeleton,
  SettingsSkeleton,
  TraceWaterfallSkeleton,
  WizardSkeleton,
  WorkflowsSkeleton,
} from "./pages";

type Rule = readonly [RegExp, ComponentType];

/** Detail-page id segment: uuid, prefixed public id, hash, or numeric. */
const ID = "[^/]+";

const RULES: readonly Rule[] = [
  /* ── project shell: (matches /p/:publicId and /:orgSlug/p/:publicId) ── */
  [/^\/p\/[^/]+\/overview$/, ProjectOverviewSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/overview$/, ProjectOverviewSkeleton],
  [/^\/p\/[^/]+\/analytics$/, MetricsSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/analytics$/, MetricsSkeleton],
  [/^\/p\/[^/]+\/usage$/, MetricsSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/usage$/, MetricsSkeleton],
  [/^\/p\/[^/]+\/activity$/, AuditSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/activity$/, AuditSkeleton],
  [/^\/p\/[^/]+\/environments$/, KeysSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/environments$/, KeysSkeleton],
  [/^\/p\/[^/]+\/api-keys$/, KeysSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/api-keys$/, KeysSkeleton],
  [/^\/p\/[^/]+\/remote-config$/, RemoteConfigSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/remote-config$/, RemoteConfigSkeleton],
  [/^\/p\/[^/]+\/alert-rules$/, RulesSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/alert-rules$/, RulesSkeleton],
  [/^\/p\/[^/]+\/alert-channels$/, IntegrationsSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/alert-channels$/, IntegrationsSkeleton],
  [new RegExp(`^/p/[^/]+/routes/${ID}$`), WizardSkeleton],
  [new RegExp(`^/[^/]+/p/[^/]+/routes/${ID}$`), WizardSkeleton],
  [/^\/p\/[^/]+\/routes$/, RulesSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/routes$/, RulesSkeleton],
  [/^\/p\/[^/]+\/connectors$/, IntegrationsSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/connectors$/, IntegrationsSkeleton],
  [/^\/p\/[^/]+\/deliveries$/, AuditSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/deliveries$/, AuditSkeleton],
  [/^\/p\/[^/]+\/dlq$/, ListSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/dlq$/, ListSkeleton],
  [/^\/p\/[^/]+\/preferences$/, SettingsSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/preferences$/, SettingsSkeleton],
  [/^\/p\/[^/]+\/members$/, MembersSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/members$/, MembersSkeleton],
  [/^\/p\/[^/]+\/settings(\/.*)?$/, SettingsSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/settings(\/.*)?$/, SettingsSkeleton],
  [/^\/p\/[^/]+$/, ProjectOverviewSkeleton],
  [/^\/[^/]+\/p\/[^/]+$/, ProjectOverviewSkeleton],

  /* ── workspaces & project creation ───────────────────────────────────── */
  [/^\/projects\/new$/, WizardSkeleton],
  [/^\/[^/]+\/projects\/new$/, WizardSkeleton],
  [/^\/projects$/, ProjectsSkeleton],
  [/^\/[^/]+\/projects$/, ProjectsSkeleton],

  /* ── root dashboard ──────────────────────────────────────────────────── */
  [/^\/$/, DashboardSkeleton],
  [/^\/dashboard$/, DashboardSkeleton],

  /* ── dashboards module ───────────────────────────────────────────────── */
  [/^\/dashboards\/reports\/new$/, WizardSkeleton],
  [/^\/dashboards\/reports$/, ListSkeleton],
  [/^\/dashboards\/geo$/, GeoSkeleton],
  [/^\/dashboards\/executive$/, DashboardSkeleton],
  [/^\/dashboards\/performance$/, MetricsSkeleton],
  [/^\/dashboards\/errors$/, ErrorGroupsSkeleton],
  [/^\/dashboards\/(realtime|traffic|infrastructure)$/, MetricsSkeleton],
  [/^\/dashboards\/tracing-map$/, GeoSkeleton],
  [/^\/dashboards\/security$/, AuditSkeleton],
  [/^\/dashboards\/releases$/, ServiceHealthSkeleton],
  [/^\/dashboards\/business$/, DashboardSkeleton],
  [/^\/dashboards\/(overview)?$/, DashboardGallerySkeleton],
  [/^\/dashboards\/[^/]+$/, DashboardSkeleton],

  /* ── observability ───────────────────────────────────────────────────── */
  [new RegExp(`^/observability/traces/${ID}/spans/${ID}$`), TraceWaterfallSkeleton],
  [new RegExp(`^/observability/traces/${ID}$`), TraceWaterfallSkeleton],
  [new RegExp(`^/observability/spans/${ID}$`), DetailSkeleton],
  [/^\/observability\/traces$/, ExplorerTableSkeleton],
  [new RegExp(`^/observability/logs/${ID}$`), DetailSkeleton],
  [/^\/observability\/logs$/, LogsSkeleton],
  [new RegExp(`^/observability/error-groups/${ID}$`), DetailSkeleton],
  [/^\/observability\/error-groups$/, ErrorGroupsSkeleton],
  [new RegExp(`^/observability/errors/${ID}`), DetailSkeleton],
  [/^\/observability\/errors$/, ErrorGroupsSkeleton],
  [new RegExp(`^/observability/requests/${ID}$`), DetailSkeleton],
  [/^\/observability\/requests$/, ExplorerTableSkeleton],
  [/^\/observability\/service-health$/, ServiceHealthSkeleton],
  [new RegExp(`^/observability/metrics/${ID}$`), DetailSkeleton],
  [new RegExp(`^/observability/profiling/${ID}$`), DetailSkeleton],
  [new RegExp(`^/observability/crons/${ID}$`), DetailSkeleton],
  [/^\/observability\/(latency|metrics|profiling|runtime-metrics|event-loop|gc-monitoring)$/, MetricsSkeleton],
  [/^\/observability\/(crons|replay)$/, ListSkeleton],
  [/^\/observability$/, DashboardSkeleton],

  /* ── services ────────────────────────────────────────────────────────── */
  [/^\/services\/slos$/, ServiceHealthSkeleton],
  [/^\/services\/dependencies$/, GeoSkeleton],
  [/^\/services$/, ListSkeleton],

  /* ── alerting ────────────────────────────────────────────────────────── */
  [new RegExp(`^/alerts/incidents/${ID}$`), DetailSkeleton],
  [/^\/alerts\/incidents$/, AlertsSkeleton],
  [new RegExp(`^/alerts/events/${ID}$`), DetailSkeleton],
  [/^\/alerts\/events$/, LogsSkeleton],
  [new RegExp(`^/alerts/policies/${ID}$`), DetailSkeleton],
  [new RegExp(`^/alerts/rules/${ID}$`), DetailSkeleton],
  [/^\/alerts\/rules$/, RulesSkeleton],
  [new RegExp(`^/alerts/escalations/${ID}$`), DetailSkeleton],
  [/^\/alerts\/(escalations|routing)$/, RulesSkeleton],
  [/^\/alerts\/templates$/, IntegrationsSkeleton],
  [/^\/alerts\/metrics$/, MetricsSkeleton],
  [/^\/alerts\/(silences|dead-letters)$/, ListSkeleton],
  [/^\/alerts$/, AlertsSkeleton],
  [new RegExp(`^/alerts/${ID}$`), DetailSkeleton],

  /* ── automation ──────────────────────────────────────────────────────── */
  [new RegExp(`^/automation/(workflows|runs|approvals)/${ID}$`), DetailSkeleton],
  [/^\/automation\/workflows$/, WorkflowsSkeleton],
  [/^\/automation\/(runs|approvals)$/, ListSkeleton],
  [/^\/automation\/templates$/, IntegrationsSkeleton],
  [/^\/automation\/(events|audit)$/, AuditSkeleton],
  [/^\/automation$/, WorkflowsSkeleton],

  /* ── ingestion ───────────────────────────────────────────────────────── */
  [/^\/ingestion\/health$/, ServiceHealthSkeleton],
  [/^\/ingestion\/keys$/, KeysSkeleton],
  [/^\/ingestion\/rate-limits$/, RulesSkeleton],
  [/^\/ingestion\/(endpoints|replay)$/, ListSkeleton],
  [/^\/ingestion$/, ServiceHealthSkeleton],

  /* ── AI ──────────────────────────────────────────────────────────────── */
  [/^\/ai\/assistant$/, AiConversationSkeleton],
  [/^\/ai\/(investigations|knowledge)$/, AiOverviewSkeleton],
  [/^\/ai\/reports$/, ListSkeleton],
  [/^\/ai\/usage$/, MetricsSkeleton],
  [/^\/ai\/settings$/, SettingsSkeleton],
  [/^\/ai$/, AiOverviewSkeleton],

  /* ── organization admin ──────────────────────────────────────────────── */
  [new RegExp(`^/admin/members/${ID}$`), DetailSkeleton],
  [/^\/admin\/team$/, MembersSkeleton],
  [/^\/admin\/(security-events|audit-logs)$/, AuditSkeleton],
  [/^\/admin\/(domains|roles)$/, ListSkeleton],
  [/^\/admin(\/(settings|sso|scim|sdk-config|compliance))?$/, SettingsSkeleton],
  [/^\/team$/, MembersSkeleton],

  /* ── billing ─────────────────────────────────────────────────────────── */
  [new RegExp(`^/billing/invoices/${ID}$`), DetailSkeleton],
  [/^\/billing\/invoices$/, ListSkeleton],
  [/^\/billing\/usage$/, MetricsSkeleton],
  [/^\/billing\/payment-methods$/, SettingsSkeleton],
  [/^\/billing$/, BillingSkeleton],
  [/^\/super-admin\/billing$/, BillingSkeleton],

  /* ── connectors ──────────────────────────────────────────────────────── */
  [new RegExp(`^/connectors/(webhooks|integrations)/${ID}$`), DetailSkeleton],
  [/^\/connectors\/webhooks$/, ListSkeleton],
  [/^\/connectors\/integrations(\/.*)?$/, IntegrationsSkeleton],
  [/^\/connectors\/audit$/, AuditSkeleton],

  /* ── developer + settings + account ──────────────────────────────────── */
  [/^\/developer\/.*$/, SettingsSkeleton],
  [/^\/account\/activity\/active-sessions$/, MembersSkeleton],
  [/^\/account\/activity\/login-history$/, AuditSkeleton],
  [/^\/account(\/.*)?$/, SettingsSkeleton],
  [/^\/settings(\/.*)?$/, SettingsSkeleton],
  [/^\/auth\/sessions$/, MembersSkeleton],
  [/^\/auth\/(security|step-up)$/, SettingsSkeleton],
  [/^\/auth(\/.*)?$/, AuthCardSkeleton],
  [/^\/onboarding(\/.*)?$/, WizardSkeleton],
];

/** Strip the trailing slash so `/alerts/` and `/alerts` resolve identically. */
function normalize(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

const TOP_LEVEL_UNSCOPED = new Set([
  "auth",
  "accept-invite",
  "loading",
  "onboarding",
]);

const KNOWN_MODULE_ROOTS = new Set([
  "dashboard",
  "dashboards",
  "observability",
  "services",
  "projects",
  "p",
  "alerts",
  "automation",
  "ingestion",
  "ai",
  "admin",
  "super-admin",
  "billing",
  "connectors",
  "developer",
  "settings",
  "account",
  "team",
]);

/**
 * Normalizes an application URL by stripping the `:orgSlug` prefix if present.
 * For example:
 *   `/acme/observability/traces` -> `/observability/traces`
 *   `/acme/p/prj_123/remote-config` -> `/p/prj_123/remote-config`
 *   `/acme/billing` -> `/billing`
 *   `/auth/login` -> `/auth/login`
 *   `/dashboard` -> `/dashboard`
 */
export function stripOrgSlug(pathname: string): string {
  const norm = normalize(pathname);
  const segments = norm.split("/").filter(Boolean);
  if (segments.length === 0) return "/";

  // Public/unscoped top-level roots
  if (TOP_LEVEL_UNSCOPED.has(segments[0])) {
    return norm;
  }

  // Already a known root without org slug
  if (KNOWN_MODULE_ROOTS.has(segments[0])) {
    return norm;
  }

  // Legacy root or single org slug e.g. /acme
  if (segments.length === 1) {
    return "/dashboard";
  }

  // Strip orgSlug segment
  return "/" + segments.slice(1).join("/");
}

/** Resolve the skeleton component for a pathname. Exported for tests/tools. */
export function resolveRouteSkeleton(pathname: string): ComponentType {
  const path = normalize(pathname);
  const stripped = stripOrgSlug(path);

  // 1. Check against the canonical stripped path
  for (const [pattern, Skeleton] of RULES) {
    if (pattern.test(stripped)) return Skeleton;
  }

  // 2. Check against the original unstripped path
  for (const [pattern, Skeleton] of RULES) {
    if (pattern.test(path)) return Skeleton;
  }

  return GenericPageSkeleton;
}

/**
 * Renders the skeleton that matches the current (or supplied) location.
 *
 * `padded` adds the module gutter — set it to false when the skeleton is
 * rendered inside a layout that already applies page padding.
 */
export function RouteSkeleton({
  pathname,
  padded = false,
  className,
}: {
  pathname?: string;
  padded?: boolean;
  className?: string;
}) {
  const location = useLocation();
  const Skeleton = resolveRouteSkeleton(pathname ?? location.pathname);

  if (!padded && !className) return <Skeleton />;

  return (
    <div className={className ?? "w-full px-6 py-6"}>
      <Skeleton />
    </div>
  );
}
