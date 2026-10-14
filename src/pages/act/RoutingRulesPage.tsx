/**
 * Routing rules: `GET/POST/DELETE /organizations/:orgId/alerting/routing-rules`
 * plus `/test`. A routing rule matches on severity/source/labels and fans an
 * alert out to connector/route targets, with an optional fallback set.
 */
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FlaskConical, Plus } from "lucide-react";

import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useRoutingRuleMutations, useRoutingRules } from "@/modules/alerting/hooks/useAlerting";
import { EnabledPill, labelize } from "@/modules/alerting/components/alerting-ui";
import {
  ALERT_SEVERITIES,
  type AlertRoutingRule,
  type AlertSeverity,
  type TestRoutingResult,
} from "@/modules/alerting/api/types";
import { apiErrorMessage, ConfirmDialog, DialogField, FormDialog } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  HIDE_BELOW_XL,
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
import { JsonViewer, Timestamp, formatNumber } from "@/shared/observe";
import { Pill, SegmentedControl, fieldInputClass, fieldTextareaClass, type SegmentOption } from "@/shared/ui/pulse";

// ── module-level constants ───────────────────────────────────

type StatusFilter = "all" | "on" | "off";

const COLUMNS: SheetColumn[] = [
  { key: "priority", header: "Priority", className: "w-[84px]" },
  { key: "rule", header: "Rule" },
  { key: "targets", header: "Targets", className: `w-[200px] ${HIDE_BELOW_MD}` },
  { key: "fallback", header: "Fallback", className: `w-[96px] ${HIDE_BELOW_LG}`, align: "right" },
  { key: "status", header: "Status", className: "w-[84px]" },
  { key: "updated", header: "Updated", className: `w-[120px] ${HIDE_BELOW_XL}` },
  { key: "actions", header: "Actions", srOnly: true, className: "w-[56px]", align: "right" },
];

const MONO = "font-[family-name:var(--mono)] tabular-nums";
const ID_LIST_CLASS = `${fieldInputClass} h-auto min-h-[64px] py-2 font-[family-name:var(--mono)] text-[12px]`;

// ── helpers ──────────────────────────────────────────────────

function parseIdList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value.split(/[\n,]/).map((v) => v.trim()).filter(Boolean);
}

function plural(count: number, one: string, many: string): string {
  return `${formatNumber(count)} ${count === 1 ? one : many}`;
}

function listClause(field: string, values: readonly string[]): string {
  return values.length === 1 ? `${field}=${values[0]}` : `${field} in (${values.join(", ")})`;
}

