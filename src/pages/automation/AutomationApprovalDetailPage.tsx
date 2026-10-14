/**
 * Approval detail: `GET /approvals/:approvalId` plus the approve and reject
 * decisions. The held action sits on the sequence spine as the stage in focus.
 */
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { Check, Clock, ShieldAlert, X } from "lucide-react";
import { Notice, Panel, fieldTextareaClass } from "@/shared/ui/pulse";
import { JsonViewer, Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DialogField, FormDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  ProjectPageHeader,
  Readouts,
  Sheet,
  SheetError,
  WorkspacePage,
  type Readout,
} from "@/modules/projects/components/project-page";
import {
  useApproval,
  useApprovalMutations,
  useAutomationScope,
} from "@/modules/automation/hooks/useAutomation";
import {
  ApprovalStatusPill,
  CodeChip,
  DetailLoading,
  FactGrid,
  NoOrgNotice,
  RiskPill,
  Sequence,
  SequenceStage,
  labelize,
  stageToneForStatus,
} from "@/modules/automation/components/automation-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const CRUMBS_BASE = [
  { label: "Workflows", to: "/automation" },
  { label: "Approvals", to: "/automation/approvals" },
];
const monoTextarea = `${fieldTextareaClass} min-h-[72px] font-[family-name:var(--mono)] text-[12px]`;

function parseDecisionPayload(raw: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof raw !== "string" || raw.trim() === "") return {};
  const parsed = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Decision payload must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

/** Actor ids render short and mono; a missing requester is the system. */
function shortActor(id: string | null, fallback: string) {
  return id ? id.slice(0, 8) : fallback;
}

