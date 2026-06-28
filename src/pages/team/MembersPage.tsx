import { useState } from "react";
import { useNavigate } from "react-router";
import { UserPlus } from "lucide-react";
import { useMembers } from "@/hooks/useDummyData";
import {
  PageHeader, KpiCard, FillPage, InfiniteTable, StatusBadge, Button, Timestamp, SearchInput, demoAction, demoSuccess,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { Member } from "@/lib/dummy-data";

export default function MembersPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useMembers();
  const [query, setQuery] = useState("");
  let members = data ?? [];
  if (query) members = members.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()) || m.email.includes(query.toLowerCase()));

  const columns: Column<Member>[] = [
    {
      key: "member", header: "Member", width: "1fr",
      cell: (m) => (
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-bg)] text-[12px] font-semibold text-[var(--brand)]">{m.name.charAt(0)}</div>
          <div className="min-w-0">
            <div className="truncate font-medium">{m.name}</div>
            <div className="truncate text-[12px] text-[var(--text3)]">{m.email}</div>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", width: "100px", cell: (m) => <span className="text-[var(--text2)]">{m.role}</span> },
    { key: "mfa", header: "MFA", width: "70px", cell: (m) => (m.mfaEnabled ? <span className="text-[var(--green)]">On</span> : <span className="text-[var(--text3)]">Off</span>) },
    { key: "status", header: "Status", width: "110px", cell: (m) => <StatusBadge status={m.status} /> },
    { key: "active", header: "Last active", width: "130px", cell: (m) => <Timestamp value={m.lastActiveAt} /> },
    {
      key: "actions", header: "", width: "120px",
      cell: (m) => <div onClick={(e) => e.stopPropagation()}><Button variant="ghost" onClick={() => demoSuccess(`${m.status === "suspended" ? "Reactivated" : "Suspended"} ${m.name}`)}>{m.status === "suspended" ? "Reactivate" : "Suspend"}</Button></div>,
    },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Members"
        description="Membership, role, suspend, and reactivate flows."
        actions={<Button variant="primary" onClick={() => demoAction("Invite member")}><UserPlus className="size-4" /> Invite</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Members" value={(data ?? []).length} />
        <KpiCard label="Active" value={(data ?? []).filter((m) => m.status === "active").length} />
        <KpiCard label="MFA enabled" value={(data ?? []).filter((m) => m.mfaEnabled).length} />
        <KpiCard label="Suspended" value={(data ?? []).filter((m) => m.status === "suspended").length} />
      </div>

      <div className="flex"><SearchInput placeholder="Search members…" onSearch={setQuery} defaultValue={query} /></div>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={members}
        queryKey={["members", query]}
        columns={columns}
        getKey={(m) => m.id}
        onRowClick={(m) => navigate(`/admin/members/${m.id}`)}
      />
    </FillPage>
  );
}
