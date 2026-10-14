import { startTransition, useActionState, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { orgApi } from "@/modules/organizations/api/org.api";
import { useAdminHref } from "@/modules/organizations/components/org-page";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { Invitation, Member, MemberStatus, OrgRole } from "@/modules/organizations/types/org.types";
import {
  HIDE_BELOW_MD,
  HIDE_BELOW_SM,
  PageTabs,
  ProjectPageHeader,
  Readouts,
  RowActions,
  RowTitle,
  SearchField,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  ToolbarCount,
  WorkspacePage,
  pageTabPanelProps,
  type PageTab,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { ConfirmDialog, DialogField, FormDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";
import { FilterSelect, Timestamp, formatNumber } from "@/shared/observe";
import { Pill, fieldInputClass, type SurfaceTone } from "@/shared/ui/pulse";

// ── Vocabulary ───────────────────────────────────────────────

type TabKey = "members" | "invitations";

type InviteState = { ok: boolean; error: string | null; email?: string };

const TAB_ID = "team-view";

const roleOptions: OrgRole[] = ["owner", "admin", "member", "viewer"];

const INVITE_ROLE_OPTIONS = roleOptions.filter((role) => role !== "owner");

const PRIVILEGED_ROLES: OrgRole[] = ["owner", "admin"];

const ROLE_FILTER_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "security", label: "Security" },
  { value: "billing", label: "Billing" },
  { value: "developer", label: "Developer" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

const MFA_FILTER_OPTIONS = [
  { value: "all", label: "Any MFA state" },
  { value: "enabled", label: "MFA enabled" },
  { value: "disabled", label: "MFA missing" },
];

const MEMBER_STATUS_TONE: Record<MemberStatus, SurfaceTone> = {
  active: "green",
  invited: "amber",
  suspended: "red",
  locked: "red",
  removed: "neutral",
};

const MEMBER_COLUMNS: SheetColumn[] = [
  { key: "member", header: "Member" },
  { key: "role", header: "Role", className: "w-[120px]" },
  { key: "mfa", header: "MFA", className: `w-[130px] ${HIDE_BELOW_SM}` },
  { key: "active", header: "Last active", className: `w-[160px] ${HIDE_BELOW_MD}` },
  { key: "status", header: "Status", className: "w-[120px]" },
  { key: "actions", header: "Actions", srOnly: true, className: "w-[56px]", align: "right" },
];

const INVITATION_COLUMNS: SheetColumn[] = [
  { key: "invitation", header: "Invitation" },
  { key: "role", header: "Role", className: "w-[120px]" },
  { key: "status", header: "Status", className: "w-[120px]" },
  { key: "sent", header: "Sent", className: `w-[180px] ${HIDE_BELOW_MD}` },
  { key: "actions", header: "Actions", srOnly: true, className: "w-[140px]", align: "right" },
];

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function daysUntil(date: string) {
  const ms = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function isExpired(invite: Invitation) {
  return new Date(invite.expiresAt).getTime() < Date.now();
}

/** Initial avatar in neutral tones: identity, not state. */
function MemberAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg2)] text-[12.5px] font-semibold text-[var(--text2)] ring-1 ring-inset ring-[var(--border)]"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function TeamPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const href = useAdminHref();
  const { activeOrgId } = useOrganizations();
  const [tab, setTab] = useState<TabKey>("members");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [mfaFilter, setMfaFilter] = useState("all");
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: me } = useQuery({
    queryKey: [...orgQueryKeys.members(activeOrgId!), "me"],
    queryFn: () => orgApi.getMe(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const {
    data: membersData,
    isLoading: membersLoading,
    isError: membersFailed,
    error: membersError,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: [...orgQueryKeys.members(activeOrgId!), "team"],
    queryFn: () => orgApi.listMembers(activeOrgId!, { limit: 100, status: "active" }),
    enabled: !!activeOrgId,
  });

  const {
    data: invitationsData,
    isLoading: invitationsLoading,
    isError: invitationsFailed,
    error: invitationsError,
    refetch: refetchInvitations,
  } = useQuery({
    queryKey: [...orgQueryKeys.invitations(activeOrgId!), "pending"],
    queryFn: () => orgApi.listInvitations(activeOrgId!, { limit: 100, status: "pending" }),
    enabled: !!activeOrgId,
  });

  // Same key as the organization dashboard, so the seat limit comes from one cache entry.
  const { data: limits } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "usageLimits"],
    queryFn: () => orgApi.getUsageLimits(activeOrgId!),
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
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Failed to update role")),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => orgApi.removeMember(activeOrgId!, userId),
    onSuccess: () => {
      toast.success("Member removed");
      setRemoveTarget(null);
      invalidateTeam();
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Failed to remove member")),
  });

  const resendInvitation = useMutation({
    mutationFn: (id: string) => orgApi.resendInvitation(activeOrgId!, id),
    onSuccess: () => {
      toast.success("Invitation resent");
      invalidateTeam();
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Failed to resend invitation")),
  });

  const revokeInvitation = useMutation({
    mutationFn: (id: string) => orgApi.revokeInvitation(activeOrgId!, id),
    onSuccess: () => {
      toast.success("Invitation revoked");
      setRevokeTarget(null);
      invalidateTeam();
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Failed to revoke invitation")),
  });

  const [state, inviteAction, invitePending] = useActionState(
    async (_prev: InviteState, form: FormData): Promise<InviteState> => {
      if (!activeOrgId) return { ok: false, error: "No active organization" };
      try {
        const email = String(form.get("email") || "").trim();
        const role = String(form.get("role") || "member") as OrgRole;
        await orgApi.createInvitation(activeOrgId, { email, role });
        invalidateTeam();
        setInviteOpen(false);
        return { ok: true, error: null, email };
      } catch (err: unknown) {
        return { ok: false, error: apiErrorMessage(err, "Failed to send invitation") };
      }
    },
    { ok: false, error: null, email: undefined },
  );

  useEffect(() => {
    if (state.ok && state.email) toast.success(`Invitation sent to ${state.email}`);
    if (state.error) toast.error(state.error);
  }, [state]);

  // ── Derived views ──

  const term = search.trim().toLowerCase();
  const filtersActive = term.length > 0 || roleFilter !== "all" || mfaFilter !== "all";
  const inviteFiltersActive = term.length > 0 || roleFilter !== "all";

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

  const visibleInvites = pendingInvites.filter((invite) => {
    const matchesTerm = term.length === 0 || invite.email.toLowerCase().includes(term);
    const matchesRole = roleFilter === "all" || invite.role === roleFilter;
    return matchesTerm && matchesRole;
  });

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setMfaFilter("all");
  };

  // ── Summary (whole collection, never the filtered view) ──

  const membersMore = membersData?.meta?.hasMore ?? false;
  const invitesMore = invitationsData?.meta?.hasMore ?? false;
  const activeCount = members.filter((member) => member.status === "active").length;
  const privilegedCount = members.filter((member) => PRIVILEGED_ROLES.includes(member.role)).length;
  const mfaCount = members.filter((member) => member.mfaEnabled).length;
  const withoutMfa = members.length - mfaCount;
  const seatBucket = limits?.limits?.members;
  const seatLimit = seatBucket?.limit ?? null;
  const seatsUsed = seatBucket?.used ?? activeCount;
  const hasSeatLimit = seatLimit !== null && seatLimit > 0;

  const countLabel = (count: number, more: boolean) => `${formatNumber(count)}${more ? "+" : ""}`;

  const readouts: Readout[] = [
    {
      label: "Active members",
      value: countLabel(activeCount, membersMore),
      sub: membersMore ? "Showing the first 100" : "With access to this organization",
    },
    {
      label: "Pending invitations",
      value: countLabel(pendingInvites.length, invitesMore),
      sub: pendingInvites.length > 0 ? "Waiting to be accepted" : "None outstanding",
    },
    ...(hasSeatLimit
      ? [
          {
            label: "Seat limit",
            value: formatNumber(seatLimit),
            sub: `${formatNumber(Math.max(0, seatLimit - seatsUsed))} seats open`,
            tone: seatsUsed >= seatLimit ? ("warn" as const) : ("neutral" as const),
          },
        ]
      : []),
    {
      label: "Without MFA",
      value: formatNumber(withoutMfa),
      sub: `${formatNumber(mfaCount)} of ${formatNumber(members.length)} have MFA`,
      tone: members.length === 0 ? "neutral" : withoutMfa > 0 ? "warn" : "good",
    },
    {
      label: "Admins and owners",
      value: formatNumber(privilegedCount),
      sub: "Owner and admin roles",
    },
  ];

  const tabs: PageTab<TabKey>[] = [
    { value: "members", label: "Members", count: members.length },
    { value: "invitations", label: "Invitations", count: pendingInvites.length },
  ];

  const canManage = (member: Member) => member.role !== "owner" && member.userId !== me?.userId;

  const lockedReason = (member: Member) =>
    member.userId === me?.userId
      ? "You can't change your own access here."
      : member.role === "owner"
        ? "The owner's access changes through ownership transfer."
        : null;

  const openInvite = () => setInviteOpen(true);

  const roleFilterSelect = (
    <FilterSelect label="Role" value={roleFilter} onChange={setRoleFilter} options={ROLE_FILTER_OPTIONS} />
  );

  // ── Members view ──

  const membersSheet = (
    <Sheet
      label="Members"
      toolbar={
        <>
          <SearchField value={search} onChange={setSearch} placeholder="Search name or email" label="Search members" />
          {roleFilterSelect}
          <FilterSelect label="MFA" value={mfaFilter} onChange={setMfaFilter} options={MFA_FILTER_OPTIONS} />
          <ToolbarCount>
            {filtersActive
              ? `${formatNumber(visibleMembers.length)} of ${formatNumber(members.length)}`
              : `${countLabel(members.length, membersMore)} members`}
          </ToolbarCount>
        </>
      }
      footer={
        members.length > 0 ? (
          <span>
            Open a member to change their role, suspend, or remove them.
            {membersMore ? " Showing the first 100 members." : ""}
          </span>
        ) : undefined
      }
    >
      {membersLoading ? (
        <SheetLoading rows={5} label="Loading members" />
      ) : membersFailed ? (
        <SheetError
          title="Could not load members"
          message={apiErrorMessage(membersError, "The members request failed. Try again in a moment.")}
          onRetry={() => void refetchMembers()}
        />
      ) : members.length === 0 ? (
        <SheetEmpty
          title="No members yet"
          description="Everyone who accepts an invitation appears here with their role, MFA state, and last activity."
          action={
            <UiButton size="lg" onClick={openInvite}>
              Invite member
            </UiButton>
          }
        />
      ) : visibleMembers.length === 0 ? (
        <SheetEmpty
          title="No members match these filters"
          description="Nobody matches the current search, role, and MFA filters."
          action={
            <UiButton variant="outline" size="lg" onClick={clearFilters}>
              Clear filters
            </UiButton>
          }
        />
      ) : (
        <SheetTable columns={MEMBER_COLUMNS} caption="Organization members" minWidth={420}>
          {visibleMembers.map((member) => {
            const name = member.fullName || member.email;
            const reason = lockedReason(member);
            const manageable = canManage(member);
            const memberHref = href(`members/${member.userId}`);
            return (
              <SheetRow key={member.id} onActivate={() => navigate(memberHref)}>
                <SheetCell>
                  <RowTitle
                    title={member.fullName || "Unnamed member"}
                    to={memberHref}
                    subtitle={member.email}
                    leading={<MemberAvatar name={name} />}
                  />
                </SheetCell>
                <SheetCell>
                  <Pill>{member.role}</Pill>
                </SheetCell>
                <SheetCell className={HIDE_BELOW_SM}>
                  {member.mfaEnabled ? (
                    <Pill tone="green" dot>
                      Enabled
                    </Pill>
                  ) : (
                    <Pill tone="amber" dot>
                      Missing
                    </Pill>
                  )}
                </SheetCell>
                <SheetCell className={HIDE_BELOW_MD}>
                  {member.lastActiveAt ? (
                    <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                      <Timestamp value={member.lastActiveAt} />
                    </span>
                  ) : (
                    <span className="text-[12px] text-[var(--text3)]">No activity</span>
                  )}
                </SheetCell>
                <SheetCell>
                  <Pill tone={MEMBER_STATUS_TONE[member.status] ?? "neutral"} dot={member.status === "active"}>
                    {member.status}
                  </Pill>
                </SheetCell>
                <SheetCell align="right">
                  <RowActions label={`Actions for ${name}`}>
                    <DropdownMenuItem onSelect={() => navigate(memberHref)}>Open member</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[12px] font-normal text-[var(--text3)]">
                      Change role
                      {reason && <span className="mt-0.5 block text-[11.5px] leading-snug">{reason}</span>}
                    </DropdownMenuLabel>
                    {roleOptions.map((role) => (
                      <DropdownMenuItem
                        key={role}
                        disabled={!manageable || role === member.role || updateRole.isPending}
                        onSelect={() => updateRole.mutate({ userId: member.userId, role })}
                      >
                        {capitalize(role)}
                        {role === member.role && (
                          <span className="ml-auto text-[11.5px] text-[var(--text3)]">Current</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={!manageable || removeMember.isPending}
                      onSelect={() => setRemoveTarget(member)}
                    >
                      Remove member
                    </DropdownMenuItem>
                  </RowActions>
                </SheetCell>
              </SheetRow>
            );
          })}
        </SheetTable>
      )}
    </Sheet>
  );

  // ── Invitations view ──

  const invitationsSheet = (
    <Sheet
      label="Pending invitations"
      toolbar={
        <>
          <SearchField value={search} onChange={setSearch} placeholder="Search email" label="Search invitations" />
          {roleFilterSelect}
          <ToolbarCount>
            {inviteFiltersActive
              ? `${formatNumber(visibleInvites.length)} of ${formatNumber(pendingInvites.length)}`
              : `${countLabel(pendingInvites.length, invitesMore)} pending`}
          </ToolbarCount>
        </>
      }
      footer={
        pendingInvites.length > 0 ? (
          <span>Resend delivers a fresh email. Revoke cancels the invitation link.</span>
        ) : undefined
      }
    >
      {invitationsLoading ? (
        <SheetLoading rows={3} label="Loading invitations" />
      ) : invitationsFailed ? (
        <SheetError
          title="Could not load invitations"
          message={apiErrorMessage(invitationsError, "The invitations request failed. Try again in a moment.")}
          onRetry={() => void refetchInvitations()}
        />
      ) : pendingInvites.length === 0 ? (
        <SheetEmpty
          title="No pending invitations"
          description="Everyone who was invited has either joined or had their invitation revoked. New invitations wait here until they are accepted."
          action={
            <UiButton size="lg" onClick={openInvite}>
              Invite member
            </UiButton>
          }
        />
      ) : visibleInvites.length === 0 ? (
        <SheetEmpty
          title="No invitations match these filters"
          description="No pending invitation matches the current search and role filter."
          action={
            <UiButton variant="outline" size="lg" onClick={clearFilters}>
              Clear filters
            </UiButton>
          }
        />
      ) : (
        <SheetTable columns={INVITATION_COLUMNS} caption="Pending invitations" minWidth={480}>
          {visibleInvites.map((invite) => {
            const expired = isExpired(invite);
            const inviter = invite.invitedBy?.name || invite.invitedBy?.email;
            return (
              <SheetRow key={invite.id}>
                <SheetCell>
                  <RowTitle
                    title={invite.email}
                    subtitle={inviter ? `Invited by ${inviter}` : "Inviter not recorded"}
                  />
                </SheetCell>
                <SheetCell>
                  <Pill>{invite.role}</Pill>
                </SheetCell>
                <SheetCell>
                  <Pill tone={expired ? "red" : "amber"}>{expired ? "Expired" : "Pending"}</Pill>
                </SheetCell>
                <SheetCell className={HIDE_BELOW_MD}>
                  <span className="flex flex-col">
                    <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                      <Timestamp value={invite.invitedAt} />
                    </span>
                    <span className="text-[11.5px] tabular-nums text-[var(--text3)]">
                      {expired ? "Link no longer works" : `Expires in ${daysUntil(invite.expiresAt)} days`}
                    </span>
                  </span>
                </SheetCell>
                <SheetCell align="right">
                  <div className="flex items-center justify-end gap-1.5">
                    <UiButton
                      variant="outline"
                      size="sm"
                      disabled={resendInvitation.isPending}
                      onClick={() => resendInvitation.mutate(invite.id)}
                    >
                      Resend
                      <span className="sr-only"> invitation to {invite.email}</span>
                    </UiButton>
                    <RowActions label={`Actions for ${invite.email}`}>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={revokeInvitation.isPending}
                        onSelect={() => setRevokeTarget(invite)}
                      >
                        Revoke invitation
                      </DropdownMenuItem>
                    </RowActions>
                  </div>
                </SheetCell>
              </SheetRow>
            );
          })}
        </SheetTable>
      )}
    </Sheet>
  );

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Team"
        description="Members with access to this organization, plus invitations that have not been accepted yet."
        meta={[
          membersLoading
            ? null
            : { label: "MFA enabled", value: `${formatNumber(mfaCount)} of ${formatNumber(members.length)}`, mono: true },
          me?.role ? { label: "Your role", value: <span className="first-letter:uppercase">{me.role}</span> } : null,
        ]}
        actions={
          <UiButton size="lg" onClick={openInvite}>
            Invite member
          </UiButton>
        }
      />

      <Readouts cells={readouts} loading={membersLoading} label="Team summary" />

      <div className="flex min-w-0 flex-col gap-4">
        <PageTabs tabs={tabs} value={tab} onChange={setTab} label="Team view" idBase={TAB_ID} />
        <div {...pageTabPanelProps(TAB_ID, tab)} className="min-w-0">
          {tab === "members" ? membersSheet : invitationsSheet}
        </div>
      </div>

      <FormDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Invite member"
        description="Invitations expire automatically. Roles can be changed after the member joins."
        submitLabel="Send invitation"
        pending={invitePending}
        onSubmit={(form) => startTransition(() => inviteAction(form))}
      >
        <DialogField label="Email" name="invite-email" required>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="teammate@company.com"
            className={fieldInputClass}
          />
        </DialogField>
        <DialogField label="Role" name="invite-role">
          <select id="invite-role" name="role" className={fieldInputClass} defaultValue="member">
            {INVITE_ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {capitalize(role)}
              </option>
            ))}
          </select>
        </DialogField>
      </FormDialog>

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title="Remove member"
        description="The member loses access to every project and resource in this organization immediately."
        confirmLabel="Remove member"
        pending={removeMember.isPending}
        onConfirm={() => {
          if (removeTarget) removeMember.mutate(removeTarget.userId);
        }}
      >
        <p className="text-[13px] text-[var(--text2)]">
          {removeTarget?.fullName || removeTarget?.email}{" "}
          <span className="text-[12px] text-[var(--text3)]">{removeTarget?.email}</span>
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title="Revoke invitation"
        description="The invitation link stops working right away. You can invite the same address again later."
        confirmLabel="Revoke invitation"
        pending={revokeInvitation.isPending}
        onConfirm={() => {
          if (revokeTarget) revokeInvitation.mutate(revokeTarget.id);
        }}
      >
        <p className="text-[13px] text-[var(--text)]">{revokeTarget?.email}</p>
      </ConfirmDialog>
    </WorkspacePage>
  );
}
