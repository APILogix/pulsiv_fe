import { useMemo } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, Clock, ShieldAlert, UserPlus } from "lucide-react";

import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { Button, KpiCard, PageHeader, SectionCard, StatusBadge, Timestamp } from "@/shared/observe";
import { RouteLoadingRegion } from "@/shared/ui/loading";

function initials(name?: string | null) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

export default function OrgOverviewPage() {
  const { activeOrgId } = useOrganizations();

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: orgQueryKeys.detail(activeOrgId!),
    queryFn: () => orgApi.getOrganization(activeOrgId!),
    enabled: !!activeOrgId,
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

  const { data: currentUsage } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "currentUsage"],
    queryFn: () => orgApi.getCurrentUsage(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: sso } = useQuery({
    queryKey: orgQueryKeys.sso(activeOrgId!),
    queryFn: () => orgApi.listSsoProviders(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: auditLogs } = useQuery({
    queryKey: [...orgQueryKeys.auditLogs(activeOrgId!), "overview"],
    queryFn: () => orgApi.listAuditLogs(activeOrgId!, { limit: 5 }),
    enabled: !!activeOrgId,
  });

  const eventLimit = currentUsage?.eventLimit ?? billing?.plan.eventLimitMonthly ?? 0;
  const eventsUsed = Number(currentUsage?.eventsUsed ?? 0);
  const quotaPercent = eventLimit > 0 ? Math.min(100, Math.round((eventsUsed / eventLimit) * 100)) : 0;
  const planLabel = billing?.plan.tier || billing?.plan.key || "active";
  const activeSso = useMemo(() => (sso || []).find((provider) => provider.isActive), [sso]);

  if (orgLoading || !org) {
    return <RouteLoadingRegion label="Loading organization overview" />;
  }

  return (
    <div className="flex w-full max-w-[1120px] flex-col gap-5">
      <PageHeader
        title="Organization Dashboard"
        description="Organization health, access, security, and usage at a glance."
        actions={
          <div className="flex gap-2">
            <Link to="/admin/team">
              <Button variant="primary">
                <UserPlus className="size-4" />
                Invite member
              </Button>
            </Link>
            <Link to="/billing/usage">
              <Button>View usage</Button>
            </Link>
            <Link to="/admin/sso">
              <Button>Configure SSO</Button>
            </Link>
          </div>
        }
      />

      <SectionCard>
        <div className="flex flex-wrap items-center gap-4">
          {org.logoUrl ? (
            <img src={org.logoUrl} alt="" className="size-10 rounded-[8px] object-cover" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-[8px] bg-[var(--brand-bg)] text-sm font-semibold text-[var(--brand)]">
              {initials(org.name)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-[var(--text)]">{org.name}</h2>
              <StatusBadge status={planLabel} />
            </div>
            <div className="text-sm text-[var(--text2)]">@{org.slug}</div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <SectionCard title="Usage Quotas">
          <div className="flex flex-col gap-4">
            <div className="rounded-[8px] border border-[var(--border)] bg-transparent p-4">
              <div className="mb-3 flex items-center justify-between font-[family-name:var(--mono)]">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text3)]">Ingest Quota</span>
                <span className="text-sm font-bold text-[var(--text)]">{quotaPercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg3)]">
                <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${quotaPercent}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-[12px] text-[var(--text3)]">
                <span>{(eventsUsed / 1000).toFixed(1)}k / {(eventLimit / 1000).toFixed(0)}k events</span>
                <span>resets in current period</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Members" value={billing?.usage.activeMembers ?? "-"} />
              <KpiCard label="Pending invites" value={billing?.usage.pendingInvitations ?? "-"} />
              <KpiCard label="API keys" value={billing?.usage.apiKeys ?? "-"} />
              <KpiCard label="Monitors" value={billing?.usage.environments ?? "-"} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Security Status">
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-[8px] bg-[var(--bg2)] px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm text-[var(--text2)]">
                {activeSso ? <CheckCircle2 className="size-4 text-[var(--green)]" /> : <ShieldAlert className="size-4 text-[var(--amber)]" />}
                SSO
              </span>
              <span className="text-sm font-medium text-[var(--text)]">{activeSso ? `Active: ${activeSso.providerName}` : "Off"}</span>
            </div>
            <div className="flex items-center justify-between rounded-[8px] bg-[var(--bg2)] px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm text-[var(--text2)]">
                {settings?.enforceMfa ? <CheckCircle2 className="size-4 text-[var(--green)]" /> : <ShieldAlert className="size-4 text-[var(--amber)]" />}
                MFA required
              </span>
              <span className="text-sm font-medium text-[var(--text)]">{settings?.enforceMfa ? "Yes" : "No"}</span>
            </div>
            <div className="flex items-center justify-between rounded-[8px] bg-[var(--bg2)] px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm text-[var(--text2)]">
                <Clock className="size-4 text-[var(--text3)]" />
                Pending invites
              </span>
              <span className="text-sm font-medium text-[var(--text)]">{billing?.usage.pendingInvitations ?? 0}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Recent Activity">
        {(auditLogs?.data ?? []).length > 0 ? (
          <div className="divide-y divide-[var(--border)]">
            {auditLogs!.data.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-[var(--text)]">{event.action}</div>
                  <div className="truncate text-[13px] text-[var(--text2)]">
                    {event.actorEmail || "System"} {event.entityName ? `-> ${event.entityName}` : event.entityType}
                  </div>
                </div>
                <Timestamp value={new Date(event.createdAt).getTime()} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-[var(--text2)]">
            <Activity className="size-4 text-[var(--text3)]" />
            No recent activity
          </div>
        )}
      </SectionCard>
    </div>
  );
}
