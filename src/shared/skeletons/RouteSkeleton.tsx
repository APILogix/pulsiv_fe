import { useLayoutEffect, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { useLocation } from "react-router";

import { Block } from "./primitives";

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
  RulesSkeleton,
  ServiceHealthSkeleton,
  SettingsSkeleton,
  TraceWaterfallSkeleton,
  WizardSkeleton,
  WorkflowsSkeleton,
} from "./pages";
import {
  ProjectActivitySkeleton,
  ProjectAlertChannelsSkeleton,
  ProjectAlertRulesSkeleton,
  ProjectAnalyticsSkeleton,
  ProjectApiKeysSkeleton,
  ProjectConnectorsSkeleton,
  ProjectCreateSkeleton,
  ProjectDeadLettersSkeleton,
  ProjectDeliveriesSkeleton,
  ProjectEnvironmentsSkeleton,
  ProjectIncidentsSkeleton,
  ProjectMembersSkeleton,
  ProjectOverviewSkeleton,
  ProjectPreferencesSkeleton,
  ProjectRouteEditorSkeleton,
  ProjectRoutesSkeleton,
  ProjectSettingsSkeleton,
  ProjectsSkeleton,
  ProjectUsageSkeleton,
  RemoteConfigSkeleton,
} from "./workspace";

type Rule = readonly [RegExp, ComponentType];

/** Detail-page id segment: uuid, prefixed public id, hash, or numeric. */
const ID = "[^/]+";

const RULES: readonly Rule[] = [
  /* ── project shell: (matches /p/:publicId and /:orgSlug/p/:publicId) ── */
  [/^\/p\/[^/]+\/overview$/, ProjectOverviewSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/overview$/, ProjectOverviewSkeleton],
  [/^\/p\/[^/]+\/analytics$/, ProjectAnalyticsSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/analytics$/, ProjectAnalyticsSkeleton],
  [/^\/p\/[^/]+\/usage$/, ProjectUsageSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/usage$/, ProjectUsageSkeleton],
  [/^\/p\/[^/]+\/activity$/, ProjectActivitySkeleton],
  [/^\/[^/]+\/p\/[^/]+\/activity$/, ProjectActivitySkeleton],
  [/^\/p\/[^/]+\/environments$/, ProjectEnvironmentsSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/environments$/, ProjectEnvironmentsSkeleton],
  [/^\/p\/[^/]+\/api-keys$/, ProjectApiKeysSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/api-keys$/, ProjectApiKeysSkeleton],
  [/^\/p\/[^/]+\/remote-config$/, RemoteConfigSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/remote-config$/, RemoteConfigSkeleton],
  [/^\/p\/[^/]+\/alerts$/, ProjectIncidentsSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/alerts$/, ProjectIncidentsSkeleton],
  [/^\/p\/[^/]+\/alert-rules$/, ProjectAlertRulesSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/alert-rules$/, ProjectAlertRulesSkeleton],
  [/^\/p\/[^/]+\/alert-channels$/, ProjectAlertChannelsSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/alert-channels$/, ProjectAlertChannelsSkeleton],
  [new RegExp(`^/p/[^/]+/routes/${ID}$`), ProjectRouteEditorSkeleton],
  [new RegExp(`^/[^/]+/p/[^/]+/routes/${ID}$`), ProjectRouteEditorSkeleton],
  [/^\/p\/[^/]+\/routes$/, ProjectRoutesSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/routes$/, ProjectRoutesSkeleton],
  [/^\/p\/[^/]+\/connectors$/, ProjectConnectorsSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/connectors$/, ProjectConnectorsSkeleton],
  [/^\/p\/[^/]+\/deliveries$/, ProjectDeliveriesSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/deliveries$/, ProjectDeliveriesSkeleton],
  [/^\/p\/[^/]+\/dlq$/, ProjectDeadLettersSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/dlq$/, ProjectDeadLettersSkeleton],
  [/^\/p\/[^/]+\/preferences$/, ProjectPreferencesSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/preferences$/, ProjectPreferencesSkeleton],
  [/^\/p\/[^/]+\/members$/, ProjectMembersSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/members$/, ProjectMembersSkeleton],
  [/^\/p\/[^/]+\/settings(\/.*)?$/, ProjectSettingsSkeleton],
  [/^\/[^/]+\/p\/[^/]+\/settings(\/.*)?$/, ProjectSettingsSkeleton],
  [/^\/p\/[^/]+$/, ProjectOverviewSkeleton],
  [/^\/[^/]+\/p\/[^/]+$/, ProjectOverviewSkeleton],

  /* ── workspaces & project creation ───────────────────────────────────── */
  [/^\/projects\/new$/, ProjectCreateSkeleton],
  [/^\/[^/]+\/projects\/new$/, ProjectCreateSkeleton],
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

import { normalize, stripOrgSlug } from "./slug";
export { stripOrgSlug };

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

/* ── continuity ────────────────────────────────────────────────────────────
   A page load can hand the skeleton between owners (org guard → app shell →
   module layout → page gate). Each handoff used to replay the entrance rise
   and restart the shimmer, which is what made one load look like two. Two
   rules make a handoff invisible:
     1. A skeleton that mounts while another is on screen (or just left)
        skips its entrance rise.
     2. Every route skeleton shimmers on one shared clock, so the replacement
        is in the same phase as the one it replaced. */

/** Matches `loading-skeleton-shift` in src/app/index.css. */
const SHIMMER_PERIOD_MS = 1200;
const CONTINUE_WINDOW_MS = 250;
let mountedRouteSkeletons = 0;
let lastRouteSkeletonAt = Number.NEGATIVE_INFINITY;

function useSkeletonContinuity() {
  const [attrs] = useState(() => {
    const now = performance.now();
    return {
      continuing: mountedRouteSkeletons > 0 || now - lastRouteSkeletonAt < CONTINUE_WINDOW_MS,
      phase: -(Math.round(now) % SHIMMER_PERIOD_MS),
    };
  });

  useLayoutEffect(() => {
    mountedRouteSkeletons += 1;
    return () => {
      mountedRouteSkeletons -= 1;
      lastRouteSkeletonAt = performance.now();
    };
  }, []);

  return attrs;
}

/* ── destination frames ────────────────────────────────────────────────────
   A skeleton rendered above the destination layout (org guard, app shell
   boundary, project shell while the project resolves) must sit exactly where
   that layout will put the page, or it jumps on handoff. */

type FrameKind = "project" | "settings" | "home" | "module";

function frameKind(pathname: string): FrameKind {
  const segments = stripOrgSlug(pathname).split("/").filter(Boolean);
  const root = segments[0];
  if (root === "p") return "project";
  if (root === "settings" || root === "account") return "settings";
  if (!root || root === "dashboard") return "home";
  return "module";
}

/** Stand-in for ProjectHeaderBar: same height, border and gutters. */
function ProjectHeaderSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--bg1)] px-3 sm:px-4"
    >
      <Block className="h-3 w-16" />
      <Block className="h-3 w-2" />
      <Block className="h-3.5 w-36" delay={20} />
      <div className="ml-auto flex items-center gap-2">
        <Block className="h-7 w-28" delay={40} />
        <Block className="size-7" delay={60} />
      </div>
    </div>
  );
}

