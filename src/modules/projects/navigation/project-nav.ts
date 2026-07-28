/**
 * Project navigation — the single source of truth.
 *
 * One nav system per project. This module owns the sidebar tree, the route
 * segments, the breadcrumb labels, and the active-match rules. Nothing else in
 * the app may declare project-level navigation: the global rail/flyout stops at
 * "Projects", and the project shell no longer ships a horizontal tab strip.
 *
 * Adding a page = adding one entry here + one route in `protected-routes.tsx`.
 */

import {
  Activity,
  BellRing,
  Cable,
  Gauge,
  Inbox,
  KeyRound,
  Layers,
  LayoutDashboard,
  LineChart,
  Radio,
  ScrollText,
  Send,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Split,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── types ────────────────────────────────────────────────────

export interface ProjectNavItem {
  /** Path segment relative to `/projects/:projectId`. */
  segment: string;
  label: string;
  icon: LucideIcon;
  /** Screen-reader / tooltip detail. Also used by the collapsed rail. */
  description: string;
}

export interface ProjectNavGroup {
  /** Stable key — persisted in the collapse store, so never rename casually. */
  id: string;
  label: string;
  icon: LucideIcon;
  items: ProjectNavItem[];
}

// ── the tree ─────────────────────────────────────────────────

export const PROJECT_NAV: ProjectNavGroup[] = [
  {
    id: "monitor",
    label: "Monitor",
    icon: LineChart,
    items: [
      {
        segment: "overview",
        label: "Overview",
        icon: LayoutDashboard,
        description: "Today's ingestion, traffic shape, and configuration snapshot",
      },
      {
        segment: "analytics",
        label: "Analytics",
        icon: LineChart,
        description: "Time-sliced event, error, and latency analytics",
      },
      {
        segment: "usage",
        label: "Usage",
        icon: Gauge,
        description: "Lifetime counters and plan consumption",
      },
      {
        segment: "activity",
        label: "Activity",
        icon: ScrollText,
        description: "Audit trail of changes made to this project",
      },
    ],
  },
  {
    id: "telemetry",
    label: "Telemetry",
    icon: Radio,
    items: [
      {
        segment: "environments",
        label: "Environments",
        icon: Layers,
        description: "Production, staging, and preview telemetry targets",
      },
      {
        segment: "api-keys",
        label: "API keys",
        icon: KeyRound,
        description: "Ingestion credentials, rotation, and scopes",
      },
      {
        segment: "remote-config",
        label: "Remote config",
        icon: SlidersHorizontal,
        description: "Values delivered to SDKs at runtime",
      },
    ],
  },
  {
    id: "alerting",
    label: "Alerting",
    icon: BellRing,
    items: [
      {
        segment: "alert-rules",
        label: "Alert rules",
        icon: BellRing,
        description: "Metric thresholds that raise alerts",
      },
      {
        segment: "alert-channels",
        label: "Channels",
        icon: Send,
        description: "Where alerts are delivered",
      },
      {
        segment: "routes",
        label: "Routing",
        icon: Split,
        description: "Which alerts reach which channel",
      },
      {
        segment: "connectors",
        label: "Connectors",
        icon: Cable,
        description: "Organization integrations subscribed by this project",
      },
      {
        segment: "deliveries",
        label: "Delivery log",
        icon: Activity,
        description: "Per-notification delivery outcomes",
      },
      {
        segment: "dlq",
        label: "Dead letters",
        icon: Inbox,
        description: "Notifications that exhausted every retry",
      },
      {
        segment: "preferences",
        label: "My notifications",
        icon: ShieldAlert,
        description: "Your personal delivery preferences for this project",
      },
    ],
  },
  {
    id: "team",
    label: "Team",
    icon: Users,
    items: [
      {
        segment: "members",
        label: "Members",
        icon: Users,
        description: "Project membership and roles",
      },
    ],
  },
  {
    id: "configuration",
    label: "Configuration",
    icon: Settings,
    items: [
      {
        segment: "settings/general",
        label: "General",
        icon: Settings,
        description: "Name, retention, sampling, privacy, and danger zone",
      },
    ],
  },
];

// ── lookups ──────────────────────────────────────────────────

/** Flat view — used by the command palette and active-route detection. */
export const PROJECT_NAV_ITEMS: Array<ProjectNavItem & { groupId: string; groupLabel: string }> =
  PROJECT_NAV.flatMap((group) =>
    group.items.map((item) => ({ ...item, groupId: group.id, groupLabel: group.label })),
  );

/**
 * Legacy segment → current segment. Routes keep redirects for these, and the
 * active-state matcher resolves them so a bookmarked old URL still highlights
 * the right sidebar row.
 */
export const PROJECT_SEGMENT_ALIASES: Record<string, string> = {
  "alert-thresholds": "alert-rules",
  settings: "settings/general",
  thresholds: "alert-rules",
  channels: "alert-channels",
};

/**
 * Resolve a pathname to the active `{ groupId, segment }`.
 *
 * Longest-match wins so `settings/general` beats a hypothetical `settings`, and
 * detail routes (`routes/abc123`) resolve to their list page.
 */
export function resolveActiveProjectNav(
  pathname: string,
  projectId: string,
): { groupId: string; segment: string } | null {
  const base = `/projects/${projectId}`;
  if (!pathname.startsWith(base)) return null;

  const rest = pathname.slice(base.length).replace(/^\/+/, "").replace(/\/+$/, "");
  if (!rest) return { groupId: "monitor", segment: "overview" };

  const canonical = PROJECT_SEGMENT_ALIASES[rest] ?? rest;

  let best: { groupId: string; segment: string } | null = null;
  for (const group of PROJECT_NAV) {
    for (const item of group.items) {
      const isMatch = canonical === item.segment || canonical.startsWith(`${item.segment}/`);
      if (!isMatch) continue;
      if (!best || item.segment.length > best.segment.length) {
        best = { groupId: group.id, segment: item.segment };
      }
    }
  }
  return best;
}

/** Group that owns a segment — used for breadcrumbs. */
export function projectNavCrumb(segment: string): { group: string; page: string } | null {
  const hit = PROJECT_NAV_ITEMS.find((item) => item.segment === segment);
  return hit ? { group: hit.groupLabel, page: hit.label } : null;
}
