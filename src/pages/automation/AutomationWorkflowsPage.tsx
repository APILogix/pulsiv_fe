/**
 * Workflow inventory, the primary Workflows surface.
 *
 * Wires `GET /workflows`, `POST /workflows`, `POST /workflows/:id/{enable,disable,publish,run}`
 * and `DELETE /workflows/:id`. The row switch calls enable/disable directly; the
 * backend refuses `enable` until a version has been published, so drafts show a
 * blocked switch with the reason on hover.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, FileStack, Plus, Rocket, Trash2, Zap } from "lucide-react";
import { Pill } from "@/shared/ui/pulse";
import { FilterSelect, Timestamp, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  ProjectPageHeader,
  Readouts,
  RowActions,
  RowTitle,
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
import { ConfirmDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  useAutomationScope,
  useWorkflowMutations,
  useWorkflows,
} from "@/modules/automation/hooks/useAutomation";
import {
  WORKFLOW_STATUSES,
  WORKFLOW_TYPES,
  type CreateWorkflowBody,
  type WorkflowListQuery,
  type WorkflowStatus,
  type WorkflowSummary,
  type WorkflowType,
} from "@/modules/automation/api/types";
import {
  CodeChip,
  EntitlementNote,
  MONO,
  NoOrgNotice,
  PowerToggle,
  RunStatusPill,
  WorkflowStatusPill,
  labelize,
  plural,
  withAllOption,
} from "@/modules/automation/components/automation-ui";
import { WorkflowFormDialog } from "@/modules/automation/components/WorkflowFormDialog";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md §1.2) ───────────────────

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const STATUS_OPTIONS = withAllOption(WORKFLOW_STATUSES, "All statuses");
const TYPE_OPTIONS = withAllOption(WORKFLOW_TYPES, "All types");
const ENABLED_OPTIONS = [
  { value: "", label: "On and off" },
  { value: "enabled", label: "Switched on only" },
];

const COLUMNS: SheetColumn[] = [
  { key: "workflow", header: "Workflow" },
  { key: "trigger", header: "Trigger", className: `w-[190px] ${HIDE_BELOW_MD}` },
  { key: "lastRun", header: "Last run", className: `w-[170px] ${HIDE_BELOW_LG}` },
  { key: "enabled", header: "On", className: "w-[72px]" },
  { key: "actions", header: "Actions", className: "w-[110px]", align: "right", srOnly: true },
];

function blockedReasonFor(workflow: WorkflowSummary): string | null {
  if (workflow.entitlementUnavailable) return workflow.unavailableReason ?? "Plan upgrade required";
  if (workflow.status === "draft") return "Publish a version before switching this on";
  return null;
}

export default function AutomationWorkflowsPage() {
  const navigate = useNavigate();
  const { activeOrgId } = useAutomationScope();
  const [status, setStatus] = useState("");
  const [workflowType, setWorkflowType] = useState("");
  const [enabledOnly, setEnabledOnly] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowSummary | null>(null);

  // SearchField is instant; commit the server search after a short pause so
  // each keystroke does not become its own request.
  useEffect(() => {
    const next = searchDraft.trim();
    if (next === search) return;
    const timer = window.setTimeout(() => {
      setSearch(next);
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchDraft, search]);

  const query: WorkflowListQuery = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    ...(status ? { status: status as WorkflowStatus } : {}),
    ...(workflowType ? { workflowType: workflowType as WorkflowType } : {}),
    // `isEnabled` is coerced server-side, so only ever send `true`.
    ...(enabledOnly === "enabled" ? { isEnabled: true as const } : {}),
    ...(search ? { search } : {}),
  };

  const workflowsQuery = useWorkflows(query);
  const { createWorkflow, deleteWorkflow, toggleWorkflow, publishWorkflow, runWorkflow } =
    useWorkflowMutations();

  if (!activeOrgId) {
    return <NoOrgNotice>Pick an organization to manage its workflows.</NoOrgNotice>;
  }

  const workflows = workflowsQuery.data?.data ?? [];
  const total = workflowsQuery.data?.total ?? 0;
  const ready = Boolean(workflowsQuery.data);
  const hasNext = (page + 1) * PAGE_SIZE < total;
  const filtersActive = Boolean(status || workflowType || enabledOnly || search || searchDraft.trim());

  const onPage = {
    enabled: workflows.filter((workflow) => workflow.isEnabled).length,
    drafts: workflows.filter((workflow) => workflow.status === "draft").length,
    blocked: workflows.filter((workflow) => workflow.entitlementUnavailable).length,
  };

  const clearFilters = () => {
    setStatus("");
    setWorkflowType("");
    setEnabledOnly("");
    setSearchDraft("");
    setSearch("");
    setPage(0);
  };

  const handleToggle = (workflow: WorkflowSummary, next: boolean) => {
    setPendingToggleId(workflow.id);
    toggleWorkflow.mutate(
      { id: workflow.id, enabled: next },
      {
        onSuccess: () => toast.success(next ? `${workflow.name} switched on` : `${workflow.name} switched off`),
        onError: (error) => toast.error(apiErrorMessage(error, "Could not change the workflow state.")),
        onSettled: () => setPendingToggleId(null),
      },
    );
  };

  const handlePublish = (workflow: WorkflowSummary) => {
    publishWorkflow.mutate(
      { id: workflow.id, activateOnPublish: true },
      {
        onSuccess: (version) => toast.success(`Published version ${version.version}`),
        onError: (error) => toast.error(apiErrorMessage(error, "Publish failed.")),
      },
    );
  };

  const handleRun = (workflow: WorkflowSummary) => {
    runWorkflow.mutate(
      { id: workflow.id },
      {
        onSuccess: (result) => toast.success(`Run queued (${result.steps.length} steps)`),
        onError: (error) => toast.error(apiErrorMessage(error, "Could not start a run.")),
      },
    );
  };

  const handleCreate = (body: CreateWorkflowBody) => {
    createWorkflow.mutate(body, {
      onSuccess: (workflow) => {
        toast.success(`${workflow.name} created as a draft`);
        setCreateOpen(false);
      },
      onError: (error) => toast.error(apiErrorMessage(error, "Could not create the workflow.")),
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteWorkflow.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`${deleteTarget.name} archived`);
        setDeleteTarget(null);
      },
      onError: (error) => toast.error(apiErrorMessage(error, "Could not archive the workflow.")),
    });
  };

  const pageScope = `On this page of ${formatNumber(workflows.length)}`;
  const readouts: Readout[] = [
    {
      label: "Total",
      value: ready ? formatNumber(total) : "—",
      sub: filtersActive ? "Matching these filters" : "In this organization",
    },
    {
      label: "On",
      value: ready ? formatNumber(onPage.enabled) : "—",
      sub: pageScope,
    },
    {
      label: "Drafts",
      value: ready ? formatNumber(onPage.drafts) : "—",
      sub: `${pageScope}; publish before enabling`,
    },
    {
      label: "Needs plan upgrade",
      value: ready ? formatNumber(onPage.blocked) : "—",
      sub: pageScope,
      tone: ready && onPage.blocked > 0 ? "warn" : "neutral",
    },
  ];

  const withPageReset = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(0);
  };

  const toolbar = (
    <>
      <SearchField
        value={searchDraft}
        onChange={setSearchDraft}
        placeholder="Search workflows"
        label="Search workflows by name"
      />
      <FilterSelect label="Status" value={status} options={STATUS_OPTIONS} onChange={withPageReset(setStatus)} />
      <FilterSelect label="Type" value={workflowType} options={TYPE_OPTIONS} onChange={withPageReset(setWorkflowType)} />
      <FilterSelect label="State" value={enabledOnly} options={ENABLED_OPTIONS} onChange={withPageReset(setEnabledOnly)} />
      {ready && <ToolbarCount>{plural(total, "workflow")}</ToolbarCount>}
    </>
  );

  let body: ReactNode;
  if (workflowsQuery.isLoading || (!workflowsQuery.data && !workflowsQuery.isError)) {
    body = <SheetLoading rows={5} label="Loading workflows" />;
  } else if (workflowsQuery.isError) {
    body = (
      <SheetError
        title="Could not load workflows"
        message={apiErrorMessage(workflowsQuery.error, "The workflows request failed.")}
        onRetry={() => void workflowsQuery.refetch()}
      />
    );
  } else if (workflows.length === 0 && filtersActive) {
    body = (
      <SheetEmpty
        title="No workflows match these filters"
        description="Try a different status, type, or search term."
        action={
          <UiButton variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    );
  } else if (workflows.length === 0) {
    body = (
      <SheetEmpty
        title="No workflows yet"
        description="A workflow pairs a trigger with conditions and actions. Build one from scratch or start from a template."
        action={
          <>
            <UiButton size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" aria-hidden="true" />
              New workflow
            </UiButton>
            <UiButton asChild variant="outline" size="sm">
              <Link to="/automation/templates">Browse templates</Link>
            </UiButton>
          </>
        }
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Workflows in this organization" minWidth={480}>
        {workflows.map((workflow) => {
          const detailPath = `/automation/workflows/${workflow.id}`;
          const needsApproval = workflow.actionRequiresApproval.some(Boolean);
          return (
            <SheetRow key={workflow.id} onActivate={() => navigate(detailPath)}>
              <SheetCell>
                <div className="flex min-w-0 flex-col gap-1">
                  <RowTitle
                    title={workflow.name}
                    to={detailPath}
                    badges={
                      <>
                        <WorkflowStatusPill status={workflow.status} />
                        {needsApproval && <Pill tone="amber">Approval</Pill>}
                      </>
                    }
                    subtitle={
                      <>
                        {labelize(workflow.workflowType)} · {plural(workflow.actionCount, "action")} ·{" "}
                        <span className={cn(MONO, "text-[11.5px]")}>v{workflow.currentVersion}</span>
                        {workflow.tags.length > 0 ? ` · ${workflow.tags.join(", ")}` : ""}
                      </>
                    }
                  />
                  <EntitlementNote
                    unavailable={workflow.entitlementUnavailable}
                    reason={workflow.unavailableReason}
                  />
                </div>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                {workflow.triggerType ? (
                  <CodeChip>{workflow.triggerType}</CodeChip>
                ) : (
                  <span className="text-[12px] text-[var(--text3)]">No trigger</span>
                )}
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                {workflow.lastRunStatus ? (
                  <div className="flex flex-col items-start gap-1">
                    <RunStatusPill status={workflow.lastRunStatus} />
                    {workflow.lastRunCreatedAt && (
                      <span className={cn("text-[11.5px] text-[var(--text3)]", MONO)}>
                        <Timestamp value={workflow.lastRunCreatedAt} />
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[12px] text-[var(--text3)]">Never run</span>
                )}
              </SheetCell>
              <SheetCell>
                <PowerToggle
                  checked={workflow.isEnabled}
                  onChange={(next) => handleToggle(workflow, next)}
                  label={`Switch ${workflow.name} ${workflow.isEnabled ? "off" : "on"}`}
                  pending={pendingToggleId === workflow.id && toggleWorkflow.isPending}
                  blockedReason={blockedReasonFor(workflow)}
                />
              </SheetCell>
              <SheetCell align="right">
                <div className="flex items-center justify-end gap-1.5">
                  <UiButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleRun(workflow)}
                    disabled={runWorkflow.isPending || !workflow.isEnabled}
                    title={workflow.isEnabled ? undefined : "Switch the workflow on to run it"}
                    aria-label={`Run ${workflow.name}`}
                  >
                    <Zap className="size-3.5" aria-hidden="true" />
                    Run
                  </UiButton>
                  <RowActions label={`Actions for ${workflow.name}`}>
                    <DropdownMenuItem onClick={() => handlePublish(workflow)} disabled={publishWorkflow.isPending}>
                      <Rocket className="size-3.5" aria-hidden="true" />
                      {publishWorkflow.isPending ? "Publishing…" : "Publish"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(workflow)}>
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Archive
                    </DropdownMenuItem>
                  </RowActions>
                </div>
              </SheetCell>
            </SheetRow>
          );
        })}
      </SheetTable>
    );
  }

  const footer =
    ready && total > 0 ? (
      <>
        <span className="tabular-nums">
          {total > PAGE_SIZE
            ? `Showing ${formatNumber(page * PAGE_SIZE + 1)}–${formatNumber(Math.min(total, (page + 1) * PAGE_SIZE))} of ${formatNumber(total)}`
            : `All ${plural(total, "workflow")} shown`}
        </span>
        {total > PAGE_SIZE && (
          <div className="flex items-center gap-2">
            <UiButton variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              Previous
            </UiButton>
            <UiButton variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage(page + 1)}>
              Next
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </UiButton>
          </div>
        )}
      </>
    ) : undefined;

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Workflows"
        description="Every workflow in this organization. Switch one on to let its published version react to live events."
        actions={
          <>
            <UiButton asChild variant="outline" size="lg">
              <Link to="/automation/templates">
                <FileStack className="size-4" aria-hidden="true" />
                Templates
              </Link>
            </UiButton>
            <UiButton size="lg" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              New workflow
            </UiButton>
          </>
        }
      />

      <Readouts cells={readouts} loading={workflowsQuery.isLoading} label="Workflow summary" />

      <Sheet label="Workflows" toolbar={toolbar} footer={footer}>
        {body}
      </Sheet>

      {createOpen && (
        <WorkflowFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          mode="create"
          pending={createWorkflow.isPending}
          onCreate={handleCreate}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Archive this workflow?"
        description={
          deleteTarget
            ? `${deleteTarget.name} stops reacting to events. Runs already recorded stay in the history.`
            : undefined
        }
        confirmLabel="Archive"
        pending={deleteWorkflow.isPending}
        onConfirm={handleDelete}
      />
    </WorkspacePage>
  );
}
