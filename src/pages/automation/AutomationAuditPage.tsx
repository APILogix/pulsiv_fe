/**
 * Automation audit trail — `GET /audit`.
 *
 * The rows are immutable server-side (insert-only table with UPDATE/DELETE
 * triggers), so this surface is read-only. Requires an admin role; a 403 here
 * means the signed-in member cannot read the automation audit log.
 */
import { Fragment, useState } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Lock,
  ScrollText,
} from "lucide-react";
import { EmptyPanel, Notice, PageHero, Panel, Toolbar } from "@/shared/ui/pulse";
import { FilterSelect, JsonViewer, SearchInput, Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { useAutomationAudit, useAutomationScope } from "@/modules/automation/hooks/useAutomation";
import { AUDIT_ACTIONS, type AuditListQuery } from "@/modules/automation/api/types";
import { CodeChip, labelize, withAllOption } from "@/modules/automation/components/automation-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const PAGE_SIZE = 25;
const ACTION_OPTIONS = withAllOption(AUDIT_ACTIONS, "All actions");

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
    return (
      <Notice tone="amber" icon={AlertTriangle} title="No organization selected">
        Pick an organization to read its automation audit trail.
      </Notice>
    );
  }

  const entries = auditQuery.data?.data ?? [];
  const total = auditQuery.data?.total ?? 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;
  const forbidden = auditQuery.isError && apiErrorMessage(auditQuery.error).toLowerCase().includes("admin");

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Workflows"
        title="Automation audit"
        description="Immutable record of every workflow edit, publish, run transition, and approval decision."
        icon={ScrollText}
      />

      <Toolbar
        trailing={
          <span className="text-[12px] text-[var(--text3)]">
            {total} entr{total === 1 ? "y" : "ies"}
          </span>
        }
      >
        <SearchInput
          placeholder="Filter by workflow id…"
          defaultValue={workflowId}
          onSearch={(value) => {
            setWorkflowId(value.trim());
            setPage(0);
          }}
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
      </Toolbar>

      {auditQuery.isError && (
        <Notice
          tone={forbidden ? "amber" : "red"}
          icon={forbidden ? Lock : AlertTriangle}
          title={forbidden ? "Admin role required" : "Could not load the audit trail"}
        >
          {apiErrorMessage(auditQuery.error)}
        </Notice>
      )}

      <Panel bodyClassName="p-0">
        {auditQuery.isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="h-12 animate-pulse rounded-[9px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-5">
            <EmptyPanel
              icon={ScrollText}
              title="No audit entries"
              description="Entries are written as workflows are created, published, run, and approved."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Occurred</TableHead>
                <TableHead className="text-right">Links</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const expanded = expandedId === entry.id;
                return (
                  <Fragment key={entry.id}>
                    <TableRow>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-medium text-[var(--text)]">
                            {labelize(entry.action)}
                          </span>
                          <CodeChip>{entry.entityType}</CodeChip>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[12px] text-[var(--text2)]">
                          {entry.actorType === "user" ? "User" : labelize(entry.actorType)}
                          {entry.actorUserId ? ` · ${entry.actorUserId.slice(0, 8)}` : ""}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[12px] text-[var(--text3)]">
                          <Timestamp value={entry.occurredAt} />
                          {entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {entry.workflowId && (
                            <UiButton asChild variant="ghost" size="sm">
                              <Link to={`/automation/workflows/${entry.workflowId}`}>Workflow</Link>
                            </UiButton>
                          )}
                          {entry.runId && (
                            <UiButton asChild variant="ghost" size="sm">
                              <Link to={`/automation/runs/${entry.runId}`}>Run</Link>
                            </UiButton>
                          )}
                          <UiButton
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedId(expanded ? null : entry.id)}
                            aria-expanded={expanded}
                          >
                            {expanded ? "Hide" : "Diff"}
                          </UiButton>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow>
                        <TableCell colSpan={4} className="bg-[var(--bg2)]/40">
                          <div className="grid gap-3 py-1 lg:grid-cols-2">
                            <div>
                              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text3)]">
                                Before
                              </p>
                              <JsonViewer data={entry.beforeState ?? null} maxHeight={220} />
                            </div>
                            <div>
                              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text3)]">
                                After
                              </p>
                              <JsonViewer data={entry.afterState ?? null} maxHeight={220} />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[var(--text3)]">
            Showing {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <UiButton variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="size-3.5" /> Previous
            </UiButton>
            <UiButton variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="size-3.5" />
            </UiButton>
          </div>
        </div>
      )}
    </div>
  );
}
