import { useActionState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MailPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { Invitation, Member, OrgRole } from "@/modules/organizations/types/org.types";
import {
  Button,
  Field,
  InfiniteTable,
  PageHeader,
  SectionCard,
  StatusBadge,
  SubmitButton,
  Tabs,
  Timestamp,
  inputClass,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";

const roleOptions: OrgRole[] = ["owner", "admin", "member", "viewer"];

function daysUntil(date: string) {
  const ms = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export default function TeamPage() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();

  const { data: me } = useQuery({
    queryKey: [...orgQueryKeys.members(activeOrgId!), "me"],
    queryFn: () => orgApi.getMe(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: [...orgQueryKeys.members(activeOrgId!), "team"],
    queryFn: () => orgApi.listMembers(activeOrgId!, { limit: 100, status: "active" }),
    enabled: !!activeOrgId,
  });

  const { data: invitationsData, isLoading: invitationsLoading } = useQuery({
    queryKey: [...orgQueryKeys.invitations(activeOrgId!), "pending"],
    queryFn: () => orgApi.listInvitations(activeOrgId!, { limit: 100, status: "pending" }),
    enabled: !!activeOrgId,
  });

  const members = membersData?.data ?? [];
  const pendingInvites = invitationsData?.data ?? [];

  const invalidateTeam = () => {
    if (!activeOrgId) return;
    queryClient.invalidateQueries({ queryKey: orgQueryKeys.members(activeOrgId) });
    queryClient.invalidateQueries({ queryKey: orgQueryKeys.invitations(activeOrgId) });
  };

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: OrgRole }) =>
      orgApi.updateMemberRole(activeOrgId!, userId, role),
    onSuccess: () => {
      toast.success("Role updated");
      invalidateTeam();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update role"),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => orgApi.removeMember(activeOrgId!, userId),
    onSuccess: () => {
      toast.success("Member removed");
      invalidateTeam();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to remove member"),
  });

  const resendInvitation = useMutation({
    mutationFn: (id: string) => orgApi.resendInvitation(activeOrgId!, id),
    onSuccess: () => {
      toast.success("Invitation resent");
      invalidateTeam();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to resend invitation"),
  });

  const revokeInvitation = useMutation({
    mutationFn: (id: string) => orgApi.revokeInvitation(activeOrgId!, id),
    onSuccess: () => {
      toast.success("Invitation revoked");
      invalidateTeam();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to revoke invitation"),
  });

  const [state, inviteAction] = useActionState(
    async (_prev: any, form: FormData) => {
      if (!activeOrgId) return { ok: false, error: "No active organization" };
      try {
        const email = String(form.get("email") || "").trim();
        const role = String(form.get("role") || "member") as OrgRole;
        await orgApi.createInvitation(activeOrgId, { email, role });
        invalidateTeam();
        return { ok: true, email };
      } catch (err: any) {
        return { ok: false, error: err.response?.data?.message || "Failed to send invitation" };
      }
    },
    { ok: false, error: null, email: undefined },
  );

  useEffect(() => {
    if (state.ok && state.email) toast.success(`Invitation sent to ${state.email}`);
    if (state.error) toast.error(state.error);
  }, [state]);

  const memberColumns: Column<Member>[] = [
    {
      key: "user",
      header: "User",
      width: "minmax(260px, 1fr)",
      cell: (member) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-bg)] text-[12px] font-semibold text-[var(--brand)]">
            {(member.fullName || member.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-[var(--text)]">{member.fullName || "-"}</div>
            <div className="truncate text-[12px] text-[var(--text2)]">{member.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      width: "140px",
      cell: (member) => (
        <select
          className={inputClass}
          value={member.role}
          disabled={member.role === "owner" || member.userId === me?.userId || updateRole.isPending}
          onChange={(event) => updateRole.mutate({ userId: member.userId, role: event.target.value as OrgRole })}
        >
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </option>
          ))}
        </select>
      ),
    },
    { key: "mfa", header: "MFA", width: "120px", cell: (member) => <StatusBadge status={member.mfaEnabled ? "enabled" : "not enabled"} /> },
    {
      key: "lastActive",
      header: "Last active",
      width: "140px",
      cell: (member) =>
        member.lastActiveAt ? <Timestamp value={member.lastActiveAt} /> : <span className="text-[var(--text3)]">-</span>,
    },
    {
      key: "joined",
      header: "Joined",
      width: "120px",
      cell: (member) => member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "-",
    },
    {
      key: "actions",
      header: "Actions",
      width: "120px",
      cell: (member) => (
        <Button
          variant="secondary"
          disabled={member.role === "owner" || member.userId === me?.userId || removeMember.isPending}
          onClick={() => removeMember.mutate(member.userId)}
        >
          <Trash2 className="size-4" />
          Remove
        </Button>
      ),
    },
  ];

  const inviteColumns: Column<Invitation>[] = [
    { key: "email", header: "Email", width: "minmax(240px, 1fr)", cell: (invite) => <span className="font-medium">{invite.email}</span> },
    { key: "role", header: "Role", width: "120px", cell: (invite) => <span className="capitalize text-[var(--text2)]">{invite.role}</span> },
    { key: "by", header: "Invited by", width: "170px", cell: (invite) => invite.invitedBy?.name || invite.invitedBy?.email || "-" },
    {
      key: "sent",
      header: "Sent",
      width: "180px",
      cell: (invite) => (
        <div>
          <Timestamp value={invite.invitedAt} />
          <div className="text-[12px] text-[var(--text3)]">Expires in {daysUntil(invite.expiresAt)} days</div>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: "190px",
      cell: (invite) => (
        <div className="flex gap-2">
          <Button disabled={resendInvitation.isPending} onClick={() => resendInvitation.mutate(invite.id)}>
            Resend
          </Button>
          <Button disabled={revokeInvitation.isPending} onClick={() => revokeInvitation.mutate(invite.id)}>
            Revoke
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex w-full max-w-[1120px] flex-col gap-5">
      <PageHeader
        title="Team"
        description="Members and pending invitations for this organization."
      />

      <SectionCard title="Invite member">
        <form action={inviteAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <Field label="Email">
              <input name="email" type="email" required placeholder="teammate@company.com" className={inputClass} />
            </Field>
          </div>
          <div className="w-40">
            <Field label="Role">
              <select name="role" className={inputClass} defaultValue="member">
                {roleOptions.filter((role) => role !== "owner").map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <SubmitButton>
            <MailPlus className="size-4" />
            Send invite
          </SubmitButton>
        </form>
      </SectionCard>

      <Tabs
        tabs={[
          {
            id: "members",
            label: "Members",
            content: (
              <InfiniteTable
                loading={membersLoading}
                items={members}
                queryKey={["team-members-table", activeOrgId]}
                columns={memberColumns}
                getKey={(member) => member.id}
              />
            ),
          },
          {
            id: "pending",
            label: "Pending",
            content: (
              <InfiniteTable
                loading={invitationsLoading}
                items={pendingInvites}
                queryKey={["team-pending-table", activeOrgId]}
                columns={inviteColumns}
                getKey={(invite) => invite.id}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
