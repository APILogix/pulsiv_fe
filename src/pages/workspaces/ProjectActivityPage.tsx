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

function actionTone(action: string): SurfaceTone {
  if (/delete|revoke|remove|archive/i.test(action)) return "red";
  if (/create|add|invite|enable/i.test(action)) return "green";
  if (/update|patch|rotate|regenerate|toggle/i.test(action)) return "amber";
  return "neutral";
}

const TONE_DOT_COLOR: Record<SurfaceTone, string> = {
  brand: "bg-[var(--brand)]",
  green: "bg-[var(--green)]",
  red: "bg-[var(--red)]",
  amber: "bg-[var(--amber)]",
  blue: "bg-[var(--blue)]",
  violet: "bg-[var(--violet)]",
  neutral: "bg-[var(--text3)]",
};

function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

// ── timeline activity item ───────────────────────────────────

function TimelineItem({ item }: { item: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ENTITY_ICON[item.entityType] ?? Activity;
  const hasDetail = Object.keys(item.metadata ?? {}).length > 0 || (item.changedFields?.length ?? 0) > 0;
  const tone = actionTone(item.action);

  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {/* Timeline connector line */}
      <div className="absolute left-[15px] top-10 bottom-0 w-px bg-gradient-to-b from-[var(--border)] to-transparent" />

      {/* Timeline dot */}
      <div className="relative z-10 flex flex-col items-center">
        <div className={cn("size-[30px] shrink-0 rounded-full border-2 border-[var(--bg1)] shadow-sm flex items-center justify-center", TONE_DOT_COLOR[tone])}>
          <Icon className="size-3.5 text-white" />
        </div>
      </div>

      {/* Content card */}
      <div className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg1)]/70 p-4 backdrop-blur-sm transition-all duration-200 hover:shadow-md hover:shadow-[var(--brand)]/5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <code className="font-[family-name:var(--mono)] text-[12.5px] font-semibold text-[var(--text)]">
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
            <p className="mt-1.5 text-[12px] text-[var(--text2)]">
              <span className="text-[var(--text3)]">{item.entityType.replace(/_/g, " ")}</span>
              {item.entityName && <> &middot; <span className="font-medium text-[var(--text)]">{item.entityName}</span></>}
              {item.actorEmail && <> &middot; by <span className="text-[var(--brand)]">{item.actorEmail}</span></>}
            </p>
            {(item.changedFields?.length ?? 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.changedFields!.map((field) => (
                  <code
                    key={field}
                    className="rounded-md bg-[var(--bg2)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[10px] text-[var(--text3)]"
                  >
                    {field}
                  </code>
                ))}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[11px] tabular-nums text-[var(--text3)]">
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
                <ChevronDown className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")} />
              </UiButton>
            )}
          </div>
        </div>
        {expanded && (
          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)]/50 p-3">
            <JsonViewer data={item.metadata} />
          </div>
        )}
      </div>
    </div>
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

  // Group items by date
  const groupedItems = items.reduce<Record<string, AuditLog[]>>((groups, item) => {
    const dateKey = new Date(item.createdAt).toDateString();
    (groups[dateKey] ??= []).push(item);
    return groups;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Activity log"
        description="Every mutation to this project is recorded in the organization audit trail with actor, IP, and changed fields."
      />

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg1)]/70 px-4 py-3 backdrop-blur-sm">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text3)]">Total entries</span>
          <p className="mt-0.5 text-[22px] font-bold tabular-nums tracking-tight text-[var(--text)]">{items.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg1)]/70 px-4 py-3 backdrop-blur-sm">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text3)]">Sensitive</span>
          <p className="mt-0.5 text-[22px] font-bold tabular-nums tracking-tight text-[var(--red)]">{sensitiveCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg1)]/70 px-4 py-3 backdrop-blur-sm">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text3)]">Days shown</span>
          <p className="mt-0.5 text-[22px] font-bold tabular-nums tracking-tight text-[var(--text)]">{Object.keys(groupedItems).length}</p>
        </div>
      </div>

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

      {isLoading ? (
        <div className="flex flex-col gap-4 pl-8">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-20 animate-pulse rounded-xl bg-[var(--bg2)]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <IconChip icon={Eye} size="lg" tone="brand" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">
              {action ? "No activity matches that action" : "No activity recorded yet"}
            </p>
            <p className="max-w-[46ch] text-[12.5px] text-[var(--text2)]">
              Entries appear as members change settings, rotate keys, or manage alerting.
            </p>
          </div>
        </Panel>
      ) : (
        <div className="flex flex-col gap-2">
          {Object.entries(groupedItems).map(([dateKey, dateItems]) => (
            <div key={dateKey} className="flex flex-col gap-0">
              {/* Sticky date header */}
              <div className="sticky top-16 z-20 mb-3 ml-0">
                <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg1)]/90 px-3 py-1 text-[11px] font-semibold text-[var(--text2)] shadow-sm backdrop-blur-sm">
                  {formatDateGroup(dateKey)}
                </span>
              </div>
              {/* Timeline items */}
              <div className="ml-0">
                {dateItems.map((item) => (
                  <TimelineItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
