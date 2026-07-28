import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, MoreHorizontal, ShieldCheck, UserMinus, UserPlus, Users } from "lucide-react";
import { useMemberMutations, useProjectMembers } from "@/modules/projects/hooks/useMembers";
import { PROJECT_MEMBER_ROLES, type ProjectMember, type ProjectMemberRole } from "@/modules/projects/api/types";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys } from "@/modules/organizations/hooks/useOrganizations";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useCurrentProject } from "./ProjectShellPage";
import { IconChip, Notice, Panel, Pill, SectionHeading, StatCard, Toolbar, fieldInputClass, type SurfaceTone } from "@/shared/ui/pulse";
import { FilterSelect } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog, DialogField, FormDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md §1.2) ───────────────────

const ROLE_TONE: Record<ProjectMemberRole, SurfaceTone> = {
  owner: "violet",
  admin: "brand",
  developer: "blue",
  qa: "amber",
  viewer: "neutral",
};

const ROLE_DESCRIPTION: Record<ProjectMemberRole, string> = {
  owner: "Full control including deletion and ownership transfer.",
  admin: "Manage settings, keys, members, and alerting.",
  developer: "Manage keys and alerting; read all telemetry.",
  qa: "Read telemetry and acknowledge alerts.",
  viewer: "Read-only access to telemetry and dashboards.",
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "inactive", label: "Inactive" },
  { value: "removed", label: "Removed" },
];

const ROLE_FILTER_OPTIONS = [
  { value: "", label: "All roles" },
  ...PROJECT_MEMBER_ROLES.map((role) => ({ value: role, label: role })),
];

const AVATAR_COLORS = [
  "bg-[var(--brand)]",
  "bg-[var(--violet)]",
  "bg-[var(--blue)]",
  "bg-[var(--green)]",
  "bg-[var(--amber)]",
  "bg-[var(--red)]",
];

function memberLabel(member: ProjectMember) {
  return member.user?.fullName || member.user?.email || member.userId;
}

