import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, UserPlus } from "lucide-react";

import { useMemberMutations, useProjectMembers } from "@/modules/projects/hooks/useMembers";
import {
  PROJECT_MEMBER_ROLES,
  type ProjectMember,
  type ProjectMemberRole,
  type ProjectMemberStatus,
} from "@/modules/projects/api/types";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys } from "@/modules/organizations/hooks/useOrganizations";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { ConfirmDialog, DialogField, FormDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_MD,
  ProjectPageHeader,
  Readouts,
  RowActions,
  RowTitle,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  ToolbarCount,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Notice, Panel, Pill, fieldInputClass, type SurfaceTone } from "@/shared/ui/pulse";
import { FilterSelect, Timestamp, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useCurrentProject } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

const ROLE_LABEL: Record<ProjectMemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  developer: "Developer",
  qa: "QA",
  viewer: "Viewer",
};

const ROLE_DESCRIPTION: Record<ProjectMemberRole, string> = {
  owner: "Full control including deletion and ownership transfer.",
  admin: "Manage settings, keys, members, and alerting.",
  developer: "Manage keys and alerting; read all telemetry.",
  qa: "Read telemetry and acknowledge alerts.",
  viewer: "Read-only access to telemetry and dashboards.",
};

// Status is the only coloured reading. Roles are categories, so they stay neutral.
const STATUS_TONE: Record<ProjectMemberStatus, SurfaceTone> = {
  active: "green",
  pending: "amber",
  inactive: "neutral",
  removed: "neutral",
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
  ...PROJECT_MEMBER_ROLES.map((role) => ({ value: role, label: ROLE_LABEL[role] })),
];

// The identity column takes the free width and truncates; the rest hug their content.
const COLUMNS: SheetColumn[] = [
  { key: "member", header: "Member", className: "w-full" },
  { key: "role", header: "Role", className: "w-[120px]" },
  { key: "status", header: "Status", className: "w-[112px]" },
  { key: "joined", header: "Joined", className: `w-[120px] ${HIDE_BELOW_MD}` },
  { key: "actions", header: "Actions", srOnly: true, align: "right", className: "w-px" },
];

