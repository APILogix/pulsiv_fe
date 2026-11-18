import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, Copy } from "lucide-react";
import type { Member } from "@/modules/organizations/types/org.types";

import { useMemberMutations, useProjectMembers } from "@/modules/projects/hooks/useMembers";
import type {
  ProjectMember,
  ProjectMemberStatus,
} from "@/modules/projects/api/types";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys } from "@/modules/organizations/hooks/useOrganizations";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { ConfirmDialog, DialogField, FormDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_MD,
  HIDE_BELOW_SM,
  ProjectPageHeader,
  Readouts,
  RowActions,
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
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Notice, Pill, fieldInputClass, type SurfaceTone } from "@/shared/ui/pulse";
import { FilterSelect, formatDate, formatNumber, formatRelativeTime } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useCurrentProject } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

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

// Impeccable balanced horizontal layout: Member identity, adjacent email, role, status, and formatted joined date.
const COLUMNS: SheetColumn[] = [
  { key: "member", header: "Member", className: "w-[24%] min-w-[200px]" },
  { key: "email", header: "Email", className: `w-[28%] min-w-[220px] ${HIDE_BELOW_SM}` },
  { key: "role", header: "Role", className: `w-[14%] min-w-[120px] ${HIDE_BELOW_SM}` },
  { key: "status", header: "Status", className: "w-[14%] min-w-[110px]" },
  { key: "joined", header: "Date joined", className: `w-[16%] min-w-[140px] ${HIDE_BELOW_MD}` },
  { key: "actions", header: "Actions", srOnly: true, align: "right", className: "w-[56px]" },
];

function memberLabel(member: ProjectMember) {
  return member.user?.fullName || member.user?.email || member.userId;
}

