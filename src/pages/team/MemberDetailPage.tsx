import { useActionState, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  KeyRound,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UserMinus,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { OrgRole } from "@/modules/organizations/types/org.types";
import {
  Breadcrumbs,
  EmptyPanel,
  KeyValueGrid,
  PageHero,
  Panel,
  Pill,
  Row,
  RowStack,
  SettingRow,
  type Crumb,
  type KeyValueItem,
} from "@/shared/ui/pulse";
import { Button, DetailSkeleton, Field, SubmitButton, Timestamp, inputClass } from "@/shared/observe";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmKind = "remove" | "suspend" | "reactivate";

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

const CONFIRM_COPY: Record<ConfirmKind, { title: string; description: string; confirm: string }> = {
  remove: {
    title: "Remove member",
    description: "The member loses access to every project and resource in this organization immediately.",
    confirm: "Remove member",
  },
  suspend: {
    title: "Suspend member",
    description: "Sessions are revoked and sign-in is blocked until the member is reactivated.",
    confirm: "Suspend member",
  },
  reactivate: {
    title: "Reactivate member",
    description: "The member regains access with their current role.",
    confirm: "Reactivate member",
  },
};

function roleTone(role: string) {
  if (role === "owner") return "brand" as const;
  if (role === "admin" || role === "security") return "violet" as const;
  if (role === "billing") return "blue" as const;
  return "neutral" as const;
}

export default function MemberDetailPage() {
  const { userId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);

  const memberQueryKey = orgQueryKeys.detail(activeOrgId!).concat(["member", userId]);

  const { data: member, isLoading } = useQuery({
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
      navigate("/admin/team");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to remove member"),
  });

  const suspendMutation = useMutation({
    mutationFn: () => orgApi.suspendMember(activeOrgId!, userId),
    onSuccess: () => {
      toast.success("Member suspended");
      setConfirmKind(null);
      invalidateMember();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to suspend member"),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => orgApi.reactivateMember(activeOrgId!, userId),
    onSuccess: () => {
      toast.success("Member reactivated");
      setConfirmKind(null);
      invalidateMember();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to reactivate member"),
  });

  const [roleState, saveRole] = useActionState(
    async (_prev: { ok: boolean; error: string | null }, formData: FormData) => {
      if (!activeOrgId) return { ok: false, error: "No active organization" };
      try {
        await orgApi.updateMemberRole(activeOrgId, userId, String(formData.get("role") || ""));
        invalidateMember();
        return { ok: true, error: null };
      } catch (err: any) {
        return { ok: false, error: err.response?.data?.message || "Failed to update role" };
      }
    },
    { ok: false, error: null },
  );

  useEffect(() => {
    if (roleState.ok) toast.success("Member role updated");
    if (roleState.error) toast.error(roleState.error);
  }, [roleState]);

  if (isLoading) return <DetailSkeleton />;

  if (!member) {
    const crumbs: Crumb[] = [{ label: "Organization", to: "/admin" }, { label: "Team", to: "/admin/team" }, { label: "Member" }];
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={crumbs} />
        <EmptyPanel
          icon={UserX}
          title="Member not found"
          description="This member is no longer part of the organization, or the link is out of date."
          action={<Button variant="secondary" onClick={() => navigate("/admin/team")}>Back to team</Button>}
        />
      </div>
    );
  }

  const displayName = member.fullName || member.email || "Unknown user";
  const initial = displayName.charAt(0).toUpperCase();
  const breadcrumbs: Crumb[] = [
    { label: "Organization", to: "/admin" },
    { label: "Team", to: "/admin/team" },
    { label: displayName },
  ];

  const identity: KeyValueItem[] = [
    { label: "Email", value: member.email || "—" },
    {
      label: "User ID",
      value: <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{member.userId}</span>,
    },
    { label: "Joined", value: member.joinedAt ? <Timestamp value={member.joinedAt} /> : "—" },
    { label: "Last active", value: member.lastActiveAt ? <Timestamp value={member.lastActiveAt} /> : "—" },
    {
      label: "MFA",
      value: member.mfaEnabled ? <Pill tone="green" dot>Enabled</Pill> : <Pill tone="amber" dot>Not enabled</Pill>,
    },
    {
      label: "Membership",
      value:
        member.status === "active" ? (
          <Pill tone="green" dot>Active</Pill>
        ) : member.status === "suspended" ? (
          <Pill tone="red" dot>Suspended</Pill>
        ) : (
          <Pill tone="amber" dot>{member.status}</Pill>
        ),
    },
  ];

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
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Team member"
        title={displayName}
        description={member.email}
        breadcrumbs={breadcrumbs}
        actions={
          <>
            <Pill tone={roleTone(member.role)}>{member.role}</Pill>
            <Button variant="secondary" onClick={() => navigate("/admin/team")}>
              Back to team
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-4 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] px-4 py-3">
          <span
            aria-hidden="true"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand-bg)] font-[family-name:var(--display)] text-[17px] font-semibold text-[var(--brand)] ring-1 ring-inset ring-[var(--brand)]/25"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-medium text-[var(--text)]">{displayName}</p>
            <p className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">{member.userId}</p>
          </div>
        </div>
      </PageHero>

      <Panel title="Identity" description="Directory record for this membership." icon={UserCog} tone="brand">
        <KeyValueGrid items={identity} columns={3} />
      </Panel>

      <Panel
        title="Role and permissions"
        description="The role determines which organization surfaces this member can reach."
        icon={KeyRound}
        tone="violet"
        bodyClassName="p-0"
      >
        <RowStack>
          <Row>
            <SettingRow label={`Current role: ${member.role}`} description={ROLE_SCOPES[member.role] ?? "Scoped organization access."}>
              <Pill tone={roleTone(member.role)}>{member.role}</Pill>
            </SettingRow>
          </Row>
          <Row>
            <form action={saveRole} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <Field label="Assign role" hint="Owner transfer is handled from organization settings.">
                  <select name="role" defaultValue={member.role} className={inputClass}>
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <SubmitButton>Update role</SubmitButton>
            </form>
          </Row>
        </RowStack>
      </Panel>

      <Panel title="Sessions and activity" description="Signals recorded for this member." icon={Activity} tone="ai">
        <RowStack className="-my-1">
          <Row className="px-0">
            <SettingRow label="Last active" description="Most recent authenticated request seen for this member.">
              {member.lastActiveAt ? (
                <Timestamp value={member.lastActiveAt} />
              ) : (
                <span className="text-[13px] text-[var(--text3)]">No activity recorded</span>
              )}
            </SettingRow>
          </Row>
          <Row className="px-0">
            <SettingRow
              label="Action history"
              description="Per-member action history lives in the organization audit log."
            >
              <Button variant="secondary" onClick={() => navigate("/admin/audit-logs")}>
                <ScrollText className="size-4" aria-hidden="true" />
                Open audit logs
              </Button>
            </SettingRow>
          </Row>
        </RowStack>
      </Panel>

      <Panel
        title="Danger zone"
        description="Access changes take effect immediately and are recorded in the audit log."
        icon={ShieldAlert}
        danger
        bodyClassName="p-0"
      >
        <RowStack>
          <Row>
            <SettingRow
              label={member.status === "suspended" ? "Reactivate member" : "Suspend member"}
              description={
                member.status === "suspended"
                  ? "Restore sign-in for this member with their current role."
                  : "Revoke sessions and block sign-in without removing the membership."
              }
            >
              <Button
                variant="danger"
                disabled={member.role === "owner" || suspendMutation.isPending || reactivateMutation.isPending}
                onClick={() => setConfirmKind(member.status === "suspended" ? "reactivate" : "suspend")}
              >
                {member.status === "suspended" ? (
                  <ShieldCheck className="size-4" aria-hidden="true" />
                ) : (
                  <UserX className="size-4" aria-hidden="true" />
                )}
                {member.status === "suspended" ? "Reactivate" : "Suspend"}
              </Button>
            </SettingRow>
          </Row>
          <Row>
            <SettingRow
              label="Remove from organization"
              description="Deletes the membership. Project data created by this member is retained."
            >
              <Button variant="danger" disabled={member.role === "owner" || removeMutation.isPending} onClick={() => setConfirmKind("remove")}>
                <UserMinus className="size-4" aria-hidden="true" />
                Remove
              </Button>
            </SettingRow>
          </Row>
        </RowStack>
      </Panel>

      <Dialog open={confirmKind !== null} onOpenChange={(open) => { if (!open) setConfirmKind(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.description}</DialogDescription>
          </DialogHeader>
          <p className="text-[13px] text-[var(--text2)]">
            {displayName} <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">({member.userId})</span>
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmKind(null)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={confirmPending} onClick={runConfirm}>
              {confirm?.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
