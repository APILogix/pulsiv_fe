import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router";

import { useAlertingWorkspace } from "@/modules/alerting/hooks/useAlerting";
import { EnabledPill } from "@/modules/alerting/components/alerting-ui";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  ProjectPageHeader,
  Readouts,
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
import { Pill } from "@/shared/ui/pulse";
import { formatNumber } from "@/shared/observe";

// ── module-level helpers ─────────────────────────────────────

interface EscalationStep {
  id?: string;
  stepNumber: number;
  waitSeconds: number;
  connectorIds: string[];
  routeIds: string[];
  notifyOnCall?: boolean;
  isActive?: boolean;
}

interface EscalationRow {
  id: string;
  systemKey: string;
  name: string;
  description: string;
  acknowledgementTimeoutSeconds: number;
  repeatIntervalSeconds: number;
  maxRepeats: number;
  isDefault?: boolean;
  steps: EscalationStep[];
}

/** The workspace snapshot types escalation policies loosely; read them in one place. */
function toEscalationRow(raw: Record<string, unknown>): EscalationRow {
  const row = raw as unknown as EscalationRow;
  const steps = (Array.isArray(row.steps) ? row.steps : [])
    .map((step) => ({ ...step, connectorIds: step.connectorIds ?? [], routeIds: step.routeIds ?? [] }))
    .sort((a, b) => a.stepNumber - b.stepNumber);
  return { ...row, steps };
}

const hasTarget = (step: EscalationStep) => step.connectorIds.length > 0 || step.routeIds.length > 0;
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

const policyPath = (id: string) => `/alerts/escalations/${id}`;

const MONO = "font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]";

const COLUMNS: SheetColumn[] = [
  { key: "policy", header: "Policy" },
  { key: "steps", header: "Steps", className: "w-[80px]", align: "right" },
  { key: "first", header: "First step", className: "w-[120px]" },
  { key: "ack", header: "Ack timeout", className: `w-[120px] ${HIDE_BELOW_MD}` },
  { key: "targets", header: "Delivery targets", className: `w-[160px] ${HIDE_BELOW_LG}` },
  { key: "status", header: "Status", className: "w-[88px]" },
];

// ── page ─────────────────────────────────────────────────────

export default function EscalationsPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useAlertingWorkspace();
  const policies = useMemo(() => (data?.escalationPolicies ?? []).map(toEscalationRow), [data]);

  const loading = isLoading && !data;
  const loadFailed = Boolean(error) && !data;

  const summary = useMemo(() => {
    let steps = 0;
    let activeSteps = 0;
    let withoutTargets = 0;
    for (const policy of policies) {
      steps += policy.steps.length;
      activeSteps += policy.steps.filter(isStepActive).length;
      if (!policy.steps.some(hasTarget)) withoutTargets += 1;
    }
    return { steps, activeSteps, withoutTargets };
  }, [policies]);

  const readouts: Readout[] = [
    {
      label: "Policies",
      value: formatNumber(policies.length),
      sub: "Provisioned for this organization",
    },
    {
      label: "Steps",
      value: formatNumber(summary.steps),
      sub: `${formatNumber(summary.activeSteps)} active`,
    },
    {
      label: "Without delivery targets",
      value: formatNumber(summary.withoutTargets),
      sub: summary.withoutTargets > 0 ? "No connector or route selected" : "Every policy has a target",
    },
  ];

  let body: ReactNode;
  if (loading) {
    body = <SheetLoading rows={4} label="Loading escalation policies" />;
  } else if (loadFailed) {
    body = (
      <SheetError
        title="Could not load escalation policies"
        message={apiErrorMessage(error, "The alerting workspace is unavailable right now.")}
        onRetry={() => void refetch()}
      />
    );
  } else if (policies.length === 0) {
    body = (
      <SheetEmpty
        title="No escalation policies yet"
        description="An escalation policy notifies in ordered steps, each after its own delay. Delivery targets for each step come from your organization's connectors; provisioned defaults stay connector-free until they are configured."
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Escalation policies" minWidth={520}>
        {policies.map((policy) => {
          const to = policyPath(policy.id);
          const first = policy.steps[0];
          const enabled = policy.steps.some(isStepActive);
          const targeted = policy.steps.some(hasTarget);
          return (
            <SheetRow key={policy.id} onActivate={() => navigate(to)}>
              <SheetCell>
                <RowTitle
                  title={policy.name}
                  to={to}
                  subtitle={policy.systemKey}
                  subtitleMono
                  badges={policy.isDefault ? <Pill>Default</Pill> : undefined}
                />
              </SheetCell>
              <SheetCell align="right">
                <span className={MONO}>{formatNumber(policy.steps.length)}</span>
              </SheetCell>
              <SheetCell>
                {first ? (
                  <span className={MONO}>after {formatSeconds(first.waitSeconds)}</span>
                ) : (
                  <span className="text-[12px] text-[var(--text3)]">No steps</span>
                )}
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                <span className={MONO}>{formatSeconds(policy.acknowledgementTimeoutSeconds)}</span>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                <span className={targeted ? "text-[12px] text-[var(--text2)]" : "text-[12px] text-[var(--text3)]"}>
                  {targeted ? "Configured" : "None selected"}
                </span>
              </SheetCell>
              <SheetCell>
                <span title="On while at least one step is active">
                  <EnabledPill enabled={enabled} />
                </span>
              </SheetCell>
            </SheetRow>
          );
        })}
      </SheetTable>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Escalations"
        description="Escalation policies notify in ordered steps, each after its own delay. Provisioned defaults stay connector-free until your organization configures delivery targets."
      />

      {!loadFailed && <Readouts cells={readouts} loading={loading} label="Escalation summary" />}

      <Sheet
        label="Escalation policies"
        toolbar={
          !loading && !loadFailed && policies.length > 0 ? (
            <ToolbarCount>
              {formatNumber(policies.length)} {policies.length === 1 ? "policy" : "policies"}
            </ToolbarCount>
          ) : undefined
        }
      >
        {body}
      </Sheet>
    </WorkspacePage>
  );
}
