import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  Power,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useThresholdMutations, useThresholds } from "@/modules/projects/hooks/useProjectAlerting";
import { useEnvironments } from "@/modules/projects/hooks/useEnvironments";
import { environmentTypeLabel } from "@/modules/projects/environment.constants";
import {
  THRESHOLD_OPERATORS,
  type EnvironmentType,
  type ProjectAlertThreshold,
  type ThresholdBody,
  type ThresholdOperator,
} from "@/modules/projects/api/types";
import { useCurrentProject } from "./ProjectShellPage";
import {
  IconChip,
  Notice,
  Panel,
  Pill,
  SectionHeading,
  StatCard,
  Toggle,
  Toolbar,
  fieldInputClass,
  type SurfaceTone,
} from "@/shared/ui/pulse";
import { FilterSelect, Table, Td, Timestamp, Tr, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  ConfirmDialog,
  DialogField,
  FormDialog,
  apiErrorMessage,
  optionalNumber,
  optionalText,
} from "@/modules/projects/components/project-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const SEVERITY_TONE: Record<string, SurfaceTone> = {
  info: "blue",
  warning: "amber",
  error: "red",
  critical: "red",
};

const SEVERITY_CHOICES = ["info", "warning", "error", "critical"] as const;

/** Preset metrics so operators don't have to memorise metric identifiers. */
const METRIC_PRESETS: Array<{
  metricName: string;
  metricSource: string;
  category: string;
  unit: string;
  operator: ThresholdOperator;
  value: number;
  label: string;
}> = [
  { metricName: "error_rate", metricSource: "analytics", category: "error", unit: "percent", operator: ">", value: 5, label: "Error rate above 5%" },
  { metricName: "latency_p95_ms", metricSource: "analytics", category: "performance", unit: "ms", operator: ">", value: 1000, label: "p95 latency above 1s" },
  { metricName: "event_volume", metricSource: "usage", category: "usage", unit: "count", operator: ">", value: 100000, label: "Event volume spike" },
  { metricName: "failed_notifications", metricSource: "alerting", category: "deployment", unit: "count", operator: ">", value: 10, label: "Notification failures" },
  { metricName: "rate_limited_events", metricSource: "usage", category: "usage", unit: "count", operator: ">", value: 100, label: "Rate limiting active" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "true", label: "Enabled" },
  { value: "false", label: "Disabled" },
];

const SEVERITY_FILTER_OPTIONS = [
  { value: "", label: "All severities" },
  ...SEVERITY_CHOICES.map((severity) => ({ value: severity, label: severity })),
];

const THRESHOLD_HEADERS = ["Threshold", "Condition", "Window", "Severity", "State", "Last fired", ""];

const asMessage = apiErrorMessage;

// ── threshold form ───────────────────────────────────────────

