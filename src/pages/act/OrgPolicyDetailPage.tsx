import { type ReactNode } from "react";
import { useParams } from "react-router";

import { useOrganizationAlertPolicy } from "@/modules/alerting/hooks/useAlerting";
import { EnabledPill, labelize } from "@/modules/alerting/components/alerting-ui";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  ProjectPageHeader,
  Readouts,
  Sheet,
  SheetError,
  SheetLoading,
  TextLink,
  WorkspacePage,
  type Readout,
} from "@/modules/projects/components/project-page";
import { Panel, Pill } from "@/shared/ui/pulse";
import {
  CodeBlock,
  EmptyNote,
  KeyValueList,
  SeverityBadge,
  formatAbsoluteTime,
  formatNumber,
  formatRelativeTime,
  type KeyValueItem,
} from "@/shared/observe";

// ── module-level helpers ─────────────────────────────────────

const RULES_PATH = "/alerts/rules";
const CRUMB_ROOT = { label: "Alert rules", to: RULES_PATH };

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

/** Compact one-line JSON for threshold values; null when there is nothing. */
function compactJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  const text = JSON.stringify(value);
  return text === "{}" ? null : text;
}

function PolicyShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <WorkspacePage>
      <ProjectPageHeader title={title} crumbs={[CRUMB_ROOT, { label: title }]} />
      {children}
    </WorkspacePage>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function OrgPolicyDetailPage() {
  const { policyId = "" } = useParams();
  const { data: policy, isLoading, error: loadError, refetch } = useOrganizationAlertPolicy(policyId);

  if (isLoading) {
    return (
      <PolicyShell title="Alert policy">
        <Sheet label="Loading alert policy">
          <SheetLoading rows={5} label="Loading alert policy" />
        </Sheet>
      </PolicyShell>
    );
  }

  if (!policy) {
    return (
      <PolicyShell title={loadError ? "Could not load policy" : "Policy not found"}>
        <Sheet label="Alert policy">
          {loadError ? (
            <SheetError
              title="Could not load this policy"
              message={apiErrorMessage(loadError, "The policy is unavailable right now.")}
              onRetry={() => void refetch()}
            />
          ) : (
            <div className="flex flex-col items-start gap-3 px-5 py-8">
              <p className="max-w-[72ch] text-[13px] leading-[1.6] text-[var(--text2)]">
                The policy{" "}
                <code className="break-all font-[family-name:var(--mono)] text-[var(--text)]">{policyId}</code> does not
                exist or has been removed.
              </p>
              <TextLink to={RULES_PATH} arrow>
                Back to alert rules
              </TextLink>
            </div>
          )}
        </Sheet>
      </PolicyShell>
    );
  }

  const version = policy.currentVersion ?? policy.version ?? 1;
  const dependencies = Array.isArray(policy.dependencies) ? policy.dependencies : null;
  const versions = Array.isArray(policy.versions) ? policy.versions : null;
  const showDocumentation = Boolean(policy.documentation && policy.documentation !== policy.description);

  const readoutCells: Array<Readout | null> = [
    { label: "Current version", value: `v${version}`, sub: "Each save adds an immutable version" },
    versions && {
      label: "Versions stored",
      value: formatNumber(versions.length),
      sub: "In this policy's history",
    },
    dependencies && {
      label: "Dependencies",
      value: formatNumber(dependencies.length),
      sub: dependencies.length > 0 ? dependencies.join(", ") : "None declared",
      title: dependencies.join(", ") || undefined,
    },
    {
      label: "Last updated",
      value: formatRelativeTime(policy.updatedAt),
      sub: formatAbsoluteTime(policy.updatedAt),
    },
  ];
  const readouts = readoutCells.filter((cell): cell is Readout => cell !== null);

  const configuration: KeyValueItem[] = [
    { label: "Policy ID", value: policy.id, mono: true, copyable: true },
    { label: "Slug", value: policy.slug, mono: true, copyable: true },
    { label: "Metric source", value: policy.metricSource || null, mono: true },
    { label: "Default threshold", value: compactJson(policy.defaultThreshold), mono: true },
    { label: "Recovery threshold", value: compactJson(policy.recoveryThreshold), mono: true },
    { label: "System policy", value: policy.isSystem },
    { label: "Created", value: formatAbsoluteTime(policy.createdAt), mono: true },
    { label: "Updated", value: formatAbsoluteTime(policy.updatedAt), mono: true },
  ];

  return (
    <WorkspacePage>
      <ProjectPageHeader
        crumbs={[CRUMB_ROOT, { label: policy.name }]}
        title={policy.name}
        description={policy.description || undefined}
        badges={
          <>
            <SeverityBadge severity={policy.severity} />
            <EnabledPill enabled={policy.enabled} />
            {policy.isSystem && <Pill>System</Pill>}
          </>
        }
        meta={[
          { label: "Slug", value: policy.slug, mono: true },
          { label: "Category", value: labelize(policy.category) },
          { label: "Evaluation window", value: formatSeconds(policy.evaluationWindowSeconds), mono: true },
          { label: "Cooldown", value: formatSeconds(policy.cooldownSeconds), mono: true },
        ]}
      />

      <Readouts cells={readouts} label="Policy summary" />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Expression" description="What the current version evaluates against its metric source.">
            {policy.expression ? (
              <CodeBlock maxHeight={280}>{policy.expression}</CodeBlock>
            ) : (
              <EmptyNote title="No expression">The current version does not define an expression.</EmptyNote>
            )}
          </Panel>

          {showDocumentation && (
            <Panel title="Documentation">
              <p className="max-w-[72ch] whitespace-pre-wrap text-[13px] leading-[1.6] text-[var(--text2)]">
                {policy.documentation}
              </p>
            </Panel>
          )}
        </div>

        <Panel title="Configuration" bodyClassName="px-5 pb-2 pt-1">
          <KeyValueList items={configuration} columns={1} labelWidth={140} />
        </Panel>
      </div>
    </WorkspacePage>
  );
}
