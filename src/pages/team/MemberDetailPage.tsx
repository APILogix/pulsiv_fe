import { useActionState, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button as UiButton } from "@/components/ui/button";
import { orgApi } from "@/modules/organizations/api/org.api";
import { useAdminHref } from "@/modules/organizations/components/org-page";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { MemberStatus, OrgRole } from "@/modules/organizations/types/org.types";
import {
  ProjectPageHeader,
  SETTINGS_COLUMN,
  Sheet,
  SheetEmpty,
  SheetError,
  SheetLoading,
  WorkspacePage,
} from "@/modules/projects/components/project-page";
import { ConfirmDialog, DialogField, apiErrorMessage } from "@/modules/projects/components/project-ui";
import { Timestamp } from "@/shared/observe";
import { Panel, Pill, Row, RowStack, SettingRow, fieldInputClass, type SurfaceTone } from "@/shared/ui/pulse";

// ── Vocabulary ───────────────────────────────────────────────

type ConfirmKind = "remove" | "suspend" | "reactivate";

type RoleState = { ok: boolean; error: string | null };

const ROLE_OPTIONS: OrgRole[] = ["viewer", "member", "developer", "billing", "security", "admin", "owner"];

const ROLE_SCOPES: Record<string, string> = {
  owner: "Full control including billing, ownership transfer, and organization deletion.",
  admin: "Manage members, security settings, domains, SSO, and SCIM.",
  security: "Review security events, audit logs, and compliance records.",
  billing: "Manage plan, invoices, and payment methods.",
  developer: "Manage projects, environments, and API keys.",
  member: "Read and contribute to projects the member is added to.",
  viewer: "Read-only access to dashboards and reports.",
};

const CONFIRM_COPY: Record<ConfirmKind, { title: string; description: string; confirm: string; destructive: boolean }> = {
  remove: {
    title: "Remove member",
    description: "The member loses access to every project and resource in this organization immediately.",
    confirm: "Remove member",
    destructive: true,
  },
  suspend: {
    title: "Suspend member",
    description: "Sessions are revoked and sign-in is blocked until the member is reactivated.",
    confirm: "Suspend member",
    destructive: true,
  },
  reactivate: {
    title: "Reactivate member",
    description: "The member regains access with their current role.",
    confirm: "Reactivate member",
    destructive: false,
  },
};

const MEMBER_STATUS_TONE: Record<MemberStatus, SurfaceTone> = {
  active: "green",
  invited: "amber",
  suspended: "red",
  locked: "red",
  removed: "neutral",
};

const PAGE_DESCRIPTION = "Role, sign-in state, and access for this membership.";

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

// ── Page ─────────────────────────────────────────────────────

