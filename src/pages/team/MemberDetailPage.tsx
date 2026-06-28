import { useParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useMember } from "@/hooks/useDummyData";
import {
  PageHeader, SectionCard, KpiCard, StatusBadge, Tabs, Table, Tr, Td, Timestamp, Button, demoSuccess,
} from "@/shared/observe";

export default function MemberDetailPage() {
  const { userId = "" } = useParams();
  const navigate = useNavigate();
  const { data: m, isLoading } = useMember(userId);

  if (isLoading) return <div className="p-8 text-[var(--text3)]">Loading member…</div>;
  if (!m) return <div className="p-8 text-[var(--text2)]">Member not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to members</Button>
      <PageHeader
        title={m.name}
        description={m.email}
        breadcrumbs={[{ label: "Team" }, { label: "Members" }, { label: m.name }]}
        actions={<><StatusBadge status={m.status} /><Button variant="secondary" onClick={() => demoSuccess("Role updated")}>Change role</Button></>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Role" value={m.role} />
        <KpiCard label="MFA" value={m.mfaEnabled ? "Enabled" : "Disabled"} />
        <KpiCard label="Projects" value={m.projects.length} />
        <KpiCard label="Sessions" value={m.sessions.length} />
      </div>

      <Tabs
        tabs={[
          {
            id: "profile",
            label: "Profile",
            content: (
              <SectionCard>
                <dl className="grid grid-cols-2 gap-y-3 text-[13px]">
                  <dt className="text-[var(--text3)]">Joined</dt><dd className="text-[var(--text)]"><Timestamp value={m.joinedAt} /></dd>
                  <dt className="text-[var(--text3)]">Last active</dt><dd className="text-[var(--text)]"><Timestamp value={m.lastActiveAt} /></dd>
                  <dt className="text-[var(--text3)]">IP address</dt><dd className="font-[family-name:var(--mono)] text-[var(--text)]">{m.ipAddress}</dd>
                </dl>
              </SectionCard>
            ),
          },
          {
            id: "sessions",
            label: `Sessions (${m.sessions.length})`,
            content: (
              <SectionCard className="p-0">
                <Table headers={["Device", "Browser", "Location", "Last active", ""]}>
                  {m.sessions.map((s) => (
                    <Tr key={s.id}>
                      <Td>{s.device} {s.isCurrent && <span className="ml-1 text-[11px] text-[var(--green)]">(current)</span>}</Td>
                      <Td className="text-[var(--text2)]">{s.browser}</Td>
                      <Td className="text-[var(--text2)]">{s.location}</Td>
                      <Td><Timestamp value={s.lastActiveAt} /></Td>
                      <Td><Button variant="ghost" onClick={() => demoSuccess("Session revoked")}>Revoke</Button></Td>
                    </Tr>
                  ))}
                </Table>
              </SectionCard>
            ),
          },
          {
            id: "activity",
            label: "Activity",
            content: <SectionCard><div className="text-[13px] text-[var(--text2)]">Member activity, incidents, and audit log entries render here.</div></SectionCard>,
          },
        ]}
      />
    </div>
  );
}
