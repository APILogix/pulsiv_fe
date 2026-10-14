/**
 * Templates — `GET /templates`, `GET /templates/:templateKey`, and
 * `POST /templates/:templateKey/create-workflow`.
 *
 * Opening a template loads its current version so its sequence (trigger,
 * conditions, actions) can be read before a workflow draft is created.
 */
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Pill, fieldInputClass, fieldTextareaClass } from "@/shared/ui/pulse";
import { FilterSelect, JsonViewer, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DialogField, FormDialog, apiErrorMessage, optionalText } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  ProjectPageHeader,
  Readouts,
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
import {
  useAutomationScope,
  useAutomationTemplate,
  useAutomationTemplates,
  useTemplateMutations,
} from "@/modules/automation/hooks/useAutomation";
import { AUTOMATION_LIMITS, type AutomationTemplate, type Json } from "@/modules/automation/api/types";
import {
  CodeChip,
  ConditionText,
  EntitlementNote,
  FactGrid,
  MONO,
  NoOrgNotice,
  RiskPill,
  Sequence,
  SequenceGroup,
  SequenceStage,
  labelize,
  plural,
} from "@/modules/automation/components/automation-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md §1.2) ───────────────────

const PAGE_SIZE = 24;
const monoTextarea = `${fieldTextareaClass} min-h-[88px] font-[family-name:var(--mono)] text-[12px]`;

const COLUMNS: SheetColumn[] = [
  { key: "template", header: "Template" },
  { key: "category", header: "Category", className: `w-[150px] ${HIDE_BELOW_MD}` },
  { key: "type", header: "Type", className: `w-[150px] ${HIDE_BELOW_LG}` },
  { key: "plan", header: "Plan", className: `w-[200px] ${HIDE_BELOW_LG}` },
  { key: "actions", header: "Actions", srOnly: true, className: "w-[140px]", align: "right" },
];

function parseOverrides(raw: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof raw !== "string" || raw.trim() === "") return {};
  const parsed = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Config overrides must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

// ── Definition preview ───────────────────────────────────────
// A template version's `definition` is the create-workflow body shape. Read it
// defensively: anything missing simply drops out of the sequence.

interface PreviewTrigger {
  triggerType: string | null;
  triggerKind: string | null;
  sourceModule: string | null;
  sourceEvent: string | null;
  scheduleCron: string | null;
}

interface PreviewCondition {
  leftPath: string;
  operator: string;
  rightValue: unknown;
}

interface PreviewAction {
  actionKey: string | null;
  actionType: string | null;
  riskLevel: string | null;
  requiresApproval: boolean;
}

