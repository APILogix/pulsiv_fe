import { useId, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search } from "lucide-react";

import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys } from "@/modules/organizations/hooks/useOrganizations";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import type { AuditLog } from "@/modules/organizations/types/org.types";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  ProjectPageHeader,
  Sheet,
  SheetEmpty,
  SheetError,
  SheetList,
  SheetLoading,
  ToolbarCount,
  WorkspacePage,
} from "@/modules/projects/components/project-page";
import { Pill, fieldInputClass, type SurfaceTone } from "@/shared/ui/pulse";
import { JsonViewer, Timestamp, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrentProject } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

// Successful entries carry no pill; only outcomes that need attention are marked.
const QUIET_STATUSES = new Set(["success", "ok"]);

const STATUS_TONE: Record<string, SurfaceTone> = {
  failure: "red",
  failed: "red",
  error: "red",
  denied: "red",
  pending: "amber",
};

const PAGE_SIZE = 25;
const MAX_ENTRIES = 100;

function sentenceCase(value: string) {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ── activity row ─────────────────────────────────────────────

function ActivityRow({ item }: { item: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();
  const status = item.status?.toLowerCase() ?? "";
  const hasDetail = Object.keys(item.metadata ?? {}).length > 0;
  const changedFields = item.changedFields ?? [];

  return (
    <li>
      <div className="flex items-start gap-4 px-5 py-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <code className="min-w-0 break-all font-[family-name:var(--mono)] text-[12.5px] font-medium text-[var(--text)]">
              {item.action}
            </code>
            {!QUIET_STATUSES.has(status) && (
              <Pill tone={STATUS_TONE[status] ?? "neutral"} dot>
                {item.status || "unknown"}
              </Pill>
            )}
            {item.isSensitive && <Pill>Sensitive</Pill>}
          </div>
          <p className="mt-1 text-[12px] leading-[1.5] text-[var(--text2)]">
            {sentenceCase(item.entityType)}
            {item.entityName && <span className="text-[var(--text)]"> {item.entityName}</span>}
            {item.actorEmail && <span className="text-[var(--text3)]"> · by {item.actorEmail}</span>}
          </p>
          {changedFields.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1" aria-label="Changed fields">
              {changedFields.map((field) => (
                <code
                  key={field}
                  className="rounded-[4px] bg-[var(--bg3)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[11px] text-[var(--text2)]"
                >
                  {field}
                </code>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <Timestamp value={item.createdAt} />
          {hasDetail ? (
            <UiButton
              variant="ghost"
              size="icon-sm"
              aria-label={expanded ? `Hide details for ${item.action}` : `Show details for ${item.action}`}
              aria-expanded={expanded}
              aria-controls={detailId}
              onClick={() => setExpanded((current) => !current)}
            >
              <ChevronDown
                className={cn("size-4 transition-transform duration-150 motion-reduce:transition-none", expanded && "rotate-180")}
                aria-hidden="true"
              />
            </UiButton>
          ) : (
            // Keeps timestamps aligned with the rows that have a disclosure.
            <span aria-hidden="true" className="size-7 shrink-0" />
          )}
        </div>
      </div>
      {hasDetail && (
        <div id={detailId} hidden={!expanded} className="border-t border-[var(--border)] bg-[var(--bg)] px-5 py-3">
          {expanded && <JsonViewer data={item.metadata} />}
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
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...orgQueryKeys.auditLogs(activeOrgId!), { projectId, limit, action }],
    queryFn: () =>
      orgApi.listAuditLogs(activeOrgId!, {
        projectId,
        limit,
        action: action || undefined,
      }),
    enabled: !!activeOrgId && !!projectId,
  });
  const items = data?.data ?? [];

  const asMessage = apiErrorMessage;

  const sensitiveCount = items.filter((item) => item.isSensitive).length;
  const atCap = limit >= MAX_ENTRIES;

  let body: ReactNode;
  if (isLoading) {
    body = <SheetLoading rows={5} label="Loading activity" />;
  } else if (error) {
    body = <SheetError title="Could not load activity" message={asMessage(error)} onRetry={() => void refetch()} />;
  } else if (items.length === 0) {
    body = action ? (
      <SheetEmpty
        title="No activity matches that action"
        description={`Nothing in this project's audit trail has the action “${action}”. Actions look like api_key.rotated.`}
        action={
          <UiButton variant="outline" size="lg" onClick={() => setAction("")}>
            Clear filter
          </UiButton>
        }
      />
    ) : (
      <SheetEmpty
        title="No activity recorded yet"
        description="Entries appear as members change settings, rotate keys, or manage alerting."
      />
    );
  } else {
    body = (
      <SheetList label="Activity entries">
        {items.map((item) => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </SheetList>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Activity"
        description="Every change to this project, from the organization audit trail: what changed, who changed it, and when."
      />

      <Sheet
        label="Activity"
        toolbar={
          <>
            <form
              role="search"
              className="relative min-w-[200px] flex-1 sm:max-w-[360px]"
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
                key={action}
                id="activity-action"
                name="activity-action"
                type="search"
                defaultValue={action}
                placeholder="Filter by action, then press Enter"
                aria-label="Filter activity by action, for example api_key.rotated"
                autoComplete="off"
                spellCheck={false}
                className={`${fieldInputClass} pl-9 font-[family-name:var(--mono)] text-[12px] [&::-webkit-search-cancel-button]:appearance-none`}
              />
            </form>
            {action && (
              <UiButton variant="ghost" onClick={() => setAction("")}>
                Clear
              </UiButton>
            )}
            {!isLoading && !error && (
              <ToolbarCount>
                {formatNumber(items.length)} {items.length === 1 ? "entry" : "entries"}
                {sensitiveCount > 0 ? ` · ${formatNumber(sensitiveCount)} sensitive` : ""}
              </ToolbarCount>
            )}
          </>
        }
        footer={
          data?.meta.hasMore ? (
            <>
              <span>{atCap ? `Showing the latest ${MAX_ENTRIES} entries.` : "Older entries are available."}</span>
              <UiButton
                variant="outline"
                size="sm"
                disabled={atCap}
                onClick={() => setLimit((current) => Math.min(current + PAGE_SIZE, MAX_ENTRIES))}
              >
                Load more
              </UiButton>
            </>
          ) : undefined
        }
      >
        {body}
      </Sheet>
    </WorkspacePage>
  );
}