function ThresholdFields({
  threshold,
  environments,
}: {
  threshold?: ProjectAlertThreshold;
  environments: Array<{ id: string; name: string; type: EnvironmentType }>;
}) {
  return (
    <>
      {!threshold && (
        <DialogField label="Start from a preset" name="preset" hint="Optional. Fills the fields below; adjust as needed.">
          <select
            id="preset"
            name="preset"
            className={fieldInputClass}
            defaultValue=""
            onChange={(event) => {
              const preset = METRIC_PRESETS.find((entry) => entry.metricName === event.target.value);
              if (!preset) return;
              const form = event.currentTarget.form;
              if (!form) return;
              const set = (name: string, value: string) => {
                const field = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
                if (field) field.value = value;
              };
              set("thresholdKey", `${preset.metricName}_alert`);
              set("metricName", preset.metricName);
              set("metricSource", preset.metricSource);
              set("category", preset.category);
              set("thresholdUnit", preset.unit);
              set("comparisonOperator", preset.operator);
              set("thresholdValue", String(preset.value));
            }}
          >
            <option value="">Custom threshold</option>
            {METRIC_PRESETS.map((preset) => (
              <option key={preset.metricName} value={preset.metricName}>
                {preset.label}
              </option>
            ))}
          </select>
        </DialogField>
      )}

      <div className="grid grid-cols-2 gap-3">
        <DialogField label="Threshold key" name="thresholdKey" required hint="Unique identifier within the project.">
          <input
            id="thresholdKey"
            name="thresholdKey"
            required
            defaultValue={threshold?.thresholdKey}
            maxLength={100}
            placeholder="error_rate_alert"
            className={fieldInputClass}
          />
        </DialogField>
        <DialogField label="Environment" name="environmentId" hint="Leave empty to apply to all environments.">
          <select
            id="environmentId"
            name="environmentId"
            defaultValue={threshold?.environmentId ?? ""}
            className={fieldInputClass}
          >
            <option value="">All environments</option>
            {environments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.name} · {environmentTypeLabel(environment.type)}
              </option>
            ))}
          </select>
        </DialogField>
        <DialogField label="Metric name" name="metricName" required>
          <input
            id="metricName"
            name="metricName"
            required
            defaultValue={threshold?.metricName}
            maxLength={100}
            placeholder="error_rate"
            className={fieldInputClass}
          />
        </DialogField>
        <DialogField label="Metric source" name="metricSource" required>
          <input
            id="metricSource"
            name="metricSource"
            required
            defaultValue={threshold?.metricSource ?? "analytics"}
            maxLength={100}
            className={fieldInputClass}
          />
        </DialogField>
        <DialogField label="Category" name="category" required>
          <input
            id="category"
            name="category"
            required
            defaultValue={threshold?.category ?? "error"}
            maxLength={100}
            className={fieldInputClass}
          />
        </DialogField>
        <DialogField label="Severity" name="severity" required>
          <select id="severity" name="severity" defaultValue={threshold?.severity ?? "warning"} className={fieldInputClass}>
            {SEVERITY_CHOICES.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
        </DialogField>
      </div>

      <DialogField label="Condition" hint="Fires when the metric satisfies this comparison.">
        <div className="grid grid-cols-[100px_minmax(0,1fr)_120px] gap-2">
          <select
            id="comparisonOperator"
            name="comparisonOperator"
            defaultValue={threshold?.comparisonOperator ?? ">"}
            aria-label="Comparison operator"
            className={fieldInputClass}
          >
            {THRESHOLD_OPERATORS.map((operator) => (
              <option key={operator} value={operator}>
                {operator}
              </option>
            ))}
          </select>
          <input
            id="thresholdValue"
            name="thresholdValue"
            type="number"
            step="any"
            required
            defaultValue={threshold?.thresholdValue}
            aria-label="Threshold value"
            className={fieldInputClass}
          />
          <input
            id="thresholdUnit"
            name="thresholdUnit"
            required
            defaultValue={threshold?.thresholdUnit ?? "percent"}
            maxLength={50}
            aria-label="Unit"
            placeholder="unit"
            className={fieldInputClass}
          />
        </div>
      </DialogField>

      <div className="grid grid-cols-3 gap-3">
        <DialogField label="Window (min)" name="evaluationWindowMinutes">
          <input
            id="evaluationWindowMinutes"
            name="evaluationWindowMinutes"
            type="number"
            min={1}
            defaultValue={threshold?.evaluationWindowMinutes ?? 5}
            className={fieldInputClass}
          />
        </DialogField>
        <DialogField label="Cooldown (min)" name="cooldownMinutes">
          <input
            id="cooldownMinutes"
            name="cooldownMinutes"
            type="number"
            min={0}
            defaultValue={threshold?.cooldownMinutes ?? 15}
            className={fieldInputClass}
          />
        </DialogField>
        <DialogField label="Consecutive breaches" name="consecutiveBreaches">
          <input
            id="consecutiveBreaches"
            name="consecutiveBreaches"
            type="number"
            min={1}
            defaultValue={threshold?.consecutiveBreaches ?? 1}
            className={fieldInputClass}
          />
        </DialogField>
      </div>

      <div className="flex flex-wrap gap-5 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-3.5 py-3">
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--text)]">
          <input type="checkbox" name="enabled" defaultChecked={threshold?.enabled ?? true} className="size-4" />
          Enabled
        </label>
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--text)]">
          <input
            type="checkbox"
            name="notifyOnRecovery"
            defaultChecked={threshold?.notifyOnRecovery ?? true}
            className="size-4"
          />
          Notify on recovery
        </label>
      </div>
    </>
  );
}

