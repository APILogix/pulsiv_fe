/**
 * Alert templates: `GET/POST/DELETE /organizations/:orgId/alerting/templates`
 * plus `/preview`. Message templates rendered into notifications sent via
 * rule actions, escalation steps, and routing rules.
 */
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Button as UiButton } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAlertTemplateMutations, useAlertTemplates } from "@/modules/alerting/hooks/useAlerting";
import { labelize } from "@/modules/alerting/components/alerting-ui";
import {
  ALERT_SEVERITIES,
  type AlertSeverity,
  type AlertTemplate,
  type PreviewTemplateResult,
} from "@/modules/alerting/api/types";
import { apiErrorMessage, ConfirmDialog, DialogField, FormDialog } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_MD,
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
import { CodeBlock, FilterSelect, JsonViewer, SeverityBadge, Timestamp, formatNumber } from "@/shared/observe";
import { Pill, fieldInputClass, fieldTextareaClass } from "@/shared/ui/pulse";

// ── module-level constants ───────────────────────────────────

const TEMPLATES_QUERY = { limit: 100 };

// Rows revealed per "Load more", matching the previous infinite table.
const PAGE_SIZE = 20;

const SEVERITY_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "none", label: "No default" },
  ...ALERT_SEVERITIES.map((severity) => ({ value: severity, label: labelize(severity) })),
];

const COLUMNS: SheetColumn[] = [
  { key: "template", header: "Template" },
  { key: "severity", header: "Default severity", className: "w-[140px]" },
  { key: "updated", header: "Updated", className: `w-[132px] ${HIDE_BELOW_MD}` },
  { key: "actions", header: "Actions", srOnly: true, className: "w-[132px]", align: "right" },
];

const MONO = "font-[family-name:var(--mono)] tabular-nums";

