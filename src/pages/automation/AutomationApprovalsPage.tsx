/**
 * Approval queue — `GET /approvals` with approve/reject decisions.
 *
 * Rejection needs a reason (backend requires 1-1000 chars); approval reasons are
 * optional. Both accept an arbitrary decision payload, exposed here as JSON.
 */
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  X,
} from "lucide-react";
import {
  EmptyPanel,
  Notice,
  PageHero,
  Panel,
  Row,
  RowStack,
  Toolbar,
  fieldTextareaClass,
} from "@/shared/ui/pulse";
import { FilterSelect, Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DialogField, FormDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";
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
  CodeChip,
  RiskPill,
  labelize,
  withAllOption,
} from "@/modules/automation/components/automation-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const PAGE_SIZE = 20;
const STATUS_OPTIONS = withAllOption(APPROVAL_STATUSES, "All statuses");
const RISK_OPTIONS = withAllOption(ACTION_RISK_LEVELS, "All risk levels");
const monoTextarea = `${fieldTextareaClass} min-h-[72px] font-[family-name:var(--mono)] text-[12px]`;

type Decision = { approval: ApprovalDetail; kind: "approve" | "reject" };

function parseDecisionPayload(raw: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof raw !== "string" || raw.trim() === "") return {};
  const parsed = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Decision payload must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

export default function AutomationApprovalsPage() {
  const { activeOrgId } = useAutomationScope();
  const [status, setStatus] = useState<string>("pending");
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
    return (
      <Notice tone="amber" icon={AlertTriangle} title="No organization selected">
        Pick an organization to review approvals.
      </Notice>
    );
  }

  const approvals = approvalsQuery.data?.data ?? [];
  const total = approvalsQuery.data?.total ?? 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;
  const pending = approve.isPending || reject.isPending;

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

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Workflows"
        title="Approvals"
        description="High-risk automation actions pause here. Approving resumes the run; rejecting stops it and records the reason."
        icon={ClipboardCheck}
      />

      <Toolbar
        trailing={
          <span className="text-[12px] text-[var(--text3)]">
            {total} request{total === 1 ? "" : "s"}
          </span>
        }
      >
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
      </Toolbar>

      {approvalsQuery.isError && (
        <Notice tone="red" icon={AlertTriangle} title="Could not load approvals">
          {apiErrorMessage(approvalsQuery.error)}
        </Notice>
      )}

      <Panel bodyClassName="p-0">
        {approvalsQuery.isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-14 animate-pulse rounded-[9px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : approvals.length === 0 ? (
          <div className="p-5">
            <EmptyPanel
              icon={ClipboardCheck}
              title="Nothing to review"
              description="Approval requests show up when a run reaches a high-risk or dangerous action."
            />
          </div>
        ) : (
          <RowStack>
            {approvals.map((approval) => {
              const expired = new Date(approval.expiresAt).getTime() < Date.now();
              const decidable = approval.status === "pending" && !expired;
              return (
                <Row key={approval.id} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/automation/approvals/${approval.id}`}
                        className="truncate text-[13.5px] font-medium text-[var(--text)] hover:text-[var(--brand)]"
                      >
                        {approval.workflowName || "Workflow"}
                      </Link>
                      <ApprovalStatusPill status={approval.status} />
                      <RiskPill risk={approval.riskLevel} />
                      {expired && approval.status === "pending" && (
                        <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--red)]">
                          <Clock className="size-3" aria-hidden="true" /> expired
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[12px] text-[var(--text3)]">
                      {approval.actionType ? <CodeChip>{approval.actionType}</CodeChip> : "Action unknown"} · requested{" "}
                      <Timestamp value={approval.createdAt} /> · expires <Timestamp value={approval.expiresAt} />
                    </p>
                    {approval.approvalReason && (
                      <p className="truncate text-[12px] text-[var(--text2)]">{approval.approvalReason}</p>
                    )}
                    {approval.rejectionReason && (
                      <p className="truncate text-[12px] text-[var(--red)]">{approval.rejectionReason}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <UiButton asChild variant="ghost" size="sm">
                      <Link to={`/automation/runs/${approval.runId}`}>View run</Link>
                    </UiButton>
                    <UiButton
                      variant="outline"
                      size="sm"
                      disabled={!decidable || pending}
                      onClick={() => setDecision({ approval, kind: "reject" })}
                    >
                      <X className="size-3.5 text-[var(--red)]" /> Reject
                    </UiButton>
                    <UiButton
                      size="sm"
                      disabled={!decidable || pending}
                      onClick={() => setDecision({ approval, kind: "approve" })}
                    >
                      <Check className="size-3.5" /> Approve
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

      <FormDialog
        open={!!decision}
        onOpenChange={(open) => {
          if (!open) {
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
    </div>
  );
}
