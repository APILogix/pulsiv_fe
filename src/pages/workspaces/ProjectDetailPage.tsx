import { useParams, useNavigate } from "react-router";
import { ArrowLeft, MoreHorizontal, Pause, Play, Archive, RotateCcw } from "lucide-react";
import { useProject, useProjectMutations } from "@/modules/projects/hooks/useProjects";
import { PageHeader, KpiCard, SectionCard, StatusBadge, Tabs, Button, Timestamp, Table, Tr, Td, formatCompact, DetailSkeleton } from "@/shared/observe";
import { ActivityStream } from "@/modules/projects/ActivityStream";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const { data: p, isLoading } = useProject(projectId);
  const { archiveProject, unarchiveProject, pauseProject, resumeProject } = useProjectMutations();

  if (isLoading) return <DetailSkeleton />;
  if (!p) return <div className="p-8 text-[var(--text2)]">Project not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to projects</Button>
      <PageHeader
        title={p.name}
        description={p.description ?? undefined}
        breadcrumbs={[{ label: "Workspaces" }, { label: "Projects" }, { label: p.name }]}
        actions={
          <div className="flex items-center gap-2">
            <UiButton variant="secondary" size="sm" onClick={() => navigate(`/projects/${p.id}/remote-config`)}>
              Remote Config
            </UiButton>
            <StatusBadge status={p.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <UiButton variant="outline" size="icon-sm"><MoreHorizontal className="size-4" /></UiButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {p.status === "active" && (
                  <DropdownMenuItem onClick={() => pauseProject.mutate(p.id)} className="text-amber-500">
                    <Pause className="mr-2 size-4" /> Pause Project
                  </DropdownMenuItem>
                )}
                {p.status === "paused" && (
                  <DropdownMenuItem onClick={() => resumeProject.mutate(p.id)} className="text-green-500">
                    <Play className="mr-2 size-4" /> Resume Project
                  </DropdownMenuItem>
                )}
                {p.status !== "archived" ? (
                  <DropdownMenuItem onClick={() => archiveProject.mutate(p.id)} className="text-red-500">
                    <Archive className="mr-2 size-4" /> Archive Project
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => unarchiveProject.mutate(p.id)}>
                    <RotateCcw className="mr-2 size-4" /> Unarchive Project
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Health" value={p.healthScore} />
        <KpiCard label="Events / 24h" value={formatCompact(p.eventVolume24h)} />
        <KpiCard label="Error rate" value={`${p.errorRate}%`} />
        <KpiCard label="Members" value={p.memberCount} />
      </div>

      <Tabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <SectionCard title="Environments" className="p-0">
                  <Table headers={["Environment", "Status"]}>
                    {p.environments.map((e: string) => (
                      <Tr key={e}><Td className="capitalize">{e}</Td><Td><StatusBadge status="active" /></Td></Tr>
                    ))}
                  </Table>
                </SectionCard>
                <SectionCard title="Details">
                  <dl className="grid grid-cols-2 gap-y-3 text-[13px]">
                    <dt className="text-[var(--text3)]">Slug</dt><dd className="font-[family-name:var(--mono)] text-[var(--text)]">{p.slug}</dd>
                    <dt className="text-[var(--text3)]">Created</dt><dd className="text-[var(--text)]"><Timestamp value={p.createdAt} /></dd>
                    <dt className="text-[var(--text3)]">Last activity</dt><dd className="text-[var(--text)]"><Timestamp value={p.lastActivityAt} /></dd>
                  </dl>
                </SectionCard>
              </div>
            ),
          },
          {
            id: "services",
            label: "Services",
            content: (
              <SectionCard title="Recent releases" className="p-0">
                <Table headers={["Release", "Service", "Status"]}>
                  {["v2.4.1", "v2.4.0", "v2.3.8"].map((v, i) => (
                    <Tr key={v}><Td className="font-[family-name:var(--mono)] text-[12px]">{v}</Td><Td>api-gateway</Td><Td><StatusBadge status={i === 0 ? "stable" : "stable"} /></Td></Tr>
                  ))}
                </Table>
              </SectionCard>
            ),
          },
          {
            id: "activity",
            label: "Activity",
            content: (
              <SectionCard className="p-0">
                <ActivityStream />
              </SectionCard>
            ),
          },
        ]}
      />
    </div>
  );
}
