import { useState } from "react";
import { Ban, CheckCircle2, Clock, Mail, MailPlus, ShieldAlert, ThumbsDown, Ticket } from "lucide-react";
import { useMemberMutations, useProjectInvitations } from "@/modules/projects/hooks/useMembers";
import {
  PROJECT_MEMBER_ROLES,
  type InvitationStatus,
  type ProjectInvitation,
  type ProjectMemberRole,
} from "@/modules/projects/api/types";
import { useCurrentProject } from "./ProjectShellPage";
import {
  IconChip,
  Notice,
  Panel,
  Pill,
  SecretField,
  SectionHeading,
  StatCard,
  Toolbar,
  fieldInputClass,
  type SurfaceTone,
} from "@/shared/ui/pulse";
import { FilterSelect, Table, Td, Timestamp, Tr } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { ConfirmDialog, DialogField, FormDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const INVITE_STATUS_TONE: Record<InvitationStatus, SurfaceTone> = {
  pending: "amber",
  accepted: "green",
  declined: "red",
  expired: "neutral",
  cancelled: "neutral",
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

const INVITE_TABLE_HEADERS = ["Invitee", "Role", "Status", "Expires", ""];

// ── page ─────────────────────────────────────────────────────

export default function ProjectInvitationsPage() {
  const { projectId, project } = useCurrentProject();
  const [status, setStatus] = useState("");
  const { data, isLoading, error } = useProjectInvitations(
    projectId,
    status ? { status: status as InvitationStatus } : {},
  );
  const invitations = data?.data ?? [];

  const { inviteMember, acceptInvitation, declineInvitation, cancelInvitation } = useMemberMutations(projectId);

  const [inviting, setInviting] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [cancelling, setCancelling] = useState<ProjectInvitation | null>(null);
  const [issuedToken, setIssuedToken] = useState<{ email: string; token: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const asMessage = apiErrorMessage;

  const pending = invitations.filter((invitation) => invitation.status === "pending").length;
  const accepted = invitations.filter((invitation) => invitation.status === "accepted").length;
  const expired = invitations.filter(
    (invitation) => invitation.status === "expired" || invitation.status === "cancelled",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Invitations"
        description="Invite people to this project by email. The invitation token is returned once and must be delivered to the invitee."
        actions={
          <div className="flex items-center gap-2">
            <UiButton variant="outline" size="lg" onClick={() => setRedeeming(true)}>
              <Ticket className="mr-1.5 size-4" /> Redeem token
            </UiButton>
            <UiButton size="lg" onClick={() => setInviting(true)}>
              <MailPlus className="mr-1.5 size-4" /> Invite member
            </UiButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Invitations" value={data?.total ?? invitations.length} icon={Mail} tone="brand" />
        <StatCard label="Pending" value={pending} icon={Clock} tone={pending > 0 ? "amber" : "neutral"} />
        <StatCard label="Accepted" value={accepted} icon={CheckCircle2} tone="green" />
        <StatCard label="Expired / cancelled" value={expired} icon={Ban} tone="neutral" />
      </div>

      <Toolbar>
        <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_FILTER_OPTIONS} />
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
        ) : invitations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <IconChip icon={Mail} size="lg" tone="brand" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">No invitations</p>
            <p className="max-w-[44ch] text-[12.5px] text-[var(--text2)]">
              Invite teammates by email, or add existing organization members directly from the Members tab.
            </p>
            <UiButton size="lg" onClick={() => setInviting(true)}>
              <MailPlus className="mr-1.5 size-4" /> Invite member
            </UiButton>
          </div>
        ) : (
          <Table headers={INVITE_TABLE_HEADERS} maxHeight="32rem">
            {invitations.map((invitation) => (
              <Tr key={invitation.id}>
                <Td>
                  <span className="truncate text-[13px] font-medium text-[var(--text)]">{invitation.email}</span>
                </Td>
                <Td>
                  <Pill tone="blue">{invitation.role}</Pill>
                </Td>
                <Td>
                  <Pill tone={INVITE_STATUS_TONE[invitation.status]} dot>
                    {invitation.status}
                  </Pill>
                </Td>
                <Td>
                  <Timestamp value={invitation.expiresAt} />
                </Td>
                <Td className="text-right">
                  {invitation.status === "pending" ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <UiButton
                        variant="ghost"
                        size="sm"
                        onClick={() => declineInvitation.mutate(invitation.id)}
                        disabled={declineInvitation.isPending}
                      >
                        <ThumbsDown className="mr-1 size-3.5" /> Decline
                      </UiButton>
                      <UiButton variant="outline" size="sm" onClick={() => setCancelling(invitation)}>
                        <Ban className="mr-1 size-3.5" /> Cancel
                      </UiButton>
                    </div>
                  ) : (
                    <span className="text-[11.5px] text-[var(--text3)]">
                      {invitation.acceptedAt ? (
                        <>
                          accepted <Timestamp value={invitation.acceptedAt} />
                        </>
                      ) : invitation.declinedAt ? (
                        <>
                          declined <Timestamp value={invitation.declinedAt} />
                        </>
                      ) : invitation.cancelledAt ? (
                        <>
                          cancelled <Timestamp value={invitation.cancelledAt} />
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Panel>

      {/* ── create invitation ── */}
      <FormDialog
        open={inviting}
        onOpenChange={(open) => {
          setInviting(open);
          if (!open) setFormError(null);
        }}
        title="Invite to project"
        description={`Send a project invitation for ${project.name}.`}
        submitLabel="Create invitation"
        pending={inviteMember.isPending}
        error={formError}
        onSubmit={(form) => {
          const email = String(form.get("email") ?? "").trim();
          if (!email) {
            setFormError("An email address is required.");
            return;
          }
          inviteMember.mutate(
            { email, role: String(form.get("role") ?? "viewer") as ProjectMemberRole },
            {
              onSuccess: (result) => {
                setInviting(false);
                setIssuedToken({ email, token: result.token });
              },
              onError: (mutationError) => setFormError(asMessage(mutationError)),
            },
          );
        }}
      >
        <DialogField label="Email" name="email" required>
          <input id="email" name="email" type="email" required placeholder="teammate@example.com" className={fieldInputClass} />
        </DialogField>
        <DialogField label="Project role" name="role">
          <select id="role" name="role" defaultValue="viewer" className={fieldInputClass}>
            {PROJECT_MEMBER_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </DialogField>
      </FormDialog>

      {/* ── issued token ── */}
      <FormDialog
        open={!!issuedToken}
        onOpenChange={(open) => !open && setIssuedToken(null)}
        title="Share this invitation token"
        description="The token is shown once. Send it to the invitee over a trusted channel."
        submitLabel="Done"
        onSubmit={() => setIssuedToken(null)}
      >
        <Notice tone="amber" icon={ShieldAlert} title="Shown once">
          Anyone holding this token can join the project with the assigned role.
        </Notice>
        {issuedToken && <SecretField label={issuedToken.email} value={issuedToken.token} masked />}
      </FormDialog>

      {/* ── redeem token ── */}
      <FormDialog
        open={redeeming}
        onOpenChange={(open) => {
          setRedeeming(open);
          if (!open) setFormError(null);
        }}
        title="Redeem an invitation token"
        description="Accept a project invitation issued to your account."
        submitLabel="Accept invitation"
        pending={acceptInvitation.isPending}
        error={formError}
        onSubmit={(form) => {
          const token = String(form.get("token") ?? "").trim();
          if (!token) {
            setFormError("Paste the invitation token.");
            return;
          }
          acceptInvitation.mutate(token, {
            onSuccess: () => setRedeeming(false),
            onError: (mutationError) => setFormError(asMessage(mutationError)),
          });
        }}
      >
        <DialogField label="Invitation token" name="token" required>
          <input id="token" name="token" required className={fieldInputClass} />
        </DialogField>
      </FormDialog>

      {/* ── cancel ── */}
      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        title={`Cancel invitation to ${cancelling?.email ?? ""}?`}
        description="The token stops working immediately. You can send a new invitation later."
        confirmLabel="Cancel invitation"
        pending={cancelInvitation.isPending}
        onConfirm={() => {
          if (!cancelling) return;
          cancelInvitation.mutate(cancelling.id, { onSuccess: () => setCancelling(null) });
        }}
      />
    </div>
  );
}
