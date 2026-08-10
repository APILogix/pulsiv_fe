import type { ComponentType } from "react";
import { useLocation } from "react-router";

import {
  AiConversationSkeleton,
  AiOverviewSkeleton,
  AlertsSkeleton,
  AuditSkeleton,
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
  RulesSkeleton,
  ServiceHealthSkeleton,
  SettingsSkeleton,
  TraceWaterfallSkeleton,
  WizardSkeleton,
  WorkflowsSkeleton,
} from "./pages";

/**
 * Route → skeleton resolver (Phase 3).
 *
 * Clicking a sidebar item must paint the *shape* of the destination on the next
 * frame, before its JS chunk has even downloaded. That means the fallback has to
 * be chosen from the URL alone — no route module, no data. This table is that
 * mapping.
 *
 * Rules are evaluated top-down, first match wins, so put detail routes
 * (`/x/:id`) above their index route where the patterns would otherwise
 * overlap. `$` anchors keep index routes from swallowing their children.
 */

type Rule = readonly [RegExp, ComponentType];

/** Detail-page id segment: uuid, prefixed public id, hash, or numeric. */
const ID = "[^/]+";

const RULES: readonly Rule[] = [
  /* ── project shell: /:orgSlug/p/:publicId/<tab> ───────────────────────── */
  [/^\/[^/]+\/p\/[^/]+\/overview$/, ProjectOverviewSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/analytics$/, DashboardSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/usage$/, DashboardSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/activity$/, AuditSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/environments$/, KeysSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/api-keys$/, KeysSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/remote-config$/, SettingsSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/alert-rules$/, RulesSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/alert-channels$/, IntegrationsSkeleton],
  [new RegExp(`^/[^/]+/p/[^/]+/routes/${ID}$`), WizardSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/routes$/, RulesSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/connectors$/, IntegrationsSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/deliveries$/, AuditSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/dlq$/, ListSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/preferences$/, SettingsSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/members$/, MembersSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/settings(\/.*)?$/, SettingsSkeleton],
  [/^\/[^/]+\/p\/[^/]+$/, ProjectOverviewSkeleton],

  /* ── workspaces ──────────────────────────────────────────────────────── */
  [/^\/[^/]+\/projects\/new$/, WizardSkeleton],
  [/^\/[^/]+\/projects$/, ProjectsSkeleton],

  /* ── root dashboard ──────────────────────────────────────────────────── */
  [/^\/$/, DashboardSkeleton],
  [/^\/dashboard$/, DashboardSkeleton],

  /* ── dashboards module ───────────────────────────────────────────────── */
  [/^\/dashboards\/reports\/new$/, WizardSkeleton],
  [/^\/dashboards\/reports$/, ListSkeleton],
  [/^\/dashboards\/geo$/, GeoSkeleton],
  [/^\/dashboards\/(overview)?$/, DashboardGallerySkeleton],
  [/^\/dashboards\/[^/]+$/, DashboardSkeleton],

  /* ── observability ───────────────────────────────────────────────────── */
  [new RegExp(`^/observability/traces/${ID}/spans/${ID}$`), TraceWaterfallSkeleton],
  [new RegExp(`^/observability/traces/${ID}$`), TraceWaterfallSkeleton],
  [new RegExp(`^/observability/spans/${ID}$`), DetailSkeleton],
  [/^\/observability\/traces$/, ExplorerTableSkeleton],
  [new RegExp(`^/observability/logs/${ID}$`), DetailSkeleton],
  [/^\/observability\/logs$/, LogsSkeleton],
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
  [new RegExp(`^/alerts/rules/${ID}$`), DetailSkeleton],
  [/^\/alerts\/rules$/, RulesSkeleton],
  [new RegExp(`^/alerts/escalations/${ID}$`), DetailSkeleton],
  [/^\/alerts\/(escalations|routing)$/, RulesSkeleton],
  [/^\/alerts\/templates$/, IntegrationsSkeleton],
  [/^\/alerts\/metrics$/, DashboardSkeleton],
  [/^\/alerts\/(silences|dead-letters)$/, ListSkeleton],
  [/^\/alerts$/, AlertsSkeleton],
  [new RegExp(`^/alerts/${ID}$`), DetailSkeleton],

  /* ── automation ──────────────────────────────────────────────────────── */
  [new RegExp(`^/automation/(workflows|runs|approvals)/${ID}$`), DetailSkeleton],
  [/^\/automation\/workflows$/, WorkflowsSkeleton],
  [/^\/automation\/(runs|approvals)$/, ListSkeleton],
  [/^\/automation\/templates$/, IntegrationsSkeleton],
  [/^\/automation\/(events|audit)$/, AuditSkeleton],
  [/^\/automation$/, DashboardSkeleton],

  /* ── ingestion ───────────────────────────────────────────────────────── */
  [/^\/ingestion\/health$/, ServiceHealthSkeleton],
  [/^\/ingestion\/keys$/, KeysSkeleton],
  [/^\/ingestion\/rate-limits$/, RulesSkeleton],
  [/^\/ingestion\/(endpoints|replay)$/, ListSkeleton],
  [/^\/ingestion$/, DashboardSkeleton],

  /* ── AI ──────────────────────────────────────────────────────────────── */
  [/^\/ai\/assistant$/, AiConversationSkeleton],
  [/^\/ai\/(investigations|knowledge)$/, AiOverviewSkeleton],
  [/^\/ai\/reports$/, ListSkeleton],
  [/^\/ai\/usage$/, DashboardSkeleton],
  [/^\/ai\/settings$/, SettingsSkeleton],
  [/^\/ai$/, AiOverviewSkeleton],

  /* ── organization admin ──────────────────────────────────────────────── */
  [new RegExp(`^/admin/members/${ID}$`), DetailSkeleton],
  [/^\/admin\/team$/, MembersSkeleton],
  [/^\/admin\/(security-events|audit-logs)$/, AuditSkeleton],
  [/^\/admin\/(domains|roles)$/, ListSkeleton],
  [/^\/admin(\/(settings|sso|scim|sdk-config|compliance))?$/, SettingsSkeleton],

  /* ── billing ─────────────────────────────────────────────────────────── */
  [new RegExp(`^/billing/invoices/${ID}$`), DetailSkeleton],
  [/^\/billing\/invoices$/, ListSkeleton],
  [/^\/billing\/usage$/, DashboardSkeleton],
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
  [/^\/onboarding\/.*$/, WizardSkeleton],
];

/** Strip the trailing slash so `/alerts/` and `/alerts` resolve identically. */
function normalize(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/** Resolve the skeleton component for a pathname. Exported for tests/tools. */
export function resolveRouteSkeleton(pathname: string): ComponentType {
  const path = normalize(pathname);
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
