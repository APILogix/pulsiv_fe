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
import { FilterSelect, Table, Td, Timestamp, Tr } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog, DialogField, FormDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";

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

const MEMBER_TABLE_HEADERS = ["Member", "Role", "Status", "Added", ""];

function memberLabel(member: ProjectMember) {
  return member.user?.fullName || member.user?.email || member.userId;
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

  // Project members are drawn from the organization roster.
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
        description="Project roles layer on top of organization membership. A user must belong to the organization before joining a project."
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

      <Panel bodyClassName="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-10 animate-pulse rounded-[8px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : error ? (
          <div className="p-5">
            <Notice tone="red">{asMessage(error)}</Notice>
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <IconChip icon={Users} size="lg" tone="brand" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">No members match these filters</p>
            <UiButton size="lg" onClick={() => setAdding(true)}>
              <UserPlus className="mr-1.5 size-4" /> Add member
            </UiButton>
          </div>
        ) : (
          <Table headers={MEMBER_TABLE_HEADERS} maxHeight="32rem">
            {members.map((member) => (
              <Tr key={member.id}>
                <Td>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-medium text-[var(--text)]">{memberLabel(member)}</span>
                    {member.user?.email && (
                      <span className="truncate text-[11.5px] text-[var(--text3)]">{member.user.email}</span>
                    )}
                  </div>
                </Td>
                <Td>
                  <Pill tone={ROLE_TONE[member.role]}>{member.role}</Pill>
                </Td>
                <Td>
                  <Pill tone={member.status === "active" ? "green" : member.status === "pending" ? "amber" : "neutral"} dot>
                    {member.status}
                  </Pill>
                </Td>
                <Td>
                  <Timestamp value={member.addedAt} />
                </Td>
                <Td className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <UiButton variant="ghost" size="icon-sm" aria-label={`Actions for ${memberLabel(member)}`}>
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
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Panel>

      <Panel title="Role reference" description="What each project role can do." icon={ShieldCheck}>
        <ul className="flex flex-col divide-y divide-[var(--border)]">
          {PROJECT_MEMBER_ROLES.map((projectRole) => (
            <li key={projectRole} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
              <Pill tone={ROLE_TONE[projectRole]} className="mt-0.5 shrink-0">
                {projectRole}
              </Pill>
              <p className="text-[12.5px] leading-relaxed text-[var(--text2)]">{ROLE_DESCRIPTION[projectRole]}</p>
            </li>
          ))}
        </ul>
      </Panel>

      {/* ── add member ── */}
      <FormDialog
        open={adding}
        onOpenChange={(open) => {
          setAdding(open);
          if (!open) setFormError(null);
        }}
        title="Add project member"
        description={`Grant an existing member of this organization access to ${project.name}.`}
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
            Every active organization member already belongs to this project. Invite someone new from the Invitations
            tab.
          </Notice>
        ) : (
          <DialogField label="Organization member" name="userId" required>
            <select id="userId" name="userId" required className={fieldInputClass}>
              <option value="">Select a member…</option>
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
            <option value="">Select a project member…</option>
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
