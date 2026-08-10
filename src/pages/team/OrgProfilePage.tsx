import { useActionState, useEffect, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Archive,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Database,
  Gauge,
  KeyRound,
  LogOut,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { OrgSettings, UpdateOrganizationBody, UsageLimitsResponse } from "@/modules/organizations/types/org.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Button,
  CardSkeleton,
  Field,
  SeverityBadge,
  StatusBadge,
  SubmitButton,
  Timestamp,
  formatCompact,
  formatNumber,
  inputClass,
  textareaClass,
} from "@/shared/observe";
import {
  EmptyPanel,
  HeroFacts,
  Meter,
  PageHero,
  Panel,
  Pill,
  Ring,
  Row,
  RowStack,
  SettingRow,
  StatCard,
  type HeroFact,
} from "@/shared/ui/pulse";

type ConfirmKind = "transfer" | "leave" | "archive" | "restore";

const CONFIRM_COPY: Record<ConfirmKind, { title: string; description: string; confirm: string }> = {
  transfer: {
    title: "Transfer ownership",
    description: "The selected member becomes the owner. You are downgraded to admin and cannot undo this yourself.",
    confirm: "Transfer ownership",
  },
  leave: {
    title: "Leave organization",
    description: "You lose access to every project, environment, and resource in this organization immediately.",
    confirm: "Leave organization",
  },
  archive: {
    title: "Archive organization",
    description: "All resources and member access are suspended. Billing is paused until the organization is restored.",
    confirm: "Archive organization",
  },
  restore: {
    title: "Restore organization",
    description: "Members regain access with their existing roles and billing resumes.",
    confirm: "Restore organization",
  },
};

const normalizeOptional = (value: FormDataEntryValue | null) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
};

function bucketUsed(bucket?: { used: number | null }) {
  return bucket?.used ?? 0;
}

function postureScore(settings?: OrgSettings, ssoActive?: boolean) {
  let score = 0;
  if (settings?.enforceMfa) score += 1;
  if (settings?.enforceSso || ssoActive) score += 1;
  if ((settings?.auditLogRetentionDays ?? 0) >= 90) score += 1;
  if ((settings?.sessionTimeoutMinutes ?? 1440) <= 480) score += 1;
  return score;
}

function seatMeters(limits?: UsageLimitsResponse) {
  if (!limits) return [];
  return [
    { key: "members", label: "Members", bucket: limits?.limits?.members },
    { key: "environments", label: "Environments", bucket: limits?.limits?.environments },
    { key: "apiKeys", label: "API keys", bucket: limits?.limits?.apiKeys },
    { key: "ssoProviders", label: "SSO providers", bucket: limits?.limits?.ssoProviders },
    { key: "scimTokens", label: "SCIM tokens", bucket: limits?.limits?.scimTokens },
  ];
}

