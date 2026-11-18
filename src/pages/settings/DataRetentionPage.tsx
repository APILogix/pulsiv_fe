import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useProjectMutations, useProjectSettings } from "@/modules/projects/hooks/useProjects";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { PageHeader, SectionCard, Button } from "@/shared/observe";

export default function DataRetentionPage() {
  const projectId = useOrgStore((state) => state.activeProjectId);
  const { data: settings, isLoading, error, refetch } = useProjectSettings(projectId ?? "");
  const { updateSettings } = useProjectMutations(projectId ?? "");
  const [retentionDays, setRetentionDays] = useState(30);

  useEffect(() => {
    if (settings) setRetentionDays(settings.dataRetentionDays);
  }, [settings]);

  const save = () => {
    if (!projectId || !settings) return;
    updateSettings.mutate(
      { id: projectId, payload: { dataRetentionDays: retentionDays, version: settings.version } },
      {
        onSuccess: () => toast.success("Project retention saved"),
        onError: (saveError) => toast.error(apiErrorMessage(saveError, "Could not save project retention.")),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Project data retention"
        description="Set the retention period for this project’s telemetry."
        actions={projectId ? <Button variant="primary" onClick={save} disabled={!settings || updateSettings.isPending || retentionDays === settings.dataRetentionDays}>
          {updateSettings.isPending ? "Saving…" : "Save retention"}
        </Button> : undefined}
      />

      {!projectId ? (
        <SectionCard title="Select a project"><p className="text-[13px] text-[var(--text2)]">Choose a project to manage its retention period.</p></SectionCard>
      ) : isLoading ? (
        <SectionCard title="Retention period"><p className="text-[13px] text-[var(--text3)]">Loading project settings…</p></SectionCard>
      ) : error ? (
        <SectionCard title="Retention period">
          <div className="flex items-center justify-between gap-4">
            <p role="alert" className="text-[13px] text-[var(--red)]">{apiErrorMessage(error, "Could not load project retention settings.")}</p>
            <Button variant="secondary" onClick={() => void refetch()}>Retry</Button>
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Retention period" description="The backend accepts a project retention period from 1 to 3,650 days.">
          <div className="flex flex-col gap-4">
            <label htmlFor="retention-days" className="flex items-center justify-between gap-4 text-[13px]">
              <span className="font-medium text-[var(--text)]">Keep telemetry for</span>
              <span className="font-[family-name:var(--mono)] tabular-nums text-[var(--text2)]">{retentionDays} days</span>
            </label>
            <input
              id="retention-days"
              type="range"
              min={1}
              max={3650}
              value={retentionDays}
              onChange={(event) => setRetentionDays(Number(event.target.value))}
              className="w-full accent-[var(--brand)]"
            />
            <div className="flex justify-between text-[11px] text-[var(--text3)]"><span>1 day</span><span>3,650 days</span></div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
