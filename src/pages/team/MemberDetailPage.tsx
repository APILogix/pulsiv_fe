import { useParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { PageHeader, SectionCard, KpiCard, StatusBadge, Tabs, Timestamp, Button, DetailSkeleton } from "@/shared/observe";
import { toast } from "sonner";

export default function MemberDetailPage() {
  const { userId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();

  const { data: m, isLoading } = useQuery({
    queryKey: orgQueryKeys.detail(activeOrgId!).concat(['member', userId]),
    queryFn: () => orgApi.getMember(activeOrgId!, userId),
    enabled: !!activeOrgId && !!userId,
  });

  const removeMutation = useMutation({
    mutationFn: () => orgApi.removeMember(activeOrgId!, userId),
    onSuccess: () => {
      toast.success("Member removed");
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.members(activeOrgId!) });
      navigate("/admin/members");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to remove member")
  });

  const roleMutation = useMutation({
    mutationFn: (role: string) => orgApi.updateMemberRole(activeOrgId!, userId, role),
    onSuccess: () => {
      toast.success("Member role updated");
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.members(activeOrgId!) });
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.detail(activeOrgId!).concat(['member', userId]) });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update role")
  });

  if (isLoading) return <DetailSkeleton />;
  if (!m) return <div className="p-8 text-[var(--text2)]">Member not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start">
        <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4 mr-2" /> Back to members</Button>
      </div>
      
      <PageHeader
        title={m.fullName || m.email || "Unknown User"}
        description={m.email}
        breadcrumbs={[{ label: "Team" }, { label: "Members" }, { label: m.fullName || m.email || "User" }]}
        actions={
          <>
            <StatusBadge status={m.status} />
            <Button variant="danger" disabled={removeMutation.isPending} onClick={() => {
              if (confirm("Are you sure you want to remove this member?")) {
                removeMutation.mutate();
              }
            }}>Remove</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Role" value={m.role} />
        <KpiCard label="Status" value={m.status} />
        <KpiCard label="Joined" value={m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "-"} />
      </div>

      <Tabs
        tabs={[
          {
            id: "profile",
            label: "Profile",
            content: (
              <SectionCard>
                <dl className="grid grid-cols-2 gap-y-3 text-[13px]">
                  <dt className="text-[var(--text3)]">User ID</dt><dd className="font-[family-name:var(--mono)] text-[var(--text)]">{m.userId}</dd>
                  <dt className="text-[var(--text3)]">Joined</dt><dd className="text-[var(--text)]">{m.joinedAt ? <Timestamp value={new Date(m.joinedAt).getTime()} /> : "-"}</dd>
                  <dt className="text-[var(--text3)]">Last active</dt><dd className="text-[var(--text)]">{m.lastActiveAt ? <Timestamp value={new Date(m.lastActiveAt).getTime()} /> : "-"}</dd>
                </dl>
                <form
                  className="mt-5 flex max-w-sm items-end gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const role = formData.get("role") as string;
                    roleMutation.mutate(role);
                  }}
                >
                  <div className="flex-1">
                    <label className="mb-1 block text-sm text-[var(--text2)]">Role</label>
                    <select name="role" defaultValue={m.role} className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] px-3 py-2 text-sm">
                      <option value="viewer">Viewer</option>
                      <option value="member">Member</option>
                      <option value="developer">Developer</option>
                      <option value="billing">Billing</option>
                      <option value="security">Security</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                  <Button type="submit" variant="secondary" disabled={roleMutation.isPending}>Update role</Button>
                </form>
              </SectionCard>
            ),
          },
          {
            id: "activity",
            label: "Activity",
            content: <SectionCard><div className="text-[13px] text-[var(--text2)]">Member activity and audit log entries render here.</div></SectionCard>,
          },
        ]}
      />
    </div>
  );
}