function matchesSearch(template: AlertTemplate, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${template.name} ${template.templateType} ${template.connectorType ?? ""}`.toLowerCase().includes(needle);
}

function matchesSeverity(template: AlertTemplate, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "none") return !template.defaultForSeverity;
  return template.defaultForSeverity === filter;
}

/** `body · slack`: the template type, then its connector scope when it has one. */
function templateKey(template: AlertTemplate): string {
  return template.connectorType ? `${template.templateType} · ${template.connectorType}` : template.templateType;
}

// ── page ─────────────────────────────────────────────────────

export default function AlertTemplatesPage() {
  const { data, isLoading, error, refetch } = useAlertTemplates(TEMPLATES_QUERY);
  const { create, remove, preview } = useAlertTemplateMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlertTemplate | null>(null);
  const [previewTarget, setPreviewTarget] = useState<AlertTemplate | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewTemplateResult | null>(null);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const templates = useMemo(() => data?.data ?? [], [data]);
  const filtered = useMemo(
    () => templates.filter((template) => matchesSearch(template, search) && matchesSeverity(template, severity)),
    [templates, search, severity],
  );
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visible.length < filtered.length;

  const total = data?.total ?? templates.length;
  const partial = total > templates.length;
  const loading = isLoading && !data;
  const loadFailed = Boolean(error) && !data;
  const filtersActive = search.trim() !== "" || severity !== "all";

  // Filters restart the list at the first page, as the infinite table did.
  const updateSearch = (next: string) => {
    setSearch(next);
    setVisibleCount(PAGE_SIZE);
  };
  const updateSeverity = (next: string) => {
    setSeverity(next);
    setVisibleCount(PAGE_SIZE);
  };
  const clearFilters = () => {
    setSearch("");
    setSeverity("all");
    setVisibleCount(PAGE_SIZE);
  };

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

  const openCreate = () => {
    setFormError(null);
    setDialogOpen(true);
  };

  const defaults = templates.filter((t) => t.isDefault).length;
  const severityDefaults = templates.filter((t) => t.defaultForSeverity).length;
  const connectorScoped = templates.filter((t) => t.connectorType).length;

  const readouts: Readout[] = [
    {
      label: "Templates",
      value: formatNumber(total),
      sub: partial ? `Counts use the latest ${formatNumber(templates.length)}` : "Saved for this organization",
    },
    {
      label: "Defaults",
      value: formatNumber(defaults),
      sub: defaults > 0 ? "Marked as a default template" : "No default template set",
    },
    {
      label: "Severity defaults",
      value: formatNumber(severityDefaults),
      sub: "Default for one severity",
    },
    {
      label: "Connector-scoped",
      value: formatNumber(connectorScoped),
      sub: "Limited to one connector type",
    },
  ];

  let body: ReactNode;
  if (loading) {
    body = <SheetLoading rows={5} label="Loading templates" />;
  } else if (loadFailed) {
    body = (
      <SheetError
        title="Could not load templates"
        message={apiErrorMessage(error, "The template list is unavailable right now.")}
        onRetry={() => void refetch()}
      />
    );
  } else if (templates.length === 0) {
    body = (
      <SheetEmpty
        title="No templates yet"
        description="A template sets the wording of a notification. Rule actions, escalation steps, and routing rules render it when they notify. Create one to control what recipients read."
        action={
          <UiButton variant="outline" size="lg" onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" />
            New template
          </UiButton>
        }
      />
    );
  } else if (filtered.length === 0) {
    body = (
      <SheetEmpty
        title="No templates match"
        description={
          search.trim()
            ? `Nothing matches “${search.trim()}” with the current severity filter.`
            : "No template matches the current severity filter."
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
      <SheetTable columns={COLUMNS} caption="Alert templates" minWidth={480}>
        {visible.map((template) => (
          <SheetRow key={template.id}>
            <SheetCell>
              <RowTitle
                title={template.name}
                badges={template.isDefault ? <Pill>Default</Pill> : undefined}
                subtitle={templateKey(template)}
                subtitleMono
              />
            </SheetCell>
            <SheetCell>
              {template.defaultForSeverity ? (
                <SeverityBadge severity={template.defaultForSeverity} />
              ) : (
                <span className="text-[12px] text-[var(--text3)]">None</span>
              )}
            </SheetCell>
            <SheetCell className={HIDE_BELOW_MD}>
              <Timestamp value={template.updatedAt} />
            </SheetCell>
            <SheetCell align="right">
              <div className="flex items-center justify-end gap-1.5">
                <UiButton
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(template)}
                  aria-label={`Preview ${template.name}`}
                >
                  Preview
                </UiButton>
                <RowActions label={`Actions for ${template.name}`}>
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(template)}>
                    Delete template
                  </DropdownMenuItem>
                </RowActions>
              </div>
            </SheetCell>
          </SheetRow>
        ))}
      </SheetTable>
    );
  }

  const showFooter = !loading && !loadFailed && filtered.length > 0;

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Templates"
        description="Message templates rendered into notifications by rule actions, escalation steps, and routing rules."
        actions={
          <UiButton size="lg" onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" />
            New template
          </UiButton>
        }
      />

      {!loadFailed && <Readouts cells={readouts} loading={loading} label="Template summary" />}

      <Sheet
        label="Template list"
        toolbar={
          <>
            <SearchField
              value={search}
              onChange={updateSearch}
              placeholder="Search by name, type, or connector"
              label="Search templates"
            />
            <FilterSelect
              label="Default severity"
              value={severity}
              onChange={updateSeverity}
              options={SEVERITY_FILTER_OPTIONS}
            />
            {!loading && !loadFailed && (
              <ToolbarCount>
                {formatNumber(filtered.length)} {filtered.length === 1 ? "template" : "templates"}
                {filtersActive ? (filtered.length === 1 ? " matches" : " match") : ""}
              </ToolbarCount>
            )}
          </>
        }
        footer={
          showFooter ? (
            <>
              <span>
                Showing <span className={MONO}>1–{formatNumber(visible.length)}</span> of{" "}
                <span className={MONO}>{formatNumber(filtered.length)}</span>
                {partial && (
                  <>
                    {" "}
                    · latest <span className={MONO}>{formatNumber(templates.length)}</span> of{" "}
                    <span className={MONO}>{formatNumber(total)}</span> loaded
                  </>
                )}
              </span>
              {hasMore && (
                <UiButton
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  aria-label={`Load ${formatNumber(Math.min(PAGE_SIZE, filtered.length - visible.length))} more templates`}
                >
                  Load more
                </UiButton>
              )}
            </>
          ) : undefined
        }
      >
        {body}
      </Sheet>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="New template"
        description="Content supports variable interpolation, validated against the template's variables schema."
        submitLabel="Create template"
        pending={create.isPending}
        error={formError}
        onSubmit={handleCreate}
        width="sm:max-w-[640px]"
      >
        <DialogField label="Name" name="name" required>
          <input id="name" name="name" className={fieldInputClass} placeholder="Critical error notification" />
        </DialogField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DialogField label="Template type" name="templateType" hint="For example body, subject, or slack_block.">
            <input
              id="templateType"
              name="templateType"
              className={`${fieldInputClass} font-[family-name:var(--mono)] text-[12px]`}
              defaultValue="body"
              spellCheck={false}
            />
          </DialogField>
          <DialogField label="Default for severity" name="defaultForSeverity">
            <select id="defaultForSeverity" name="defaultForSeverity" className={fieldInputClass} defaultValue="">
              <option value="">None</option>
              {ALERT_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {labelize(s)}
                </option>
              ))}
            </select>
          </DialogField>
        </div>
        <DialogField label="Connector type" name="connectorType" hint="Optional. Scopes this template to one connector type.">
          <input
            id="connectorType"
            name="connectorType"
            className={`${fieldInputClass} font-[family-name:var(--mono)] text-[12px]`}
            placeholder="slack, email, webhook"
            spellCheck={false}
          />
        </DialogField>
        <DialogField label="Content" name="content" required hint="Up to 20,000 characters.">
          <textarea
            id="content"
            name="content"
            className={`${fieldTextareaClass} min-h-[140px] font-[family-name:var(--mono)] text-[12px]`}
            placeholder={"{{severity}} alert on {{source}}: {{message}}"}
            spellCheck={false}
          />
        </DialogField>
        <label className="flex w-fit items-center gap-2 rounded-[var(--radius)]">
          <input
            type="checkbox"
            name="isDefault"
            className="size-4 rounded-[4px] border-[var(--border)] accent-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]"
          />
          <span className="text-[13px] text-[var(--text)]">Set as default template</span>
        </label>
      </FormDialog>

      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="break-words">Preview {previewTarget?.name}</DialogTitle>
            <DialogDescription>Rendered with the template&apos;s stored sample data.</DialogDescription>
          </DialogHeader>
          <PreviewBody
            pending={preview.isPending}
            result={previewResult}
            error={preview.isError ? apiErrorMessage(preview.error, "Could not render preview.") : null}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete template?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be removed. Rules referencing it will fall back to their default template.`
            : undefined
        }
        confirmLabel="Delete template"
        pending={remove.isPending}
        onConfirm={handleDelete}
      />
    </WorkspacePage>
  );
}

