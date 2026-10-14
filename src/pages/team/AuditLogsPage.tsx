import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button as UiButton } from "@/components/ui/button";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  ProjectPageHeader,
  Readouts,
  SearchField,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  ToolbarCount,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { FilterSelect, Timestamp, formatNumber } from "@/shared/observe";
import { Pill, type SurfaceTone } from "@/shared/ui/pulse";
import { cn } from "@/lib/utils";

const ENTRY_LIMIT = 100;

const ACTION_OPTS = [
  { value: "", label: "All actions" },
  ...["member.invited", "member.removed", "organization.updated", "environment.created", "api_key.created"].map((action) => ({
    value: action,
    label: action,
  })),
];

const FAILED_STATUSES = ["failed", "denied", "error"];

const COLUMNS: SheetColumn[] = [
  { key: "actor", header: "Actor" },
  { key: "action", header: "Action", className: `w-[200px] ${HIDE_BELOW_MD}` },
  { key: "target", header: "Target", className: `w-[260px] ${HIDE_BELOW_LG}` },
  { key: "status", header: "Outcome", className: "w-[110px]" },
  { key: "time", header: "Time", className: "w-[140px]", align: "right" },
];

const MONO = "font-[family-name:var(--mono)] tabular-nums";

function outcomeTone(status: string): SurfaceTone {
  const value = status.toLowerCase();
  if (value === "success" || value === "succeeded" || value === "ok") return "green";
  if (value === "failure" || FAILED_STATUSES.includes(value)) return "red";
  return "neutral";
}

export default function AuditLogsPage() {
  const { activeOrgId } = useOrganizations();
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...orgQueryKeys.auditLogs(activeOrgId!), action],
    queryFn: () => orgApi.listAuditLogs(activeOrgId!, { limit: ENTRY_LIMIT, action: action || undefined }),
    enabled: !!activeOrgId,
  });

  const logs = data?.data ?? [];
  const hasMore = data?.meta?.hasMore ?? false;
  const ready = Boolean(data);
  const failures = logs.filter((log) => FAILED_STATUSES.includes(log.status)).length;
  const actors = new Set(logs.map((log) => log.actorEmail ?? log.actorUserId ?? "system")).size;
  const actionTypes = new Set(logs.map((log) => log.action)).size;

  const query = search.trim().toLowerCase();
  const isFiltered = action !== "" || query.length > 0;
  const filtered = logs.filter((log) => {
    if (query.length === 0) return true;
    return (
      (log.actorEmail ?? "").toLowerCase().includes(query) ||
      (log.actorUserId ?? "").toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.entityType.toLowerCase().includes(query) ||
      (log.entityName ?? "").toLowerCase().includes(query) ||
      (log.entityId ?? "").toLowerCase().includes(query)
    );
  });

  const clearFilters = () => {
    setSearch("");
    setAction("");
  };

  async function exportLogs() {
    if (!activeOrgId) return;
    setExporting(true);
    try {
      const exported = await orgApi.exportAuditLogs(activeOrgId, { action: action || undefined });
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `org-audit-logs-${activeOrgId}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Audit logs exported");
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Failed to export audit logs"));
    } finally {
      setExporting(false);
    }
  }

  // The fetch is capped, so every reading describes the loaded entries only.
  const scope = action ? `In the latest ${ENTRY_LIMIT} ${action} entries` : `In the latest ${ENTRY_LIMIT} entries`;
  const readouts: Readout[] = [
    {
      label: "Entries loaded",
      value: ready ? formatNumber(logs.length) : "—",
      sub: hasMore ? `Latest ${ENTRY_LIMIT}; older entries exist` : `Up to the latest ${ENTRY_LIMIT}`,
    },
    {
      label: "Failed actions",
      value: ready ? formatNumber(failures) : "—",
      sub: scope,
      tone: !ready ? "neutral" : failures > 0 ? "bad" : "good",
    },
    { label: "Distinct actors", value: ready ? formatNumber(actors) : "—", sub: scope },
    { label: "Action types", value: ready ? formatNumber(actionTypes) : "—", sub: scope },
  ];

  const toolbar = (
    <>
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search actor, action, or target"
        label="Search audit entries"
      />
      <FilterSelect label="Action" value={action} onChange={setAction} options={ACTION_OPTS} />
      {ready && (
        <ToolbarCount>
          {formatNumber(filtered.length)} of {formatNumber(logs.length)}
        </ToolbarCount>
      )}
    </>
  );

  let body: ReactNode;
  if (isLoading || (!data && !isError)) {
    body = <SheetLoading rows={6} label="Loading audit entries" />;
  } else if (isError) {
    body = (
      <SheetError
        title="Could not load audit logs"
        message={apiErrorMessage(error, "The audit log request failed.")}
        onRetry={() => void refetch()}
      />
    );
  } else if (filtered.length === 0 && isFiltered) {
    body = (
      <SheetEmpty
        title="No entries match these filters"
        description="Try a different action or search term."
        action={
          <UiButton variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    );
  } else if (filtered.length === 0) {
    body = (
      <SheetEmpty
        title="No recorded activity yet"
        description="Invitations, role changes, settings updates, and key creation appear here as members make them."
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Audit log entries with actor, action, target, outcome, and time" minWidth={440}>
        {filtered.map((log) => {
          const actor = log.actorEmail ?? log.actorUserId ?? "System";
          const target = log.entityName ?? log.entityId ?? "—";
          return (
            <SheetRow key={log.id}>
              <SheetCell>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate text-[13px] text-[var(--text)]",
                      !log.actorEmail && log.actorUserId && cn(MONO, "text-[12px]"),
                    )}
                    title={actor}
                  >
                    {actor}
                  </p>
                  {/* Action and target columns drop on small screens; keep the reading. */}
                  <p className={cn("mt-0.5 truncate text-[11.5px] text-[var(--text3)] lg:hidden", MONO)}>
                    {log.action} · {log.entityType} {target}
                  </p>
                </div>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                <span className={cn("block truncate text-[12px] text-[var(--text2)]", MONO)} title={log.action}>
                  {log.action}
                </span>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                <span className="block min-w-0 truncate text-[12px]" title={`${log.entityType} ${target}`}>
                  <span className="text-[var(--text3)]">{log.entityType}</span>{" "}
                  <span className={cn("text-[var(--text)]", MONO)}>{target}</span>
                </span>
              </SheetCell>
              <SheetCell>
                <Pill tone={outcomeTone(log.status)}>{log.status}</Pill>
              </SheetCell>
              <SheetCell align="right">
                <span className={cn("whitespace-nowrap text-[12px] text-[var(--text2)]", MONO)}>
                  <Timestamp value={log.createdAt} />
                </span>
              </SheetCell>
            </SheetRow>
          );
        })}
      </SheetTable>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Audit logs"
        description="Every privileged action taken in this organization, with actor, target, and outcome."
        actions={
          <UiButton variant="outline" size="lg" onClick={() => void exportLogs()} disabled={exporting}>
            {exporting ? "Exporting…" : "Export JSON"}
          </UiButton>
        }
      />

      <Readouts cells={readouts} loading={isLoading} label="Audit log summary" />

      <Sheet
        label="Audit log entries"
        toolbar={toolbar}
        footer={
          ready && logs.length > 0 ? (
            <span>
              {hasMore
                ? `Showing the latest ${ENTRY_LIMIT} entries. Older entries are not loaded on this page.`
                : `All ${formatNumber(logs.length)} matching entries are loaded.`}
            </span>
          ) : undefined
        }
      >
        {body}
      </Sheet>
    </WorkspacePage>
  );
}
