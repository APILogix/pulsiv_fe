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

// ── activity row ─────────────────────────────────────────────

function ActivityRow({ item }: { item: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ENTITY_ICON[item.entityType] ?? Activity;
  const hasDetail = Object.keys(item.metadata ?? {}).length > 0 || (item.changedFields?.length ?? 0) > 0;

  return (
    <li className="flex flex-col">
      <div className="flex items-start gap-3 px-5 py-3.5">
        <IconChip icon={Icon} tone={actionTone(item.action)} size="sm" className="mt-0.5" />
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
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
      </div>
      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--bg2)]/50 px-5 py-3">
          <JsonViewer data={item.metadata} />
        </div>
      )}
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
          <ul className="divide-y divide-[var(--border)]">
            {items.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </ul>
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
