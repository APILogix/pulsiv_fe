/**
 * Routing rules — `GET/POST/DELETE /organizations/:orgId/alerting/routing-rules`
 * plus `/test`. A routing rule matches on severity/source/labels and fans an
 * alert out to connector/route targets, with an optional fallback set.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Route, Trash2, FlaskConical } from "lucide-react";
import { PageHeader, KpiCard, FillPage, Table, Tr, Td, SeverityBadge, JsonViewer } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  useRoutingRuleMutations,
  useRoutingRules,
} from "@/modules/alerting/hooks/useAlerting";
import { apiErrorMessage, ConfirmDialog, DialogField, FormDialog } from "@/modules/projects/components/project-ui";
import { EnabledPill } from "@/modules/alerting/components/alerting-ui";
import { fieldInputClass, fieldTextareaClass } from "@/shared/ui/pulse";
import { ALERT_SEVERITIES, type AlertRoutingRule, type AlertSeverity } from "@/modules/alerting/api/types";

function parseIdList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value.split(/[\n,]/).map((v) => v.trim()).filter(Boolean);
}

export default function RoutingRulesPage() {
  const { data, isLoading } = useRoutingRules();
  const { create, remove, test } = useRoutingRuleMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<unknown>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlertRoutingRule | null>(null);
  const rules = data ?? [];

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

  return (
    <FillPage>
      <PageHeader
        title="Routing rules"
        description="Match alerts by severity, source, or labels and fan them out to connector or route targets."
        actions={
          <div className="flex gap-2">
            <UiButton variant="outline" onClick={() => setTestOpen(true)}>
              <FlaskConical className="size-4" /> Test routing
            </UiButton>
            <UiButton onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" /> New rule
            </UiButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Rules" value={rules.length} icon={Route} />
        <KpiCard label="Active" value={rules.filter((r) => r.isActive).length} />
        <KpiCard label="With fallback" value={rules.filter((r) => r.fallbackConnectorIds.length > 0).length} />
        <KpiCard label="Template-scoped" value={rules.filter((r) => r.templateId).length} />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="loading-skeleton h-11 rounded-[var(--radius)] bg-[var(--bg2)]" />)}
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--text3)]">No routing rules yet.</div>
      ) : (
        <Table headers={["Name", "Priority", "Severity match", "Source match", "Targets", "Status", ""]} maxHeight="calc(100vh - 22rem)">
          {rules
            .slice()
            .sort((a, b) => a.priority - b.priority)
            .map((r) => (
              <Tr key={r.id}>
                <Td><span className="font-medium">{r.name}</span></Td>
                <Td><span className="tabular-nums text-[var(--text2)]">{r.priority}</span></Td>
                <Td>
                  {r.conditions.severity && r.conditions.severity.length > 0 ? (
                    <div className="flex gap-1">{r.conditions.severity.map((s) => <SeverityBadge key={s} severity={s} />)}</div>
                  ) : <span className="text-[var(--text3)]">Any</span>}
                </Td>
                <Td>{r.conditions.source && r.conditions.source.length > 0 ? r.conditions.source.join(", ") : <span className="text-[var(--text3)]">Any</span>}</Td>
                <Td>
                  <span className="text-[12px] text-[var(--text2)]">
                    {r.targetConnectorIds.length} connector{r.targetConnectorIds.length === 1 ? "" : "s"}, {r.targetRouteIds.length} route{r.targetRouteIds.length === 1 ? "" : "s"}
                  </span>
                </Td>
                <Td><EnabledPill enabled={r.isActive} /></Td>
                <Td className="text-right">
                  <UiButton variant="ghost" className="h-8 w-8 p-0" onClick={() => setDeleteTarget(r)}>
                    <Trash2 className="size-4 text-[var(--red)]" />
                  </UiButton>
                </Td>
              </Tr>
            ))}
        </Table>
      )}

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
          <input id="priority" name="priority" type="number" defaultValue={100} className={fieldInputClass} />
        </DialogField>
        <div className="grid grid-cols-2 gap-4">
          <DialogField label="Match severity" name="condSeverity" hint={`Comma-separated: ${ALERT_SEVERITIES.join(", ")}. Blank = any.`}>
            <input id="condSeverity" name="condSeverity" className={fieldInputClass} placeholder="error, critical" />
          </DialogField>
          <DialogField label="Match source" name="condSource" hint="Comma-separated. Blank = any.">
            <input id="condSource" name="condSource" className={fieldInputClass} placeholder="checkout-api" />
          </DialogField>
        </div>
        <DialogField label="Target connector ids" name="targetConnectorIds" hint="One per line or comma-separated.">
          <textarea id="targetConnectorIds" name="targetConnectorIds" className={`${fieldInputClass} min-h-[64px] py-2 font-[family-name:var(--mono)] text-[12px]`} spellCheck={false} />
        </DialogField>
        <DialogField label="Target route ids" name="targetRouteIds" hint="One per line or comma-separated.">
          <textarea id="targetRouteIds" name="targetRouteIds" className={`${fieldInputClass} min-h-[64px] py-2 font-[family-name:var(--mono)] text-[12px]`} spellCheck={false} />
        </DialogField>
        <DialogField label="Fallback connector ids" name="fallbackConnectorIds" hint="Used if all primary targets fail delivery.">
          <textarea id="fallbackConnectorIds" name="fallbackConnectorIds" className={`${fieldInputClass} min-h-[64px] py-2 font-[family-name:var(--mono)] text-[12px]`} spellCheck={false} />
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
        <div className="grid grid-cols-2 gap-4">
          <DialogField label="Severity" name="severity" required>
            <select id="severity" name="severity" defaultValue="error" className={fieldInputClass}>
              {ALERT_SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </DialogField>
          <DialogField label="Source" name="source" required>
            <input id="source" name="source" className={fieldInputClass} placeholder="checkout-api" />
          </DialogField>
        </div>
        {testResult != null && (
          <div className="mt-1">
            <JsonViewer data={testResult} maxHeight={220} />
          </div>
        )}
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
    </FillPage>
  );
}