function readThresholdForm(form: FormData): ThresholdBody {
  return {
    thresholdKey: String(form.get("thresholdKey") ?? "").trim(),
    metricName: String(form.get("metricName") ?? "").trim(),
    metricSource: String(form.get("metricSource") ?? "").trim(),
    category: String(form.get("category") ?? "").trim(),
    severity: String(form.get("severity") ?? "warning"),
    comparisonOperator: String(form.get("comparisonOperator") ?? ">") as ThresholdOperator,
    thresholdValue: Number(form.get("thresholdValue") ?? 0),
    thresholdUnit: String(form.get("thresholdUnit") ?? "count").trim(),
    environmentId: optionalText(form.get("environmentId")) ?? null,
    evaluationWindowMinutes: optionalNumber(form.get("evaluationWindowMinutes")) ?? 5,
    cooldownMinutes: optionalNumber(form.get("cooldownMinutes")) ?? 15,
    consecutiveBreaches: optionalNumber(form.get("consecutiveBreaches")) ?? 1,
    enabled: form.get("enabled") === "on",
    notifyOnRecovery: form.get("notifyOnRecovery") === "on",
  };
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectThresholdsPage() {
  const { projectId } = useCurrentProject();
  const { data: environments = [] } = useEnvironments(projectId);

  const [enabledFilter, setEnabledFilter] = useState("");
  const [severity, setSeverity] = useState("");

  const { data, isLoading, error } = useThresholds(projectId, {
    ...(enabledFilter ? { enabled: enabledFilter === "true" } : {}),
    ...(severity ? { severity } : {}),
  });
  const thresholds = data?.data ?? [];

  const { createThreshold, updateThreshold, deleteThreshold, toggleThreshold } = useThresholdMutations(projectId);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProjectAlertThreshold | null>(null);
  const [deleting, setDeleting] = useState<ProjectAlertThreshold | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const enabledCount = thresholds.filter((threshold) => threshold.enabled).length;
  const firingRecently = thresholds.filter(
    (threshold) =>
      threshold.lastTriggeredAt &&
      Date.now() - new Date(threshold.lastTriggeredAt).getTime() < 24 * 60 * 60 * 1000,
  ).length;

  const environmentName = (environmentId: string | null) =>
    environmentId ? (environments.find((environment) => environment.id === environmentId)?.name ?? "unknown") : "all";

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Metric thresholds"
        description="Project-scoped rules evaluated against ingested metrics. Breaches route through this project's alert channels."
        actions={
          <UiButton size="lg" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 size-4" /> New threshold
          </UiButton>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Thresholds" value={data?.total ?? thresholds.length} icon={BellRing} tone="brand" />
        <StatCard label="Enabled" value={enabledCount} icon={CheckCircle2} tone="green" />
        <StatCard
          label="Fired (24h)"
          value={firingRecently}
          icon={Activity}
          tone={firingRecently > 0 ? "red" : "neutral"}
        />
        <StatCard
          label="Critical rules"
          value={thresholds.filter((threshold) => threshold.severity === "critical").length}
          icon={AlertTriangle}
          tone="amber"
        />
      </div>

      <Toolbar>
        <FilterSelect label="State" value={enabledFilter} onChange={setEnabledFilter} options={STATUS_FILTER_OPTIONS} />
        <FilterSelect label="Severity" value={severity} onChange={setSeverity} options={SEVERITY_FILTER_OPTIONS} />
      </Toolbar>

      {error && <Notice tone="red">{asMessage(error)}</Notice>}

      <Panel bodyClassName="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-10 animate-pulse rounded-[8px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : thresholds.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <IconChip icon={BellRing} size="lg" tone="brand" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">No thresholds configured</p>
            <p className="max-w-[48ch] text-[12.5px] text-[var(--text2)]">
              Start with an error-rate or p95-latency threshold. Presets are available in the create dialog.
            </p>
            <UiButton size="lg" onClick={() => setCreating(true)}>
              <Plus className="mr-1.5 size-4" /> New threshold
            </UiButton>
          </div>
        ) : (
          <Table headers={THRESHOLD_HEADERS} maxHeight="34rem">
            {thresholds.map((threshold) => (
              <Tr key={threshold.id}>
                <Td>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-medium text-[var(--text)]">{threshold.thresholdKey}</span>
                    <span className="truncate text-[11px] text-[var(--text3)]">
                      {threshold.metricName} · {threshold.metricSource} · env: {environmentName(threshold.environmentId)}
                    </span>
                  </div>
                </Td>
                <Td>
                  <code className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
                    {threshold.comparisonOperator} {formatNumber(threshold.thresholdValue)} {threshold.thresholdUnit}
                  </code>
                </Td>
                <Td>
                  <span className="text-[12px] text-[var(--text2)]">
                    {threshold.evaluationWindowMinutes}m
                    <span className="text-[var(--text3)]">
                      {" "}
                      · x{threshold.consecutiveBreaches} · cd {threshold.cooldownMinutes}m
                    </span>
                  </span>
                </Td>
                <Td>
                  <Pill tone={SEVERITY_TONE[threshold.severity] ?? "neutral"}>{threshold.severity}</Pill>
                </Td>
                <Td>
                  <Toggle
                    checked={threshold.enabled}
                    label={`Toggle ${threshold.thresholdKey}`}
                    disabled={toggleThreshold.isPending}
                    onChange={(next) => toggleThreshold.mutate({ id: threshold.id, enabled: next })}
                  />
                </Td>
                <Td>
                  {threshold.lastTriggeredAt ? (
                    <Timestamp value={threshold.lastTriggeredAt} />
                  ) : (
                    <span className="text-[12px] text-[var(--text3)]">Never</span>
                  )}
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <UiButton
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${threshold.thresholdKey}`}
                      onClick={() => {
                        setFormError(null);
                        setEditing(threshold);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </UiButton>
                    <UiButton
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${threshold.thresholdKey}`}
                      onClick={() => setDeleting(threshold)}
                    >
                      <Trash2 className="size-3.5 text-[var(--red)]" />
                    </UiButton>
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Panel>

      <Panel title="How evaluation works" icon={TrendingUp}>
        <ul className="flex flex-col gap-2.5 text-[12.5px] leading-relaxed text-[var(--text2)]">
          <li className="flex gap-2">
            <Clock className="mt-0.5 size-3.5 shrink-0 text-[var(--text3)]" aria-hidden="true" />
            The evaluation window is the aggregation period. A 5-minute window compares the last 5 minutes of the metric
            against the threshold value.
          </li>
          <li className="flex gap-2">
            <Activity className="mt-0.5 size-3.5 shrink-0 text-[var(--text3)]" aria-hidden="true" />
            Consecutive breaches suppress single-window noise: the rule only fires after N windows in a row satisfy the
            condition.
          </li>
          <li className="flex gap-2">
            <Power className="mt-0.5 size-3.5 shrink-0 text-[var(--text3)]" aria-hidden="true" />
            Cooldown prevents repeat notifications while a condition stays broken. Recovery notifications are sent
            separately when enabled.
          </li>
        </ul>
      </Panel>

      <FormDialog
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) setFormError(null);
        }}
        title="New metric threshold"
        submitLabel="Create threshold"
        pending={createThreshold.isPending}
        error={formError}
        onSubmit={(form) => {
          setFormError(null);
          createThreshold.mutate(readThresholdForm(form), {
            onSuccess: () => setCreating(false),
            onError: (mutationError) => setFormError(asMessage(mutationError)),
          });
        }}
        width="sm:max-w-[680px]"
      >
        <ThresholdFields environments={environments} />
      </FormDialog>

      <FormDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setFormError(null);
          }
        }}
        title={editing ? `Edit ${editing.thresholdKey}` : "Edit threshold"}
        submitLabel="Save changes"
        pending={updateThreshold.isPending}
        error={formError}
        onSubmit={(form) => {
          if (!editing) return;
          setFormError(null);
          updateThreshold.mutate(
            { id: editing.id, payload: readThresholdForm(form) },
            {
              onSuccess: () => setEditing(null),
              onError: (mutationError) => setFormError(asMessage(mutationError)),
            },
          );
        }}
        width="sm:max-w-[680px]"
      >
        {editing && <ThresholdFields threshold={editing} environments={environments} />}
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.thresholdKey ?? "threshold"}?`}
        description="Evaluation stops immediately. Historical alerts are retained."
        confirmLabel="Delete threshold"
        pending={deleteThreshold.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteThreshold.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </div>
  );
}