export default function OrgProfilePage() {
  const { activeOrgId } = useOrganizations();
  const queryClient = useQueryClient();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);
  const [newOwnerUserId, setNewOwnerUserId] = useState("");

  const { data: org, isLoading } = useQuery({
    queryKey: orgQueryKeys.detail(activeOrgId!),
    queryFn: () => orgApi.getOrganization(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: me } = useQuery({
    queryKey: [...orgQueryKeys.members(activeOrgId!), "me"],
    queryFn: () => orgApi.getMe(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: members } = useQuery({
    queryKey: [...orgQueryKeys.members(activeOrgId!), "transfer-candidates"],
    queryFn: () => orgApi.listMembers(activeOrgId!, { limit: 100, status: "active" }),
    enabled: !!activeOrgId && me?.role === "owner",
  });

  const { data: settings } = useQuery({
    queryKey: orgQueryKeys.settings(activeOrgId!),
    queryFn: () => orgApi.getSettings(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: billing } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "summary"],
    queryFn: () => orgApi.getBillingSummary(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: limits } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "usageLimits"],
    queryFn: () => orgApi.getUsageLimits(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: dailyUsage } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "dailyUsage"],
    queryFn: () => orgApi.getDailyUsage(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: ssoProviders } = useQuery({
    queryKey: orgQueryKeys.sso(activeOrgId!),
    queryFn: () => orgApi.listSsoProviders(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: auditLogs } = useQuery({
    queryKey: [...orgQueryKeys.auditLogs(activeOrgId!), "overview"],
    queryFn: () => orgApi.listAuditLogs(activeOrgId!, { limit: 6 }),
    enabled: !!activeOrgId,
  });

  const { data: securityEvents } = useQuery({
    queryKey: [...orgQueryKeys.securityEvents(activeOrgId!), "overview"],
    queryFn: () => orgApi.listSecurityEvents(activeOrgId!, { limit: 6 }),
    enabled: !!activeOrgId,
  });

  const invalidateOrg = () => {
    if (!activeOrgId) return;
    queryClient.invalidateQueries({ queryKey: orgQueryKeys.detail(activeOrgId) });
    queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
  };

  const [state, saveAction] = useActionState(
    async (_prevState: { ok: boolean; error: string | null }, formData: FormData) => {
      if (!activeOrgId) return { ok: false, error: "No active organization" };
      try {
        const body: UpdateOrganizationBody = {
          name: String(formData.get("name") || "").trim(),
          description: normalizeOptional(formData.get("description")) ?? null,
          logoUrl: normalizeOptional(formData.get("logoUrl")) ?? null,
          websiteUrl: normalizeOptional(formData.get("websiteUrl")) ?? null,
          industry: normalizeOptional(formData.get("industry")) ?? null,
          companySize: normalizeOptional(formData.get("companySize")) ?? null,
          country: normalizeOptional(formData.get("country")) ?? null,
          timezone: normalizeOptional(formData.get("timezone")),
          billingEmail: normalizeOptional(formData.get("billingEmail")),
          supportEmail: normalizeOptional(formData.get("supportEmail")) ?? null,
        };
        await orgApi.updateOrganization(activeOrgId, body);
        invalidateOrg();
        return { ok: true, error: null };
      } catch (err: any) {
        return { ok: false, error: err?.response?.data?.message || "Failed to update profile" };
      }
    },
    { ok: false, error: null },
  );

  useEffect(() => {
    if (state.ok) toast.success("Organization profile saved");
    if (state.error) toast.error(state.error);
  }, [state]);

  const transferMutation = useMutation({
    mutationFn: () => orgApi.transferOwnership(activeOrgId!, { newOwnerUserId }),
    onSuccess: () => {
      toast.success("Ownership transferred");
      setConfirmKind(null);
      invalidateOrg();
      if (activeOrgId) queryClient.invalidateQueries({ queryKey: orgQueryKeys.members(activeOrgId) });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to transfer ownership"),
  });

  const leaveMutation = useMutation({
    mutationFn: () => orgApi.leaveOrganization(activeOrgId!),
    onSuccess: () => {
      toast.success("You have left the organization");
      setConfirmKind(null);
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to leave organization"),
  });

  const statusMutation = useMutation({
    mutationFn: (next: "archive" | "restore") =>
      next === "archive" ? orgApi.archiveOrganization(activeOrgId!) : orgApi.restoreOrganization(activeOrgId!),
    onSuccess: (_result, next) => {
      toast.success(next === "archive" ? "Organization archived" : "Organization restored");
      setConfirmKind(null);
      invalidateOrg();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update organization status"),
  });

  if (isLoading || !org) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
      </div>
    );
  }

  const activeSso = (ssoProviders ?? []).find((provider) => provider.isActive) ?? null;
  const memberCount = bucketUsed(limits?.limits?.members) || billing?.usage?.activeMembers || 0;
  const memberLimit = limits?.limits?.members?.limit ?? null;
  const eventsUsed = bucketUsed(limits?.limits?.eventsMonthly);
  const eventLimit = limits?.limits?.eventsMonthly?.limit ?? billing?.plan?.eventLimitMonthly ?? null;
  const eventsPercent = eventLimit && eventLimit > 0 ? Math.min(100, Math.round((eventsUsed / eventLimit) * 100)) : 0;
  const eventSeries = (dailyUsage ?? []).map((point) => point.eventsCount);
  const recentAudit = auditLogs?.data ?? [];
  const recentSecurity = securityEvents?.data ?? [];
  const highSeverity = recentSecurity.filter((event) => event.severity === "high" || event.severity === "critical").length;
  const posture = postureScore(settings, !!activeSso);
  const planLabel = billing?.plan?.tier || billing?.plan?.key || org.status;
  const isOwner = me?.role === "owner";

  const facts: HeroFact[] = [
    { label: "Members", value: formatNumber(memberCount), icon: Users },
    { label: "Plan", value: planLabel, tone: "ai", icon: Gauge },
    { label: "Data region", value: settings?.dataRegion ?? "—", icon: Database },
    { label: "Created", value: <Timestamp value={org.createdAt} />, icon: CalendarDays },
  ];

  const confirm = confirmKind ? CONFIRM_COPY[confirmKind] : null;
  const confirmPending =
    confirmKind === "transfer"
      ? transferMutation.isPending
      : confirmKind === "leave"
        ? leaveMutation.isPending
        : statusMutation.isPending;

  const runConfirm = () => {
    if (confirmKind === "transfer") transferMutation.mutate();
    if (confirmKind === "leave") leaveMutation.mutate();
    if (confirmKind === "archive") statusMutation.mutate("archive");
    if (confirmKind === "restore") statusMutation.mutate("restore");
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Organization"
        title={org.name}
        description={org.description || `Workspace @${org.slug} · ${org.timezone || "UTC"}`}
        icon={Building2}
        actions={
          <>
            <StatusBadge status={org.status} />
            <Link
              to="/admin/team"
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[var(--brand)] px-3 text-[13px] font-medium text-[var(--brand-fg)] transition-colors hover:bg-[var(--brand-d)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <Users className="size-4" aria-hidden="true" />
              Manage team
            </Link>
          </>
        }
      >
        <HeroFacts facts={facts} />
      </PageHero>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active members"
          value={formatNumber(memberCount)}
          icon={Users}
          tone="brand"
          footnote={memberLimit && memberLimit > 0 ? `of ${formatNumber(memberLimit)} seats in plan` : "Unlimited seats"}
        />
        <StatCard
          label="Events this period"
          value={formatCompact(eventsUsed)}
          icon={Activity}
          tone="ai"
          series={eventSeries.length > 1 ? eventSeries : undefined}
          footnote={eventLimit && eventLimit > 0 ? `${eventsPercent}% of monthly quota` : "No monthly cap"}
        />
        <StatCard
          label="Security posture"
          value={`${posture}/4`}
          icon={ShieldCheck}
          tone={posture >= 3 ? "green" : posture === 2 ? "amber" : "red"}
          footnote="MFA, SSO, retention, session policy"
        />
        <StatCard
          label="High severity signals"
          value={highSeverity}
          icon={ShieldAlert}
          tone={highSeverity > 0 ? "red" : "green"}
          footnote="In the latest security events"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Quota consumption" description="Plan entitlements for the current billing period." icon={Gauge} tone="brand">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex flex-col items-center gap-2">
              <Ring value={eventsPercent} label={`${eventsPercent}%`} sublabel="Events" size={112} />
              <p className="text-[11.5px] tabular-nums text-[var(--text3)]">
                {formatCompact(eventsUsed)}
                {eventLimit && eventLimit > 0 ? ` / ${formatCompact(eventLimit)}` : ""}
              </p>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {seatMeters(limits).map((meter) => (
                <Meter
                  key={meter.key}
                  label={meter.label}
                  used={meter.bucket?.used ?? 0}
                  limit={meter.bucket?.limit}
                />
              ))}
              {!limits && <p className="text-[12.5px] text-[var(--text3)]">Plan entitlements are unavailable right now.</p>}
            </div>
          </div>
        </Panel>

        <Panel title="Security posture" description="Access controls currently applied to this organization." icon={ShieldCheck} tone="green" bodyClassName="p-0">
          <RowStack>
            <Row>
              <SettingRow label="Single sign-on" description={activeSso ? `${activeSso.providerName} is accepting sign-ins.` : "No active SAML provider."}>
                {activeSso ? <Pill tone="green" dot>Active</Pill> : <Pill tone="amber" dot>Off</Pill>}
              </SettingRow>
            </Row>
            <Row>
              <SettingRow label="MFA required" description="Every member must complete multi-factor authentication.">
                {settings?.enforceMfa ? <Pill tone="green" dot>Enforced</Pill> : <Pill tone="amber" dot>Optional</Pill>}
              </SettingRow>
            </Row>
            <Row>
              <SettingRow label="Session timeout" description="Idle sessions are signed out after this period.">
                <span className="text-[13px] tabular-nums text-[var(--text)]">
                  {settings ? `${settings.sessionTimeoutMinutes} min` : "—"}
                </span>
              </SettingRow>
            </Row>
            <Row>
              <SettingRow label="Audit log retention" description="How long privileged action history is kept.">
                <span className="text-[13px] tabular-nums text-[var(--text)]">
                  {settings ? `${settings.auditLogRetentionDays} days` : "—"}
                </span>
              </SettingRow>
            </Row>
            <Row>
              <SettingRow label="Security review" description="Inspect authentication and privilege events in detail.">
                <Link
                  to="/admin/security-events"
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--text)] transition-colors hover:border-[var(--border2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  Security events
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </SettingRow>
            </Row>
          </RowStack>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel
          title="Recent activity"
          description="Latest privileged actions recorded in the audit log."
          icon={ScrollText}
          tone="blue"
          bodyClassName="p-0"
          actions={
            <Link
              to="/admin/audit-logs"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text2)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              All entries
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          }
        >
          {recentAudit.length === 0 ? (
            <EmptyPanel
              className="rounded-none border-0 border-t border-dashed"
              icon={Activity}
              title="No recorded activity yet"
              description="Privileged actions appear here as soon as members start making changes."
            />
          ) : (
            <RowStack>
              {recentAudit.map((entry) => (
                <Row key={entry.id} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]">{entry.action}</p>
                    <p className="truncate text-[12.5px] text-[var(--text2)]">
                      {entry.actorEmail || entry.actorUserId || "System"}
                      {entry.entityName ? ` · ${entry.entityName}` : ` · ${entry.entityType}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={entry.status} />
                    <span className="font-[family-name:var(--mono)] text-[11.5px] tabular-nums text-[var(--text3)]">
                      <Timestamp value={entry.createdAt} />
                    </span>
                  </div>
                </Row>
              ))}
            </RowStack>
          )}
        </Panel>

        <Panel
          title="Security signals"
          description="Most recent authentication and privilege events."
          icon={ShieldAlert}
          tone="amber"
          bodyClassName="p-0"
          actions={
            <Link
              to="/admin/security-events"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text2)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              All events
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          }
        >
          {recentSecurity.length === 0 ? (
            <EmptyPanel
              className="rounded-none border-0 border-t border-dashed"
              icon={CheckCircle2}
              title="No security events"
              description="Nothing needs attention in the current retention window."
            />
          ) : (
            <RowStack>
              {recentSecurity.map((event) => (
                <Row key={event.id} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]">{event.eventType}</p>
                    <p className="truncate font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">
                      {event.ipAddress ?? "no IP recorded"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <SeverityBadge severity={event.severity} />
                    <span className="font-[family-name:var(--mono)] text-[11.5px] tabular-nums text-[var(--text3)]">
                      <Timestamp value={event.createdAt} />
                    </span>
                  </div>
                </Row>
              ))}
            </RowStack>
          )}
        </Panel>
      </div>

      <Panel
        title="Organization identity"
        description="Shown to members and used on billing documents."
        icon={Building2}
        tone="brand"
      >
        <form action={saveAction} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Organization name">
            <input name="name" defaultValue={org.name} className={inputClass} required />
          </Field>
          <Field label="Slug" hint={`Used in URLs: sentinel.io/org/${org.slug}`}>
            <input value={org.slug} disabled readOnly className={`${inputClass} font-[family-name:var(--mono)] text-[12.5px]`} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea name="description" rows={3} defaultValue={org.description || ""} className={textareaClass} />
            </Field>
          </div>
          <Field label="Logo URL">
            <input name="logoUrl" defaultValue={org.logoUrl || ""} className={inputClass} />
          </Field>
          <Field label="Website URL">
            <input name="websiteUrl" defaultValue={org.websiteUrl || ""} className={inputClass} />
          </Field>
          <Field label="Industry">
            <input name="industry" defaultValue={org.industry || ""} className={inputClass} />
          </Field>
          <Field label="Company size">
            <input name="companySize" defaultValue={org.companySize || ""} className={inputClass} />
          </Field>
          <Field label="Country">
            <input name="country" defaultValue={org.country || ""} className={inputClass} />
          </Field>
          <Field label="Timezone">
            <input name="timezone" defaultValue={org.timezone || ""} className={inputClass} />
          </Field>
          <Field label="Billing email">
            <input type="email" name="billingEmail" defaultValue={org.billingEmail || ""} className={inputClass} />
          </Field>
          <Field label="Support email">
            <input type="email" name="supportEmail" defaultValue={org.supportEmail || ""} className={inputClass} />
          </Field>
          <div className="flex justify-end sm:col-span-2">
            <SubmitButton>Save profile</SubmitButton>
          </div>
        </form>
      </Panel>

      <Panel
        title="Ownership"
        description="Only the current owner can hand over the organization."
        icon={KeyRound}
        tone="violet"
      >
        {isOwner ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[260px] flex-1">
              <Field label="New owner" hint="You become an admin once the transfer completes.">
                <select
                  value={newOwnerUserId}
                  onChange={(event) => setNewOwnerUserId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select an active member</option>
                  {(members?.data ?? [])
                    .filter((member) => member.userId !== me?.userId)
                    .map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.fullName || member.email} ({member.role})
                      </option>
                    ))}
                </select>
              </Field>
            </div>
            <Button
              variant="secondary"
              disabled={!newOwnerUserId || transferMutation.isPending}
              onClick={() => setConfirmKind("transfer")}
            >
              Transfer ownership
            </Button>
          </div>
        ) : (
          <p className="text-[13px] text-[var(--text2)]">
            Only the current organization owner can transfer ownership. Your role is {me?.role ?? "unknown"}.
          </p>
        )}
      </Panel>

      <Panel
        title="Danger zone"
        description="These actions change access for everyone in the organization."
        icon={ShieldAlert}
        danger
        bodyClassName="p-0"
      >
        <RowStack>
          <Row>
            <SettingRow
              label="Leave organization"
              description="Remove yourself from this organization. Access is revoked immediately."
            >
              <Button variant="danger" disabled={leaveMutation.isPending} onClick={() => setConfirmKind("leave")}>
                <LogOut className="size-4" aria-hidden="true" />
                Leave
              </Button>
            </SettingRow>
          </Row>
          <Row>
            <SettingRow
              label={org.status === "archived" ? "Restore organization" : "Archive organization"}
              description={
                org.status === "archived"
                  ? "Bring the organization back online for all members."
                  : "Suspend all resources and member access. Billing is paused."
              }
            >
              <Button
                variant="danger"
                disabled={statusMutation.isPending}
                onClick={() => setConfirmKind(org.status === "archived" ? "restore" : "archive")}
              >
                <Archive className="size-4" aria-hidden="true" />
                {org.status === "archived" ? "Restore" : "Archive"}
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
            {org.name} <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">@{org.slug}</span>
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
