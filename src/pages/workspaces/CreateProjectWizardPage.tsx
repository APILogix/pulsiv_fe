import { useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Globe,
  Loader2,
  Lock,
  Package,
  Palette,
  Tag,
} from "lucide-react";
import { useProjectMutations } from "@/modules/projects/hooks/useProjects";
import type { CreateProjectBody, ProjectVisibility } from "@/modules/projects/api/types";
import {
  Notice,
  PageHero,
  Panel,
  fieldInputClass,
  fieldTextareaClass,
} from "@/shared/ui/pulse";
import { Button as UiButton } from "@/components/ui/button";
import { DialogField, apiErrorMessage, parseList } from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md - no inline objects in JSX) ──

const VISIBILITY_CHOICES: Array<{
  value: ProjectVisibility;
  label: string;
  description: string;
  icon: typeof Lock;
}> = [
  {
    value: "private",
    label: "Private",
    description: "Only explicitly added project members can see this project.",
    icon: Lock,
  },
  {
    value: "organization",
    label: "Organization",
    description: "Every member of the organization can read this project.",
    icon: Building2,
  },
  {
    value: "public",
    label: "Public",
    description: "Readable by anyone with the link, subject to org policy.",
    icon: Globe,
  },
];

const COLOR_CHOICES = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#0ea5e9", label: "Sky" },
  { value: "#10b981", label: "Emerald" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#a855f7", label: "Violet" },
];

const WIZARD_STEPS = [
  { number: 1, title: "Details", description: "Name, description, and tags" },
  { number: 2, title: "Visibility & color", description: "Access and appearance" },
  { number: 3, title: "Review & create", description: "Confirm everything" },
] as const;

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

// ── slug generator ───────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