export function RouteFrame({ pathname, children }: { pathname: string; children: ReactNode }) {
  const kind = frameKind(pathname);

  if (kind === "project") {
    // ProjectShellPage: header bar, then the scroll area with the 1400px rail.
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <ProjectHeaderSkeleton />
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-6 sm:px-6">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </div>
      </div>
    );
  }

  if (kind === "settings") {
    // SettingsLayout: centred 1440px column with a breadcrumb row on account pages.
    const hasCrumb = stripOrgSlug(pathname).startsWith("/account");
    return (
      <div className="mx-auto w-full max-w-[1440px] px-6 py-6 md:px-8 xl:px-10">
        {hasCrumb && (
          <div aria-hidden="true" className="mb-5 flex h-[18px] items-center gap-2">
            <Block className="h-3 w-14" />
            <Block className="h-3 w-20" delay={20} />
            <Block className="h-3 w-24" delay={40} />
          </div>
        )}
        {children}
      </div>
    );
  }

  if (kind === "home") {
    // Home renders BoardPage with its own gutter.
    return <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">{children}</div>;
  }

  // ModuleLayout gutter.
  return <div className="w-full px-6 py-6">{children}</div>;
}

/**
 * Renders the skeleton that matches the current (or supplied) location.
 *
 * - `framed` places it inside the destination layout's frame (use anywhere
 *   above that layout: guards, the app-shell boundary, the project shell).
 * - `padded` adds the plain module gutter (legacy; prefer `framed`).
 * - neither: bare skeleton, for use inside a layout that already pads.
 */
export function RouteSkeleton({
  pathname,
  padded = false,
  framed = false,
  className,
}: {
  pathname?: string;
  padded?: boolean;
  framed?: boolean;
  className?: string;
}) {
  const location = useLocation();
  const path = pathname ?? location.pathname;
  const Skeleton = resolveRouteSkeleton(path);
  const { continuing, phase } = useSkeletonContinuity();

  const body = (
    <div
      className="route-skeleton"
      data-sk-continue={continuing || undefined}
      style={{ "--sk-phase": `${phase}ms` } as CSSProperties}
    >
      <Skeleton />
    </div>
  );

  if (framed) return <RouteFrame pathname={path}>{body}</RouteFrame>;
  if (!padded && !className) return body;

  return <div className={className ?? "w-full px-6 py-6"}>{body}</div>;
}
