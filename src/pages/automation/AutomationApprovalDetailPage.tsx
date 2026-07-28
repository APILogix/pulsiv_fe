/**
 * Approval detail — `GET /approvals/:approvalId` plus the approve/reject
 * decisions. Shows the request payload the action will receive on resume.
 */
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Clock,
  Play,
  ShieldAlert,
  Workflow as WorkflowIcon,
  X,
} from "lucide-react";
import {
  HeroFacts,
  Notice,
  PageHero,
  Panel,
  Row,
  RowStack,
  fieldTextareaClass,
} from "@/shared/ui/pulse";
import { JsonViewer, Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DialogField, FormDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  useApproval,
  useApprovalMutations,
  useAutomationScope,
} from "@/modules/automation/hooks/useAutomation";
import {
  ApprovalStatusPill,
  CodeChip,
  MetaCell,
  RiskPill,
  labelize,
} from "@/modules/automation/components/automation-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const BREADCRUMBS = [
  { label: "Automation", to: "/automation" },
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

export default function AutomationApprovalDetailPage() {
  const { approvalId } = useParams<{ approvalId: string }>();
  const { activeOrgId } = useAutomationScope();
  const approvalQuery = useApproval(approvalId);
  const { approve, reject } = useApprovalMutations();

  const [kind, setKind] = useState<"approve" | "reject" | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  if (!activeOrgId) {
    return (
      <Notice tone="amber" icon={AlertTriangle} title="No organization selected">
        Pick an organization to review this approval.
      </Notice>
    );
  }

  if (approvalQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1].map((block) => (
          <div key={block} className="h-40 animate-pulse rounded-[14px] bg-[var(--bg2)]" />
        ))}
      </div>
    );
  }

  if (approvalQuery.isError || !approvalQuery.data) {
    return (
      <Notice tone="red" icon={AlertTriangle} title="Could not load this approval">
        {apiErrorMessage(approvalQuery.error)}
      </Notice>
    );
  }

  const approval = approvalQuery.data;
  const expired = new Date(approval.expiresAt).getTime() < Date.now();
  const decidable = approval.status === "pending" && !expired;
  const pending = approve.isPending || reject.isPending;

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

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Approval"
        title={approval.workflowName || "Approval request"}
        description={
          approval.actionType
            ? `${labelize(approval.actionType)} is held at ${approval.riskLevel} risk until a decision is recorded.`
            : "This action is held until a decision is recorded."
        }
        icon={ClipboardCheck}
        breadcrumbs={[...BREADCRUMBS, { label: approval.id.slice(0, 8) }]}
        actions={
          <>
            <UiButton asChild variant="outline" size="lg">
              <Link to={`/automation/runs/${approval.runId}`}>
                <Play className="size-4" /> View run
              </Link>
            </UiButton>
            <UiButton asChild variant="outline" size="lg">
              <Link to={`/automation/workflows/${approval.workflowId}`}>
                <WorkflowIcon className="size-4" /> Workflow
              </Link>
            </UiButton>
            <UiButton variant="outline" size="lg" disabled={!decidable || pending} onClick={() => setKind("reject")}>
              <X className="size-4 text-[var(--red)]" /> Reject
            </UiButton>
            <UiButton size="lg" disabled={!decidable || pending} onClick={() => setKind("approve")}>
              <Check className="size-4" /> Approve
            </UiButton>
          </>
        }
      >
        <HeroFacts
          facts={[
            { label: "Status", value: labelize(approval.status) },
            {
              label: "Risk",
              value: labelize(approval.riskLevel),
              tone: approval.riskLevel === "low" ? "green" : approval.riskLevel === "medium" ? "amber" : "red",
            },
            { label: "Requested", value: <Timestamp value={approval.createdAt} /> },
            { label: "Expires", value: <Timestamp value={approval.expiresAt} />, tone: expired ? "red" : "neutral" },
          ]}
        />
      </PageHero>

      {expired && approval.status === "pending" && (
        <Notice tone="red" icon={Clock} title="This request has expired">
          The backend rejects decisions past the expiry window. Retry the run to raise a fresh approval.
        </Notice>
      )}

      {approval.status === "pending" && !expired && (
        <Notice tone="amber" icon={ShieldAlert} title="Action held">
          Nothing has executed yet. Approving resumes the run from this step.
        </Notice>
      )}

      <Panel title="Decision record" description="Who asked, who decided, and why." icon={ClipboardCheck} bodyClassName="p-0">
        <RowStack>
          <Row>
            <div className="grid gap-4 sm:grid-cols-4">
              <MetaCell label="Status">
                <ApprovalStatusPill status={approval.status} />
              </MetaCell>
              <MetaCell label="Risk">
                <RiskPill risk={approval.riskLevel} />
              </MetaCell>
              <MetaCell label="Action">
                {approval.actionType ? <CodeChip>{approval.actionType}</CodeChip> : "—"}
              </MetaCell>
              <MetaCell label="Decided">
                {approval.decidedAt ? <Timestamp value={approval.decidedAt} /> : "Not yet"}
              </MetaCell>
            </div>
          </Row>
          <Row>
            <div className="grid gap-4 sm:grid-cols-3">
              <MetaCell label="Requested by">
                {approval.requestedBy ? <CodeChip>{approval.requestedBy.slice(0, 8)}</CodeChip> : "System"}
              </MetaCell>
              <MetaCell label="Approved by">
                {approval.approvedBy ? <CodeChip>{approval.approvedBy.slice(0, 8)}</CodeChip> : "—"}
              </MetaCell>
              <MetaCell label="Rejected by">
                {approval.rejectedBy ? <CodeChip>{approval.rejectedBy.slice(0, 8)}</CodeChip> : "—"}
              </MetaCell>
            </div>
          </Row>
          {(approval.approvalReason || approval.rejectionReason) && (
            <Row>
              <div className="flex flex-col gap-2">
                {approval.approvalReason && (
                  <MetaCell label="Approval reason">{approval.approvalReason}</MetaCell>
                )}
                {approval.rejectionReason && (
                  <MetaCell label="Rejection reason">
                    <span className="text-[var(--red)]">{approval.rejectionReason}</span>
                  </MetaCell>
                )}
              </div>
            </Row>
          )}
        </RowStack>
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
    </div>
  );
}
