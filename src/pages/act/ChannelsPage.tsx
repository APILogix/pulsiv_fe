/**
 * Alert templates — `GET/POST/DELETE /organizations/:orgId/alerting/templates`
 * plus `/preview`. Message templates rendered into notifications sent via
 * rule actions, escalation steps, and routing rules.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader, KpiCard, FillPage, InfiniteTable, Timestamp, JsonViewer } from "@/shared/observe";
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
  useAlertTemplateMutations,
  useAlertTemplates,
} from "@/modules/alerting/hooks/useAlerting";
import { apiErrorMessage, ConfirmDialog, DialogField, FormDialog } from "@/modules/projects/components/project-ui";
import { EnabledPill } from "@/modules/alerting/components/alerting-ui";
import { fieldInputClass, fieldTextareaClass } from "@/shared/ui/pulse";
import { ALERT_SEVERITIES, type AlertSeverity, type AlertTemplate } from "@/modules/alerting/api/types";

export default function AlertTemplatesPage() {
  const { data, isLoading } = useAlertTemplates({ limit: 100 });
  const { create, remove, preview } = useAlertTemplateMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlertTemplate | null>(null);
  const [previewTarget, setPreviewTarget] = useState<AlertTemplate | null>(null);
  const [previewResult, setPreviewResult] = useState<unknown>(null);
  const templates = data?.data ?? [];

  const handleCreate = (form: FormData) => {
    setFormError(null);
    const name = String(form.get("name") ?? "").trim();
    const content = String(form.get("content") ?? "").trim();
    if (!name || !content) {
      setFormError("Name and content are required.");
      return;
    }
    const defaultForSeverity = String(form.get("defaultForSeverity") ?? "");
    create.mutate(
      {
        name,
        content,
        templateType: String(form.get("templateType") ?? "body").trim() || "body",
        defaultForSeverity: defaultForSeverity ? (defaultForSeverity as AlertSeverity) : undefined,
        connectorType: String(form.get("connectorType") ?? "").trim() || undefined,
        isDefault: form.get("isDefault") === "on",
      },
      {
        onSuccess: () => {
          toast.success("Template created");
          setDialogOpen(false);
        },
        onError: (err) => setFormError(apiErrorMessage(err, "Could not create template.")),
      },
    );
  };

  const handlePreview = (template: AlertTemplate) => {
    setPreviewTarget(template);
    setPreviewResult(null);
    preview.mutate(
      { id: template.id, sampleData: template.sampleData },
      {
        onSuccess: (result) => setPreviewResult(result),
        onError: (err) => toast.error(apiErrorMessage(err, "Could not render preview.")),
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
      onError: (err) => toast.error(apiErrorMessage(err, "Could not delete template.")),
    });
  };

  const columns: Column<AlertTemplate>[] = [
    { key: "name", header: "Name", width: "1fr", cell: (t) => <span className="truncate font-medium">{t.name}</span> },
    { key: "type", header: "Type", width: "100px", cell: (t) => <span className="capitalize text-[var(--text2)]">{t.templateType}</span> },
    { key: "severity", header: "Default severity", width: "140px", cell: (t) => <span className="text-[var(--text2)]">{t.defaultForSeverity ?? "—"}</span> },
    { key: "default", header: "Default", width: "90px", cell: (t) => <EnabledPill enabled={t.isDefault} /> },
    { key: "updated", header: "Updated", width: "130px", cell: (t) => <Timestamp value={t.updatedAt} /> },
    {
      key: "actions",
      header: "",
      width: "60px",
      align: "right" as const,
      cell: (t) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <UiButton variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </UiButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handlePreview(t)}>
                <Eye className="mr-2 h-4 w-4" /> Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteTarget(t)} className="text-[var(--red)]">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Templates"
        description="Message templates rendered into notifications by rule actions, escalation steps, and routing rules."
        actions={<UiButton onClick={() => setDialogOpen(true)}><Plus className="size-4" /> New template</UiButton>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Templates" value={templates.length} />
        <KpiCard label="Defaults" value={((templates ?? []) as any[]).filter((t: any) => t.isDefault).length} />
        <KpiCard label="With severity" value={((templates ?? []) as any[]).filter((t: any) => t.defaultForSeverity).length} />
        <KpiCard label="Connector-scoped" value={((templates ?? []) as any[]).filter((t: any) => t.connectorType).length} />
      </div>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={templates}
        queryKey={["alert-templates"]}
        columns={columns}
        getKey={(t) => t.id}
        emptyMessage="No templates yet. Create one to render into notifications."
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="New template"
        description="Content supports variable interpolation validated against variablesSchema."
        submitLabel="Create template"
        pending={create.isPending}
        error={formError}
        onSubmit={handleCreate}
        width="sm:max-w-[640px]"
      >
        <DialogField label="Name" name="name" required>
          <input id="name" name="name" className={fieldInputClass} placeholder="Critical error notification" />
        </DialogField>
        <div className="grid grid-cols-2 gap-4">
          <DialogField label="Template type" name="templateType" hint="e.g. body, subject, slack_block.">
            <input id="templateType" name="templateType" className={fieldInputClass} defaultValue="body" />
          </DialogField>
          <DialogField label="Default for severity" name="defaultForSeverity">
            <select id="defaultForSeverity" name="defaultForSeverity" className={fieldInputClass} defaultValue="">
              <option value="">None</option>
              {ALERT_SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </DialogField>
        </div>
        <DialogField label="Connector type" name="connectorType" hint="Optional. Scopes this template to one connector type.">
          <input id="connectorType" name="connectorType" className={fieldInputClass} placeholder="slack, email, webhook…" />
        </DialogField>
        <DialogField label="Content" name="content" required hint="Up to 20,000 characters.">
          <textarea id="content" name="content" className={`${fieldTextareaClass} min-h-[140px] font-[family-name:var(--mono)] text-[12px]`} placeholder={"{{severity}} alert on {{source}}: {{message}}"} spellCheck={false} />
        </DialogField>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isDefault" className="size-4 rounded border-[var(--border)]" />
          <span className="text-[13px] text-[var(--text)]">Set as default template</span>
        </label>
      </FormDialog>

      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Preview: {previewTarget?.name}</DialogTitle>
            <DialogDescription>Rendered with the template&apos;s stored sample data.</DialogDescription>
          </DialogHeader>
          {preview.isPending ? (
            <p className="text-[13px] text-[var(--text2)]">Rendering…</p>
          ) : previewResult != null ? (
            <JsonViewer data={previewResult} maxHeight={280} />
          ) : (
            <p className="text-[13px] text-[var(--text2)]">No preview yet.</p>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete template?"
        description={deleteTarget ? `"${deleteTarget.name}" will be removed. Rules referencing it will fall back to their default template.` : undefined}
        confirmLabel="Delete template"
        pending={remove.isPending}
        onConfirm={handleDelete}
      />
    </FillPage>
  );
}