/** Conditions as one expression; `null` when the rule matches any alert. */
function matchExpression(rule: AlertRoutingRule): string | null {
  const { severity, source, labels } = rule.conditions ?? {};
  const parts: string[] = [];
  if (severity && severity.length > 0) parts.push(listClause("severity", severity));
  if (source && source.length > 0) parts.push(listClause("source", source));
  if (labels) {
    for (const [key, value] of Object.entries(labels)) parts.push(`${key}=${value}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function matchesSearch(rule: AlertRoutingRule, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${rule.name} ${rule.description ?? ""} ${matchExpression(rule) ?? ""}`.toLowerCase().includes(needle);
}

// ── page ─────────────────────────────────────────────────────

export default function RoutingRulesPage() {
  const { data, isLoading, error, refetch } = useRoutingRules();
  const { create, remove, test } = useRoutingRuleMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestRoutingResult | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlertRoutingRule | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Evaluation order: lower priority number first.
  const rules = useMemo(() => (data ?? []).slice().sort((a, b) => a.priority - b.priority), [data]);
  const filtered = useMemo(
    () =>
      rules.filter((rule) => {
        if (statusFilter === "on" && !rule.isActive) return false;
        if (statusFilter === "off" && rule.isActive) return false;
        return matchesSearch(rule, search);
      }),
    [rules, statusFilter, search],
  );

  const loading = isLoading && !data;
  const loadFailed = Boolean(error) && !data;
  const activeCount = rules.filter((r) => r.isActive).length;
  const fallbackCount = rules.filter((r) => r.fallbackConnectorIds.length > 0).length;
  const templateCount = rules.filter((r) => r.templateId).length;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const openCreate = () => {
    setFormError(null);
    setDialogOpen(true);
  };

  const handleCreate = (form: FormData) => {
    setFormError(null);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      setFormError("Name is required.");
      return;
    }
    const severityRaw = String(form.get("condSeverity") ?? "").trim();
    const sourceRaw = String(form.get("condSource") ?? "").trim();
    create.mutate(
      {
        name,
        description: String(form.get("description") ?? "").trim() || undefined,
        priority: Number(form.get("priority") ?? 100),
        conditions: {
          severity: severityRaw ? (severityRaw.split(",").map((s) => s.trim()) as AlertSeverity[]) : undefined,
          source: sourceRaw ? sourceRaw.split(",").map((s) => s.trim()) : undefined,
        },
        targetConnectorIds: parseIdList(form.get("targetConnectorIds")),
        targetRouteIds: parseIdList(form.get("targetRouteIds")),
        fallbackConnectorIds: parseIdList(form.get("fallbackConnectorIds")),
      },
      {
        onSuccess: () => {
          toast.success("Routing rule created");
          setDialogOpen(false);
        },
        onError: (err) => setFormError(apiErrorMessage(err, "Could not create routing rule.")),
      },
    );
  };

  const handleTest = (form: FormData) => {
    setTestError(null);
    setTestResult(null);
    const source = String(form.get("source") ?? "").trim();
    if (!source) {
      setTestError("Source is required.");
      return;
    }
    test.mutate(
      { severity: form.get("severity") as AlertSeverity, source },
      {
        onSuccess: (result) => setTestResult(result),
        onError: (err) => setTestError(apiErrorMessage(err, "Could not test routing.")),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Deleted "${deleteTarget.name}"`);
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(apiErrorMessage(err, "Could not delete routing rule.")),
    });
  };

  const readouts: Readout[] = [
    {
      label: "Rules",
      value: formatNumber(rules.length),
      sub: "Evaluated lowest priority first",
    },
    {
      label: "On",
      value: formatNumber(activeCount),
      sub: rules.length - activeCount > 0 ? `${formatNumber(rules.length - activeCount)} turned off` : "All rules on",
    },
    {
      label: "With fallback",
      value: formatNumber(fallbackCount),
      sub: "Fallback connectors set",
    },
    {
      label: "Template-scoped",
      value: formatNumber(templateCount),
      sub: "Render with a set template",
    },
  ];

  const statusOptions: SegmentOption<StatusFilter>[] = [
    { value: "all", label: "All", count: rules.length },
    { value: "on", label: "On", count: activeCount },
    { value: "off", label: "Off", count: rules.length - activeCount },
  ];

  let body: ReactNode;
  if (loading) {
    body = <SheetLoading rows={4} label="Loading routing rules" />;
  } else if (loadFailed) {
    body = (
      <SheetError
        title="Could not load routing rules"
        message={apiErrorMessage(error, "The routing rule list is unavailable right now.")}
        onRetry={() => void refetch()}
      />
    );
  } else if (rules.length === 0) {
    body = (
      <SheetEmpty
        title="No routing rules yet"
        description="A routing rule matches alerts by severity, source, or labels and sends them to connector or route targets. Fallback connectors take over if every primary target fails delivery. Create a rule to decide where alerts go."
        action={
          <UiButton variant="outline" size="lg" onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" />
            New rule
          </UiButton>
        }
      />
    );
  } else if (filtered.length === 0) {
    body = (
      <SheetEmpty
        title="No routing rules match"
        description={
          search.trim()
            ? `Nothing matches “${search.trim()}” with the current status filter.`
            : "No routing rule matches the current status filter."
        }
        action={
          <UiButton variant="outline" size="lg" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Routing rules in evaluation order" minWidth={460}>
        {filtered.map((rule) => {
          const expression = matchExpression(rule);
          const connectors = rule.targetConnectorIds.length;
          const routes = rule.targetRouteIds.length;
          const fallback = rule.fallbackConnectorIds.length;
          return (
            <SheetRow key={rule.id}>
              <SheetCell>
                <span className={`${MONO} text-[12px] text-[var(--text2)]`}>{rule.priority}</span>
              </SheetCell>
              <SheetCell>
                <RowTitle
                  title={rule.name}
                  subtitle={expression ?? "Matches any alert"}
                  subtitleMono={expression !== null}
                />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {connectors === 0 && routes === 0 ? (
                    <Pill>No targets</Pill>
                  ) : (
                    <>
                      {connectors > 0 && <Pill>{plural(connectors, "connector", "connectors")}</Pill>}
                      {routes > 0 && <Pill>{plural(routes, "route", "routes")}</Pill>}
                    </>
                  )}
                </div>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG} align="right">
                {fallback > 0 ? (
                  <span className={`${MONO} text-[12px] text-[var(--text2)]`}>{formatNumber(fallback)}</span>
                ) : (
                  <span className="text-[12px] text-[var(--text3)]">None</span>
                )}
              </SheetCell>
              <SheetCell>
                <EnabledPill enabled={rule.isActive} />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_XL}>
                <Timestamp value={rule.updatedAt} />
              </SheetCell>
              <SheetCell align="right">
                <RowActions label={`Actions for ${rule.name}`}>
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(rule)}>
                    Delete rule
                  </DropdownMenuItem>
                </RowActions>
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
        title="Routing"
        description="Match alerts by severity, source, or labels and fan them out to connector or route targets."
        actions={
          <>
            <UiButton variant="outline" size="lg" onClick={() => setTestOpen(true)}>
              <FlaskConical className="size-4" aria-hidden="true" />
              Test routing
            </UiButton>
            <UiButton size="lg" onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              New rule
            </UiButton>
          </>
        }
      />

      {!loadFailed && <Readouts cells={readouts} loading={loading} label="Routing summary" />}

      <Sheet
        label="Routing rules"
        toolbar={
          <>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search by name or condition"
              label="Search routing rules"
            />
            <div className="sidebar-scroll max-w-full overflow-x-auto">
              <SegmentedControl
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
                ariaLabel="Filter routing rules by status"
              />
            </div>
            {!loading && !loadFailed && (
              <ToolbarCount>{plural(filtered.length, "rule", "rules")}</ToolbarCount>
            )}
          </>
        }
        footer={
          !loading && !loadFailed && rules.length > 0 ? (
            <span>Rules are evaluated in priority order, lowest number first.</span>
          ) : undefined
        }
      >
        {body}
      </Sheet>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="New routing rule"
        description="Lower priority number is evaluated first."
        submitLabel="Create rule"
        pending={create.isPending}
        error={formError}
        onSubmit={handleCreate}
        width="sm:max-w-[640px]"
      >
        <DialogField label="Name" name="name" required>
          <input id="name" name="name" className={fieldInputClass} placeholder="Critical alerts to PagerDuty" />
        </DialogField>
        <DialogField label="Description" name="description">
          <textarea id="description" name="description" className={fieldTextareaClass} />
        </DialogField>
        <DialogField label="Priority" name="priority" hint="Lower runs first. Default 100.">
          <input
            id="priority"
            name="priority"
            type="number"
            defaultValue={100}
            className={`${fieldInputClass} font-[family-name:var(--mono)] text-[12px] tabular-nums`}
          />
        </DialogField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DialogField
            label="Match severity"
            name="condSeverity"
            hint={`Comma-separated: ${ALERT_SEVERITIES.join(", ")}. Leave blank to match any.`}
          >
            <input
              id="condSeverity"
              name="condSeverity"
              className={`${fieldInputClass} font-[family-name:var(--mono)] text-[12px]`}
              placeholder="error, critical"
              spellCheck={false}
            />
          </DialogField>
          <DialogField label="Match source" name="condSource" hint="Comma-separated. Leave blank to match any.">
            <input
              id="condSource"
              name="condSource"
              className={`${fieldInputClass} font-[family-name:var(--mono)] text-[12px]`}
              placeholder="checkout-api"
              spellCheck={false}
            />
          </DialogField>
        </div>
        <DialogField label="Target connector IDs" name="targetConnectorIds" hint="One per line or comma-separated.">
          <textarea id="targetConnectorIds" name="targetConnectorIds" className={ID_LIST_CLASS} spellCheck={false} />
        </DialogField>
        <DialogField label="Target route IDs" name="targetRouteIds" hint="One per line or comma-separated.">
          <textarea id="targetRouteIds" name="targetRouteIds" className={ID_LIST_CLASS} spellCheck={false} />
        </DialogField>
        <DialogField label="Fallback connector IDs" name="fallbackConnectorIds" hint="Used if all primary targets fail delivery.">
          <textarea id="fallbackConnectorIds" name="fallbackConnectorIds" className={ID_LIST_CLASS} spellCheck={false} />
        </DialogField>
      </FormDialog>

      <FormDialog
        open={testOpen}
        onOpenChange={setTestOpen}
        title="Test routing"
        description="See which rules would match a hypothetical event, without ingesting anything."
        submitLabel="Run test"
        pending={test.isPending}
        error={testError}
        onSubmit={handleTest}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DialogField label="Severity" name="severity" required>
            <select id="severity" name="severity" defaultValue="error" className={fieldInputClass}>
              {ALERT_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {labelize(s)}
                </option>
              ))}
            </select>
          </DialogField>
          <DialogField label="Source" name="source" required>
            <input
              id="source"
              name="source"
              className={`${fieldInputClass} font-[family-name:var(--mono)] text-[12px]`}
              placeholder="checkout-api"
              spellCheck={false}
            />
          </DialogField>
        </div>
        {testResult != null && <TestResult result={testResult} />}
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete routing rule?"
        description={deleteTarget ? `"${deleteTarget.name}" will stop matching new alerts.` : undefined}
        confirmLabel="Delete rule"
        pending={remove.isPending}
        onConfirm={handleDelete}
      />
    </WorkspacePage>
  );
}

// ── test result ──────────────────────────────────────────────

function TestResult({ result }: { result: TestRoutingResult }) {
  const matched = Array.isArray(result.matchedRules) ? result.matchedRules : null;

  return (
    <div className="flex min-w-0 flex-col gap-3" aria-live="polite">
      {matched && (
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-[12px] text-[var(--text3)]">
            {matched.length === 0 ? "No rule matched this event." : `${plural(matched.length, "rule", "rules")} matched`}
          </p>
          {matched.length > 0 && (
            <ol className="divide-y divide-[var(--border)] rounded-[var(--radius)] border border-[var(--border)]">
              {matched.map((rule) => (
                <li key={rule.id} className="flex min-w-0 items-center gap-3 px-3 py-2 text-[13px]">
                  <span className={`${MONO} w-10 shrink-0 text-[12px] text-[var(--text3)]`}>{rule.priority}</span>
                  <span className="min-w-0 truncate text-[var(--text)]">{rule.name}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-[12px] text-[var(--text3)]">Full response</p>
        <JsonViewer data={result} maxHeight={220} />
      </div>
    </div>
  );
}
