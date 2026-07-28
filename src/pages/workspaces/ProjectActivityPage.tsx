import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  Eye,
  KeyRound,
  Layers,
  Search,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys } from "@/modules/organizations/hooks/useOrganizations";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import type { AuditLog } from "@/modules/organizations/types/org.types";
import { useCurrentProject } from "./ProjectShellPage";
import { IconChip, Notice, Panel, Pill, SectionHeading, Toolbar, fieldInputClass, type SurfaceTone } from "@/shared/ui/pulse";
import { JsonViewer, Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md §1.2) ───────────────────

const ENTITY_ICON: Record<string, LucideIcon> = {
  project: Layers,
  project_settings: Settings,
  api_key: KeyRound,
  project_api_key: KeyRound,
  environment: Layers,
  project_member: Users,
  project_role: ShieldAlert,
  alert_channel: Activity,
  alert_threshold: Activity,
};

const STATUS_TONE: Record<string, SurfaceTone> = {
  success: "green",
  ok: "green",
  failure: "red",
  failed: "red",
  error: "red",
  denied: "red",
  pending: "amber",
};

const ACTION_BG_COLOR: Record<string, string> = {
  create: "bg-[var(--green-bg)]",
  add: "bg-[var(--green-bg)]",
  invite: "bg-[var(--green-bg)]",
  enable: "bg-[var(--green-bg)]",
  update: "bg-[var(--amber-bg)]",
  patch: "bg-[var(--amber-bg)]",
  rotate: "bg-[var(--amber-bg)]",
  regenerate: "bg-[var(--amber-bg)]",
  toggle: "bg-[var(--amber-bg)]",
  delete: "bg-[var(--red-bg)]",
  revoke: "bg-[var(--red-bg)]",
  remove: "bg-[var(--red-bg)]",
  archive: "bg-[var(--red-bg)]",
};

function actionTone(action: string): SurfaceTone {
  if (/delete|revoke|remove|archive/i.test(action)) return "red";
  if (/create|add|invite|enable/i.test(action)) return "green";
  if (/update|patch|rotate|regenerate|toggle/i.test(action)) return "amber";
  return "neutral";
}

function actionBgClass(action: string): string {
  const verb = action.split(".")[0] ?? "";
  for (const [key, cls] of Object.entries(ACTION_BG_COLOR)) {
    if (verb.toLowerCase().includes(key)) return cls;
  }
  // Check full action string
  for (const [key, cls] of Object.entries(ACTION_BG_COLOR)) {
    if (action.toLowerCase().includes(key)) return cls;
  }
  return "bg-[var(--bg2)]";
}

/** Group items by relative time period */
function getTimeGroup(dateStr: string, now: Date): string {
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Check if same calendar day
    if (date.toDateString() === now.toDateString()) return "Today";
    return "Yesterday";
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This week";
  if (diffDays < 30) return "This month";
  return "Older";
}

// ── activity row ─────────────────────────────────────────────

