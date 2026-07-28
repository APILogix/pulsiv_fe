/**
 * Template gallery — `GET /templates`, `GET /templates/:templateKey`, and
 * `POST /templates/:templateKey/create-workflow`.
 *
 * Selecting a template loads its current version so the trigger/action summary
 * can be shown before the workflow draft is created.
 */
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileStack,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  EmptyPanel,
  Notice,
  PageHero,
  Panel,
  Pill,
  Toolbar,
  fieldInputClass,
  fieldTextareaClass,
} from "@/shared/ui/pulse";
import { FilterSelect, JsonViewer } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DialogField, FormDialog, apiErrorMessage, optionalText } from "@/modules/projects/components/project-ui";
import {
  useAutomationScope,
  useAutomationTemplate,
  useAutomationTemplates,
  useTemplateMutations,
} from "@/modules/automation/hooks/useAutomation";
import { AUTOMATION_LIMITS, type AutomationTemplate } from "@/modules/automation/api/types";
import { CodeChip, EntitlementNote, labelize } from "@/modules/automation/components/automation-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const PAGE_SIZE = 24;
const monoTextarea = `${fieldTextareaClass} min-h-[88px] font-[family-name:var(--mono)] text-[12px]`;

function parseOverrides(raw: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof raw !== "string" || raw.trim() === "") return {};
  const parsed = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Config overrides must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

