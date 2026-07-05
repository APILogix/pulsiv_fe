import { useState } from "react";
import { useNavigate } from "react-router";
import { UserPlus, MoreHorizontal } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { Member } from "@/modules/organizations/types/org.types";
import {
  PageHeader, KpiCard, FillPage, InfiniteTable, StatusBadge, Button, Timestamp, SearchInput
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function MembersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: [...orgQueryKeys.members(activeOrgId!), query],
    queryFn: () => orgApi.listMembers(activeOrgId!, { search: query, limit: 100 }),
    enabled: !!activeOrgId,
  });

  const members = data?.data ?? [];

  const suspendMutation = useMutation({
    mutationFn: (userId: string) => orgApi.suspendMember(activeOrgId!, userId),
    onSuccess: () => {
      toast.success("Member suspended");
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.members(activeOrgId!) });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to suspend member")
  });

  const reactivateMutation = useMutation({
    mutationFn: (userId: string) => orgApi.reactivateMember(activeOrgId!, userId),
    onSuccess: () => {
      toast.success("Member reactivated");
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.members(activeOrgId!) });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to reactivate member")
  });

  const columns: Column<Member>[] = [
    {
      key: "member", header: "Member", width: "1fr",
      cell: (m) => (
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-bg)] text-[12px] font-semibold text-[var(--brand)]">
            {(m.fullName || m.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">{m.fullName || '-'}</div>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", width: "100px", cell: (m) => <span className="text-[var(--text2)] capitalize">{m.role}</span> },
    { key: "status", header: "Status", width: "110px", cell: (m) => <StatusBadge status={m.status} /> },
    { key: "active", header: "Last active", width: "130px", cell: (m) => m.lastActiveAt ? <Timestamp value={new Date(m.lastActiveAt).getTime()} /> : <span className="text-[var(--text3)]">-</span> },
    {
      key: "actions", header: "", width: "60px",
      cell: (m) => {
        const isSuspended = m.status === 'suspended';
        const isPending = suspendMutation.isPending || reactivateMutation.isPending;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--text2)] hover:bg-[var(--bg2)]">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuItem 
                  disabled={isPending}
                  onClick={() => isSuspended ? reactivateMutation.mutate(m.userId) : suspendMutation.mutate(m.userId)}
                  className={!isSuspended ? "text-[var(--red)] focus:text-[var(--red)] focus:bg-[var(--red-bg)]" : ""}
                >
                  {isSuspended ? "Reactivate member" : "Suspend member"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Members"
        description="Membership, role, suspend, and reactivate flows."
        actions={<Button variant="primary" onClick={() => navigate('/admin/invitations')}><UserPlus className="size-4 mr-2" /> Invite</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Members" value={members.length} />
        <KpiCard label="Active" value={members.filter((m) => m.status === "active").length} />
        <KpiCard label="Suspended" value={members.filter((m) => m.status === "suspended").length} />
        <KpiCard label="Invited" value={members.filter((m) => m.status === "invited").length} />
      </div>

      <div className="flex"><SearchInput placeholder="Search members…" onSearch={setQuery} defaultValue={query} /></div>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={members}
        queryKey={["members-table", activeOrgId, query]}
        columns={columns}
        getKey={(m) => m.id}
      />
    </FillPage>
  );
}
