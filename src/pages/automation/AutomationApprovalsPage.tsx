/**
 * Approvals queue: `GET /approvals` with approve and reject decisions.
 *
 * Rejection needs a reason (the backend requires 1 to 1000 characters);
 * approval reasons are optional. Both accept a decision payload as JSON.
 */
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fieldTextareaClass } from "@/shared/ui/pulse";
import { FilterSelect, Timestamp, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { DialogField, FormDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  ProjectPageHeader,
  Readouts,
  RowActions,
  RowTitle,
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
import {
  useApprovalMutations,
  useApprovals,
  useAutomationScope,
} from "@/modules/automation/hooks/useAutomation";
import {
  ACTION_RISK_LEVELS,
  APPROVAL_STATUSES,
  type ActionRiskLevel,
  type ApprovalDetail,
  type ApprovalListQuery,
  type ApprovalStatus,
} from "@/modules/automation/api/types";
import {
  ApprovalStatusPill,
  MONO,
  NoOrgNotice,
  RiskPill,
  labelize,
  plural,
  requiresApprovalRisk,
  withAllOption,
} from "@/modules/automation/components/automation-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md §1.2) ───────────────────

const PAGE_SIZE = 20;
const DEFAULT_STATUS = "pending";
const HOUR_MS = 60 * 60 * 1000;
const STATUS_OPTIONS = withAllOption(APPROVAL_STATUSES, "All statuses");
const RISK_OPTIONS = withAllOption(ACTION_RISK_LEVELS, "All risk levels");
const monoTextarea = `${fieldTextareaClass} min-h-[72px] font-[family-name:var(--mono)] text-[12px]`;

const COLUMNS: SheetColumn[] = [
  { key: "request", header: "Request" },
  { key: "risk", header: "Risk", className: "w-[130px]" },
  { key: "status", header: "Status", className: `w-[180px] ${HIDE_BELOW_MD}` },
  { key: "requestedBy", header: "Requested by", className: `w-[150px] ${HIDE_BELOW_LG}` },
  { key: "requested", header: "Requested", className: `w-[120px] ${HIDE_BELOW_LG}` },
  { key: "expires", header: "Expires", className: "w-[120px]", align: "right" },
  { key: "actions", header: "Actions", className: "w-[132px]", align: "right", srOnly: true },
];

type Decision = { approval: ApprovalDetail; kind: "approve" | "reject" };

function parseDecisionPayload(raw: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof raw !== "string" || raw.trim() === "") return {};
  const parsed = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Decision payload must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

function isExpired(approval: ApprovalDetail, now: number) {
  return new Date(approval.expiresAt).getTime() < now;
}

export default function AutomationApprovalsPage() {
  const { activeOrgId } = useAutomationScope();
  const [status, setStatus] = useState<string>(DEFAULT_STATUS);
  const [riskLevel, setRiskLevel] = useState("");
  const [page, setPage] = useState(0);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const query: ApprovalListQuery = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    ...(status ? { status: status as ApprovalStatus } : {}),
    ...(riskLevel ? { riskLevel: riskLevel as ActionRiskLevel } : {}),
  };

  const approvalsQuery = useApprovals(query);
  const { approve, reject } = useApprovalMutations();

  if (!activeOrgId) {
    return <NoOrgNotice>Pick an organization to review approvals.</NoOrgNotice>;
  }

  const approvals = approvalsQuery.data?.data ?? [];
  const total = approvalsQuery.data?.total ?? 0;
  const ready = Boolean(approvalsQuery.data);
  const hasNext = (page + 1) * PAGE_SIZE < total;
  const pending = approve.isPending || reject.isPending;

  // Readouts describe the loaded page only; the sub lines say so.
  const now = Date.now();
  const open = approvals.filter((approval) => approval.status === "pending" && !isExpired(approval, now));
  const openHighRisk = open.filter((approval) => requiresApprovalRisk(approval.riskLevel as ActionRiskLevel)).length;
  const expiringSoon = open.filter((approval) => new Date(approval.expiresAt).getTime() - now < HOUR_MS).length;
  const pageScope = `On this page of ${formatNumber(approvals.length)}`;

  const readouts: Readout[] = [
    {
      label: "Pending",
      value: ready ? formatNumber(open.length) : "—",
      sub: pageScope,
      tone: ready && open.length > 0 ? "warn" : "neutral",
    },
    {
      label: "High or critical",
      value: ready ? formatNumber(openHighRisk) : "—",
      sub: "Pending on this page",
      tone: ready && openHighRisk > 0 ? "bad" : "neutral",
    },
    {
      label: "Expiring within 1h",
      value: ready ? formatNumber(expiringSoon) : "—",
      sub: "Pending on this page",
      tone: ready && expiringSoon > 0 ? "warn" : "neutral",
    },
    {
      label: "Matching requests",
      value: ready ? formatNumber(total) : "—",
      sub: status ? `${labelize(status)}${riskLevel ? `, ${riskLevel} risk` : ""}` : "All statuses",
    },
  ];

  const filtersActive = status !== DEFAULT_STATUS || riskLevel !== "";
  const clearFilters = () => {
    setStatus("");
    setRiskLevel("");
    setPage(0);
  };

  const handleDecision = (form: FormData) => {
    if (!decision) return;
    setDialogError(null);

    let decisionPayload: Record<string, unknown>;
    try {
      decisionPayload = parseDecisionPayload(form.get("decisionPayload"));
    } catch (error) {
      setDialogError((error as Error).message);
      return;
    }

    const reason = (form.get("reason") as string | null)?.trim() ?? "";

    if (decision.kind === "reject") {
      if (reason === "") {
        setDialogError("A rejection reason is required.");
        return;
      }
      reject.mutate(
        { id: decision.approval.id, reason, decisionPayload },
        {
          onSuccess: () => {
            toast.success("Approval rejected");
            setDecision(null);
          },
          onError: (error) => setDialogError(apiErrorMessage(error, "Could not reject this request.")),
        },
      );
      return;
    }

    approve.mutate(
      { id: decision.approval.id, ...(reason ? { reason } : {}), decisionPayload },
      {
        onSuccess: () => {
          toast.success("Approved — the run will resume");
          setDecision(null);
        },
        onError: (error) => setDialogError(apiErrorMessage(error, "Could not approve this request.")),
      },
    );
  };

  const toolbar = (
    <>
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
        label="Risk"
        value={riskLevel}
        options={RISK_OPTIONS}
        onChange={(value) => {
          setRiskLevel(value);
          setPage(0);
        }}
      />
      {ready && <ToolbarCount>{plural(total, "request")}</ToolbarCount>}
    </>
  );

  let body: ReactNode;
  if (approvalsQuery.isLoading || (!approvalsQuery.data && !approvalsQuery.isError)) {
    body = <SheetLoading rows={5} label="Loading approvals" />;
  } else if (approvalsQuery.isError) {
    body = (
      <SheetError
        title="Could not load approvals"
        message={apiErrorMessage(approvalsQuery.error, "The approvals request failed.")}
        onRetry={() => void approvalsQuery.refetch()}
      />
    );
  } else if (approvals.length === 0 && page > 0) {
    body = (
      <SheetEmpty
        title="This page is empty"
        description="Requests were decided or expired since the page loaded."
        action={
          <UiButton variant="outline" size="sm" onClick={() => setPage(0)}>
            Go to first page
          </UiButton>
        }
      />
    );
  } else if (approvals.length === 0 && !filtersActive) {
    body = (
      <SheetEmpty
        title="Nothing waiting for review"
        description="Requests appear here when a run reaches a high-risk or dangerous action. Decided and expired requests stay in the history."
        action={
          <UiButton variant="outline" size="sm" onClick={clearFilters}>
            Show all statuses
          </UiButton>
        }
      />
    );
  } else if (approvals.length === 0 && status === "" && riskLevel === "") {
    body = (
      <SheetEmpty
        title="No approval requests yet"
        description="Requests appear here when a run reaches a high-risk or dangerous action."
      />
    );
  } else if (approvals.length === 0) {
    body = (
      <SheetEmpty
        title="No requests match these filters"
        description="Try a different status or risk level."
        action={
          <UiButton variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    );
  } else {
    body = (
      <SheetTable
        columns={COLUMNS}
        caption="Approval requests. Open a request to see what will run."
        minWidth={560}
      >
        {approvals.map((approval) => {
          const expired = isExpired(approval, now);
          const decidable = approval.status === "pending" && !expired;
          const workflowName = approval.workflowName || "Workflow";
          const reason = approval.rejectionReason ?? approval.approvalReason;
          const blocked = expired && approval.status === "pending"
            ? "Expired; decisions are closed"
            : `Already ${labelize(approval.status).toLowerCase()}`;
          return (
            <SheetRow key={approval.id}>
              <SheetCell>
                <RowTitle
                  title={workflowName}
                  to={`/automation/approvals/${approval.id}`}
                  subtitleMono
                  subtitle={`${approval.actionType ?? "action"} · run ${approval.runId.slice(0, 8)}`}
                />
              </SheetCell>
              <SheetCell>
                <RiskPill risk={approval.riskLevel} />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                <div className="flex min-w-0 flex-col items-start gap-1">
                  <ApprovalStatusPill status={approval.status} />
                  {reason && (
                    <span
                      className={cn(
                        "block max-w-full truncate text-[11.5px]",
                        approval.rejectionReason ? "text-[var(--red)]" : "text-[var(--text3)]",
                      )}
                      title={reason}
                    >
                      {reason}
                    </span>
                  )}
                </div>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                {approval.requestedBy ? (
                  <span className={cn("text-[12px] text-[var(--text2)]", MONO)} title={approval.requestedBy}>
                    {approval.requestedBy.slice(0, 8)}
                  </span>
                ) : (
                  <span className="text-[12px] text-[var(--text3)]">System</span>
                )}
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                <Timestamp value={approval.createdAt} />
              </SheetCell>
              <SheetCell align="right">
                {expired && approval.status === "pending" ? (
                  <span className="whitespace-nowrap text-[12px] text-[var(--red)]">Expired</span>
                ) : (
                  <span className="whitespace-nowrap">
                    <Timestamp value={approval.expiresAt} />
                  </span>
                )}
              </SheetCell>
              <SheetCell align="right">
                <div className="flex items-center justify-end gap-1.5">
                  {decidable && (
                    <UiButton
                      size="sm"
                      disabled={pending}
                      onClick={() => setDecision({ approval, kind: "approve" })}
                    >
                      Approve
                    </UiButton>
                  )}
                  <RowActions label={`Actions for ${workflowName} approval`}>
                    <DropdownMenuItem asChild>
                      <Link to={`/automation/approvals/${approval.id}`}>Open request</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/automation/runs/${approval.runId}`}>Open run</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={!decidable || pending}
                      onSelect={() => setDecision({ approval, kind: "reject" })}
                    >
                      {decidable ? (
                        "Reject request"
                      ) : (
                        <span className="flex flex-col">
                          <span>Reject request</span>
                          <span className="text-[11.5px] text-[var(--text3)]">{blocked}</span>
                        </span>
                      )}
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
    ready && total > 0 && approvals.length > 0 ? (
      <>
        <span className="tabular-nums">
          Showing {formatNumber(page * PAGE_SIZE + 1)}–{formatNumber(Math.min(total, page * PAGE_SIZE + approvals.length))} of{" "}
          {formatNumber(total)}
        </span>
        {total > PAGE_SIZE && (
          <div className="flex items-center gap-2">
            <UiButton variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft aria-hidden="true" /> Previous
            </UiButton>
            <UiButton variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage(page + 1)}>
              Next <ChevronRight aria-hidden="true" />
            </UiButton>
          </div>
        )}
      </>
    ) : undefined;

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Approvals"
        description="High-risk workflow actions pause here. Approving resumes the run; rejecting stops it and records the reason."
      />

      <Readouts cells={readouts} loading={approvalsQuery.isLoading} label="Approvals summary" />

      <Sheet label="Approval requests" toolbar={toolbar} footer={footer}>
        {body}
      </Sheet>

      <FormDialog
        open={!!decision}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDecision(null);
            setDialogError(null);
          }
        }}
        title={decision?.kind === "reject" ? "Reject this action?" : "Approve this action?"}
        description={
          decision?.kind === "reject"
            ? "The run stops at this step and the reason is written to the audit trail."
            : "The run resumes and the action executes with the risk you have accepted."
        }
        submitLabel={decision?.kind === "reject" ? "Reject" : "Approve"}
        pending={pending}
        error={dialogError}
        onSubmit={handleDecision}
      >
        <DialogField
          label="Reason"
          name="reason"
          required={decision?.kind === "reject"}
          hint={decision?.kind === "reject" ? "Required, up to 1000 characters." : "Optional context for the audit log."}
        >
          <textarea id="reason" name="reason" className={fieldTextareaClass} maxLength={1000} />
        </DialogField>
        <DialogField label="Decision payload (JSON)" name="decisionPayload" hint="Passed to the resumed action.">
          <textarea
            id="decisionPayload"
            name="decisionPayload"
            className={monoTextarea}
            defaultValue="{}"
            spellCheck={false}
          />
        </DialogField>
        {decision && (
          <p className="text-[12px] text-[var(--text3)]">
            {labelize(decision.approval.actionType)} on {decision.approval.workflowName || "this workflow"} ·{" "}
            {decision.approval.riskLevel} risk
          </p>
        )}
      </FormDialog>
    </WorkspacePage>
  );
}