export default function AutomationApprovalDetailPage() {
  const { approvalId } = useParams<{ approvalId: string }>();
  const { activeOrgId } = useAutomationScope();
  const approvalQuery = useApproval(approvalId);
  const { approve, reject } = useApprovalMutations();

  const [kind, setKind] = useState<"approve" | "reject" | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  if (!activeOrgId) {
    return <NoOrgNotice>Pick an organization to review this approval.</NoOrgNotice>;
  }

  if (approvalQuery.isLoading) {
    return <DetailLoading label="Loading approval" />;
  }

  if (approvalQuery.isError || !approvalQuery.data) {
    return (
      <WorkspacePage>
        <ProjectPageHeader title="Approval" crumbs={[...CRUMBS_BASE, { label: "Approval" }]} />
        <Sheet label="Approval">
          <SheetError
            title="Could not load this approval"
            message={apiErrorMessage(approvalQuery.error, "The request may have been removed or belong to another organization.")}
            onRetry={() => void approvalQuery.refetch()}
          />
        </Sheet>
      </WorkspacePage>
    );
  }

  const approval = approvalQuery.data;
  const expired = new Date(approval.expiresAt).getTime() < Date.now();
  const decidable = approval.status === "pending" && !expired;
  const pending = approve.isPending || reject.isPending;
  const actionLabel = approval.actionType ? labelize(approval.actionType) : "Held action";
  const highRisk = approval.riskLevel === "high" || approval.riskLevel === "critical";
  const stageTone = expired && approval.status === "pending" ? "bad" : stageToneForStatus(approval.status);

  const handleDecision = (form: FormData) => {
    if (!kind) return;
    setDialogError(null);

    let decisionPayload: Record<string, unknown>;
    try {
      decisionPayload = parseDecisionPayload(form.get("decisionPayload"));
    } catch (error) {
      setDialogError((error as Error).message);
      return;
    }

    const reason = (form.get("reason") as string | null)?.trim() ?? "";

    if (kind === "reject") {
      if (reason === "") {
        setDialogError("A rejection reason is required.");
        return;
      }
      reject.mutate(
        { id: approval.id, reason, decisionPayload },
        {
          onSuccess: () => {
            toast.success("Approval rejected");
            setKind(null);
          },
          onError: (error) => setDialogError(apiErrorMessage(error, "Could not reject this request.")),
        },
      );
      return;
    }

    approve.mutate(
      { id: approval.id, ...(reason ? { reason } : {}), decisionPayload },
      {
        onSuccess: () => {
          toast.success("Approved — the run will resume");
          setKind(null);
        },
        onError: (error) => setDialogError(apiErrorMessage(error, "Could not approve this request.")),
      },
    );
  };

  const readouts: Readout[] = [
    {
      label: "Status",
      value: <span className="font-[family-name:var(--sans)]">{expired && approval.status === "pending" ? "Expired" : labelize(approval.status)}</span>,
      sub: approval.decidedAt ? "Decision recorded" : decidable ? "Waiting for a decision" : "No decision possible",
      tone: stageTone === "good" ? "good" : stageTone === "bad" ? "bad" : stageTone === "warn" ? "warn" : "neutral",
    },
    {
      label: "Risk",
      value: <span className="font-[family-name:var(--sans)]">{labelize(approval.riskLevel)}</span>,
      sub: highRisk ? "Always needs an approver" : "Gated by the workflow",
      tone: highRisk ? "bad" : approval.riskLevel === "medium" ? "warn" : "neutral",
    },
    {
      label: "Requested",
      value: <Timestamp value={approval.createdAt} />,
      sub: `By ${approval.requestedBy ? "a member" : "the system"}`,
    },
    {
      label: "Expires",
      value: <Timestamp value={approval.expiresAt} />,
      sub: expired ? "Past the decision window" : "Decisions close after this",
      tone: expired && approval.status === "pending" ? "bad" : "neutral",
    },
  ];

  return (
    <WorkspacePage>
      <ProjectPageHeader
        crumbs={[...CRUMBS_BASE, { label: approval.workflowName || approval.id.slice(0, 8) }]}
        title={approval.workflowName || "Approval request"}
        badges={
          <>
            <ApprovalStatusPill status={approval.status} />
            <RiskPill risk={approval.riskLevel} />
          </>
        }
        description={`${actionLabel} is held at ${approval.riskLevel} risk until someone approves or rejects it.`}
        meta={[
          { label: "Approval", value: approval.id.slice(0, 8), mono: true },
          { label: "Run", value: approval.runId.slice(0, 8), mono: true },
          approval.decidedAt ? { label: "Decided", value: <Timestamp value={approval.decidedAt} /> } : null,
        ]}
        actions={
          <>
            <UiButton asChild variant="outline" size="lg">
              <Link to={`/automation/runs/${approval.runId}`}>View run</Link>
            </UiButton>
            {decidable && (
              <>
                <UiButton variant="destructive" size="lg" disabled={pending} onClick={() => setKind("reject")}>
                  <X className="size-4" aria-hidden="true" /> Reject
                </UiButton>
                <UiButton size="lg" disabled={pending} onClick={() => setKind("approve")}>
                  <Check className="size-4" aria-hidden="true" /> Approve
                </UiButton>
              </>
            )}
          </>
        }
      />

      <Readouts cells={readouts} label="Approval summary" />

      {expired && approval.status === "pending" && (
        <Notice tone="red" icon={Clock} title="This request has expired">
          The backend rejects decisions past the expiry window. Retry the run to raise a fresh approval.
        </Notice>
      )}

      {decidable && (
        <Notice tone="amber" icon={ShieldAlert} title="Nothing has executed yet">
          Approving resumes the run from this step. Rejecting stops the run here and records your reason.
        </Notice>
      )}

      <Sheet
        title="What will run"
        description="The run is paused at this action. Everything before it has finished."
        actions={
          <UiButton asChild variant="ghost" size="sm">
            <Link to={`/automation/workflows/${approval.workflowId}`}>Open workflow definition</Link>
          </UiButton>
        }
      >
        <Sequence label="Held action">
          <SequenceStage
            marker={stageTone === "good" ? <Check className="size-3.5" aria-hidden="true" /> : stageTone === "bad" ? <X className="size-3.5" aria-hidden="true" /> : "!"}
            tone={stageTone}
            highlighted
            title={
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <span>{actionLabel}</span>
                {approval.actionType && <CodeChip>{approval.actionType}</CodeChip>}
              </span>
            }
            meta={
              <>
                <RiskPill risk={approval.riskLevel} />
                <ApprovalStatusPill status={approval.status} />
              </>
            }
          >
            {approval.status === "pending"
              ? "Waiting for a decision. The action receives the request payload below plus any decision payload you add."
              : approval.status === "approved"
                ? "Approved. The run resumed from this action."
                : approval.status === "rejected"
                  ? "Rejected. The run stopped at this action."
                  : `${labelize(approval.status)}. No decision was applied.`}
          </SequenceStage>
        </Sequence>
      </Sheet>

      <Panel title="Decision record" description="Who asked, who decided, and why.">
        <div className="flex flex-col gap-5">
          <FactGrid
            facts={[
              { label: "Requested by", value: shortActor(approval.requestedBy, "System"), mono: Boolean(approval.requestedBy) },
              { label: "Approved by", value: shortActor(approval.approvedBy, "No one"), mono: Boolean(approval.approvedBy) },
              { label: "Rejected by", value: shortActor(approval.rejectedBy, "No one"), mono: Boolean(approval.rejectedBy) },
              { label: "Decided", value: approval.decidedAt ? <Timestamp value={approval.decidedAt} /> : "Not yet" },
            ]}
          />
          {(approval.approvalReason || approval.rejectionReason) && (
            <FactGrid
              columns={2}
              className="border-t border-[var(--border)] pt-5"
              facts={[
                approval.approvalReason && { label: "Approval reason", value: approval.approvalReason, wide: true },
                approval.rejectionReason && {
                  label: "Rejection reason",
                  value: <span className="text-[var(--red)]">{approval.rejectionReason}</span>,
                  wide: true,
                },
              ]}
            />
          )}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Request payload" description="Context captured when the action paused.">
          <JsonViewer data={approval.requestPayload} maxHeight={320} />
        </Panel>
        <Panel title="Decision payload" description="Extra data recorded with the decision.">
          <JsonViewer data={approval.decisionPayload} maxHeight={320} />
        </Panel>
      </div>

      <FormDialog
        open={!!kind}
        onOpenChange={(open) => {
          if (!open) {
            setKind(null);
            setDialogError(null);
          }
        }}
        title={kind === "reject" ? "Reject this action?" : "Approve this action?"}
        description={
          kind === "reject"
            ? "The run stops at this step and the reason is written to the audit trail."
            : "The run resumes and the action executes with the risk you have accepted."
        }
        submitLabel={kind === "reject" ? "Reject" : "Approve"}
        pending={pending}
        error={dialogError}
        onSubmit={handleDecision}
      >
        <DialogField
          label="Reason"
          name="reason"
          required={kind === "reject"}
          hint={kind === "reject" ? "Required, up to 1000 characters." : "Optional context for the audit log."}
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
      </FormDialog>
    </WorkspacePage>
  );
}
