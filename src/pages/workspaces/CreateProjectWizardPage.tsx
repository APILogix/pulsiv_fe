import { useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, Loader2 } from "lucide-react";

import { useOrgStore } from "@/modules/organizations/store/org.store";
import { projectPath, projectsListPath } from "@/modules/projects/navigation/project-routes";
import { useProjectMutations } from "@/modules/projects/hooks/useProjects";
import type { CreateProjectBody } from "@/modules/projects/api/types";
import { DialogField, apiErrorMessage, parseList } from "@/modules/projects/components/project-ui";
import { ProjectPageHeader, WorkspacePage } from "@/modules/projects/components/project-page";
import { Notice, Panel, SetupSteps, fieldInputClass, fieldTextareaClass, type SetupStepItem } from "@/shared/ui/pulse";
import { Button as UiButton } from "@/components/ui/button";
import { CreationTransition, PROJECT_WORKFLOW, useWorkflow } from "@/shared/motion";

// ── module-level constants (rules.md §1.2) ───────────────────

// Mirrors ProjectService.createProject: one transaction creates the project,
// the owner membership, default settings, one Production environment with its
// SDK configuration, and one Production ingestion key.
const CREATION_STEPS: SetupStepItem[] = [
  {
    title: "You become the owner",
    description: "The project starts with default retention, sampling, and privacy settings.",
  },
  {
    title: "A Production environment is created",
    description: "It is the default environment, with SDK configuration published. Add staging or development later.",
  },
  {
    title: "A Production ingestion key is issued",
    description: "Manage it under API keys. To copy a secret into an SDK, rotate this key or create another; each secret is shown once.",
  },
];

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

// ── page ─────────────────────────────────────────────────────

export default function CreateProjectWizardPage() {
  const navigate = useNavigate();
  const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
  const { createProject } = useProjectMutations();
  const [error, setError] = useState<string | null>(null);
  /** The submitted name, so the overlay can say what it is creating. */
  const [pendingName, setPendingName] = useState("");

  const listPath = activeOrgSlug ? projectsListPath(activeOrgSlug) : "/projects";

  /**
   * Project creation fans out server-side (project row → environment → SDK
   * config → monitoring → ingestion key), so the wait is narrated rather than
   * spun (Phase 4). Navigation happens from the workflow's success callback, so
   * the user reads "done" before the route changes — and never waits on the
   * animation if the API is fast.
   */
  const workflow = useWorkflow(PROJECT_WORKFLOW, { pace: 600, minDuration: 3400, successHold: 1300 });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      setError("Enter a project name.");
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

    setPendingName(name);
    void workflow.run(() => createProject.mutateAsync(payload), {
      onSuccess: (project) => {
        const orgSlug = useOrgStore.getState().activeOrgSlug;
        if (orgSlug) {
          navigate(projectPath(orgSlug, project.publicId, "overview"));
        } else {
          navigate(`/projects/${project.id}/overview`);
        }
      },
      onError: (mutationError) => setError(apiErrorMessage(mutationError, "Could not create the project.")),
    });
  };

  return (
    <WorkspacePage>
      <CreationTransition
        open={workflow.isActive}
        steps={PROJECT_WORKFLOW}
        state={workflow}
        name={pendingName}
        title={`Setting up ${pendingName}`}
        successTitle={`${pendingName} is ready`}
        errorTitle={`${pendingName} was not created`}
        successDescription="Opening the project overview…"
        onCancel={workflow.reset}
      />

      <ProjectPageHeader
        crumbs={[{ label: "Projects", to: listPath }, { label: "New project" }]}
        title="New project"
        description="A project holds one application or service: its environments, ingestion keys, members, and alert routing."
      />

      <div className="grid max-w-[1080px] grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={handleSubmit} className="min-w-0">
          <Panel
            title="Project details"
            description="Only the name is required. You can change everything later in settings."
            footer={
              <>
                <UiButton type="button" variant="ghost" size="lg" onClick={() => navigate(listPath)}>
                  Cancel
                </UiButton>
                <UiButton type="submit" size="lg" disabled={createProject.isPending}>
                  {createProject.isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                  Create project
                </UiButton>
              </>
            }
          >
            <div className="flex flex-col gap-5">
              <DialogField
                label="Project name"
                name="name"
                required
                hint="Name the application or service, not an environment. The project slug is generated from it."
              >
                <input
                  id="name"
                  name="name"
                  required
                  maxLength={255}
                  autoFocus
                  autoComplete="off"
                  placeholder="Checkout API"
                  className={fieldInputClass}
                />
              </DialogField>

              <DialogField label="Description" name="description" hint="Optional. Shown under the name in the projects list.">
                <textarea
                  id="description"
                  name="description"
                  maxLength={5000}
                  placeholder="Payment and checkout service for the storefront."
                  className={fieldTextareaClass}
                />
              </DialogField>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <DialogField label="Tags" name="tags" hint="Comma separated, up to 20. Useful for team or domain ownership.">
                  <input
                    id="tags"
                    name="tags"
                    autoComplete="off"
                    placeholder="payments, tier-1"
                    className={fieldInputClass}
                  />
                </DialogField>

                <DialogField
                  label="Timezone"
                  name="timezone"
                  hint="An IANA name such as Europe/Berlin. Used for daily rollups and scheduled digests."
                >
                  <input
                    id="timezone"
                    name="timezone"
                    defaultValue={DEFAULT_TIMEZONE}
                    maxLength={100}
                    autoComplete="off"
                    spellCheck={false}
                    className={`${fieldInputClass} font-[family-name:var(--mono)] text-[12px]`}
                  />
                </DialogField>
              </div>

              {error && (
                <div role="alert">
                  <Notice tone="red" icon={AlertTriangle} title="Could not create the project">
                    {error}
                  </Notice>
                </div>
              )}
            </div>
          </Panel>
        </form>

        <Panel title="What creating a project does">
          <SetupSteps steps={CREATION_STEPS} />
        </Panel>
      </div>
    </WorkspacePage>
  );
}
