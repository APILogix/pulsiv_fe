/**
 * Automation audit trail: `GET /audit`.
 *
 * Rows are immutable server-side (insert-only table with UPDATE/DELETE
 * triggers), so this surface is read-only. It needs an admin role; a 403 means
 * the signed-in member cannot read the automation audit log.
 */
import { Fragment, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { Notice } from "@/shared/ui/pulse";
import { FilterSelect, JsonViewer, Timestamp, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  ProjectPageHeader,
  SearchField,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  TextLink,
  ToolbarCount,
  WorkspacePage,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { useAutomationAudit, useAutomationScope } from "@/modules/automation/hooks/useAutomation";
import { AUDIT_ACTIONS, type AuditListQuery, type AutomationAuditLog } from "@/modules/automation/api/types";
import { CodeChip, FactGrid, MONO, NoOrgNotice, labelize, withAllOption } from "@/modules/automation/components/automation-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md §1.2) ───────────────────

const PAGE_SIZE = 25;
const ACTION_OPTIONS = withAllOption(AUDIT_ACTIONS, "All actions");

const COLUMNS: SheetColumn[] = [
  { key: "action", header: "Change" },
  { key: "target", header: "Target", className: `w-[200px] ${HIDE_BELOW_MD}` },
  { key: "actor", header: "Actor", className: `w-[180px] ${HIDE_BELOW_LG}` },
  { key: "time", header: "Time", className: "w-[140px]", align: "right" },
];

function actorLabel(entry: AutomationAuditLog) {
  const kind = entry.actorType === "user" ? "User" : labelize(entry.actorType);
  return entry.actorUserId ? `${kind} ${entry.actorUserId.slice(0, 8)}` : kind;
}

/** Links to the records a change touched, in the order a reader follows them. */
function TargetLinks({ entry }: { entry: AutomationAuditLog }) {
  const links: Array<{ to: string; label: string }> = [];
  if (entry.workflowId) links.push({ to: `/automation/workflows/${entry.workflowId}`, label: "Workflow" });
  if (entry.runId) links.push({ to: `/automation/runs/${entry.runId}`, label: "Run" });
  if (entry.approvalId) links.push({ to: `/automation/approvals/${entry.approvalId}`, label: "Approval" });
  if (links.length === 0) return <span className="text-[12px] text-[var(--text3)]">No linked record</span>;
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {links.map((link) => (
        <TextLink key={link.to} to={link.to} size="sm">
          {link.label}
        </TextLink>
      ))}
    </span>
  );
}

function EntryDetail({ entry }: { entry: AutomationAuditLog }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <FactGrid
        facts={[
          { label: "Entry", value: entry.id, mono: true },
          { label: "Entity", value: entry.entityId ? `${entry.entityType} ${entry.entityId.slice(0, 8)}` : entry.entityType, mono: true },
          { label: "Actor", value: actorLabel(entry), mono: Boolean(entry.actorUserId) },
          { label: "IP address", value: entry.ipAddress ?? "Not recorded", mono: Boolean(entry.ipAddress) },
          entry.requestId && { label: "Request", value: entry.requestId, mono: true },
        ]}
      />
      <div className="md:hidden">
        <TargetLinks entry={entry} />
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-2 text-[12px] text-[var(--text3)]">Before</p>
          <JsonViewer data={entry.beforeState ?? null} maxHeight={260} />
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-[12px] text-[var(--text3)]">After</p>
          <JsonViewer data={entry.afterState ?? null} maxHeight={260} />
        </div>
      </div>
    </div>
  );
}

