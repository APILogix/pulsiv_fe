import { useState } from "react";
import { useNavigate } from "react-router";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { projectPath } from "@/modules/projects/navigation/project-routes";
import { AlertTriangle, Check, Loader2, Package, Tag } from "lucide-react";
import { useProjectMutations } from "@/modules/projects/hooks/useProjects";
import type { CreateProjectBody } from "@/modules/projects/api/types";
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
import { PROJECT_WORKFLOW, WorkflowOverlay, useWorkflow } from "@/shared/motion";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md §1.2) ───────────────────

const SETUP_STEPS: SetupStepItem[] = [
  { title: "Name the project", description: "The slug is derived from the name and used in ingestion URLs." },
  { title: "Create an environment", description: "Development, staging, production — added after creation." },
  { title: "Issue an ingestion key", description: "API keys are environment-scoped and shown only once." },
];

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

// ── page ─────────────────────────────────────────────────────

export default function CreateProjectWizardPage() {
  const navigate = useNavigate();
  const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
  const { createProject } = useProjectMutations();
  const [error, setError] = useState<string | null>(null);

  /**
   * Project creation fans out server-side (project row → environment → SDK
   * config → monitoring → ingestion key), so the wait is narrated rather than
   * spun (Phase 4). Navigation happens from the workflow's success callback, so
   * the user reads "done" before the route changes — and never waits on the
   * animation if the API is fast.
   */
  const workflow = useWorkflow(PROJECT_WORKFLOW, { pace: 650 });

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
      timezone,
      ...(description ? { description } : {}),
      ...(tags.length > 0 ? { tags } : {}),
    };

    void workflow.run(() => createProject.mutateAsync(payload), {
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
      <WorkflowOverlay
        open={workflow.isActive}
        title="Creating your project"
        description="Provisioning the environment, SDK config, and ingestion key."
        steps={PROJECT_WORKFLOW}
        state={workflow}
        successLabel="Project ready"
        onCancel={workflow.reset}
      />
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
