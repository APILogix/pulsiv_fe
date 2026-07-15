import { PageHeader, SectionCard } from "@/shared/observe";
import { ActivityStream } from "@/modules/projects/ActivityStream";
import { useCurrentProject } from "./ProjectShellPage";

export default function ProjectActivityPage() {
  const { project: p } = useCurrentProject();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Activity Stream"
        description="Audit log of actions performed within this project."
        breadcrumbs={[{ label: "Workspaces" }, { label: "Projects", to: "/projects" }, { label: p.name, to: `/projects/${p.id}/overview` }, { label: "Activity" }]}
      />

      <SectionCard className="p-0">
        <ActivityStream />
      </SectionCard>
    </div>
  );
}
