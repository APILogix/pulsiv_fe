import { useActionState, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  MailPlus,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { Invitation, Member, OrgRole } from "@/modules/organizations/types/org.types";
import {
  Button,
  CardSkeleton,
  Field,
  FilterSelect,
  SearchInput,
  StatusBadge,
  SubmitButton,
  Table,
  Td,
  Timestamp,
  Tr,
  formatNumber,
  inputClass,
} from "@/shared/observe";
import {
  EmptyPanel,
  HeroFacts,
  PageHero,
  Panel,
  Pill,
  SegmentedControl,
  Toolbar,
  type HeroFact,
  type SegmentOption,
  type SurfaceTone,
} from "@/shared/ui/pulse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TabKey = "members" | "invitations";

const roleOptions: OrgRole[] = ["owner", "admin", "member", "viewer"];

const INVITE_ROLE_OPTIONS = roleOptions.filter((role) => role !== "owner");

const PRIVILEGED_ROLES: OrgRole[] = ["owner", "admin"];

const MEMBER_HEADERS = ["Member", "Role", "MFA", "Last active", "Status", "Actions"];

const INVITATION_HEADERS = ["Invitation", "Role", "Invited by", "Sent", "Actions"];

const ROLE_FILTER_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

const MFA_FILTER_OPTIONS = [
  { value: "all", label: "Any MFA state" },
  { value: "enabled", label: "MFA enabled" },
  { value: "disabled", label: "MFA missing" },
];

const ROLE_TONES: Record<string, SurfaceTone> = {
  owner: "brand",
  admin: "violet",
  security: "violet",
  billing: "blue",
  developer: "ai",
};

function roleTone(role: string): SurfaceTone {
  return ROLE_TONES[role] ?? "neutral";
}

function daysUntil(date: string) {
  const ms = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

// ── one-off local component: initial avatar used in the member table ──
function MemberAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-bg)] font-[family-name:var(--display)] text-[12.5px] font-semibold text-[var(--brand)] ring-1 ring-inset ring-[var(--brand)]/25"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// ── one-off local component: stops row navigation for inline controls ──
function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-end gap-2"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