function memberInitials(member: ProjectMember) {
  const name = member.user?.fullName?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const email = member.user?.email || member.userId;
  return email.slice(0, 2).toUpperCase();
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectMembersPage() {
  const { projectId, project } = useCurrentProject();
  const activeOrgId = useOrgStore((state) => state.activeOrgId);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading, error, refetch } = useProjectMembers(projectId, {
    ...(status ? { status: status as ProjectMemberStatus } : {}),
    ...(search ? { search } : {}),
  });
  const members = data?.data ?? [];

  // Overall roster for header counters.
  const { data: roster, isLoading: rosterLoading } = useProjectMembers(projectId);
  const everyone = roster?.data ?? [];

  const { addMember, removeMember } = useMemberMutations(projectId);

  // Candidates drawn directly from active organization roster.
  const { data: orgMembers } = useQuery({
    queryKey: [...orgQueryKeys.members(activeOrgId ?? ""), "project-add-candidates"],
    queryFn: () => orgApi.listMembers(activeOrgId!, { limit: 100, status: "active" }),
    enabled: !!activeOrgId,
  });

  const orgMemberMap = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of orgMembers?.data ?? []) {
      map.set(m.userId, m);
    }
    return map;
  }, [orgMembers]);

  const [adding, setAdding] = useState(false);
  const [removingMember, setRemovingMember] = useState<ProjectMember | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const asMessage = apiErrorMessage;

  const alreadyMember = new Set(members.map((member) => member.userId));
  const candidates = (orgMembers?.data ?? []).filter((orgMember) => !alreadyMember.has(orgMember.userId));

  // Client-side instant filter to keep UI responsive while typing.
  const queryLower = search.trim().toLowerCase();
  const displayedMembers = queryLower
    ? members.filter(
        (member) =>
          memberLabel(member).toLowerCase().includes(queryLower) ||
          member.user?.email?.toLowerCase().includes(queryLower) ||
          member.userId.toLowerCase().includes(queryLower),
      )
    : members;

  const readouts: Readout[] = [
    {
      label: "Total members",
      value: formatNumber(roster?.total ?? everyone.length),
      sub: "Enrolled in project",
    },
    {
      label: "Active",
      value: formatNumber(everyone.filter((member) => member.status === "active").length),
      sub: "Workspace access granted",
    },
    {
      label: "Pending",
      value: formatNumber(everyone.filter((member) => member.status === "pending").length),
      sub: "Awaiting activation",
    },
    {
      label: "Eligible org members",
      value: formatNumber(candidates.length),
      sub: "Available to add",
    },
  ];

  const filtered = Boolean(status || search);
  const clearFilters = () => {
    setStatus("");
    setSearch("");
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
  } else if (displayedMembers.length === 0) {
    body = filtered ? (
      <SheetEmpty
        title="No members match"
        description="Nobody in this project matches your search and filter criteria."
        action={
          <UiButton variant="outline" size="lg" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    ) : (
      <SheetEmpty
        title="No members yet"
        description="Add people from the organization roster. They get immediate access to this project."
        action={addAction}
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Project members" minWidth={760}>
        {displayedMembers.map((member) => {
          const label = memberLabel(member);
          const email = member.user?.email;
          const joinedDate = member.joinedAt ?? member.createdAt;
          const initials = memberInitials(member);
          const orgRole = (member as any).role || orgMemberMap.get(member.userId)?.role || "member";

          return (
            <SheetRow key={member.id} muted={member.status === "removed" || member.status === "inactive"}>
              {/* Member identity with avatar initials */}
              <SheetCell className="w-[24%] min-w-[200px]">
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="flex size-8 shrink-0 select-none items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg2)] text-[11.5px] font-semibold tracking-wide text-[var(--text2)] ring-1 ring-inset ring-[var(--border)]"
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[var(--text)]">
                      {label}
                    </p>
                    {email && (
                      <p className="truncate font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)] sm:hidden">
                        {email}
                      </p>
                    )}
                  </div>
                </div>
              </SheetCell>

              {/* Direct email column */}
              <SheetCell className={`w-[28%] min-w-[220px] ${HIDE_BELOW_SM}`}>
                {email ? (
                  <div className="group/email flex items-center gap-1.5 min-w-0">
                    <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)] select-all">
                      {email}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void navigator.clipboard.writeText(email);
                        toast.success("Email copied to clipboard");
                      }}
                      title="Copy email"
                      aria-label={`Copy email for ${label}`}
                      className="opacity-0 group-hover/email:opacity-100 transition-opacity p-0.5 rounded text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg2)] shrink-0"
                    >
                      <Copy className="size-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[12px] text-[var(--text3)]">—</span>
                )}
              </SheetCell>

              {/* Role pill */}
              <SheetCell className={`w-[14%] min-w-[120px] ${HIDE_BELOW_SM}`}>
                <Pill>{orgRole.charAt(0).toUpperCase() + orgRole.slice(1)}</Pill>
              </SheetCell>

              {/* Status pill */}
              <SheetCell className="w-[14%] min-w-[110px]">
                <Pill tone={STATUS_TONE[member.status]} dot>
                  {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                </Pill>
              </SheetCell>

              {/* Formatted Date joined */}
              <SheetCell className={`w-[16%] min-w-[140px] ${HIDE_BELOW_MD}`}>
                <div className="flex flex-col">
                  <span className="text-[12.5px] font-medium tabular-nums text-[var(--text)]">
                    {formatDate(joinedDate)}
                  </span>
                  <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                    {formatRelativeTime(joinedDate)}
                  </span>
                </div>
              </SheetCell>

              {/* Action menu */}
              <SheetCell align="right" className="w-[56px]">
                <RowActions label={`Actions for ${label}`}>
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
        actions={addAction}
      />

      <Readouts cells={readouts} loading={rosterLoading} label="Members summary" />

      {/* Full-width horizontal data table sheet — no cramping side blocks */}
      <Sheet
        label="Member list"
        toolbar={
          <>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search members by name or email…"
              className="max-w-[320px]"
            />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_FILTER_OPTIONS} />
            {!isLoading && !error && (
              <ToolbarCount>
                {formatNumber(displayedMembers.length)} {displayedMembers.length === 1 ? "member" : "members"}
              </ToolbarCount>
            )}
          </>
        }
      >
        {body}
      </Sheet>

      {/* ── add member dialog ── */}
      <FormDialog
        open={adding}
        onOpenChange={(open) => {
          setAdding(open);
          if (!open) setFormError(null);
        }}
        title="Add project member"
        description={`Grant an active member of this organization access to ${project.name}.`}
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
            { userId },
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
          <DialogField
            label="Organization member"
            name="userId"
            required
            hint="Selected member will receive immediate access to this project workspace."
          >
            <select id="userId" name="userId" required className={fieldInputClass}>
              <option value="">Select a member…</option>
              {candidates.map((candidate) => (
                <option key={candidate.userId} value={candidate.userId}>
                  {candidate.fullName ? `${candidate.fullName} (${candidate.email})` : candidate.email}
                </option>
              ))}
            </select>
          </DialogField>
        )}
      </FormDialog>

      {/* ── remove member dialog ── */}
      <ConfirmDialog
        open={!!removingMember}
        onOpenChange={(open) => !open && setRemovingMember(null)}
        title={`Remove ${removingMember ? memberLabel(removingMember) : "member"}?`}
        description="They will lose access to this project immediately. Their organization membership is unaffected."
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