interface DefinitionPreview {
  trigger: PreviewTrigger | null;
  conditions: PreviewCondition[];
  actions: PreviewAction[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function readDefinition(definition: Json | undefined): DefinitionPreview {
  const root = asRecord(definition) ?? {};
  const rawTrigger = asRecord(root.trigger);
  const trigger: PreviewTrigger | null = rawTrigger
    ? {
        triggerType: asString(rawTrigger.triggerType),
        triggerKind: asString(rawTrigger.triggerKind),
        sourceModule: asString(rawTrigger.sourceModule),
        sourceEvent: asString(rawTrigger.sourceEvent),
        scheduleCron: asString(rawTrigger.scheduleCron),
      }
    : null;

  const conditions = (Array.isArray(root.conditions) ? root.conditions : []).flatMap((item): PreviewCondition[] => {
    const condition = asRecord(item);
    const leftPath = asString(condition?.leftPath);
    const operator = asString(condition?.operator);
    return condition && leftPath && operator ? [{ leftPath, operator, rightValue: condition.rightValue }] : [];
  });

  const actions = (Array.isArray(root.actions) ? root.actions : []).flatMap((item): PreviewAction[] => {
    const action = asRecord(item);
    if (!action) return [];
    return [
      {
        actionKey: asString(action.actionKey),
        actionType: asString(action.actionType),
        riskLevel: asString(action.riskLevel),
        requiresApproval: action.requiresApproval === true,
      },
    ];
  });

  return { trigger, conditions, actions };
}

function TemplateSequence({ preview }: { preview: DefinitionPreview }) {
  const { trigger, conditions, actions } = preview;
  if (!trigger && actions.length === 0) {
    return <p className="text-[13px] text-[var(--text2)]">This version does not describe a trigger or actions.</p>;
  }

  return (
    <Sheet label="Template sequence">
      <Sequence label="Template sequence">
        <SequenceGroup title="Trigger" />
        {trigger ? (
          <SequenceStage
            marker="T"
            title={trigger.triggerType ? labelize(trigger.triggerType) : "Trigger"}
            meta={trigger.triggerKind ? <Pill tone="neutral">{labelize(trigger.triggerKind)}</Pill> : undefined}
          >
            <span className="flex flex-wrap items-center gap-1.5">
              {trigger.triggerType && <CodeChip>{trigger.triggerType}</CodeChip>}
              {trigger.sourceModule && <span>from {trigger.sourceModule}</span>}
              {trigger.scheduleCron && <CodeChip>{trigger.scheduleCron}</CodeChip>}
              {trigger.sourceEvent && <CodeChip>{trigger.sourceEvent}</CodeChip>}
            </span>
          </SequenceStage>
        ) : (
          <SequenceStage marker="T" title="No trigger in this version" />
        )}

        <SequenceGroup
          title="Conditions"
          description={conditions.length === 0 ? "Every trigger event runs the actions." : plural(conditions.length, "condition")}
        />
        {conditions.map((condition, index) => (
          <SequenceStage
            key={`${condition.leftPath}-${index}`}
            marker={`C${index + 1}`}
            title={<ConditionText path={condition.leftPath} operator={condition.operator} value={condition.rightValue} />}
          />
        ))}

        <SequenceGroup title="Actions" description={plural(actions.length, "action")} />
        {actions.map((action, index) => (
          <SequenceStage
            key={`${action.actionKey ?? "action"}-${index}`}
            marker={String(index + 1)}
            tone={action.requiresApproval ? "warn" : "neutral"}
            title={action.actionType ? labelize(action.actionType) : "Action"}
            meta={
              <>
                {action.riskLevel && <RiskPill risk={action.riskLevel} />}
                {action.requiresApproval && <Pill tone="amber">Needs approval</Pill>}
              </>
            }
          >
            {action.actionKey && <CodeChip>{action.actionKey}</CodeChip>}
          </SequenceStage>
        ))}
      </Sequence>
    </Sheet>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function AutomationTemplatesPage() {
  const navigate = useNavigate();
  const { activeOrgId } = useAutomationScope();
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AutomationTemplate | null>(null);
  const [createFor, setCreateFor] = useState<AutomationTemplate | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const templatesQuery = useAutomationTemplates({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
  const detailQuery = useAutomationTemplate(selected?.templateKey);
  const { createFromTemplate } = useTemplateMutations();

  if (!activeOrgId) {
    return <NoOrgNotice>Pick an organization to browse workflow templates.</NoOrgNotice>;
  }

  const allTemplates = templatesQuery.data?.data ?? [];
  const total = templatesQuery.data?.total ?? 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;
  const ready = Boolean(templatesQuery.data);

  // The list endpoint ignores a `category` query param, so filter client-side.
  const categories = Array.from(new Set(allTemplates.map((template) => template.category))).sort();
  const categoryOptions = [
    { value: "", label: "All categories" },
    ...categories.map((value) => ({ value, label: labelize(value) })),
  ];
  const term = search.trim().toLowerCase();
  const templates = allTemplates.filter((template) => {
    if (category && template.category !== category) return false;
    if (term === "") return true;
    return (
      template.name.toLowerCase().includes(term) ||
      template.templateKey.toLowerCase().includes(term) ||
      (template.description ?? "").toLowerCase().includes(term) ||
      template.tags.some((tag) => tag.toLowerCase().includes(term))
    );
  });
  const filtering = category !== "" || term !== "";

  const unavailable = allTemplates.filter((template) => template.entitlementUnavailable).length;
  const featured = allTemplates.filter((template) => template.isFeatured).length;
  const sampled = total > allTemplates.length;
  const scope = sampled ? `In the ${allTemplates.length} on this page` : "Across all templates";

  const readouts: Readout[] = [
    {
      label: "Templates",
      value: ready ? formatNumber(total) : "—",
      sub: sampled ? `${PAGE_SIZE} per page` : "All loaded",
    },
    { label: "Featured", value: ready ? formatNumber(featured) : "—", sub: scope },
    {
      label: "Unavailable on plan",
      value: ready ? formatNumber(unavailable) : "—",
      sub: scope,
      tone: ready && unavailable > 0 ? "warn" : "neutral",
    },
  ];

  const clearFilters = () => {
    setSearch("");
    setCategory("");
  };

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

  const toolbar = (
    <>
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search name, key, or tag"
        label="Search templates"
      />
      <FilterSelect label="Category" value={category} options={categoryOptions} onChange={setCategory} />
      {ready && (
        <ToolbarCount>
          {formatNumber(templates.length)} of {formatNumber(total)}
        </ToolbarCount>
      )}
    </>
  );

  let body: ReactNode;
  if (templatesQuery.isLoading || (!templatesQuery.data && !templatesQuery.isError)) {
    body = <SheetLoading rows={6} label="Loading templates" />;
  } else if (templatesQuery.isError) {
    body = (
      <SheetError
        title="Could not load templates"
        message={apiErrorMessage(templatesQuery.error, "The templates request failed.")}
        onRetry={() => void templatesQuery.refetch()}
      />
    );
  } else if (allTemplates.length === 0) {
    body = (
      <SheetEmpty
        title="No templates available"
        description="Platform templates appear here once your plan includes the automation module."
      />
    );
  } else if (templates.length === 0) {
    body = (
      <SheetEmpty
        title="No templates match these filters"
        description={filtering && sampled ? "Filters apply to this page only. Try another page, category, or search term." : "Try a different category or search term."}
        action={
          <UiButton variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Workflow templates. Open a template to read its sequence." minWidth={420}>
        {templates.map((template) => (
          <SheetRow key={template.templateKey} onActivate={() => setSelected(template)}>
            <SheetCell>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(template)}
                    className="min-w-0 truncate rounded-[2px] text-left text-[13px] font-medium text-[var(--text)] decoration-[var(--border2)] underline-offset-[3px] hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]"
                  >
                    {template.name}
                  </button>
                  {template.isFeatured && <Pill tone="neutral">Featured</Pill>}
                </div>
                {template.description ? (
                  <p className="mt-0.5 line-clamp-1 text-[12px] text-[var(--text3)]" title={template.description}>
                    {template.description}
                  </p>
                ) : (
                  <p className={cn("mt-0.5 truncate text-[11.5px] text-[var(--text3)]", MONO)}>{template.templateKey}</p>
                )}
                {/* Category and plan columns drop on small screens; keep the reading. */}
                <p className="mt-0.5 truncate text-[12px] text-[var(--text3)] md:hidden">
                  {labelize(template.category)}
                  {template.minimumPlanTier ? ` · ${labelize(template.minimumPlanTier)} plan` : ""}
                </p>
                {template.entitlementUnavailable && (
                  <div className="mt-1 lg:hidden">
                    <EntitlementNote unavailable reason={template.unavailableReason} />
                  </div>
                )}
              </div>
            </SheetCell>
            <SheetCell className={HIDE_BELOW_MD}>
              <span className="text-[12px] text-[var(--text2)]">{labelize(template.category)}</span>
            </SheetCell>
            <SheetCell className={HIDE_BELOW_LG}>
              <span className="text-[12px] text-[var(--text2)]">{labelize(template.workflowType)}</span>
            </SheetCell>
            <SheetCell className={HIDE_BELOW_LG}>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[12px] text-[var(--text2)]">
                  {template.minimumPlanTier ? labelize(template.minimumPlanTier) : "Any plan"}
                </span>
                <EntitlementNote unavailable={template.entitlementUnavailable} reason={template.unavailableReason} />
              </div>
            </SheetCell>
            <SheetCell align="right">
              <UiButton
                variant="outline"
                size="sm"
                disabled={template.entitlementUnavailable}
                title={template.entitlementUnavailable ? (template.unavailableReason ?? undefined) : undefined}
                aria-label={`Use template ${template.name}`}
                onClick={() => setCreateFor(template)}
              >
                Use template
              </UiButton>
            </SheetCell>
          </SheetRow>
        ))}
      </SheetTable>
    );
  }

  const footer =
    ready && total > 0 ? (
      <>
        <span className={MONO}>
          Showing {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}
        </span>
        {total > PAGE_SIZE && (
          <div className="flex items-center gap-2">
            <UiButton variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Previous
            </UiButton>
            <UiButton variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage(page + 1)}>
              Next
            </UiButton>
          </div>
        )}
      </>
    ) : undefined;

  const detail = detailQuery.data;

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Templates"
        description="Prebuilt automations you can turn into an editable draft."
      />

      <Readouts cells={readouts} loading={templatesQuery.isLoading} label="Template summary" />

      <Sheet label="Templates" toolbar={toolbar} footer={footer}>
        {body}
      </Sheet>

      {/* Template detail: read-only sequence preview. */}
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
          <div role="status" aria-label="Loading template" className="flex flex-col gap-3">
            <span aria-hidden="true" className="loading-skeleton h-3 w-[min(60%,320px)] rounded-[4px]" />
            <span aria-hidden="true" className="loading-skeleton h-3 w-[min(80%,420px)] rounded-[4px]" />
            <span aria-hidden="true" className="loading-skeleton h-32 w-full rounded-[var(--radius-lg)]" />
          </div>
        ) : detail ? (
          <div className="flex min-w-0 flex-col gap-5">
            <FactGrid
              columns={3}
              facts={[
                { label: "Key", value: detail.template.templateKey, mono: true },
                { label: "Category", value: labelize(detail.template.category) },
                { label: "Type", value: labelize(detail.template.workflowType) },
                detail.version && { label: "Version", value: `v${detail.version.version}`, mono: true },
                {
                  label: "Plan",
                  value: detail.template.minimumPlanTier ? labelize(detail.template.minimumPlanTier) : "Any plan",
                },
                detail.requiredFeatureKeys.length > 0 && {
                  label: "Requires",
                  value: detail.requiredFeatureKeys.join(", "),
                  mono: true,
                },
              ]}
            />
            <EntitlementNote unavailable={detail.entitlementUnavailable} reason={detail.unavailableReason} />
            {detail.version ? (
              <TemplateSequence preview={readDefinition(detail.version.definition)} />
            ) : (
              <p className="text-[13px] text-[var(--text2)]">This template has no published version yet.</p>
            )}
            {detail.version && (
              <div className="min-w-0">
                <p className="mb-2 text-[12px] text-[var(--text3)]">Definition</p>
                <JsonViewer data={detail.version.definition} maxHeight={280} />
              </div>
            )}
          </div>
        ) : (
          <div role="alert" className="flex flex-col gap-1.5">
            <p className="text-[13px] font-semibold text-[var(--red)]">Could not load the template definition</p>
            <p className="text-[13px] leading-[1.6] text-[var(--text2)]">
              {apiErrorMessage(detailQuery.error, "The template request failed.")} Close this dialog and open the template again.
            </p>
          </div>
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
          <input id="tags" name="tags" className={fieldInputClass} defaultValue={createFor?.tags.join(", ") ?? ""} />
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
    </WorkspacePage>
  );
}