export default function AutomationAuditPage() {
  const { activeOrgId } = useAutomationScope();
  const [action, setAction] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const query: AuditListQuery = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    ...(action ? { action } : {}),
    ...(workflowId ? { workflowId } : {}),
  };

  const auditQuery = useAutomationAudit(query);

  if (!activeOrgId) {
    return <NoOrgNotice>Pick an organization to read its automation audit trail.</NoOrgNotice>;
  }

  const entries = auditQuery.data?.data ?? [];
  const total = auditQuery.data?.total ?? 0;
  const ready = Boolean(auditQuery.data);
  const hasNext = (page + 1) * PAGE_SIZE < total;
  const filtered = Boolean(action || workflowId);
  const forbidden = auditQuery.isError && apiErrorMessage(auditQuery.error).toLowerCase().includes("admin");

  const clearFilters = () => {
    setAction("");
    setWorkflowId("");
    setPage(0);
  };

  const toggle = (id: string) => setExpandedId((current) => (current === id ? null : id));

  const toolbar = (
    <>
      <SearchField
        value={workflowId}
        onChange={(value) => {
          setWorkflowId(value.trim());
          setPage(0);
        }}
        placeholder="Filter by workflow id"
        label="Filter audit entries by workflow id"
      />
      <FilterSelect
        label="Action"
        value={action}
        options={ACTION_OPTIONS}
        onChange={(value) => {
          setAction(value);
          setPage(0);
        }}
      />
      {ready && <ToolbarCount>{formatNumber(total)} {total === 1 ? "entry" : "entries"}</ToolbarCount>}
    </>
  );

  let body: ReactNode;
  if (auditQuery.isLoading) {
    body = <SheetLoading rows={6} label="Loading audit entries" />;
  } else if (auditQuery.isError) {
    body = forbidden ? (
      <div className="px-5 py-6">
        <Notice tone="amber" icon={Lock} title="Admin role required">
          {apiErrorMessage(auditQuery.error)} Ask an organization admin for access.
        </Notice>
      </div>
    ) : (
      <SheetError
        title="Could not load the audit trail"
        message={apiErrorMessage(auditQuery.error, "The audit request failed.")}
        onRetry={() => void auditQuery.refetch()}
      />
    );
  } else if (entries.length === 0 && filtered) {
    body = (
      <SheetEmpty
        title="No entries match these filters"
        description="Try another action, or check the workflow id."
        action={
          <UiButton variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    );
  } else if (entries.length === 0) {
    body = (
      <SheetEmpty
        title="No audit entries yet"
        description="Entries are written as workflows are created, edited, published, run, and approved."
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Automation audit entries. Expand an entry for its before and after state." minWidth={420}>
        {entries.map((entry) => {
          const expanded = expandedId === entry.id;
          const detailId = `audit-entry-${entry.id}`;
          return (
            <Fragment key={entry.id}>
              <SheetRow onActivate={() => toggle(entry.id)} className={cn(expanded && "bg-[var(--bg2)]/40")}>
                <SheetCell>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={detailId}
                    onClick={() => toggle(entry.id)}
                    className="group flex min-w-0 max-w-full items-center gap-2 rounded-[2px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]"
                  >
                    <ChevronRight
                      className={cn(
                        "size-3.5 shrink-0 text-[var(--text3)] transition-transform duration-150 group-hover:text-[var(--text)]",
                        expanded && "rotate-90",
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-[var(--text)]">{labelize(entry.action)}</span>
                        <CodeChip>{entry.entityType}</CodeChip>
                      </span>
                      <span className={cn("mt-0.5 block truncate text-[11.5px] text-[var(--text3)] lg:hidden", MONO)}>
                        {actorLabel(entry)}
                      </span>
                    </span>
                  </button>
                </SheetCell>
                <SheetCell className={HIDE_BELOW_MD}>
                  <TargetLinks entry={entry} />
                </SheetCell>
                <SheetCell className={HIDE_BELOW_LG}>
                  <span className={cn("block truncate text-[12px] text-[var(--text2)]", entry.actorUserId && MONO)}>
                    {actorLabel(entry)}
                  </span>
                </SheetCell>
                <SheetCell align="right">
                  <span className={cn("whitespace-nowrap text-[12px] text-[var(--text2)]", MONO)}>
                    <Timestamp value={entry.occurredAt} />
                  </span>
                </SheetCell>
              </SheetRow>
              {expanded && (
                <tr id={detailId} className="border-b border-[var(--border)] bg-[var(--bg2)]/20 last:border-b-0">
                  <td colSpan={COLUMNS.length} className="px-5 py-4">
                    <EntryDetail entry={entry} />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </SheetTable>
    );
  }

  const footer =
    ready && total > 0 ? (
      <>
        <span>
          {total > PAGE_SIZE
            ? `Showing ${formatNumber(page * PAGE_SIZE + 1)}–${formatNumber(Math.min(total, (page + 1) * PAGE_SIZE))} of ${formatNumber(total)}`
            : `All ${formatNumber(total)} entries shown. Entries cannot be edited or deleted.`}
        </span>
        {total > PAGE_SIZE && (
          <span className="flex items-center gap-2">
            <UiButton variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="size-3.5" aria-hidden="true" /> Previous
            </UiButton>
            <UiButton variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="size-3.5" aria-hidden="true" />
            </UiButton>
          </span>
        )}
      </>
    ) : undefined;

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Audit"
        description="Immutable trail of every workflow edit, publish, run transition, and approval decision. Expand an entry to compare its before and after state."
      />

      <Sheet label="Audit entries" toolbar={toolbar} footer={footer}>
        {body}
      </Sheet>
    </WorkspacePage>
  );
}
