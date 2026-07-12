import { useNavigate } from "react-router";
import { MoreHorizontal, Pause, Play, Archive, RotateCcw, Box, Key, Activity, Users } from "lucide-react";
import { useProjectMutations, useProjectOverview } from "@/modules/projects/hooks/useProjects";
import { PageHeader, SectionCard, StatusBadge, Tabs, Timestamp, Table, Tr, Td, formatCompact } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCurrentProject } from "./ProjectShellPage";
import { DetailSkeleton } from "@/shared/observe";

export default function ProjectOverviewPage() {
  const { projectId } = useCurrentProject();
  const navigate = useNavigate();
  const { data: overview, isLoading } = useProjectOverview(projectId);
  const { archiveProject, unarchiveProject, pauseProject, resumeProject } = useProjectMutations();

  if (isLoading || !overview) {
    return <DetailSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={overview.name}
        description={overview.description ?? undefined}
        breadcrumbs={[{ label: "Workspaces" }, { label: "Projects", to: "/projects" }, { label: overview.name }]}
        actions={
          <div className="flex items-center gap-2">
            <UiButton variant="secondary" size="sm" onClick={() => navigate(`/projects/${overview.id}/remote-config`)}>
              Remote Config
            </UiButton>
            <StatusBadge status={overview.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <UiButton variant="outline" size="icon-sm"><MoreHorizontal className="size-4" /></UiButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {overview.status === "active" && (
                  <DropdownMenuItem onClick={() => pauseProject.mutate(overview.id)} className="text-amber-500">
                    <Pause className="mr-2 size-4" /> Pause Project
                  </DropdownMenuItem>
                )}
                {overview.status === "suspended" && (
                  <DropdownMenuItem onClick={() => resumeProject.mutate(overview.id)} className="text-green-500">
                    <Play className="mr-2 size-4" /> Resume Project
                  </DropdownMenuItem>
                )}
                {overview.status !== "archived" ? (
                  <DropdownMenuItem onClick={() => archiveProject.mutate(overview.id)} className="text-red-500">
                    <Archive className="mr-2 size-4" /> Archive Project
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => unarchiveProject.mutate(overview.id)}>
                    <RotateCcw className="mr-2 size-4" /> Unarchive Project
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-[var(--border)] bg-[var(--bg1)] divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)] overflow-hidden">
        <div className="p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[var(--text3)] text-[12px] font-medium uppercase tracking-wider">
            <Activity className="size-3.5" /> Events (Usage)
          </div>
          <div className="text-2xl font-bold text-[var(--text)] tabular-nums">{formatCompact(overview.usage?.totalEvents ?? 0)}</div>
        </div>
        <div className="p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[var(--text3)] text-[12px] font-medium uppercase tracking-wider">
            <Box className="size-3.5" /> Total Keys
          </div>
          <div className="text-2xl font-bold text-[var(--text)] tabular-nums">{formatCompact(overview.apiKeysCount ?? 0)}</div>
        </div>
        <div className="p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[var(--text3)] text-[12px] font-medium uppercase tracking-wider">
            <Key className="size-3.5" /> Active Keys
          </div>
          <div className="text-2xl font-bold text-[var(--text)] tabular-nums">{formatCompact(overview.activeApiKeysCount ?? 0)}</div>
        </div>
        <div className="p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[var(--text3)] text-[12px] font-medium uppercase tracking-wider">
            <Users className="size-3.5" /> Members
          </div>
          <div className="text-2xl font-bold text-[var(--text)] tabular-nums">{formatCompact(overview.memberCount ?? 0)}</div>
        </div>
      </div>

      <Tabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <SectionCard title="Status" className="p-0">
                  <Table headers={["Metric", "Value"]}>
                    <Tr><Td>State</Td><Td><StatusBadge status={overview.status} /></Td></Tr>
                    <Tr><Td>Alerting</Td><Td>{overview.settings?.alertingEnabled ? 'Enabled' : 'Disabled'}</Td></Tr>
                    <Tr><Td>Ingestion</Td><Td>{overview.settings?.ingestionEnabled ? 'Enabled' : 'Disabled'}</Td></Tr>
                    <Tr><Td>Retention Days</Td><Td>{overview.settings?.retentionDays ?? 'Default'}</Td></Tr>
                  </Table>
                </SectionCard>
                <SectionCard title="Details">
                  <dl className="grid grid-cols-2 gap-y-3 text-[13px]">
                    <dt className="text-[var(--text3)]">Slug</dt><dd className="font-[family-name:var(--mono)] text-[var(--text)]">{overview.slug}</dd>
                    <dt className="text-[var(--text3)]">Created</dt><dd className="text-[var(--text)]"><Timestamp value={overview.createdAt} /></dd>
                    <dt className="text-[var(--text3)]">Updated</dt><dd className="text-[var(--text)]"><Timestamp value={overview.updatedAt} /></dd>
                  </dl>
                </SectionCard>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
