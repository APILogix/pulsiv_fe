/**
 * Workflow inventory — the primary automation surface.
 *
 * Wires `GET /workflows`, `POST /workflows`, `POST /workflows/:id/{enable,disable,publish,run}`
 * and `DELETE /workflows/:id`. The row switch calls enable/disable directly; the
 * backend refuses `enable` until a version has been published, so drafts show a
 * blocked switch with the reason inline.
 */
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileStack,
  Plus,
  Rocket,
  Trash2,
  Workflow as WorkflowIcon,
  Zap,
} from "lucide-react";
import {
  EmptyPanel,
  Notice,
  PageHero,
  Panel,
  Pill,
  Row,
  RowStack,
  Toolbar,
} from "@/shared/ui/pulse";
import { FilterSelect, SearchInput, Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
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
  EntitlementNote,
  PowerToggle,
  RunStatusPill,
  WorkflowStatusPill,
  labelize,
  withAllOption,
} from "@/modules/automation/components/automation-ui";
import { WorkflowFormDialog } from "@/modules/automation/components/WorkflowFormDialog";

// ── module-level constants (rules.md §1.2) ───────────────────

const PAGE_SIZE = 20;
const STATUS_OPTIONS = withAllOption(WORKFLOW_STATUSES, "All statuses");
const TYPE_OPTIONS = withAllOption(WORKFLOW_TYPES, "All types");
const ENABLED_OPTIONS = [
  { value: "", label: "On and off" },
  { value: "enabled", label: "Switched on only" },
];

export default function AutomationWorkflowsPage() {
  const { activeOrgId } = useAutomationScope();
  const [status, setStatus] = useState("");
  const [workflowType, setWorkflowType] = useState("");
  const [enabledOnly, setEnabledOnly] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowSummary | null>(null);

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
    return (
      <Notice tone="amber" icon={AlertTriangle} title="No organization selected">
        Pick an organization to manage automation workflows.
      </Notice>
    );
  }

  const workflows = workflowsQuery.data?.data ?? [];
  const total = workflowsQuery.data?.total ?? 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;

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

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Workflows"
        title="Workflows"
        description="Every automation in this organization. Switch one on to let its published version react to live events."
        icon={WorkflowIcon}
        actions={
          <>
            <UiButton asChild variant="outline" size="lg">
              <Link to="/automation/templates">
                <FileStack className="size-4" /> Templates
              </Link>
            </UiButton>
            <UiButton size="lg" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> New workflow
            </UiButton>
          </>
        }
      />

      <Toolbar
        trailing={
          <span className="text-[12px] text-[var(--text3)]">
            {total} workflow{total === 1 ? "" : "s"}
          </span>
        }
      >
        <SearchInput
          placeholder="Search workflows…"
          defaultValue={search}
          onSearch={(value) => {
            setSearch(value);
            setPage(0);
          }}
        />
        <FilterSelect
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => {
            setStatus(value);
            setPage(0);
          }}
        />
        <FilterSelect
          label="Type"
          value={workflowType}
          options={TYPE_OPTIONS}
          onChange={(value) => {
            setWorkflowType(value);
            setPage(0);
          }}
        />
        <FilterSelect
          label="State"
          value={enabledOnly}
          options={ENABLED_OPTIONS}
          onChange={(value) => {
            setEnabledOnly(value);
            setPage(0);
          }}
        />
      </Toolbar>

      {workflowsQuery.isError && (
        <Notice tone="red" icon={AlertTriangle} title="Could not load workflows">
          {apiErrorMessage(workflowsQuery.error)}
        </Notice>
      )}

      <Panel bodyClassName="p-0">
        {workflowsQuery.isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="h-14 animate-pulse rounded-[9px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <div className="p-5">
            <EmptyPanel
              icon={WorkflowIcon}
              title="No workflows match"
              description="Adjust the filters, or create a workflow from scratch or a template."
              action={
                <UiButton size="lg" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" /> New workflow
                </UiButton>
              }
            />
          </div>
        ) : (
          <RowStack>
            {workflows.map((workflow) => {
              const blockedReason = workflow.entitlementUnavailable
                ? (workflow.unavailableReason ?? "Plan upgrade required")
                : workflow.status === "draft"
                  ? "Publish a version before switching this on"
                  : null;

              return (
                <Row key={workflow.id} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/automation/workflows/${workflow.id}`}
                        className="truncate text-[14px] font-medium text-[var(--text)] hover:text-[var(--brand)]"
                      >
                        {workflow.name}
                      </Link>
                      <WorkflowStatusPill status={workflow.status} />
                      {workflow.actionRequiresApproval.some(Boolean) && (
                        <Pill tone="amber">Approval</Pill>
                      )}
                      <EntitlementNote
                        unavailable={workflow.entitlementUnavailable}
                        reason={workflow.unavailableReason}
                      />
                    </div>
                    <p className="truncate text-[12px] text-[var(--text3)]">
                      {labelize(workflow.workflowType)} · {workflow.triggerType ?? "no trigger"} ·{" "}
                      {workflow.actionCount} action{workflow.actionCount === 1 ? "" : "s"} · v
                      {workflow.currentVersion}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--text3)]">
                      {workflow.lastRunStatus ? (
                        <>
                          <RunStatusPill status={workflow.lastRunStatus} />
                          {workflow.lastRunCreatedAt && <Timestamp value={workflow.lastRunCreatedAt} />}
                        </>
                      ) : (
                        <span>Never run</span>
                      )}
                      {workflow.tags.length > 0 && <span>· {workflow.tags.join(", ")}</span>}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <PowerToggle
                      checked={workflow.isEnabled}
                      onChange={(next) => handleToggle(workflow, next)}
                      label={`Switch ${workflow.name} ${workflow.isEnabled ? "off" : "on"}`}
                      pending={pendingToggleId === workflow.id && toggleWorkflow.isPending}
                      blockedReason={blockedReason}
                    />
                    <UiButton
                      variant="outline"
                      size="sm"
                      onClick={() => handlePublish(workflow)}
                      disabled={publishWorkflow.isPending}
                    >
                      <Rocket className="size-3.5" /> Publish
                    </UiButton>
                    <UiButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleRun(workflow)}
                      disabled={runWorkflow.isPending || !workflow.isEnabled}
                      title={workflow.isEnabled ? undefined : "Switch the workflow on to run it"}
                    >
                      <Zap className="size-3.5" /> Run
                    </UiButton>
                    <UiButton
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Archive ${workflow.name}`}
                      onClick={() => setDeleteTarget(workflow)}
                    >
                      <Trash2 className="size-3.5 text-[var(--red)]" />
                    </UiButton>
                  </div>
                </Row>
              );
            })}
          </RowStack>
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
    </div>
  );
}