// ── preview body ─────────────────────────────────────────────

function PreviewBody({
  pending,
  result,
  error,
}: {
  pending: boolean;
  result: PreviewTemplateResult | null;
  error: string | null;
}) {
  if (pending) {
    return (
      <div role="status" aria-label="Rendering preview" className="flex min-w-0 flex-col gap-2">
        {[0, 1, 2].map((line) => (
          <span key={line} aria-hidden="true" className="loading-skeleton h-3.5 rounded-[4px]" style={{ width: `${88 - line * 22}%` }} />
        ))}
      </div>
    );
  }

  if (error && !result) {
    return (
      <div role="alert" className="flex min-w-0 flex-col gap-1">
        <p className="text-[13px] font-semibold text-[var(--red)]">Could not render this preview</p>
        <p className="break-words text-[13px] leading-[1.6] text-[var(--text2)]">
          {error} Close this dialog and choose Preview again.
        </p>
      </div>
    );
  }

  if (!result) {
    return <p className="text-[13px] text-[var(--text2)]">No preview yet.</p>;
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {typeof result.rendered === "string" && (
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-[12px] text-[var(--text3)]">Rendered output</p>
          <CodeBlock maxHeight={240} className="whitespace-pre-wrap break-words">
            {result.rendered}
          </CodeBlock>
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-[12px] text-[var(--text3)]">Full response</p>
        <JsonViewer data={result} maxHeight={220} />
      </div>
    </div>
  );
}
