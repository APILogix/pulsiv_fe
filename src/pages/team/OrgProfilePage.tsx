import { useActionState, useEffect, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { orgRoutes } from "@/app/router/org-routes";
import { Button as UiButton } from "@/components/ui/button";
import { orgApi } from "@/modules/organizations/api/org.api";
import { CONTROL_LABEL, CONTROL_TONE, useAdminHref, type ControlState } from "@/modules/organizations/components/org-page";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { bootstrapService } from "@/modules/bootstrap";
import type {
  AuditLog,
  OrgSettings,
  OrgStatus,
  ScimToken,
  SecurityEvent,
  SecurityEventSeverity,
  SsoProvider,
  UpdateOrganizationBody,
  UsageLimitsResponse,
  VerifiedDomain,
} from "@/modules/organizations/types/org.types";
import {
  ProjectPageHeader,
  Readouts,
  SETTINGS_COLUMN,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetList,
  SheetListItem,
  SheetLoading,
  SheetRow,
  SheetTable,
  TextLink,
  WorkspacePage,
  HIDE_BELOW_MD,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { ConfirmDialog, DialogField, apiErrorMessage } from "@/modules/projects/components/project-ui";
import { Timestamp, formatCompact, formatNumber } from "@/shared/observe";
import {
  Meter,
  Panel,
  Pill,
  Row,
  RowStack,
  SettingRow,
  fieldInputClass,
  fieldMonoClass,
  fieldTextareaClass,
  type SurfaceTone,
} from "@/shared/ui/pulse";

// ── Confirm copy ─────────────────────────────────────────────

type ConfirmKind = "transfer" | "leave" | "archive" | "restore";

const CONFIRM_COPY: Record<ConfirmKind, { title: string; description: string; confirm: string; destructive: boolean }> = {
  transfer: {
    title: "Transfer ownership",
    description: "The selected member becomes the owner. You are downgraded to admin and cannot undo this yourself.",
    confirm: "Transfer ownership",
    destructive: true,
  },
  leave: {
    title: "Leave organization",
    description: "You lose access to every project, environment, and resource in this organization immediately.",
    confirm: "Leave organization",
    destructive: true,
  },
  archive: {
    title: "Archive organization",
    description: "All resources and member access are suspended. Billing is paused until the organization is restored.",
    confirm: "Archive organization",
    destructive: true,
  },
  restore: {
    title: "Restore organization",
    description: "Members regain access with their existing roles and billing resumes.",
    confirm: "Restore organization",
    destructive: false,
  },
};

// ── Helpers ──────────────────────────────────────────────────

const normalizeOptional = (value: FormDataEntryValue | null) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
};

const STATUS_TONE: Record<OrgStatus, SurfaceTone> = {
  active: "green",
  trialing: "neutral",
  suspended: "amber",
  locked: "red",
  archived: "neutral",
  delinquent: "red",
};

const SEVERITY_TONE: Record<SecurityEventSeverity, SurfaceTone> = {
  critical: "red",
  high: "red",
  medium: "amber",
  low: "neutral",
};

function auditTone(status: string): SurfaceTone {
  const value = status.toLowerCase();
  if (value === "success" || value === "succeeded" || value === "ok") return "green";
  if (value === "failure" || value === "failed" || value === "error" || value === "denied") return "red";
  return "neutral";
}

function seatMeters(limits?: UsageLimitsResponse) {
  if (!limits) return [];
  return [
    { key: "members", label: "Members", bucket: limits.limits?.members },
    { key: "environments", label: "Environments", bucket: limits.limits?.environments },
    { key: "apiKeys", label: "API keys", bucket: limits.limits?.apiKeys },
    { key: "ssoProviders", label: "SSO providers", bucket: limits.limits?.ssoProviders },
    { key: "scimTokens", label: "SCIM tokens", bucket: limits.limits?.scimTokens },
  ];
}

function isLiveToken(token: ScimToken) {
  if (token.revokedAt) return false;
  if (token.expiresAt && new Date(token.expiresAt).getTime() < Date.now()) return false;
  return true;
}

interface ControlRowModel {
  key: string;
  label: string;
  detail: string;
  value: string;
  state: ControlState;
  to: string;
  linkLabel: string;
}

/**
 * The controls ledger: one row per access control, derived only from data the
 * page already loads. Each row links to the page that owns the control.
 */
function buildControls({
  settings,
  ssoProviders,
  scimTokens,
  scimFailed,
  domains,
  href,
}: {
  settings?: OrgSettings;
  ssoProviders?: SsoProvider[];
  scimTokens?: ScimToken[];
  scimFailed: boolean;
  domains?: VerifiedDomain[];
  href: (sub?: string) => string;
}): ControlRowModel[] {
  const activeSso = (ssoProviders ?? []).find((provider) => provider.isActive) ?? null;
  const enforceSso = settings?.enforceSso ?? false;

  const sso: ControlRowModel = {
    key: "sso",
    label: "Single sign-on",
    to: href("sso"),
    linkLabel: "Configure SSO",
    ...(ssoProviders === undefined
      ? { detail: "Loading provider status.", value: "—", state: "unknown" as const }
      : activeSso && enforceSso
        ? { detail: "Required for every member sign-in.", value: activeSso.providerName, state: "enforced" as const }
        : activeSso
          ? { detail: "Available to members. Password sign-in still works.", value: activeSso.providerName, state: "active" as const }
          : enforceSso
            ? { detail: "Required in settings, but no provider is active.", value: "No active provider", state: "partial" as const }
            : { detail: "Members sign in with a password or social login.", value: "No provider", state: "off" as const }),
  };

  const liveTokens = (scimTokens ?? []).filter(isLiveToken).length;
  const scim: ControlRowModel = {
    key: "scim",
    label: "SCIM provisioning",
    to: href("scim"),
    linkLabel: "Manage tokens",
    ...(scimFailed
      ? { detail: "Token status is not available for your role.", value: "—", state: "unknown" as const }
      : scimTokens === undefined
        ? { detail: "Loading token status.", value: "—", state: "unknown" as const }
        : liveTokens > 0
          ? {
              detail: "Your identity provider can create and remove members.",
              value: `${liveTokens} live ${liveTokens === 1 ? "token" : "tokens"}`,
              state: "active" as const,
            }
          : { detail: "Members are added by invitation only.", value: "No live tokens", state: "off" as const }),
  };

  const verified = (domains ?? []).filter((domain) => domain.isVerified).length;
  const totalDomains = domains?.length ?? 0;
  const domainRow: ControlRowModel = {
    key: "domains",
    label: "Verified domains",
    to: href("domains"),
    linkLabel: "Manage domains",
    ...(domains === undefined
      ? { detail: "Loading domain status.", value: "—", state: "unknown" as const }
      : verified > 0
        ? {
            detail: "Ownership is proven through DNS.",
            value: `${verified} of ${totalDomains} verified`,
            state: "active" as const,
          }
        : totalDomains > 0
          ? { detail: "DNS verification has not completed yet.", value: `0 of ${totalDomains} verified`, state: "partial" as const }
          : { detail: "No company domain is claimed.", value: "None", state: "off" as const }),
  };

  const mfa: ControlRowModel = {
    key: "mfa",
    label: "MFA requirement",
    to: href("settings"),
    linkLabel: "Change in settings",
    ...(settings === undefined
      ? { detail: "Loading policy.", value: "—", state: "unknown" as const }
      : settings.enforceMfa
        ? { detail: "Every member must complete multi-factor authentication.", value: "Required", state: "enforced" as const }
        : { detail: "Members choose whether to set up MFA.", value: "Optional", state: "off" as const }),
  };

  const session: ControlRowModel = {
    key: "session",
    label: "Session timeout",
    to: href("settings"),
    linkLabel: "Change in settings",
    ...(settings === undefined
      ? { detail: "Loading policy.", value: "—", state: "unknown" as const }
      : settings.sessionTimeoutMinutes <= 480
        ? { detail: "Idle sessions sign out within a working day.", value: `${settings.sessionTimeoutMinutes} min`, state: "active" as const }
        : { detail: "Idle sessions stay signed in for more than 8 hours.", value: `${settings.sessionTimeoutMinutes} min`, state: "partial" as const }),
  };

  const retention: ControlRowModel = {
    key: "retention",
    label: "Audit log retention",
    to: href("settings"),
    linkLabel: "Change in settings",
    ...(settings === undefined
      ? { detail: "Loading policy.", value: "—", state: "unknown" as const }
      : settings.auditLogRetentionDays >= 90
        ? { detail: "Privileged actions are kept for at least a quarter.", value: `${settings.auditLogRetentionDays} days`, state: "active" as const }
        : { detail: "History is kept for less than 90 days.", value: `${settings.auditLogRetentionDays} days`, state: "partial" as const }),
  };

  return [sso, scim, domainRow, mfa, session, retention];
}

const CONTROL_COLUMNS: SheetColumn[] = [
  { key: "control", header: "Control" },
  { key: "value", header: "Current value", className: `w-[200px] ${HIDE_BELOW_MD}` },
  { key: "state", header: "State", className: "w-[140px]" },
  { key: "link", header: "Owning page", srOnly: true, className: "w-[160px] text-right", align: "right" },
];

// ── Page ─────────────────────────────────────────────────────

export default function OrgProfilePage() {
  const { activeOrgId, activeOrgSlug } = useOrganizations();
  const href = useAdminHref();
  const queryClient = useQueryClient();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);
  const [newOwnerUserId, setNewOwnerUserId] = useState("");

  const { data: org, isLoading, isError, error, refetch } = useQuery({
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

  const { data: limits, isLoading: limitsLoading } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "usageLimits"],
    queryFn: () => orgApi.getUsageLimits(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: ssoProviders } = useQuery({
    queryKey: orgQueryKeys.sso(activeOrgId!),
    queryFn: () => orgApi.listSsoProviders(activeOrgId!),
    enabled: !!activeOrgId,
  });

  // Same keys as the SCIM and domains pages, so the ledger and the owning page
  // share one cache entry and never disagree.
  const { data: scimTokens, isError: scimFailed } = useQuery({
    queryKey: orgQueryKeys.scimTokens(activeOrgId!),
    queryFn: () => orgApi.listScimTokens(activeOrgId!),
    enabled: !!activeOrgId,
    retry: false,
  });

  const { data: domainPage } = useQuery({
    queryKey: orgQueryKeys.domains(activeOrgId!),
    queryFn: () => orgApi.listDomains(activeOrgId!, { limit: 100 }),
    enabled: !!activeOrgId,
  });

  const {
    data: auditLogs,
    isLoading: auditLoading,
    isError: auditFailed,
    error: auditError,
    refetch: refetchAudit,
  } = useQuery({
    queryKey: [...orgQueryKeys.auditLogs(activeOrgId!), "overview"],
    queryFn: () => orgApi.listAuditLogs(activeOrgId!, { limit: 6 }),
    enabled: !!activeOrgId,
  });

  const {
    data: securityEvents,
    isLoading: securityLoading,
    isError: securityFailed,
    error: securityError,
    refetch: refetchSecurity,
  } = useQuery({
    queryKey: [...orgQueryKeys.securityEvents(activeOrgId!), "overview"],
    queryFn: () => orgApi.listSecurityEvents(activeOrgId!, { limit: 6 }),
    enabled: !!activeOrgId,
  });

  const invalidateOrg = () => {
    if (!activeOrgId) return;
    queryClient.invalidateQueries({ queryKey: orgQueryKeys.detail(activeOrgId) });
    queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
  };

  const [state, saveAction, savePending] = useActionState(
    async (_prevState: { ok: boolean; error: string | null }, formData: FormData) => {
      if (!activeOrgId) return { ok: false, error: "No active organization" };
      try {
        const body: UpdateOrganizationBody = {
          name: String(formData.get("name") || "").trim(),
          logoUrl: normalizeOptional(formData.get("logoUrl")) ?? null,
          timezone: normalizeOptional(formData.get("timezone")),
        };
        await orgApi.updateOrganization(activeOrgId, body);
        invalidateOrg();
        return { ok: true, error: null };
      } catch (err: unknown) {
        return { ok: false, error: apiErrorMessage(err, "Failed to update profile") };
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
      // You no longer own an organization, so creating one is allowed again.
      void bootstrapService.refreshBootstrap().catch(() => undefined);
      if (activeOrgId) queryClient.invalidateQueries({ queryKey: orgQueryKeys.members(activeOrgId) });
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Failed to transfer ownership")),
  });

  const leaveMutation = useMutation({
    mutationFn: () => orgApi.leaveOrganization(activeOrgId!),
    onSuccess: () => {
      toast.success("You have left the organization");
      setConfirmKind(null);
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Failed to leave organization")),
  });

  const statusMutation = useMutation({
    mutationFn: (next: "archive" | "restore") =>
      next === "archive" ? orgApi.archiveOrganization(activeOrgId!) : orgApi.restoreOrganization(activeOrgId!),
    onSuccess: (_result, next) => {
      toast.success(next === "archive" ? "Organization archived" : "Organization restored");
      setConfirmKind(null);
      invalidateOrg();
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Failed to update organization status")),
  });

  if (isError && !org) {
    return (
      <WorkspacePage>
        <ProjectPageHeader title="Organization" description="Access, security, and usage for this organization." />
        <Sheet label="Organization">
          <SheetError
            title="Could not load this organization"
            message={apiErrorMessage(error, "The organization request failed.")}
            onRetry={() => void refetch()}
          />
        </Sheet>
      </WorkspacePage>
    );
  }

  if (isLoading || !org) {
    return (
      <WorkspacePage>
        <ProjectPageHeader title="Organization" description="Access, security, and usage for this organization." />
        <Readouts
          loading
          cells={[
            { label: "Members", value: "" },
            { label: "Credits this period", value: "" },
            { label: "Controls in place", value: "" },
            { label: "High severity signals", value: "" },
          ]}
        />
        <Sheet title="Access controls">
          <SheetLoading rows={6} label="Loading access controls" />
        </Sheet>
      </WorkspacePage>
    );
  }

  const domains = domainPage?.data;
  const controls = buildControls({ settings, ssoProviders, scimTokens, scimFailed, domains, href });
  const controlsInPlace = controls.filter((control) => control.state === "enforced" || control.state === "active").length;
  const controlsNeedingAttention = controls.filter((control) => control.state === "partial").length;

  const memberCount = limits?.limits?.members?.used || billing?.usage?.activeMembers || 0;
  const memberLimit = limits?.limits?.members?.limit ?? null;
  const pendingInvites = billing?.usage?.pendingInvitations ?? 0;
  const eventsUsed = limits?.limits?.eventsMonthly?.used ?? 0;
  const rawEventLimit = limits?.limits?.eventsMonthly?.limit ?? billing?.plan?.eventLimitMonthly ?? null;
  const eventLimit = rawEventLimit !== null && rawEventLimit > 0 ? rawEventLimit : 0;
  const hasEventCap = eventLimit > 0;
  const eventsPercent = hasEventCap ? Math.min(100, Math.round((eventsUsed / eventLimit) * 100)) : 0;

  const recentAudit: AuditLog[] = auditLogs?.data ?? [];
  const recentSecurity: SecurityEvent[] = securityEvents?.data ?? [];
  const highSeverity = recentSecurity.filter((event) => event.severity === "high" || event.severity === "critical").length;

  const planLabel = billing?.plan?.tier || billing?.plan?.key || null;
  const isOwner = me?.role === "owner";
  const isArchived = org.status === "archived";

  const readouts: Readout[] = [
    {
      label: "Members",
      value: formatNumber(memberCount),
      sub:
        memberLimit !== null && memberLimit > 0
          ? `of ${formatNumber(memberLimit)} seats${pendingInvites > 0 ? `, ${pendingInvites} invited` : ""}`
          : pendingInvites > 0
            ? `${pendingInvites} invitations pending`
            : "No seat limit",
    },
    {
      label: "Credits this period",
      value: formatCompact(eventsUsed),
      sub: hasEventCap ? `${eventsPercent}% of ${formatCompact(eventLimit)} monthly` : "No monthly cap",
      tone: !hasEventCap ? "neutral" : eventsPercent >= 90 ? "bad" : eventsPercent >= 75 ? "warn" : "neutral",
    },
    {
      label: "Controls in place",
      value: `${controlsInPlace}/${controls.length}`,
      sub: controlsNeedingAttention > 0 ? `${controlsNeedingAttention} need attention` : "See the ledger below",
      tone: controlsNeedingAttention > 0 ? "warn" : controlsInPlace >= 4 ? "good" : "neutral",
    },
    {
      label: "High severity signals",
      value: securityLoading ? "—" : formatNumber(highSeverity),
      sub: "In the latest security events",
      tone: securityLoading ? "neutral" : highSeverity > 0 ? "bad" : "good",
    },
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

  const transferCandidates = (members?.data ?? []).filter((member) => member.userId !== me?.userId);

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title={org.name}
        badges={
          <Pill tone={STATUS_TONE[org.status] ?? "neutral"} dot={org.status === "active"}>
            {org.status}
          </Pill>
        }
        description="Access, security, and usage for this organization."
        meta={[
          { label: "Slug", value: `@${org.slug}`, mono: true },
          planLabel ? { label: "Plan", value: <span className="first-letter:uppercase">{planLabel}</span> } : null,
          settings?.dataRegion ? { label: "Region", value: settings.dataRegion, mono: true } : null,
          { label: "Created", value: <Timestamp value={org.createdAt} /> },
          me?.role ? { label: "Your role", value: <span className="first-letter:uppercase">{me.role}</span> } : null,
        ]}
        actions={
          <>
            <UiButton asChild variant="outline" size="lg">
              <Link to={href("settings")}>Settings</Link>
            </UiButton>
            <UiButton asChild size="lg">
              <Link to={href("team")}>Manage team</Link>
            </UiButton>
          </>
        }
      />

      <Readouts cells={readouts} label="Organization summary" />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Sheet
          title="Access controls"
          description="Every control that decides who gets in and what is recorded. Each row links to the page that changes it."
          footer={
            <span>
              {controlsInPlace} of {controls.length} controls on
              {controlsNeedingAttention > 0 ? `, ${controlsNeedingAttention} need attention` : ""}
            </span>
          }
        >
          <SheetTable columns={CONTROL_COLUMNS} caption="Access controls and their current state" minWidth={520}>
            {controls.map((control) => (
              <SheetRow key={control.key}>
                <SheetCell>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[var(--text)]">{control.label}</p>
                    <p className="mt-0.5 truncate text-[12px] text-[var(--text3)]">
                      {control.detail}
                      {/* The value column drops on small screens; keep the reading. */}
                      <span className="md:hidden"> · {control.value}</span>
                    </p>
                  </div>
                </SheetCell>
                <SheetCell className={HIDE_BELOW_MD}>
                  <span className="block truncate font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                    {control.value}
                  </span>
                </SheetCell>
                <SheetCell>
                  <Pill tone={CONTROL_TONE[control.state]} dot={control.state === "enforced" || control.state === "active"}>
                    {CONTROL_LABEL[control.state]}
                  </Pill>
                </SheetCell>
                <SheetCell align="right">
                  <TextLink to={control.to} size="sm" arrow className="whitespace-nowrap">
                    <span className="sr-only">{control.label}: </span>
                    {control.linkLabel}
                  </TextLink>
                </SheetCell>
              </SheetRow>
            ))}
          </SheetTable>
        </Sheet>

        <Panel
          title="Plan usage"
          description={planLabel ? `Entitlements on the ${planLabel} plan this billing period.` : "Entitlements for this billing period."}
          footer={
            <TextLink to={orgRoutes.billing(activeOrgSlug, "usage")} size="sm" arrow>
              Usage and billing
            </TextLink>
          }
        >
          {limitsLoading ? (
            <div role="status" aria-label="Loading plan usage" className="flex flex-col gap-5">
              {Array.from({ length: 4 }, (_, index) => (
                <span key={index} aria-hidden="true" className="loading-skeleton block h-8 w-full rounded-[4px]" />
              ))}
            </div>
          ) : limits ? (
            <div className="flex flex-col gap-5">
              <Meter
                label="Credits"
                used={eventsUsed}
                limit={hasEventCap ? eventLimit : null}
                format={formatCompact}
              />
              {seatMeters(limits).map((meter) => (
                <Meter key={meter.key} label={meter.label} used={meter.bucket?.used ?? 0} limit={meter.bucket?.limit} />
              ))}
            </div>
          ) : (
            <p className="text-[13px] leading-[1.6] text-[var(--text2)]">
              Plan entitlements are unavailable right now. Usage and billing has the full breakdown.
            </p>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Sheet
          title="Recent activity"
          description="Latest privileged actions in the audit log."
          actions={
            <TextLink to={href("audit-logs")} size="sm" arrow>
              All entries
            </TextLink>
          }
        >
          {auditLoading ? (
            <SheetLoading rows={4} label="Loading recent activity" />
          ) : auditFailed ? (
            <SheetError
              title="Could not load recent activity"
              message={apiErrorMessage(auditError, "The audit log request failed.")}
              onRetry={() => void refetchAudit()}
            />
          ) : recentAudit.length === 0 ? (
            <SheetEmpty
              title="No recorded activity yet"
              description="Role changes, invitations, and settings updates appear here as members make them."
            />
          ) : (
            <SheetList label="Recent audit entries">
              {recentAudit.map((entry) => (
                <SheetListItem key={entry.id}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{entry.action}</p>
                    <p className="mt-0.5 truncate text-[12px] text-[var(--text3)]">
                      {entry.actorEmail || entry.actorUserId || "System"}
                      {` · ${entry.entityName || entry.entityType}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Pill tone={auditTone(entry.status)}>{entry.status}</Pill>
                    <span className="hidden font-[family-name:var(--mono)] text-[11.5px] tabular-nums text-[var(--text3)] sm:inline">
                      <Timestamp value={entry.createdAt} />
                    </span>
                  </div>
                </SheetListItem>
              ))}
            </SheetList>
          )}
        </Sheet>

        <Sheet
          title="Security signals"
          description="Latest authentication and privilege events."
          actions={
            <TextLink to={href("security-events")} size="sm" arrow>
              All events
            </TextLink>
          }
        >
          {securityLoading ? (
            <SheetLoading rows={4} label="Loading security signals" />
          ) : securityFailed ? (
            <SheetError
              title="Could not load security signals"
              message={apiErrorMessage(securityError, "The security events request failed.")}
              onRetry={() => void refetchSecurity()}
            />
          ) : recentSecurity.length === 0 ? (
            <SheetEmpty
              title="No security events"
              description="Failed sign-ins, MFA changes, and privilege escalations appear here when they happen."
            />
          ) : (
            <SheetList label="Recent security events">
              {recentSecurity.map((event) => (
                <SheetListItem key={event.id}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{event.eventType}</p>
                    <p className="mt-0.5 truncate font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">
                      {event.ipAddress ?? "No IP recorded"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Pill tone={SEVERITY_TONE[event.severity] ?? "neutral"} dot={event.severity === "critical"}>
                      {event.severity}
                    </Pill>
                    <span className="hidden font-[family-name:var(--mono)] text-[11.5px] tabular-nums text-[var(--text3)] sm:inline">
                      <Timestamp value={event.createdAt} />
                    </span>
                  </div>
                </SheetListItem>
              ))}
            </SheetList>
          )}
        </Sheet>
      </div>

      <section aria-labelledby="org-profile-heading" className={`${SETTINGS_COLUMN} flex flex-col gap-6 pt-2`}>
        <div>
          <h2 id="org-profile-heading" className="text-[15px] font-semibold tracking-[-0.015em] text-[var(--text)]">
            Profile and ownership
          </h2>
          <p className="mt-1 text-[13px] text-[var(--text2)]">How the organization appears to members and on billing documents.</p>
        </div>

        <Panel
          title="Organization profile"
          description="Shown to members and used on invoices."
          footer={
            <UiButton type="submit" form="org-profile-form" size="lg" disabled={savePending}>
              {savePending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              Save profile
            </UiButton>
          }
        >
          <form id="org-profile-form" action={saveAction} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <DialogField label="Organization name" name="org-name" required>
              <input id="org-name" name="name" defaultValue={org.name} className={fieldInputClass} required />
            </DialogField>
            <DialogField label="Slug" name="org-slug" hint="Used in every URL. Contact support to change it.">
              <input id="org-slug" value={org.slug} disabled readOnly className={fieldMonoClass} />
            </DialogField>
            <DialogField label="Logo URL" name="org-logo">
              <input id="org-logo" name="logoUrl" type="url" defaultValue={org.logoUrl || ""} className={fieldInputClass} placeholder="https://" />
            </DialogField>
            <DialogField label="Timezone" name="org-timezone" hint="Regional timezone for display and schedules. Default: Asia/Kolkata">
              <input id="org-timezone" name="timezone" defaultValue={org.timezone || "Asia/Kolkata"} className={fieldMonoClass} placeholder="Asia/Kolkata" />
            </DialogField>
          </form>
        </Panel>

        <Panel
          title="Ownership"
          description="The owner holds billing and can delete the organization. Only the current owner can hand it over."
          footer={
            isOwner ? (
              <UiButton
                variant="outline"
                size="lg"
                disabled={!newOwnerUserId || transferMutation.isPending}
                onClick={() => setConfirmKind("transfer")}
              >
                Transfer ownership
              </UiButton>
            ) : undefined
          }
        >
          {isOwner ? (
            <DialogField
              label="New owner"
              name="org-new-owner"
              hint={
                transferCandidates.length === 0
                  ? "Invite another member first. Ownership can only go to an active member."
                  : "You become an admin once the transfer completes."
              }
            >
              <select
                id="org-new-owner"
                value={newOwnerUserId}
                onChange={(event) => setNewOwnerUserId(event.target.value)}
                className={fieldInputClass}
                disabled={transferCandidates.length === 0}
              >
                <option value="">Select an active member</option>
                {transferCandidates.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.fullName || member.email} ({member.role})
                  </option>
                ))}
              </select>
            </DialogField>
          ) : (
            <p className="text-[13px] leading-[1.6] text-[var(--text2)]">
              Your role is <span className="text-[var(--text)]">{me?.role ?? "unknown"}</span>. Ask the owner to transfer
              ownership if the organization needs a new one.
            </p>
          )}
        </Panel>

        <Panel title="Danger zone" description="These actions change access for everyone in the organization." danger bodyClassName="p-0">
          <RowStack>
            <Row>
              <SettingRow label="Leave organization" description="Remove yourself from this organization. Your access ends immediately.">
                <UiButton variant="destructive" size="lg" disabled={leaveMutation.isPending} onClick={() => setConfirmKind("leave")}>
                  Leave organization
                </UiButton>
              </SettingRow>
            </Row>
            <Row>
              <SettingRow
                label={isArchived ? "Restore organization" : "Archive organization"}
                description={
                  isArchived
                    ? "Bring the organization back online for every member."
                    : "Suspend all resources and member access. Billing is paused."
                }
              >
                <UiButton
                  variant={isArchived ? "outline" : "destructive"}
                  size="lg"
                  disabled={statusMutation.isPending}
                  onClick={() => setConfirmKind(isArchived ? "restore" : "archive")}
                >
                  {isArchived ? "Restore organization" : "Archive organization"}
                </UiButton>
              </SettingRow>
            </Row>
          </RowStack>
        </Panel>
      </section>

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
          {org.name} <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">@{org.slug}</span>
        </p>
      </ConfirmDialog>
    </WorkspacePage>
  );
}