function memberInitials(member: ProjectMember): string {
  const name = member.user?.fullName || member.user?.email || "";
  if (!name) return "?";
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectMembersPage() {
  const { projectId, project } = useCurrentProject();
  const activeOrgId = useOrgStore((state) => state.activeOrgId);

  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const { data, isLoading, error } = useProjectMembers(projectId, {
    ...(status ? { status: status as ProjectMember["status"] } : {}),
    ...(role ? { role: role as ProjectMemberRole } : {}),
  });
  const members = data?.data ?? [];

  const { addMember, updateMemberRole, removeMember, transferOwnership } = useMemberMutations(projectId);

  const { data: orgMembers } = useQuery({
    queryKey: [...orgQueryKeys.members(activeOrgId ?? ""), "project-add-candidates"],
    queryFn: () => orgApi.listMembers(activeOrgId!, { limit: 100, status: "active" }),
    enabled: !!activeOrgId,
  });

  const [adding, setAdding] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [removingMember, setRemovingMember] = useState<ProjectMember | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const asMessage = apiErrorMessage;

  const alreadyMember = new Set(members.map((member) => member.userId));
  const candidates = (orgMembers?.data ?? []).filter((orgMember) => !alreadyMember.has(orgMember.userId));

  const owners = members.filter((member) => member.role === "owner");
  const activeMembers = members.filter((member) => member.status === "active");

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Project members"
        description="Members are added directly from the organization roster and gain access immediately."
        actions={
          <div className="flex items-center gap-2">
            <UiButton variant="outline" size="lg" onClick={() => setTransferring(true)}>
              <Crown className="mr-1.5 size-4" /> Transfer ownership
            </UiButton>
            <UiButton size="lg" onClick={() => setAdding(true)}>
              <UserPlus className="mr-1.5 size-4" /> Add member
            </UiButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Members" value={data?.total ?? members.length} icon={Users} tone="brand" />
        <StatCard label="Active" value={activeMembers.length} icon={ShieldCheck} tone="green" />
        <StatCard label="Owners" value={owners.length} icon={Crown} tone="violet" />
        <StatCard
          label="Admins"
          value={members.filter((member) => member.role === "admin").length}
          icon={ShieldCheck}
          tone="blue"
        />
      </div>

      <Toolbar>
        <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_FILTER_OPTIONS} />
        <FilterSelect label="Role" value={role} onChange={setRole} options={ROLE_FILTER_OPTIONS} />
      </Toolbar>

      {/* Member cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="h-28 animate-pulse rounded-2xl bg-[var(--bg2)]" />
          ))}
        </div>
      ) : error ? (
        <Notice tone="red">{asMessage(error)}</Notice>
      ) : members.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <IconChip icon={Users} size="lg" tone="brand" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">No members match these filters</p>
            <UiButton size="lg" onClick={() => setAdding(true)}>
              <UserPlus className="mr-1.5 size-4" /> Add member
            </UiButton>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg1)]/70 p-4 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--brand)]/5"
            >
              {/* Avatar monogram */}
              <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white shadow-inner", avatarColor(member.userId))}>
                {memberInitials(member)}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] font-semibold text-[var(--text)]">{memberLabel(member)}</p>
                  {member.role === "owner" && <Crown className="size-3.5 shrink-0 text-[var(--violet)]" />}
                </div>
                {member.user?.email && (
                  <p className="mt-0.5 truncate text-[11px] text-[var(--text3)]">{member.user.email}</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Pill tone={ROLE_TONE[member.role]}>{member.role}</Pill>
                  <Pill tone={member.status === "active" ? "green" : member.status === "pending" ? "amber" : "neutral"} dot>
                    {member.status}
                  </Pill>
                </div>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <UiButton variant="ghost" size="icon-sm" aria-label={`Actions for ${memberLabel(member)}`} className="opacity-0 transition-opacity group-hover:opacity-100">
                    <MoreHorizontal className="size-4" />
                  </UiButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {PROJECT_MEMBER_ROLES.filter((candidate) => candidate !== member.role).map((candidate) => (
                    <DropdownMenuItem
                      key={candidate}
                      onClick={() => updateMemberRole.mutate({ memberId: member.id, role: candidate })}
                    >
                      <ShieldCheck className="mr-2 size-4" /> Set role: {candidate}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setRemovingMember(member)}>
                    <UserMinus className="mr-2 size-4 text-[var(--red)]" /> Remove from project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Role reference */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg1)]/70 backdrop-blur-sm">
        <div className="border-b border-[var(--border)] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-4 text-[var(--text2)]" />
            <h3 className="text-[13px] font-semibold text-[var(--text)]">Role reference</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-5">
          {PROJECT_MEMBER_ROLES.map((projectRole) => (
            <div key={projectRole} className="flex flex-col gap-2 bg-[var(--bg1)] px-4 py-3.5">
              <Pill tone={ROLE_TONE[projectRole]}>{projectRole}</Pill>
              <p className="text-[11.5px] leading-relaxed text-[var(--text3)]">{ROLE_DESCRIPTION[projectRole]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── add member ── */}
      <FormDialog
        open={adding}
        onOpenChange={(open) => {
          setAdding(open);
          if (!open) setFormError(null);
        }}
        title="Add project member"
        description={`Grant an existing member of this organization immediate access to ${project.name}. No invitation is sent.`}
        submitLabel="Add member"
        pending={addMember.isPending}
        error={formError}
        onSubmit={(form) => {
          const userId = String(form.get("userId") ?? "");
          if (!userId) {
            setFormError("Select an organization member.");
            return;
          }
          addMember.mutate(
            { userId, role: String(form.get("role") ?? "viewer") as ProjectMemberRole },
            {
              onSuccess: () => setAdding(false),
              onError: (mutationError) => setFormError(asMessage(mutationError)),
            },
          );
        }}
      >
        {candidates.length === 0 ? (
          <Notice tone="amber" icon={UserPlus} title="No eligible organization members">
            Every active organization member already belongs to this project. Invite people to the organization first,
            then add them here.
          </Notice>
        ) : (
          <DialogField label="Organization member" name="userId" required>
            <select id="userId" name="userId" required className={fieldInputClass}>
              <option value="">Select a member...</option>
              {candidates.map((candidate) => (
                <option key={candidate.userId} value={candidate.userId}>
                  {candidate.fullName || candidate.email} · {candidate.role}
                </option>
              ))}
            </select>
          </DialogField>
        )}
        <DialogField label="Project role" name="role">
          <select id="role" name="role" defaultValue="viewer" className={fieldInputClass}>
            {PROJECT_MEMBER_ROLES.map((projectRole) => (
              <option key={projectRole} value={projectRole}>
                {projectRole}
              </option>
            ))}
          </select>
        </DialogField>
      </FormDialog>

      {/* ── transfer ownership ── */}
      <FormDialog
        open={transferring}
        onOpenChange={(open) => {
          setTransferring(open);
          if (!open) setFormError(null);
        }}
        title="Transfer project ownership"
        description="The new owner gains full control. Your role is downgraded to admin."
        submitLabel="Transfer ownership"
        pending={transferOwnership.isPending}
        error={formError}
        onSubmit={(form) => {
          const userId = String(form.get("newOwnerUserId") ?? "");
          if (!userId) {
            setFormError("Select the new owner.");
            return;
          }
          transferOwnership.mutate(userId, {
            onSuccess: () => setTransferring(false),
            onError: (mutationError) => setFormError(asMessage(mutationError)),
          });
        }}
      >
        <Notice tone="amber" icon={Crown}>
          Ownership transfer takes effect immediately and is recorded in the organization audit log.
        </Notice>
        <DialogField label="New owner" name="newOwnerUserId" required hint="Must already be a project member.">
          <select id="newOwnerUserId" name="newOwnerUserId" required className={fieldInputClass}>
            <option value="">Select a project member...</option>
            {members
              .filter((member) => member.role !== "owner" && member.status === "active")
              .map((member) => (
                <option key={member.userId} value={member.userId}>
                  {memberLabel(member)} · {member.role}
                </option>
              ))}
          </select>
        </DialogField>
      </FormDialog>

      {/* ── remove ── */}
      <ConfirmDialog
        open={!!removingMember}
        onOpenChange={(open) => !open && setRemovingMember(null)}
        title={`Remove ${removingMember ? memberLabel(removingMember) : "member"}?`}
        description="They lose access to this project immediately. Organization membership is unaffected."
        confirmLabel="Remove member"
        pending={removeMember.isPending}
        onConfirm={() => {
          if (!removingMember) return;
          removeMember.mutate(removingMember.id, { onSuccess: () => setRemovingMember(null) });
        }}
      />
    </div>
  );
}