function ActivityRow({ item }: { item: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ENTITY_ICON[item.entityType] ?? Activity;
  const hasDetail = Object.keys(item.metadata ?? {}).length > 0 || (item.changedFields?.length ?? 0) > 0;

  return (
    <li className="relative flex gap-3 pl-5 pr-5 py-3.5">
      {/* Timeline connector line */}
      <div className="absolute left-[33px] top-0 bottom-0 w-px bg-[var(--border)]" />

      <div className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full", actionBgClass(item.action))}>
        <Icon className="size-4" style={{ color: `var(--${actionTone(item.action)})` }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <code className="font-[family-name:var(--mono)] text-[12.5px] font-medium text-[var(--text)]">
            {item.action}
          </code>
          <Pill tone={STATUS_TONE[item.status?.toLowerCase()] ?? "neutral"} dot>
            {item.status || "unknown"}
          </Pill>
          {item.isSensitive && (
            <Pill tone="red">
              <ShieldAlert className="size-3" aria-hidden="true" /> sensitive
            </Pill>
          )}
        </div>
        <p className="mt-1 text-[12.5px] text-[var(--text2)]">
          <span className="text-[var(--text3)]">{item.entityType.replace(/_/g, " ")}</span>
          {item.entityName && <> · {item.entityName}</>}
          {item.actorEmail && <> · by {item.actorEmail}</>}
        </p>
        {(item.changedFields?.length ?? 0) > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {item.changedFields!.map((field) => (
              <code
                key={field}
                className="rounded-[4px] bg-[var(--bg2)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[10.5px] text-[var(--text3)]"
              >
                {field}
              </code>
            ))}
          </div>
        )}
        {expanded && (
          <div className="mt-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)]/50 p-3">
            <JsonViewer data={item.metadata} />
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-start gap-2 pt-0.5">
        <span className="text-[11.5px] text-[var(--text3)]">
          <Timestamp value={item.createdAt} />
        </span>
        {hasDetail && (
          <UiButton
            variant="ghost"
            size="icon-sm"
            aria-label={expanded ? "Hide details" : "Show details"}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
          </UiButton>
        )}
      </div>
    </li>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectActivityPage() {
  const { projectId } = useCurrentProject();
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const [action, setAction] = useState("");
  const [limit, setLimit] = useState(25);

  const { data, isLoading, error } = useQuery({
    queryKey: [...orgQueryKeys.auditLogs(activeOrgId!), { projectId, limit, action }],
    queryFn: () => orgApi.listAuditLogs(activeOrgId!, {
      projectId,
      limit,
      action: action || undefined,
    }),
    enabled: !!activeOrgId && !!projectId,
  });
  const items = data?.data ?? [];

  const asMessage = apiErrorMessage;

  const sensitiveCount = items.filter((item) => item.isSensitive).length;

  // Group items by time period — stabilize "now" per render cycle
  const now = new Date();
  const groupedItems: Array<{ group: string; items: AuditLog[] }> = [];
  let currentGroup = "";
  for (const item of items) {
    const group = getTimeGroup(item.createdAt, now);
    if (group !== currentGroup) {
      groupedItems.push({ group, items: [item] });
      currentGroup = group;
    } else {
      groupedItems[groupedItems.length - 1].items.push(item);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Activity log"
        description="Every mutation to this project is recorded in the organization audit trail with actor, IP, and changed fields."
      />

      <Toolbar
        trailing={
          <span className="text-[12px] tabular-nums text-[var(--text3)]">
            {items.length} entries{sensitiveCount > 0 ? ` · ${sensitiveCount} sensitive` : ""}
          </span>
        }
      >
        <form
          className="relative min-w-[220px] flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem("activity-action") as HTMLInputElement | null;
            setAction(input?.value.trim() ?? "");
          }}
        >
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text3)]"
            aria-hidden="true"
          />
          <input
            id="activity-action"
            name="activity-action"
            type="search"
            defaultValue={action}
            placeholder="Filter by action, e.g. api_key.rotated"
            aria-label="Filter activity by action"
            className={`${fieldInputClass} pl-9`}
          />
        </form>
        {action && (
          <UiButton variant="ghost" size="lg" onClick={() => setAction("")}>
            Clear
          </UiButton>
        )}
      </Toolbar>

      {error && (
        <Notice tone="red" icon={AlertTriangle} title="Could not load activity">
          {asMessage(error)}
        </Notice>
      )}

      <Panel bodyClassName="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="h-14 animate-pulse rounded-[8px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <IconChip icon={Eye} size="lg" tone="brand" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">
              {action ? "No activity matches that action" : "No activity recorded yet"}
            </p>
            <p className="max-w-[46ch] text-[12.5px] text-[var(--text2)]">
              Entries appear as members change settings, rotate keys, or manage alerting.
            </p>
          </div>
        ) : (
          <div>
            {groupedItems.map((section) => (
              <div key={section.group}>
                {/* Time group header */}
                <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg2)]/80 px-5 py-2 backdrop-blur-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)]">
                    {section.group}
                  </span>
                </div>
                <ul className="divide-y divide-[var(--border)]">
                  {section.items.map((item) => (
                    <ActivityRow key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {data?.meta.hasMore && (
        <div className="flex justify-center">
          <UiButton variant="outline" size="lg" onClick={() => setLimit((current) => Math.min(current + 25, 100))}>
            Load more
          </UiButton>
        </div>
      )}
    </div>
  );
}
