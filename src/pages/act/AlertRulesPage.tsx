/**
 * Alert rules — `GET/POST/PATCH/DELETE /organizations/:orgId/alerting/rules`
 * plus `/enable`, `/disable`, `/clone`, `/test`, and the template endpoints.
 */
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Plus, FileStack, Sparkles } from "lucide-react";
import {
  PageHeader, KpiCard, FillPage, InfiniteTable, SeverityBadge, Timestamp, Button,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAlertRuleMutations,
  useAlertRuleTemplates,
  useAlertRules,
} from "@/modules/alerting/hooks/useAlerting";
import { apiErrorMessage, DialogField, FormDialog } from "@/modules/projects/components/project-ui";
import { ALERT_SEVERITIES, type AlertRule, type AlertSeverity } from "@/modules/alerting/api/types";
import { cn } from "@/lib/utils";

const dialogFieldInputClass =
  "h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-3 text-[13px] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text3)] hover:border-[var(--border2)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-bg)]";
const dialogFieldTextareaClass =
  "min-h-[80px] w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] p-3 text-[13px] leading-[1.5] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text3)] hover:border-[var(--border2)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-bg)]";

export default function AlertRulesPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useAlertRules({ limit: 200 });
  const { createRule, toggleRule, cloneRule, createFromTemplate } = useAlertRuleMutations();
  const { data: templates } = useAlertRuleTemplates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const rules = data?.data ?? [];

  const toggle = (rule: AlertRule) => {
    toggleRule.mutate(
      { id: rule.id, enabled: !rule.enabled },
      {
        onSuccess: () => toast.success(`${rule.name} ${rule.enabled ? "disabled" : "enabled"}`),
        onError: (err) => toast.error(apiErrorMessage(err, "Could not update rule.")),
      },
    );
  };

  const handleClone = (rule: AlertRule) => {
    cloneRule.mutate(rule.id, {
      onSuccess: () => toast.success(`Cloned "${rule.name}"`),
      onError: (err) => toast.error(apiErrorMessage(err, "Could not clone rule.")),
    });
  };

  const handleCreate = (form: FormData) => {
    setFormError(null);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      setFormError("Name is required.");
      return;
    }
    createRule.mutate(
      {
        name,
        description: String(form.get("description") ?? "").trim() || undefined,
        severity: form.get("severity") as AlertSeverity,
        evaluationIntervalSeconds: Number(form.get("evaluationIntervalSeconds") ?? 60),
        cooldownSeconds: Number(form.get("cooldownSeconds") ?? 300),
      },
      {
        onSuccess: () => {
          toast.success("Alert rule created");
          setDialogOpen(false);
        },
        onError: (err) => setFormError(apiErrorMessage(err, "Could not create rule.")),
      },
    );
  };

  const handleCreateFromTemplate = (templateKey: string) => {
    createFromTemplate.mutate(
      { templateKey },
      {
        onSuccess: () => {
          toast.success("Rule created from template");
          setTemplatesOpen(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Could not create rule from template.")),
      },
    );
  };

  const columns: Column<AlertRule>[] = [
    { key: "name", header: "Name", width: "1fr", cell: (r) => <span className="truncate font-medium">{r.name}</span> },
    { key: "severity", header: "Severity", width: "90px", cell: (r) => <SeverityBadge severity={r.severity} /> },
    { key: "interval", header: "Interval", width: "90px", cell: (r) => <span className="tabular-nums text-[var(--text2)]">{r.evaluationIntervalSeconds}s</span> },
    { key: "cooldown", header: "Cooldown", width: "90px", cell: (r) => <span className="tabular-nums text-[var(--text2)]">{r.cooldownSeconds}s</span> },
    { key: "triggered", header: "Last evaluated", width: "150px", cell: (r) => (r.lastEvaluatedAt ? <Timestamp value={r.lastEvaluatedAt} /> : <span className="text-[var(--text3)]">—</span>) },
    {
      key: "enabled",
      header: "Enabled",
      width: "90px",
      cell: (r) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggle(r); }}
          role="switch"
          aria-checked={r.enabled}
          aria-label={`Toggle ${r.name}`}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
            r.enabled ? "bg-[var(--brand)]" : "bg-[var(--bg3)]"
          )}
        >
          <span className={cn("inline-block size-4 transform rounded-full bg-white shadow-sm transition-transform", r.enabled ? "translate-x-[18px]" : "translate-x-0.5")} />
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "70px",
      align: "right" as const,
      cell: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" onClick={() => handleClone(r)}>Clone</Button>
        </div>
      ),
    },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Alert rules"
        description="Rule authoring for thresholds, anomalies, and composite conditions."
        actions={
          <div className="flex gap-2">
            <UiButton variant="outline" onClick={() => setTemplatesOpen(true)}>
              <FileStack className="size-4" /> Templates
            </UiButton>
            <UiButton onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" /> New rule
            </UiButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Rules" value={rules.length} />
        <KpiCard label="Enabled" value={rules.filter((r) => r.enabled).length} />
        <KpiCard label="Evaluated recently" value={rules.filter((r) => r.lastEvaluatedAt).length} />
        <KpiCard label="Default (preset)" value={rules.filter((r) => r.isDefault).length} />
      </div>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={rules}
        queryKey={["alertRules"]}
        columns={columns}
        getKey={(r) => r.id}
        onRowClick={(r) => navigate(`/alerts/rules/${r.id}`)}
        emptyMessage="No alert rules yet. Create one or start from a template."
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="New alert rule"
        description="Conditions and actions can be added from the rule detail page after creation."
        submitLabel="Create rule"
        pending={createRule.isPending}
        error={formError}
        onSubmit={handleCreate}
      >
        <DialogField label="Name" name="name" required>
          <input id="name" name="name" className={dialogFieldInputClass} placeholder="High error rate" />
        </DialogField>
        <DialogField label="Description" name="description">
          <textarea id="description" name="description" className={dialogFieldTextareaClass} placeholder="What does this rule detect?" />
        </DialogField>
        <div className="grid grid-cols-2 gap-4">
          <DialogField label="Severity" name="severity" required>
            <select id="severity" name="severity" defaultValue="warning" className={dialogFieldInputClass}>
              {ALERT_SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </DialogField>
          <DialogField label="Evaluation interval (s)" name="evaluationIntervalSeconds">
            <input id="evaluationIntervalSeconds" name="evaluationIntervalSeconds" type="number" min={1} defaultValue={60} className={dialogFieldInputClass} />
          </DialogField>
        </div>
        <DialogField label="Cooldown (s)" name="cooldownSeconds" hint="Minimum time between repeat notifications.">
          <input id="cooldownSeconds" name="cooldownSeconds" type="number" min={0} defaultValue={300} className={dialogFieldInputClass} />
        </DialogField>
      </FormDialog>

      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Rule templates</DialogTitle>
            <DialogDescription>Prebuilt conditions and actions you can turn into an editable rule.</DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto sidebar-scroll">
            {!templates || templates.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[var(--text2)]">No templates available.</p>
            ) : (
              templates.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleCreateFromTemplate(t.key)}
                  disabled={createFromTemplate.isPending}
                  className="flex items-start justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] p-3 text-left transition-colors hover:border-[var(--brand)] disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-3.5 text-[var(--brand)]" />
                      <span className="text-[13px] font-medium text-[var(--text)]">{t.name}</span>
                    </div>
                    {t.description && <p className="mt-1 text-[12px] text-[var(--text2)]">{t.description}</p>}
                  </div>
                  {t.severity && <SeverityBadge severity={t.severity} />}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </FillPage>
  );
}
