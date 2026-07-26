import { useState } from "react";
import { Download, ListChecks, ScrollText, TriangleAlert, UserCog } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { AuditLog } from "@/modules/organizations/types/org.types";
import { HeroFacts, Notice, PageHero, type HeroFact, Toolbar } from "@/shared/ui/pulse";
import {
  Button,
  FilterSelect,
  InfiniteTable,
  SearchInput,
  StatusBadge,
  Timestamp,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";

const ACTION_OPTS = [
  { value: "", label: "All actions" },
  ...["member.invited", "member.removed", "organization.updated", "environment.created", "api_key.created"].map((action) => ({
    value: action,
    label: action,
  })),
];

const FAILED_STATUSES = ["failed", "denied", "error"];

export default function AuditLogsPage() {
  const { activeOrgId } = useOrganizations();
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...orgQueryKeys.auditLogs(activeOrgId!), action],
    queryFn: () => orgApi.listAuditLogs(activeOrgId!, { limit: 100, action: action || undefined }),
    enabled: !!activeOrgId,
  });

  const logs = data?.data ?? [];
  const failures = logs.filter((log) => FAILED_STATUSES.includes(log.status)).length;
  const actors = new Set(logs.map((log) => log.actorEmail ?? log.actorUserId ?? "system")).size;
  const actionTypes = new Set(logs.map((log) => log.action)).size;

  const query = search.trim().toLowerCase();
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

  const facts: HeroFact[] = [
    { label: "Entries loaded", value: logs.length, icon: ScrollText },
    { label: "Failed actions", value: failures, tone: failures > 0 ? "red" : "green", icon: TriangleAlert },
    { label: "Distinct actors", value: actors, icon: UserCog },
    { label: "Action types", value: actionTypes, icon: ListChecks },
  ];

  const columns: Column<AuditLog>[] = [
    {
      key: "time",
      header: "Time",
      width: "150px",
      cell: (log) => (
        <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
          <Timestamp value={log.createdAt} />
        </span>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      width: "minmax(200px, 1fr)",
      cell: (log) => (
        <span className="truncate text-[13px] text-[var(--text)]" title={log.actorEmail ?? log.actorUserId ?? "System"}>
          {log.actorEmail ?? log.actorUserId ?? "System"}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      width: "minmax(180px, 1fr)",
      cell: (log) => (
        <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]" title={log.action}>
          {log.action}
        </span>
      ),
    },
    {
      key: "target",
      header: "Target",
      width: "minmax(200px, 1.2fr)",
      cell: (log) => (
        <span className="min-w-0 truncate text-[13px] text-[var(--text2)]">
          <span className="text-[var(--text3)]">{log.entityType}</span>{" "}
          <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">
            {log.entityName ?? log.entityId ?? "—"}
          </span>
        </span>
      ),
    },
    { key: "status", header: "Outcome", width: "120px", cell: (log) => <StatusBadge status={log.status} /> },
  ];

  async function exportLogs() {
    if (!activeOrgId) return;
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to export audit logs");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Auditability"
        title="Audit logs"
        description="Every privileged action taken in this organization, with actor, target, and outcome."
        icon={ScrollText}
        actions={
          <Button variant="secondary" onClick={exportLogs}>
            <Download className="size-4" aria-hidden="true" />
            Export JSON
          </Button>
        }
      >
        <HeroFacts facts={facts} />
      </PageHero>

      {isError && (
        <Notice tone="red" icon={TriangleAlert} title="Unable to load audit logs">
          {(error as Error)?.message ?? "Try again in a moment."}
        </Notice>
      )}

      <Toolbar
        trailing={
          <span className="text-[12px] tabular-nums text-[var(--text3)]">
            {filtered.length} of {logs.length} entries
          </span>
        }
      >
        <SearchInput placeholder="Search actor, action, or target…" defaultValue={search} onSearch={setSearch} />
        <FilterSelect label="Action" value={action} onChange={setAction} options={ACTION_OPTS} />
      </Toolbar>

      <InfiniteTable
        className="h-[560px]"
        loading={isLoading}
        items={filtered}
        queryKey={["auditLogs-table", activeOrgId, action, search]}
        columns={columns}
        getKey={(log) => log.id}
        emptyMessage="No audit entries match these filters."
      />
    </div>
  );
}