// ── step indicator ───────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Wizard steps" className="flex items-center gap-2">
      {WIZARD_STEPS.map((step, index) => {
        const isActive = step.number === currentStep;
        const isComplete = step.number < currentStep;
        return (
          <div key={step.number} className="flex items-center gap-2">
            {index > 0 && (
              <div
                className={cn(
                  "h-px w-8 transition-colors sm:w-12",
                  isComplete ? "bg-[var(--brand)]" : "bg-[var(--border)]",
                )}
              />
            )}
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-full font-[family-name:var(--mono)] text-[11px] font-semibold ring-1 ring-inset transition-colors",
                  isComplete
                    ? "bg-[var(--brand-bg)] text-[var(--brand)] ring-[var(--brand)]/25"
                    : isActive
                      ? "bg-[var(--brand)] text-[var(--brand-fg)] ring-[var(--brand)]"
                      : "bg-[var(--bg2)] text-[var(--text3)] ring-[var(--border)]",
                )}
              >
                {isComplete ? <Check className="size-3.5" /> : step.number}
              </span>
              <div className="hidden sm:block">
                <p
                  className={cn(
                    "text-[12px] font-medium",
                    isActive ? "text-[var(--text)]" : "text-[var(--text3)]",
                  )}
                >
                  {step.title}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function CreateProjectWizardPage() {
  const navigate = useNavigate();
  const { createProject } = useProjectMutations();
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Form state (kept across steps)
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [visibility, setVisibility] = useState<ProjectVisibility>("private");
  const [color, setColor] = useState<string>(COLOR_CHOICES[0].value);

  const slug = generateSlug(name);

  const canProceedStep1 = name.trim().length > 0;

  const handleNext = () => {
    setError(null);
    if (currentStep === 1 && !canProceedStep1) {
      setError("Project name is required.");
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleCreate = () => {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Project name is required.");
      setCurrentStep(1);
      return;
    }

    const parsedTags = parseList(tags);
    const payload: CreateProjectBody = {
      name: trimmedName,
      visibility,
      timezone: timezone.trim() || "UTC",
      color,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(parsedTags.length > 0 ? { tags: parsedTags } : {}),
    };

    createProject.mutate(payload, {
      onSuccess: (project) => navigate(`/projects/${project.id}/overview`),
      onError: (mutationError) =>
        setError(apiErrorMessage(mutationError, "Could not create the project.")),
    });
  };

  const visibilityLabel = VISIBILITY_CHOICES.find((c) => c.value === visibility)?.label ?? visibility;
  const colorLabel = COLOR_CHOICES.find((c) => c.value === color)?.label ?? color;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Workspaces"
        title="New project"
        description="A project groups environments, ingestion keys, members, and alert routing for a single application or service."
        icon={Package}
        breadcrumbs={[{ label: "Workspaces" }, { label: "Projects", to: "/projects" }, { label: "New" }]}
      />

      {/* Step indicator */}
      <div className="flex justify-center">
        <StepIndicator currentStep={currentStep} />
      </div>

      {/* Step content */}
      <div className="mx-auto w-full max-w-[680px]">
        {/* Step 1: Details */}
        {currentStep === 1 && (
          <Panel
            title="Project details"
            description="Give your project a name. The slug is auto-generated and used in ingestion URLs."
            icon={Package}
          >
            <div className="flex flex-col gap-5">
              <DialogField label="Project name" name="name" required hint="Used to derive the project slug.">
                <input
                  id="name"
                  name="name"
                  required
                  maxLength={255}
                  autoFocus
                  placeholder="Checkout API"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={fieldInputClass}
                />
              </DialogField>

              {/* Live slug preview */}
              {name.trim().length > 0 && (
                <div className="flex items-center gap-2 rounded-[9px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2.5">
                  <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Slug</span>
                  <code className="flex-1 truncate font-[family-name:var(--mono)] text-[12.5px] text-[var(--brand)]">
                    {slug || "---"}
                  </code>
                </div>
              )}

              <DialogField label="Description" name="description" hint="Optional. Shown on the project card.">
                <textarea
                  id="description"
                  name="description"
                  maxLength={5000}
                  placeholder="Payment and checkout service for the storefront."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={fieldTextareaClass}
                />
              </DialogField>

              <DialogField label="Tags" name="tags" hint="Comma separated, up to 20 tags.">
                <input
                  id="tags"
                  name="tags"
                  placeholder="payments, tier-1, platform-team"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className={fieldInputClass}
                />
              </DialogField>

              <DialogField label="Timezone" name="timezone" hint="Used for daily rollups and scheduled digests.">
                <input
                  id="timezone"
                  name="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  maxLength={100}
                  className={fieldInputClass}
                />
              </DialogField>
            </div>
          </Panel>
        )}

        {/* Step 2: Visibility & color */}
        {currentStep === 2 && (
          <div className="flex flex-col gap-6">
            <Panel title="Visibility" description="Who inside the organization can read this project." icon={Lock}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {VISIBILITY_CHOICES.map((choice) => {
                  const selected = visibility === choice.value;
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setVisibility(choice.value)}
                      className={cn(
                        "flex flex-col items-center gap-3 rounded-[12px] border p-4 text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                        selected
                          ? "border-[var(--brand)] bg-[var(--brand-bg)] shadow-[0_0_12px_-2px_var(--brand-bg)]"
                          : "border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--border2)]",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex size-10 items-center justify-center rounded-full",
                          selected
                            ? "bg-[var(--brand)] text-[var(--brand-fg)]"
                            : "bg-[var(--bg3)] text-[var(--text3)]",
                        )}
                      >
                        <choice.icon className="size-5" aria-hidden="true" />
                      </span>
                      <span
                        className={cn(
                          "text-[13px] font-semibold",
                          selected ? "text-[var(--brand)]" : "text-[var(--text)]",
                        )}
                      >
                        {choice.label}
                      </span>
                      <span className="text-[12px] leading-snug text-[var(--text2)]">{choice.description}</span>
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Accent colour" description="Used for project chips and charts." icon={Palette}>
              <div className="flex flex-wrap gap-3">
                {COLOR_CHOICES.map((choice) => {
                  const selected = color === choice.value;
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      aria-label={choice.label}
                      aria-pressed={selected}
                      onClick={() => setColor(choice.value)}
                      className={cn(
                        "inline-flex flex-col items-center gap-1.5 rounded-[10px] border p-2.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                        selected
                          ? "border-[var(--text)] bg-[var(--bg2)]"
                          : "border-transparent hover:border-[var(--border)]",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex size-8 items-center justify-center rounded-full transition-transform hover:scale-110",
                        )}
                        style={{ background: choice.value }}
                      >
                        {selected && <Check className="size-4 text-white" aria-hidden="true" />}
                      </span>
                      <span className="text-[10.5px] font-medium text-[var(--text3)]">{choice.label}</span>
                    </button>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}

        {/* Step 3: Review & create */}
        {currentStep === 3 && (
          <Panel
            title="Review your project"
            description="Confirm the details below before creating."
            icon={Check}
          >
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
                  <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Name</dt>
                  <dd className="text-[13px] font-semibold text-[var(--text)]">{name.trim() || "---"}</dd>
                </div>
                <div className="flex flex-col gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
                  <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Slug</dt>
                  <dd className="font-[family-name:var(--mono)] text-[12.5px] text-[var(--brand)]">{slug || "---"}</dd>
                </div>
                <div className="flex flex-col gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
                  <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Visibility</dt>
                  <dd className="text-[13px] font-semibold capitalize text-[var(--text)]">{visibilityLabel}</dd>
                </div>
                <div className="flex flex-col gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
                  <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Accent colour</dt>
                  <dd className="flex items-center gap-2">
                    <span className="inline-block size-4 rounded-full" style={{ background: color }} />
                    <span className="text-[13px] font-medium text-[var(--text)]">{colorLabel}</span>
                  </dd>
                </div>
                <div className="flex flex-col gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
                  <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Timezone</dt>
                  <dd className="font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]">{timezone || "UTC"}</dd>
                </div>
                {tags.trim() && (
                  <div className="flex flex-col gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
                    <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Tags</dt>
                    <dd className="flex flex-wrap gap-1">
                      {parseList(tags).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--bg3)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--text2)] ring-1 ring-inset ring-[var(--border)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>

              {description.trim() && (
                <div className="flex flex-col gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
                  <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Description</dt>
                  <dd className="text-[12.5px] leading-relaxed text-[var(--text2)]">{description.trim()}</dd>
                </div>
              )}

              <Notice tone="blue" icon={Tag} title="What happens next">
                After creation, you can add environments, generate ingestion keys, invite members, and configure alert routing.
              </Notice>
            </div>
          </Panel>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4">
            <Notice tone="red" icon={AlertTriangle} title="Could not create project">
              {error}
            </Notice>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {currentStep > 1 ? (
              <UiButton type="button" variant="ghost" size="lg" onClick={handleBack}>
                <ArrowLeft className="mr-1.5 size-4" /> Back
              </UiButton>
            ) : (
              <UiButton type="button" variant="ghost" size="lg" onClick={() => navigate("/projects")}>
                Cancel
              </UiButton>
            )}
          </div>
          <div>
            {currentStep < 3 ? (
              <UiButton type="button" size="lg" onClick={handleNext} disabled={currentStep === 1 && !canProceedStep1}>
                Next <ArrowRight className="ml-1.5 size-4" />
              </UiButton>
            ) : (
              <UiButton type="button" size="lg" onClick={handleCreate} disabled={createProject.isPending}>
                {createProject.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                Create project
              </UiButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