export default function MemberDetailPage() {
  const { userId = "" } = useParams();
  const navigate = useNavigate();
  const href = useAdminHref();
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);

  const memberQueryKey = orgQueryKeys.detail(activeOrgId!).concat(["member", userId]);

  const { data: member, isLoading, isError, error, refetch } = useQuery({
    queryKey: memberQueryKey,
    queryFn: () => orgApi.getMember(activeOrgId!, userId),
    enabled: !!activeOrgId && !!userId,
  });

  const invalidateMember = () => {
    if (!activeOrgId) return;
    queryClient.invalidateQueries({ queryKey: orgQueryKeys.members(activeOrgId) });
    queryClient.invalidateQueries({ queryKey: memberQueryKey });
  };

  const removeMutation = useMutation({
    mutationFn: () => orgApi.removeMember(activeOrgId!, userId),
    onSuccess: () => {
      toast.success("Member removed");
      setConfirmKind(null);
      if (activeOrgId) queryClient.invalidateQueries({ queryKey: orgQueryKeys.members(activeOrgId) });
      navigate(href("team"));
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Failed to remove member")),
  });

  const suspendMutation = useMutation({
    mutationFn: () => orgApi.suspendMember(activeOrgId!, userId),
    onSuccess: () => {
      toast.success("Member suspended");
      setConfirmKind(null);
      invalidateMember();
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Failed to suspend member")),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => orgApi.reactivateMember(activeOrgId!, userId),
    onSuccess: () => {
      toast.success("Member reactivated");
      setConfirmKind(null);
      invalidateMember();
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Failed to reactivate member")),
  });

  const [roleState, saveRole, rolePending] = useActionState(
    async (_prev: RoleState, formData: FormData): Promise<RoleState> => {
      if (!activeOrgId) return { ok: false, error: "No active organization" };
      try {
        await orgApi.updateMemberRole(activeOrgId, userId, String(formData.get("role") || ""));
        invalidateMember();
        return { ok: true, error: null };
      } catch (err: unknown) {
        return { ok: false, error: apiErrorMessage(err, "Failed to update role") };
      }
    },
    { ok: false, error: null },
  );

  useEffect(() => {
    if (roleState.ok) toast.success("Member role updated");
    if (roleState.error) toast.error(roleState.error);
  }, [roleState]);

  const teamCrumb = { label: "Team", to: href("team") };

  const backToTeam = (
    <UiButton asChild variant="outline" size="lg">
      <Link to={href("team")}>Back to team</Link>
    </UiButton>
  );

  if (isLoading) {
    return (
      <WorkspacePage>
        <ProjectPageHeader crumbs={[teamCrumb, { label: "Member" }]} title="Member" description={PAGE_DESCRIPTION} />
        <Sheet label="Member record" className={SETTINGS_COLUMN}>
          <SheetLoading rows={4} label="Loading member" />
        </Sheet>
      </WorkspacePage>
    );
  }

  if (isError && !member) {
    return (
      <WorkspacePage>
        <ProjectPageHeader crumbs={[teamCrumb, { label: "Member" }]} title="Member" description={PAGE_DESCRIPTION} />
        <Sheet label="Member record" className={SETTINGS_COLUMN}>
          <SheetError
            title="Could not load this member"
            message={apiErrorMessage(error, "The member request failed. Try again, or go back to the team list.")}
            onRetry={() => void refetch()}
          />
        </Sheet>
      </WorkspacePage>
    );
  }

  if (!member) {
    return (
      <WorkspacePage>
        <ProjectPageHeader crumbs={[teamCrumb, { label: "Member" }]} title="Member not found" />
        <Sheet label="Member record" className={SETTINGS_COLUMN}>
          <SheetEmpty
            title="This member is not in the organization"
            description="They may have been removed, or the link is out of date. The team list shows everyone with access."
            action={backToTeam}
          />
        </Sheet>
      </WorkspacePage>
    );
  }

  const displayName = member.fullName || member.email || "Unknown user";
  const isOwner = member.role === "owner";
  const isSuspended = member.status === "suspended";

  const confirm = confirmKind ? CONFIRM_COPY[confirmKind] : null;
  const confirmPending =
    confirmKind === "remove"
      ? removeMutation.isPending
      : confirmKind === "suspend"
        ? suspendMutation.isPending
        : reactivateMutation.isPending;

  const runConfirm = () => {
    if (confirmKind === "remove") removeMutation.mutate();
    if (confirmKind === "suspend") suspendMutation.mutate();
    if (confirmKind === "reactivate") reactivateMutation.mutate();
  };

  return (
    <WorkspacePage>
      <ProjectPageHeader
        crumbs={[teamCrumb, { label: displayName }]}
        title={displayName}
        badges={
          <>
            <Pill>{member.role}</Pill>
            <Pill tone={MEMBER_STATUS_TONE[member.status] ?? "neutral"} dot={member.status === "active"}>
              {member.status}
            </Pill>
          </>
        }
        description={PAGE_DESCRIPTION}
        meta={[
          { label: "Email", value: member.email || "—" },
          { label: "Joined", value: member.joinedAt ? <Timestamp value={member.joinedAt} /> : "—" },
          {
            label: "Last active",
            value: member.lastActiveAt ? <Timestamp value={member.lastActiveAt} /> : "No activity recorded",
          },
          { label: "MFA", value: member.mfaEnabled ? "Enabled" : "Not enabled" },
          { label: "User ID", value: member.userId, mono: true },
        ]}
        actions={
          <UiButton asChild variant="outline" size="lg">
            <Link to={href("audit-logs")}>Open audit logs</Link>
          </UiButton>
        }
      />

      <div className={`${SETTINGS_COLUMN} flex flex-col gap-6`}>
        <Panel
          title="Role and permissions"
          description="The role determines which organization surfaces this member can reach."
          bodyClassName="p-0"
          footer={
            <UiButton type="submit" form="member-role-form" size="lg" disabled={rolePending}>
              {rolePending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              Update role
            </UiButton>
          }
        >
          <RowStack>
            <Row>
              <SettingRow
                label="Current role"
                description={ROLE_SCOPES[member.role] ?? "Scoped organization access."}
              >
                <Pill>{member.role}</Pill>
              </SettingRow>
            </Row>
            <Row>
              {/* Keyed on the role so the select resets after a save. */}
              <form key={member.role} id="member-role-form" action={saveRole}>
                <DialogField
                  label="Assign role"
                  name="member-role"
                  hint="Owner transfer is handled from organization settings."
                >
                  <select id="member-role" name="role" defaultValue={member.role} className={fieldInputClass}>
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {capitalize(role)}
                      </option>
                    ))}
                  </select>
                </DialogField>
              </form>
            </Row>
          </RowStack>
        </Panel>

        <Panel
          title="Danger zone"
          description="Access changes take effect immediately and are recorded in the audit log."
          danger
          bodyClassName="p-0"
        >
          <RowStack>
            <Row>
              <SettingRow
                label={isSuspended ? "Reactivate member" : "Suspend member"}
                description={
                  isOwner
                    ? "Not available for the owner."
                    : isSuspended
                      ? "Restore sign-in for this member with their current role."
                      : "Revoke sessions and block sign-in without removing the membership."
                }
              >
                <UiButton
                  variant={isSuspended ? "outline" : "destructive"}
                  size="lg"
                  disabled={isOwner || suspendMutation.isPending || reactivateMutation.isPending}
                  onClick={() => setConfirmKind(isSuspended ? "reactivate" : "suspend")}
                >
                  {isSuspended ? "Reactivate member" : "Suspend member"}
                </UiButton>
              </SettingRow>
            </Row>
            <Row>
              <SettingRow
                label="Remove from organization"
                description={
                  isOwner
                    ? "Not available for the owner."
                    : "Deletes the membership. Project data created by this member is retained."
                }
              >
                <UiButton
                  variant="destructive"
                  size="lg"
                  disabled={isOwner || removeMutation.isPending}
                  onClick={() => setConfirmKind("remove")}
                >
                  Remove member
                </UiButton>
              </SettingRow>
            </Row>
          </RowStack>
        </Panel>
      </div>

      <ConfirmDialog
        open={confirmKind !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmKind(null);
        }}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel={confirm?.confirm}
        destructive={confirm?.destructive ?? true}
        pending={confirmPending}
        onConfirm={runConfirm}
      >
        <p className="text-[13px] text-[var(--text2)]">
          {displayName}{" "}
          <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">({member.userId})</span>
        </p>
      </ConfirmDialog>
    </WorkspacePage>
  );
}
