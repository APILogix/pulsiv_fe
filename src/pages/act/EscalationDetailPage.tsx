import { useMemo, type ReactNode } from "react";
import { useParams } from "react-router";

import { useAlertingWorkspace } from "@/modules/alerting/hooks/useAlerting";
import { EnabledPill } from "@/modules/alerting/components/alerting-ui";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  ProjectPageHeader,
  Readouts,
  Sheet,
  SheetEmpty,
  SheetError,
  SheetLoading,
  TextLink,
  WorkspacePage,
  type Readout,
} from "@/modules/projects/components/project-page";
import { Pill } from "@/shared/ui/pulse";
import { formatNumber, formatRelativeTime } from "@/shared/observe";

// ── module-level helpers ─────────────────────────────────────

interface EscalationStep {
  id: string;
  stepNumber: number;
  waitSeconds: number;
  connectorIds: string[];
  routeIds: string[];
  notifyOnCall: boolean;
  isActive: boolean;
}

interface EscalationPolicy {
  id: string;
  systemKey: string;
  name: string;
  description: string;
  acknowledgementTimeoutSeconds: number;
  repeatIntervalSeconds: number;
  maxRepeats: number;
  isDefault?: boolean;
  updatedAt?: string;
  steps: EscalationStep[];
}

const LIST_PATH = "/alerts/escalations";
const CRUMB_ROOT = { label: "Escalations", to: LIST_PATH };

/** The workspace snapshot types escalation policies loosely; read them in one place. */
function toPolicy(raw: Record<string, unknown>): EscalationPolicy {
  const policy = raw as unknown as EscalationPolicy;
  const steps = (Array.isArray(policy.steps) ? policy.steps : [])
    .map((step) => ({ ...step, connectorIds: step.connectorIds ?? [], routeIds: step.routeIds ?? [] }))
    .sort((a, b) => a.stepNumber - b.stepNumber);
  return { ...policy, steps };
}

const hasTarget = (step: EscalationStep) => step.connectorIds.length > 0 || step.routeIds.length > 0;
/** Same rule as the list page: only an explicit `false` turns a step off. */
const isStepActive = (step: EscalationStep) => step.isActive !== false;

/** 45s, 5m, 1h 30m, 2d 4h. Two units at most. */
function formatSeconds(total: number | null | undefined): string {
  if (total === null || total === undefined || !Number.isFinite(total)) return "—";
  const seconds = Math.max(0, Math.round(total));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const rest = seconds % 60;
    return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest > 0 ? `${days}d ${rest}h` : `${days}d`;
}

const plural = (count: number, one: string, many: string) => `${formatNumber(count)} ${count === 1 ? one : many}`;

/** What a step does, in words, from its targets. */
function stepOutcome(step: EscalationStep): string {
  const targets: string[] = [];
  if (step.connectorIds.length > 0) targets.push(plural(step.connectorIds.length, "connector", "connectors"));
  if (step.routeIds.length > 0) targets.push(plural(step.routeIds.length, "route", "routes"));
  if (step.notifyOnCall) targets.push("on-call");
  if (targets.length === 0) return "No connector selected yet, so this step has no delivery target.";
  const last = targets.pop();
  return `Notifies ${targets.length > 0 ? `${targets.join(", ")} and ${last}` : last}.`;
}

function DetailShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <WorkspacePage>
      <ProjectPageHeader title={title} crumbs={[CRUMB_ROOT, { label: title }]} />
      {children}
    </WorkspacePage>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function EscalationDetailPage() {
  const { policyId = "" } = useParams();
  const { data, isLoading, error, refetch } = useAlertingWorkspace();
  const policy = useMemo(() => {
    const match = (data?.escalationPolicies ?? []).find((item) => item.id === policyId);
    return match ? toPolicy(match) : undefined;
  }, [data, policyId]);

  if (isLoading && !data) {
    return (
      <DetailShell title="Escalation policy">
        <Sheet label="Loading escalation policy">
          <SheetLoading rows={4} label="Loading escalation policy" />
        </Sheet>
      </DetailShell>
    );
  }

  if (!policy) {
    return (
      <DetailShell title={error && !data ? "Could not load policy" : "Policy not found"}>
        <Sheet label="Escalation policy">
          {error && !data ? (
            <SheetError
              title="Could not load this escalation policy"
              message={apiErrorMessage(error, "The alerting workspace is unavailable right now.")}
              onRetry={() => void refetch()}
            />
          ) : (
            <div className="flex flex-col items-start gap-3 px-5 py-8">
              <p className="max-w-[72ch] text-[13px] leading-[1.6] text-[var(--text2)]">
                No escalation policy matches{" "}
                <code className="break-all font-[family-name:var(--mono)] text-[var(--text)]">{policyId}</code> in this
                organization.
              </p>
              <TextLink to={LIST_PATH} arrow>
                Back to escalations
              </TextLink>
            </div>
          )}
        </Sheet>
      </DetailShell>
    );
  }

  const steps = policy.steps;
  const activeSteps = steps.filter(isStepActive).length;
  const targetedSteps = steps.filter(hasTarget).length;

  const readouts: Readout[] = [
    {
      label: "Steps",
      value: formatNumber(steps.length),
      sub: `${formatNumber(activeSteps)} active`,
    },
    {
      label: "With delivery targets",
      value: `${formatNumber(targetedSteps)}/${formatNumber(steps.length)}`,
      sub: targetedSteps === steps.length && steps.length > 0 ? "Every step has a target" : "Connector or route selected",
    },
    {
      label: "Acknowledgement timeout",
      value: formatSeconds(policy.acknowledgementTimeoutSeconds),
      sub: `First step after ${steps[0] ? formatSeconds(steps[0].waitSeconds) : "—"}`,
    },
    {
      label: "Max repeats",
      value: formatNumber(policy.maxRepeats),
      sub: `Every ${formatSeconds(policy.repeatIntervalSeconds)}`,
    },
  ];

  return (
    <WorkspacePage>
      <ProjectPageHeader
        crumbs={[CRUMB_ROOT, { label: policy.name }]}
        title={policy.name}
        description={policy.description || undefined}
        badges={
          <>
            <span title="On while at least one step is active">
              <EnabledPill enabled={activeSteps > 0} />
            </span>
            {policy.isDefault && <Pill>Default</Pill>}
          </>
        }
        meta={[
          { label: "System key", value: policy.systemKey, mono: true },
          policy.updatedAt ? { label: "Updated", value: formatRelativeTime(policy.updatedAt), mono: true } : null,
        ]}
      />

      <Readouts cells={readouts} label="Escalation summary" />

      <Sheet title="Steps" description="Provisioned escalation steps, in the order they run.">
        {steps.length === 0 ? (
          <SheetEmpty
            title="No steps configured"
            description="Each step notifies its delivery targets after its own delay. Targets come from your organization's connectors."
          />
        ) : (
          <ol aria-label="Escalation steps" className="divide-y divide-[var(--border)]">
            {steps.map((step) => (
              <li
                key={step.id ?? step.stepNumber}
                className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 px-5 py-3.5 sm:grid-cols-[32px_112px_minmax(0,1fr)_auto]"
              >
                <span className="pt-0.5 font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text3)]">
                  <span className="sr-only">Step </span>
                  {step.stepNumber}
                </span>
                <span className="pt-0.5 font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                  after {formatSeconds(step.waitSeconds)}
                </span>
                <div className="col-span-2 col-start-2 row-start-2 flex min-w-0 flex-col gap-1.5 sm:col-span-1 sm:col-start-3 sm:row-start-1">
                  <p className="text-[13px] leading-[1.5] text-[var(--text)]">{stepOutcome(step)}</p>
                  {hasTarget(step) || step.notifyOnCall ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {step.connectorIds.length > 0 && (
                        <Pill>{plural(step.connectorIds.length, "connector", "connectors")}</Pill>
                      )}
                      {step.routeIds.length > 0 && <Pill>{plural(step.routeIds.length, "route", "routes")}</Pill>}
                      {step.notifyOnCall && <Pill>On-call</Pill>}
                    </div>
                  ) : null}
                </div>
                <span className="col-start-3 row-start-1 justify-self-end sm:col-start-4">
                  <EnabledPill enabled={isStepActive(step)} />
                </span>
              </li>
            ))}
          </ol>
        )}
      </Sheet>
    </WorkspacePage>
  );
}
