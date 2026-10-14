import type { ProjectEnvironment } from "@/modules/projects/api/types";
import { ProjectPageHeader } from "@/modules/projects/components/project-page";
import { FilterSelect } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";

interface RemoteConfigHeaderProps {
  environments: ProjectEnvironment[];
  selectedEnvironmentId: string;
  onSelectEnvironment: (id: string) => void;
  isDraft: boolean;
  draftChangesCount: number;
  hasErrors: boolean;
  onOpenPublishDrawer: () => void;
  onDiscardDraft?: () => void;
}

/**
 * Page header for the remote config editor: title, purpose, the environment
 * scope, and the draft's actions (design/workspaces/DESIGN.md).
 */
export function RemoteConfigHeader({
  environments,
  selectedEnvironmentId,
  onSelectEnvironment,
  isDraft,
  draftChangesCount,
  hasErrors,
  onOpenPublishDrawer,
  onDiscardDraft,
}: RemoteConfigHeaderProps) {
  const options = [
    { value: "", label: "All environments" },
    ...environments.map((environment) => ({
      value: environment.id,
      label: `${environment.name} (${environment.slug})`,
    })),
  ];

  return (
    <ProjectPageHeader
      title="Remote config"
      description="Values delivered to SDKs at runtime. Each environment has its own configuration, and every publish creates a new revision."
      actions={
        <>
          <FilterSelect label="Environment" value={selectedEnvironmentId} onChange={onSelectEnvironment} options={options} />
          {isDraft && onDiscardDraft && (
            <UiButton variant="outline" size="lg" onClick={onDiscardDraft}>
              Discard
            </UiButton>
          )}
          {isDraft && (
            <UiButton size="lg" onClick={onOpenPublishDrawer} disabled={hasErrors}>
              {hasErrors ? "Fix errors to publish" : "Review and publish"}
              {!hasErrors && draftChangesCount > 0 && (
                <span className="font-[family-name:var(--mono)] text-[11px] tabular-nums opacity-70">
                  {draftChangesCount}
                </span>
              )}
            </UiButton>
          )}
        </>
      }
    />
  );
}