function memberLabel(member: ProjectMember) {
  return member.user?.fullName || member.user?.email || member.userId;
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectMembersPage() {
  const { projectId, project } = useCurrentProject();
  const activeOrgId = useOrgStore((state) => state.activeOrgId);

  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const { data, isLoading, error, refetch } = useProjectMembers(projectId, {
    ...(status ? { status: status as ProjectMemberStatus } : {}),
    ...(role ? { role: role as ProjectMemberRole } : {}),
  });
  const members = data?.data ?? [];

  // The table is filtered through the API, so the readings come from the whole
  // roster. Without filters this is the same query and cache entry as the table.
  const { data: roster, isLoading: rosterLoading } = useProjectMembers(projectId);
  const everyone = roster?.data ?? [];

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

  const owners = everyone.filter((member) => member.role === "owner");
  const ownerNames = owners.map(memberLabel).join(", ");
  const readouts: Readout[] = [
    {
      label: "Members",
      value: formatNumber(roster?.total ?? everyone.length),
      sub: `${formatNumber(everyone.filter((member) => member.status === "active").length)} active`,
    },
    {
      label: "Owners",
      value: formatNumber(owners.length),
      sub: ownerNames || "No owner assigned",
      title: ownerNames || undefined,
    },
    {
      label: "Admins",
      value: formatNumber(everyone.filter((member) => member.role === "admin").length),
      sub: "Manage settings, keys, and members",
    },
    {
      label: "Pending",
      value: formatNumber(everyone.filter((member) => member.status === "pending").length),
      sub: "Added but not active yet",
    },
  ];

  const filtered = Boolean(status || role);
  const clearFilters = () => {
    setStatus("");
    setRole("");
  };

  const addAction = (
    <UiButton size="lg" onClick={() => setAdding(true)}>
      <UserPlus className="size-4" aria-hidden="true" /> Add member
    </UiButton>
  );

  let body: ReactNode;
  if (isLoading) {
    body = <SheetLoading rows={4} label="Loading members" />;
  } else if (error) {
    body = <SheetError title="Could not load members" message={asMessage(error)} onRetry={() => void refetch()} />;
  } else if (members.length === 0) {
    body = filtered ? (
      <SheetEmpty
        title="No members match"
        description="Nobody in this project has that combination of status and role."
        action={
          <UiButton variant="outline" size="lg" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    ) : (
      <SheetEmpty
        title="No members yet"
        description="Add people from the organization roster. They get access to this project as soon as you add them."
        action={addAction}
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Project members" minWidth={520}>
        {members.map((member) => {
          const label = memberLabel(member);
          return (
            <SheetRow key={member.id} muted={member.status === "removed" || member.status === "inactive"}>
              <SheetCell className="w-full max-w-0">
                <RowTitle
                  title={label}
                  subtitle={member.user?.fullName && member.user.email ? member.user.email : undefined}
                />
              </SheetCell>
              <SheetCell>
                <Pill>{ROLE_LABEL[member.role]}</Pill>
              </SheetCell>
              <SheetCell>
                <Pill tone={STATUS_TONE[member.status]} dot>
                  {member.status}
                </Pill>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                <Timestamp value={member.joinedAt ?? member.createdAt} />
              </SheetCell>
              <SheetCell align="right">
                <RowActions label={`Actions for ${label}`}>
                  <DropdownMenuLabel className="text-[12px] font-normal text-[var(--text3)]">Change role</DropdownMenuLabel>
                  {PROJECT_MEMBER_ROLES.filter((candidate) => candidate !== member.role).map((candidate) => (
                    <DropdownMenuItem
                      key={candidate}
                      onSelect={() => updateMemberRole.mutate({ memberId: member.id, role: candidate })}
                    >
                      {ROLE_LABEL[candidate]}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setRemovingMember(member)}>
                    Remove from project
                  </DropdownMenuItem>
                </RowActions>
              </SheetCell>
            </SheetRow>
          );
        })}
      </SheetTable>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Members"
        description="Members come from the organization roster and get access as soon as they're added. A person must belong to the organization before they can join a project."
        actions={
          <>
            <UiButton variant="outline" size="lg" onClick={() => setTransferring(true)}>
              <Crown className="size-4" aria-hidden="true" /> Transfer ownership
            </UiButton>
            {addAction}
          </>
        }
      />

      <Readouts cells={readouts} loading={rosterLoading} label="Members summary" />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Sheet
          label="Member list"
          toolbar={
            <>
              <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_FILTER_OPTIONS} />
              <FilterSelect label="Role" value={role} onChange={setRole} options={ROLE_FILTER_OPTIONS} />
              {!isLoading && !error && (
                <ToolbarCount>
                  {formatNumber(data?.total ?? members.length)} {(data?.total ?? members.length) === 1 ? "member" : "members"}
                </ToolbarCount>
              )}
            </>
          }
        >
          {body}
        </Sheet>

        <Panel title="Roles" description="What each project role can do.">
          <dl className="divide-y divide-[var(--border)]">
            {PROJECT_MEMBER_ROLES.map((projectRole) => (
              <div key={projectRole} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <dt className="text-[13px] font-medium text-[var(--text)]">{ROLE_LABEL[projectRole]}</dt>
                <dd className="text-[12px] leading-[1.55] text-[var(--text2)]">{ROLE_DESCRIPTION[projectRole]}</dd>
              </div>
            ))}
          </dl>
        </Panel>
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
              <option value="">Select a member…</option>
              {candidates.map((candidate) => (
                <option key={candidate.userId} value={candidate.userId}>
                  {candidate.fullName || candidate.email} · {candidate.role}
                </option>
              ))}
            </select>
          </DialogField>
        )}
        <DialogField label="Project role" name="role" hint={ROLE_DESCRIPTION.viewer}>
          <select id="role" name="role" defaultValue="viewer" className={fieldInputClass}>
            {PROJECT_MEMBER_ROLES.map((projectRole) => (
              <option key={projectRole} value={projectRole}>
                {ROLE_LABEL[projectRole]}
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
        <DialogField label="New owner" name="newOwnerUserId" required hint="Must already be an active project member.">
          <select id="newOwnerUserId" name="newOwnerUserId" required className={fieldInputClass}>
            <option value="">Select a project member…</option>
            {members
              .filter((member) => member.role !== "owner" && member.status === "active")
              .map((member) => (
                <option key={member.userId} value={member.userId}>
                  {memberLabel(member)} · {ROLE_LABEL[member.role]}
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
    </WorkspacePage>
  );
}
