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
  Sparkles,
  Tag,
} from "lucide-react";
import { useProjectMutations } from "@/modules/projects/hooks/useProjects";
import type { CreateProjectBody, ProjectVisibility } from "@/modules/projects/api/types";
import { Notice, Panel, fieldInputClass, fieldTextareaClass } from "@/shared/ui/pulse";
import { Button as UiButton } from "@/components/ui/button";
import { DialogField, apiErrorMessage, parseList } from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md) ────────────────────────

const VISIBILITY_CHOICES: Array<{
  value: ProjectVisibility;
  label: string;
  description: string;
  icon: typeof Lock;
}> = [
  {
    value: "private",
    label: "Private",
    description: "Only explicitly added members can access this project.",
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
  { value: "#ec4899", label: "Pink" },
  { value: "#14b8a6", label: "Teal" },
];

const WIZARD_STEPS = [
  { label: "Details", description: "Name and description" },
  { label: "Visibility", description: "Access control" },
  { label: "Review", description: "Confirm and create" },
] as const;

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ── page ─────────────────────────────────────────────────────

export default function CreateProjectWizardPage() {
  const navigate = useNavigate();
  const { createProject } = useProjectMutations();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [visibility, setVisibility] = useState<ProjectVisibility>("private");
  const [color, setColor] = useState<string>(COLOR_CHOICES[0].value);
  const [error, setError] = useState<string | null>(null);

  const slug = slugify(name);
  const canProceed = step === 0 ? name.trim().length > 0 : true;

  const handleSubmit = () => {
    setError(null);
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    const payload: CreateProjectBody = {
      name: name.trim(),
      visibility,
      timezone: timezone.trim() || "UTC",
      color,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(parseList(tags).length > 0 ? { tags: parseList(tags) } : {}),
    };

    createProject.mutate(payload, {
      onSuccess: (project) => navigate(`/projects/${project.id}/overview`),
      onError: (mutationError) =>
        setError(apiErrorMessage(mutationError, "Could not create the project.")),
    });
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-[640px]">
        {/* ── header ── */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="relative mb-2">
            <div className="absolute inset-0 rounded-full bg-[var(--brand)]/15 blur-xl" aria-hidden="true" />
            <div className="relative inline-flex size-14 items-center justify-center rounded-2xl bg-[var(--brand)]/10">
              <Sparkles className="size-6 text-[var(--brand)]" />
            </div>
          </div>
          <h1 className="font-[family-name:var(--display)] text-[28px] font-bold tracking-[-0.03em] text-[var(--text)]">
            Create a new project
          </h1>
          <p className="max-w-[44ch] text-[14px] text-[var(--text2)]">
            A project groups environments, API keys, members, and alert routing for one application.
          </p>
        </div>

        {/* ── step indicator ── */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {WIZARD_STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { if (i < step) setStep(i); }}
                disabled={i > step}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all",
                  i === step
                    ? "bg-[var(--brand)] text-white shadow-md shadow-[var(--brand)]/20"
                    : i < step
                      ? "bg-[var(--green)]/10 text-[var(--green)]"
                      : "bg-[var(--bg2)] text-[var(--text3)]",
                )}
              >
                {i < step ? (
                  <Check className="size-3.5" />
                ) : (
                  <span className="font-[family-name:var(--mono)] text-[11px]">{i + 1}</span>
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < WIZARD_STEPS.length - 1 && (
                <div className={cn("h-px w-8", i < step ? "bg-[var(--green)]" : "bg-[var(--border)]")} />
              )}
            </div>
          ))}
        </div>

        {/* ── step content ── */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg1)] p-6 shadow-sm sm:p-8">
          {step === 0 && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-[16px] font-semibold text-[var(--text)]">Project details</h2>
                <p className="text-[13px] text-[var(--text2)]">Give your project a name. The slug is auto-generated.</p>
              </div>

              <DialogField label="Project name" name="name" required>
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

              {/* live slug preview */}
              {name.trim() && (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--bg2)] px-3 py-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text3)]">Slug</span>
                  <code className="font-[family-name:var(--mono)] text-[12.5px] text-[var(--brand)]">
                    {slug || "..."}
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DialogField label="Tags" name="tags" hint="Comma separated.">
                  <input
                    id="tags"
                    name="tags"
                    placeholder="payments, tier-1"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className={fieldInputClass}
                  />
                </DialogField>
                <DialogField label="Timezone" name="timezone">
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
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-[16px] font-semibold text-[var(--text)]">Visibility and appearance</h2>
                <p className="text-[13px] text-[var(--text2)]">Choose who can access this project and pick an accent color.</p>
              </div>

              {/* visibility cards */}
              <div className="grid grid-cols-1 gap-3">
                {VISIBILITY_CHOICES.map((choice) => {
                  const selected = visibility === choice.value;
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setVisibility(choice.value)}
                      className={cn(
                        "flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
                        selected
                          ? "border-[var(--brand)] bg-[var(--brand)]/5 shadow-sm shadow-[var(--brand)]/10"
                          : "border-[var(--border)] bg-[var(--bg2)]/50 hover:border-[var(--border2)]",
                      )}
                    >
                      <div className={cn(
                        "flex size-10 items-center justify-center rounded-xl transition-colors",
                        selected ? "bg-[var(--brand)]/15 text-[var(--brand)]" : "bg-[var(--bg3)] text-[var(--text3)]",
                      )}>
                        <choice.icon className="size-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={cn(
                          "text-[13.5px] font-semibold",
                          selected ? "text-[var(--brand)]" : "text-[var(--text)]",
                        )}>
                          {choice.label}
                        </span>
                        <p className="mt-0.5 text-[12px] text-[var(--text2)]">{choice.description}</p>
                      </div>
                      {selected && (
                        <Check className="size-5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* color selection */}
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)]">
                  Accent color
                </span>
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
                          "inline-flex size-9 items-center justify-center rounded-full transition-all hover:scale-110",
                          selected ? "ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--bg1)]" : "ring-1 ring-black/10",
                        )}
                        style={{ background: choice.value }}
                      >
                        {selected && <Check className="size-4 text-white drop-shadow" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-[16px] font-semibold text-[var(--text)]">Review and create</h2>
                <p className="text-[13px] text-[var(--text2)]">Confirm the details below, then create your project.</p>
              </div>

              {/* summary card */}
              <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)]/40 p-5">
                <div className="flex items-center gap-3">
                  <div
                    className="size-10 rounded-xl"
                    style={{ background: color }}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-[15px] font-semibold text-[var(--text)]">{name}</p>
                    <code className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">{slug}</code>
                  </div>
                </div>

                {description && (
                  <p className="text-[13px] leading-relaxed text-[var(--text2)]">{description}</p>
                )}

                <dl className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--text3)]">Visibility</dt>
                    <dd className="mt-0.5 text-[13px] font-medium capitalize text-[var(--text)]">{visibility}</dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--text3)]">Timezone</dt>
                    <dd className="mt-0.5 font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{timezone}</dd>
                  </div>
                  {parseList(tags).length > 0 && (
                    <div className="col-span-2">
                      <dt className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--text3)]">Tags</dt>
                      <dd className="mt-1.5 flex flex-wrap gap-1.5">
                        {parseList(tags).map((t) => (
                          <span key={t} className="rounded-md bg-[var(--brand)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--brand)]">
                            {t}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <Panel title="What happens next" icon={Tag}>
                <ul className="flex flex-col gap-2.5 text-[12.5px] text-[var(--text2)]">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[10px] font-bold text-[var(--brand)]">1</span>
                    Project is created instantly with default settings.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[10px] font-bold text-[var(--brand)]">2</span>
                    Add environments (development, staging, production).
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[10px] font-bold text-[var(--brand)]">3</span>
                    Generate API keys for each environment.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[10px] font-bold text-[var(--brand)]">4</span>
                    Configure alert routing and invite team members.
                  </li>
                </ul>
              </Panel>
            </div>
          )}

          {/* ── error ── */}
          {error && (
            <div className="mt-4">
              <Notice tone="red" icon={AlertTriangle} title="Could not create project">
                {error}
              </Notice>
            </div>
          )}

          {/* ── navigation buttons ── */}
          <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-5">
            <div>
              {step === 0 ? (
                <UiButton type="button" variant="ghost" size="lg" onClick={() => navigate("/projects")}>
                  Cancel
                </UiButton>
              ) : (
                <UiButton type="button" variant="ghost" size="lg" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="mr-1.5 size-4" /> Back
                </UiButton>
              )}
            </div>
            <div>
              {step < 2 ? (
                <UiButton
                  type="button"
                  size="lg"
                  disabled={!canProceed}
                  onClick={() => setStep(step + 1)}
                >
                  Continue <ArrowRight className="ml-1.5 size-4" />
                </UiButton>
              ) : (
                <UiButton
                  type="button"
                  size="lg"
                  disabled={createProject.isPending || !name.trim()}
                  onClick={handleSubmit}
                >
                  {createProject.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                  Create project
                </UiButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
