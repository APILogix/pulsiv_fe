import { useParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useProject } from "@/hooks/useDummyData";
import { PageHeader, KpiCard, SectionCard, StatusBadge, Tabs, Button, Timestamp, Table, Tr, Td, formatCompact } from "@/shared/observe";

export default function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const { data: p, isLoading } = useProject(projectId);

  if (isLoading) return <div className="p-8 text-[var(--text3)]">Loading project…</div>;
  if (!p) return <div className="p-8 text-[var(--text2)]">Project not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to projects</Button>
      <PageHeader
        title={p.name}
        description={p.description}
        breadcrumbs={[{ label: "Workspaces" }, { label: "Projects" }, { label: p.name }]}
        actions={<StatusBadge status={p.status} />}
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
                    {p.environments.map((e) => (
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
              <SectionCard>
                <div className="text-[13px] text-[var(--text2)]">Project activity stream renders here with deploys, member changes, and config edits.</div>
              </SectionCard>
            ),
          },
        ]}
      />
    </div>
  );
}