export default function AutomationTemplatesPage() {
  const navigate = useNavigate();
  const { activeOrgId } = useAutomationScope();
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<AutomationTemplate | null>(null);
  const [createFor, setCreateFor] = useState<AutomationTemplate | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const templatesQuery = useAutomationTemplates({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
  const detailQuery = useAutomationTemplate(selected?.templateKey);
  const { createFromTemplate } = useTemplateMutations();

  if (!activeOrgId) {
    return (
      <Notice tone="amber" icon={AlertTriangle} title="No organization selected">
        Pick an organization to browse automation templates.
      </Notice>
    );
  }

  const allTemplates = templatesQuery.data?.data ?? [];
  const total = templatesQuery.data?.total ?? 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;

  // The list endpoint ignores a `category` query param, so filter client-side.
  const categories = Array.from(new Set(allTemplates.map((template) => template.category))).sort();
  const categoryOptions = [
    { value: "", label: "All categories" },
    ...categories.map((value) => ({ value, label: labelize(value) })),
  ];
  const templates = category
    ? allTemplates.filter((template) => template.category === category)
    : allTemplates;

  const handleCreate = (form: FormData) => {
    if (!createFor) return;
    setDialogError(null);

    let configOverrides: Record<string, unknown>;
    try {
      configOverrides = parseOverrides(form.get("configOverrides"));
    } catch (error) {
      setDialogError((error as Error).message);
      return;
    }

    const name = (form.get("name") as string | null)?.trim() ?? "";
    if (name === "") {
      setDialogError("Name is required.");
      return;
    }

    const tags = ((form.get("tags") as string | null) ?? "")
      .split(/[\n,]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, AUTOMATION_LIMITS.TAGS);

    const description = optionalText(form.get("description"));
    const projectId = optionalText(form.get("projectId"));

    createFromTemplate.mutate(
      {
        templateKey: createFor.templateKey,
        body: {
          name,
          ...(description ? { description } : {}),
          ...(projectId ? { projectId } : {}),
          configOverrides,
          tags,
        },
      },
      {
        onSuccess: (workflow) => {
          toast.success(`${workflow.name} created as a draft`);
          setCreateFor(null);
          navigate(`/automation/workflows/${workflow.id}`);
        },
        onError: (error) => setDialogError(apiErrorMessage(error, "Could not create the workflow.")),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Workflows"
        title="Templates"
        description="Prebuilt automations for alert routing, incident response, release guards, and cleanup. Creating one gives you an editable draft."
        icon={FileStack}
      />

      <Toolbar
        trailing={
          <span className="text-[12px] text-[var(--text3)]">
            {templates.length} of {total} template{total === 1 ? "" : "s"}
          </span>
        }
      >
        <FilterSelect label="Category" value={category} options={categoryOptions} onChange={setCategory} />
      </Toolbar>

      {templatesQuery.isError && (
        <Notice tone="red" icon={AlertTriangle} title="Could not load templates">
          {apiErrorMessage(templatesQuery.error)}
        </Notice>
      )}

      {templatesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((card) => (
            <div key={card} className="h-40 animate-pulse rounded-[14px] bg-[var(--bg2)]" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyPanel
          icon={FileStack}
          title="No templates available"
          description="Platform templates appear here once your plan includes the automation module."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Panel
              key={template.templateKey}
              title={template.name}
              description={template.description ?? undefined}
              icon={template.isFeatured ? Sparkles : FileStack}
              tone={template.isFeatured ? "ai" : "brand"}
              footer={
                <>
                  <UiButton variant="ghost" size="sm" onClick={() => setSelected(template)}>
                    Details
                  </UiButton>
                  <UiButton
                    size="sm"
                    disabled={template.entitlementUnavailable}
                    title={template.entitlementUnavailable ? (template.unavailableReason ?? undefined) : undefined}
                    onClick={() => setCreateFor(template)}
                  >
                    <Wand2 className="size-3.5" /> Use template
                  </UiButton>
                </>
              }
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone="neutral">{labelize(template.category)}</Pill>
                  <Pill tone="brand">{labelize(template.workflowType)}</Pill>
                  {template.minimumPlanTier && <Pill tone="amber">{labelize(template.minimumPlanTier)}</Pill>}
                </div>
                <CodeChip>{template.templateKey}</CodeChip>
                <EntitlementNote
                  unavailable={template.entitlementUnavailable}
                  reason={template.unavailableReason}
                />
                {template.tags.length > 0 && (
                  <p className="text-[11.5px] text-[var(--text3)]">{template.tags.join(", ")}</p>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[var(--text3)]">
            Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
          </span>
          <div className="flex items-center gap-2">
            <UiButton variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="size-3.5" /> Previous
            </UiButton>
            <UiButton variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="size-3.5" />
            </UiButton>
          </div>
        </div>
      )}

      {/* Template detail — read-only definition preview. */}
      <FormDialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.name ?? "Template"}
        description={selected?.description ?? undefined}
        submitLabel="Use this template"
        onSubmit={() => {
          if (selected) setCreateFor(selected);
          setSelected(null);
        }}
        width="sm:max-w-[720px]"
      >
        {detailQuery.isLoading ? (
          <div className="h-40 animate-pulse rounded-[10px] bg-[var(--bg2)]" />
        ) : detailQuery.data ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill tone="neutral">{labelize(detailQuery.data.template.category)}</Pill>
              <Pill tone="brand">{labelize(detailQuery.data.template.workflowType)}</Pill>
              {detailQuery.data.version && <Pill tone="neutral">v{detailQuery.data.version.version}</Pill>}
            </div>
            {detailQuery.data.requiredFeatureKeys.length > 0 && (
              <p className="text-[12px] text-[var(--text3)]">
                Requires: {detailQuery.data.requiredFeatureKeys.join(", ")}
              </p>
            )}
            <JsonViewer data={detailQuery.data.version?.definition ?? {}} maxHeight={320} />
          </div>
        ) : (
          <Notice tone="red" icon={AlertTriangle}>
            {apiErrorMessage(detailQuery.error, "Could not load the template definition.")}
          </Notice>
        )}
      </FormDialog>

      {/* Create workflow from template. */}
      <FormDialog
        open={!!createFor}
        onOpenChange={(open) => {
          if (!open) {
            setCreateFor(null);
            setDialogError(null);
          }
        }}
        title="Create workflow from template"
        description={createFor ? `Based on ${createFor.name}. The workflow starts as a draft.` : undefined}
        submitLabel="Create draft"
        pending={createFromTemplate.isPending}
        error={dialogError}
        onSubmit={handleCreate}
      >
        <DialogField label="Name" name="name" required>
          <input
            id="name"
            name="name"
            className={fieldInputClass}
            maxLength={AUTOMATION_LIMITS.NAME}
            defaultValue={createFor?.name ?? ""}
          />
        </DialogField>
        <DialogField label="Description" name="description">
          <textarea
            id="description"
            name="description"
            className={fieldTextareaClass}
            maxLength={AUTOMATION_LIMITS.DESCRIPTION}
            defaultValue={createFor?.description ?? ""}
          />
        </DialogField>
        <DialogField label="Project id" name="projectId" hint="Leave blank for an organization-scoped workflow.">
          <input id="projectId" name="projectId" className={fieldInputClass} />
        </DialogField>
        <DialogField label="Tags" name="tags" hint="Comma separated, up to 20.">
          <input
            id="tags"
            name="tags"
            className={fieldInputClass}
            defaultValue={createFor?.tags.join(", ") ?? ""}
          />
        </DialogField>
        <DialogField
          label="Config overrides (JSON)"
          name="configOverrides"
          hint="Only trigger.config, per-action config, and safety are honoured."
        >
          <textarea
            id="configOverrides"
            name="configOverrides"
            className={monoTextarea}
            defaultValue="{}"
            spellCheck={false}
          />
        </DialogField>
      </FormDialog>
    </div>
  );
}