// ── one-off local component: skeleton body for the list panels ──
function ListSkeleton() {
  return (
    <div className="grid gap-3">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

export default function TeamPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { activeOrgId } = useOrganizations();
  const [tab, setTab] = useState<TabKey>("members");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [mfaFilter, setMfaFilter] = useState("all");
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);

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
      setRemoveTarget(null);
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
      setRevokeTarget(null);
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

  const term = search.trim().toLowerCase();
  const visibleMembers = members.filter((member) => {
    const matchesTerm =
      term.length === 0 ||
      member.email.toLowerCase().includes(term) ||
      (member.fullName || "").toLowerCase().includes(term);
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    const matchesMfa =
      mfaFilter === "all" || (mfaFilter === "enabled" ? member.mfaEnabled : !member.mfaEnabled);
    return matchesTerm && matchesRole && matchesMfa;
  });

  const activeCount = members.filter((member) => member.status === "active").length;
  const privilegedCount = members.filter((member) => PRIVILEGED_ROLES.includes(member.role)).length;
  const mfaCount = members.filter((member) => member.mfaEnabled).length;

  const facts: HeroFact[] = [
    { label: "Members", value: formatNumber(members.length), icon: Users },
    { label: "Active", value: formatNumber(activeCount), tone: activeCount > 0 ? "green" : "neutral", icon: ShieldCheck },
    {
      label: "Pending invitations",
      value: formatNumber(pendingInvites.length),
      tone: pendingInvites.length > 0 ? "amber" : "neutral",
      icon: MailPlus,
    },
    { label: "Admins and owners", value: formatNumber(privilegedCount), tone: "violet", icon: UserCog },
  ];

  const tabOptions: SegmentOption<TabKey>[] = [
    { value: "members", label: "Members", icon: Users, count: members.length },
    { value: "invitations", label: "Invitations", icon: MailPlus, count: pendingInvites.length },
  ];

  const canManage = (member: Member) => member.role !== "owner" && member.userId !== me?.userId;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Access"
        title="Team"
        description="Members with access to this organization, plus invitations that have not been accepted yet."
        icon={Users}
        actions={<Pill tone="ai" dot>{`${formatNumber(mfaCount)} of ${formatNumber(members.length)} with MFA`}</Pill>}
      >
        <HeroFacts facts={facts} />
      </PageHero>

      <Panel
        title="Invite a member"
        description="Invitations expire automatically. Roles can be changed after the member joins."
        icon={UserPlus}
        tone="brand"
      >
        <form action={inviteAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <Field label="Email">
              <input
                name="email"
                type="email"
                required
                placeholder="teammate@company.com"
                className={`${inputClass} font-[family-name:var(--mono)] text-[12.5px]`}
              />
            </Field>
          </div>
          <div className="w-44">
            <Field label="Role">
              <select name="role" className={inputClass} defaultValue="member">
                {INVITE_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <SubmitButton>
            <MailPlus className="size-4" aria-hidden="true" />
            Send invite
          </SubmitButton>
        </form>
      </Panel>

      <Toolbar
        trailing={<SegmentedControl value={tab} onChange={setTab} options={tabOptions} ariaLabel="Team view" />}
      >
        <SearchInput placeholder="Search name or email…" defaultValue={search} onSearch={setSearch} />
        <FilterSelect label="Role" value={roleFilter} onChange={setRoleFilter} options={ROLE_FILTER_OPTIONS} />
        <FilterSelect label="MFA" value={mfaFilter} onChange={setMfaFilter} options={MFA_FILTER_OPTIONS} />
      </Toolbar>

      {tab === "members" ? (
        <Panel
          title="Members"
          description="Select a row to open the full membership record."
          icon={Users}
          tone="brand"
          bodyClassName={membersLoading ? undefined : "p-0"}
        >
          {membersLoading ? (
            <ListSkeleton />
          ) : visibleMembers.length === 0 ? (
            <EmptyPanel
              className="rounded-none border-0 border-t border-dashed"
              icon={Users}
              title={members.length === 0 ? "No members yet" : "No members match these filters"}
              description={
                members.length === 0
                  ? "Invite a teammate above to start building the organization."
                  : "Clear the search or filter selections to see the full member list."
              }
            />
          ) : (
            <Table headers={MEMBER_HEADERS} maxHeight="34rem">
              {visibleMembers.map((member) => (
                <Tr key={member.id} onClick={() => navigate(`/admin/members/${member.userId}`)}>
                  <Td>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <MemberAvatar name={member.fullName || member.email} />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[13px] font-medium text-[var(--text)]">
                          {member.fullName || "Unnamed member"}
                        </span>
                        <span className="truncate font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">
                          {member.email}
                        </span>
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <Pill tone={roleTone(member.role)}>{member.role}</Pill>
                  </Td>
                  <Td>
                    {member.mfaEnabled ? (
                      <Pill tone="green" dot>Enabled</Pill>
                    ) : (
                      <Pill tone="amber" dot>Missing</Pill>
                    )}
                  </Td>
                  <Td className="text-[12.5px]">
                    {member.lastActiveAt ? (
                      <Timestamp value={member.lastActiveAt} />
                    ) : (
                      <span className="text-[var(--text3)]">No activity</span>
                    )}
                  </Td>
                  <Td>
                    <StatusBadge status={member.status} />
                  </Td>
                  <Td>
                    <RowActions>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="w-9 px-0">
                            <span className="sr-only">{`Actions for ${member.fullName || member.email}`}</span>
                            <MoreHorizontal className="size-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[196px]">
                          <DropdownMenuItem onClick={() => navigate(`/admin/members/${member.userId}`)}>
                            <UserCog className="mr-2 size-4" aria-hidden="true" />
                            Open member
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Assign role</DropdownMenuLabel>
                          {roleOptions.map((role) => (
                            <DropdownMenuItem
                              key={role}
                              disabled={!canManage(member) || role === member.role || updateRole.isPending}
                              onClick={() => updateRole.mutate({ userId: member.userId, role })}
                            >
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={!canManage(member) || removeMember.isPending}
                            onClick={() => setRemoveTarget(member)}
                            className="text-[var(--red)] focus:bg-[var(--red-bg)] focus:text-[var(--red)]"
                          >
                            <Trash2 className="mr-2 size-4" aria-hidden="true" />
                            Remove member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </Panel>
      ) : (
        <Panel
          title="Pending invitations"
          description="Invitations waiting to be accepted. Resend to deliver a fresh email, revoke to cancel access."
          icon={MailPlus}
          tone="amber"
          bodyClassName={invitationsLoading ? undefined : "p-0"}
        >
          {invitationsLoading ? (
            <ListSkeleton />
          ) : pendingInvites.length === 0 ? (
            <EmptyPanel
              className="rounded-none border-0 border-t border-dashed"
              icon={MailPlus}
              title="No pending invitations"
              description="Everyone who was invited has either joined or had their invitation revoked."
            />
          ) : (
            <Table headers={INVITATION_HEADERS} maxHeight="34rem">
              {pendingInvites.map((invite) => (
                <Tr key={invite.id}>
                  <Td className="font-[family-name:var(--mono)] text-[12.5px]">{invite.email}</Td>
                  <Td>
                    <Pill tone={roleTone(invite.role)}>{invite.role}</Pill>
                  </Td>
                  <Td className="text-[12.5px] text-[var(--text2)]">
                    {invite.invitedBy?.name || invite.invitedBy?.email || "—"}
                  </Td>
                  <Td className="text-[12.5px]">
                    <span className="flex flex-col">
                      <Timestamp value={invite.invitedAt} />
                      <span className="flex items-center gap-1 text-[11.5px] tabular-nums text-[var(--text3)]">
                        <Clock className="size-3" aria-hidden="true" />
                        {`Expires in ${daysUntil(invite.expiresAt)} days`}
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <RowActions>
                      <Button
                        variant="secondary"
                        disabled={resendInvitation.isPending}
                        onClick={() => resendInvitation.mutate(invite.id)}
                      >
                        <RefreshCw className="size-3.5" aria-hidden="true" />
                        Resend
                      </Button>
                      <Button
                        variant="danger"
                        disabled={revokeInvitation.isPending}
                        onClick={() => setRevokeTarget(invite)}
                      >
                        <UserX className="size-3.5" aria-hidden="true" />
                        Revoke
                      </Button>
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </Panel>
      )}

      <Dialog open={removeTarget !== null} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              The member loses access to every project and resource in this organization immediately.
            </DialogDescription>
          </DialogHeader>
          <p className="text-[13px] text-[var(--text2)]">
            {removeTarget?.fullName || removeTarget?.email}{" "}
            <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">
              {removeTarget?.email}
            </span>
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={removeMember.isPending}
              onClick={() => {
                if (removeTarget) removeMember.mutate(removeTarget.userId);
              }}
            >
              Remove member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revokeTarget !== null} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke invitation</DialogTitle>
            <DialogDescription>
              The invitation link stops working right away. You can invite the same address again later.
            </DialogDescription>
          </DialogHeader>
          <p className="font-[family-name:var(--mono)] text-[13px] text-[var(--text)]">{revokeTarget?.email}</p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={revokeInvitation.isPending}
              onClick={() => {
                if (revokeTarget) revokeInvitation.mutate(revokeTarget.id);
              }}
            >
              Revoke invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
