import { useState } from "react";
import { useNavigate } from "react-router";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { projectPath } from "@/modules/projects/navigation/project-routes";
import { AlertTriangle, Building2, Check, Globe, Loader2, Lock, Package, Palette, Tag } from "lucide-react";
import { useProjectMutations } from "@/modules/projects/hooks/useProjects";
import type { CreateProjectBody, ProjectVisibility } from "@/modules/projects/api/types";
import {
  Notice,
  PageHero,
  Panel,
  SplitShell,
  SetupSteps,
  fieldInputClass,
  fieldTextareaClass,
  type SetupStepItem,
} from "@/shared/ui/pulse";
import { Button as UiButton } from "@/components/ui/button";
import { DialogField, apiErrorMessage, parseList } from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md §1.2) ───────────────────

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

const SETUP_STEPS: SetupStepItem[] = [
  { title: "Name the project", description: "The slug is derived from the name and used in ingestion URLs." },
  { title: "Pick visibility", description: "Controls who in the organization can read the project." },
  { title: "Create an environment", description: "Development, staging, production — added after creation." },
  { title: "Issue an ingestion key", description: "API keys are environment-scoped and shown only once." },
];

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

// ── page ─────────────────────────────────────────────────────

export default function CreateProjectWizardPage() {
  const navigate = useNavigate();
  const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
  const { createProject } = useProjectMutations();
  const [visibility, setVisibility] = useState<ProjectVisibility>("private");
  const [color, setColor] = useState<string>(COLOR_CHOICES[0].value);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      setError("Project name is required.");
      return;
    }

    const description = String(form.get("description") ?? "").trim();
    const timezone = String(form.get("timezone") ?? "").trim() || "UTC";
    const tags = parseList(form.get("tags"));

    const payload: CreateProjectBody = {
      name,
      visibility,
      timezone,
      color,
      ...(description ? { description } : {}),
      ...(tags.length > 0 ? { tags } : {}),
    };

    createProject.mutate(payload, {
      onSuccess: (project) => {
        const orgSlug = useOrgStore.getState().activeOrgSlug;
        if (orgSlug) {
          navigate(projectPath(orgSlug, project.publicId, "overview"));
        } else {
          navigate(`/projects/${project.id}/overview`);
        }
      },
      onError: (mutationError) =>
        setError(apiErrorMessage(mutationError, "Could not create the project.")),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Workspaces"
        title="New project"
        description="A project groups environments, ingestion keys, members, and alert routing for a single application or service."
        icon={Package}
        breadcrumbs={[{ label: "Workspaces" }, { label: "Projects", to: activeOrgSlug ? `/${activeOrgSlug}/projects` : "/projects" }, { label: "New" }]}
      />

      <form onSubmit={handleSubmit}>
        <SplitShell
          rail={
            <>
              <Panel title="What happens next" description="Creation is instant; the rest is guided." icon={Check}>
                <SetupSteps steps={SETUP_STEPS} />
              </Panel>
              <Panel title="Naming tips" icon={Tag}>
                <ul className="flex flex-col gap-2 text-[12.5px] leading-relaxed text-[var(--text2)]">
                  <li>Use the service or app name, not the environment.</li>
                  <li>Environments live inside a project — don't create "api-prod" and "api-dev".</li>
                  <li>Tags are searchable; use them for team or domain ownership.</li>
                </ul>
              </Panel>
            </>
          }
        >
          <Panel
            title="Project details"
            description="Only the name is required. Everything else can change later."
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
                  className={fieldInputClass}
                />
              </DialogField>

              <DialogField label="Description" name="description" hint="Optional. Shown on the project card.">
                <textarea
                  id="description"
                  name="description"
                  maxLength={5000}
                  placeholder="Payment and checkout service for the storefront."
                  className={fieldTextareaClass}
                />
              </DialogField>

              <DialogField
                label="Tags"
                name="tags"
                hint="Comma separated, up to 20 tags."
              >
                <input id="tags" name="tags" placeholder="payments, tier-1, platform-team" className={fieldInputClass} />
              </DialogField>

              <DialogField label="Timezone" name="timezone" hint="Used for daily rollups and scheduled digests.">
                <input
                  id="timezone"
                  name="timezone"
                  defaultValue={DEFAULT_TIMEZONE}
                  maxLength={100}
                  className={fieldInputClass}
                />
              </DialogField>
            </div>
          </Panel>

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
                      "flex flex-col gap-2 rounded-[12px] border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                      selected
                        ? "border-[var(--brand)] bg-[var(--brand-bg)]"
                        : "border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--border2)]",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <choice.icon
                        className={cn("size-4", selected ? "text-[var(--brand)]" : "text-[var(--text3)]")}
                        aria-hidden="true"
                      />
                      <span
                        className={cn(
                          "text-[13px] font-semibold",
                          selected ? "text-[var(--brand)]" : "text-[var(--text)]",
                        )}
                      >
                        {choice.label}
                      </span>
                    </span>
                    <span className="text-[12px] leading-snug text-[var(--text2)]">{choice.description}</span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="Accent colour" description="Used for project chips and charts." icon={Palette}>
            <div className="flex flex-wrap gap-2.5">
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
                      "inline-flex size-8 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-[var(--bg1)] transition-transform hover:scale-105 focus-visible:outline-none",
                      selected ? "ring-[var(--text)]" : "ring-transparent",
                    )}
                    style={{ background: choice.value }}
                  >
                    {selected && <Check className="size-4 text-white" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </Panel>

          {error && (
            <Notice tone="red" icon={AlertTriangle} title="Could not create project">
              {error}
            </Notice>
          )}

          <div className="flex items-center justify-end gap-2">
            <UiButton type="button" variant="ghost" size="lg" onClick={() => navigate(activeOrgSlug ? `/${activeOrgSlug}/projects` : "/projects")}>
              Cancel
            </UiButton>
            <UiButton type="submit" size="lg" disabled={createProject.isPending}>
              {createProject.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Create project
            </UiButton>
          </div>
        </SplitShell>
      </form>
    </div>
  );
}
