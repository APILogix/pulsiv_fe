import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { PageHeader, KpiCard, SectionCard, formatCompact } from "@/shared/observe";
import { AreaChart, Heatmap } from "@/pages/dashboards/widgets";
import { Loader2 } from "lucide-react";

function buildHeatmapRows(activity: { date: string; events: number }[]) {
  const byDay = new Map(activity.map((day) => [day.date.slice(0, 10), day.events]));
  const rows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => ({ label, cells: [] as number[] }));
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - 83);

  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const iso = day.toISOString().slice(0, 10);
    rows[day.getDay()].cells.push(byDay.get(iso) ?? 0);
  }

  return rows;
}

export default function BillingUsagePage() {
  const { activeOrgId } = useOrganizations();

  const { data: usageOverview, isLoading: isUsageLoading } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "usageOverview"],
    queryFn: () => orgApi.getBillingUsageOverview(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: limits, isLoading: isLimitsLoading } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "usageLimits"],
    queryFn: () => orgApi.getUsageLimits(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const eventSeries = useMemo(
    () => usageOverview?.activity.map((day) => day.events) ?? [],
    [usageOverview],
  );

  const heatmapRows = useMemo(
    () => buildHeatmapRows(usageOverview?.activity ?? []),
    [usageOverview],
  );

  if (isUsageLoading || isLimitsLoading) {
    return <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" /></div>;
  }

  if (!usageOverview || !limits) {
    return <div className="text-sm text-[var(--text2)]">Usage data unavailable.</div>;
  }

  const limitCards = [
    { label: "Members", used: limits.limits.members.used ?? 0, limit: limits.limits.members.limit, pending: limits.limits.members.pending ?? 0 },
    { label: "API keys", used: limits.limits.apiKeys.used ?? 0, limit: limits.limits.apiKeys.limit },
    { label: "Environments", used: limits.limits.environments.used ?? 0, limit: limits.limits.environments.limit },
    { label: "SCIM tokens", used: limits.limits.scimTokens.used ?? 0, limit: limits.limits.scimTokens.limit },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Usage" description="Daily organization usage, activity patterns, and current limits." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Events today" value={formatCompact(usageOverview.summary.todayEvents)} />
        <KpiCard label="Events MTD" value={formatCompact(usageOverview.summary.monthToDateEvents)} />
        <KpiCard label="Remaining this month" value={usageOverview.summary.remainingEvents === null || usageOverview.summary.remainingEvents === -1 ? "∞" : formatCompact(usageOverview.summary.remainingEvents)} />
        <KpiCard label="Month-end forecast" value={formatCompact(Math.round(usageOverview.summary.projectedMonthEndEvents))} />
      </div>

      <SectionCard title="Events over time">
        <div className="mb-4 grid grid-cols-1 gap-3 text-sm text-[var(--text2)] md:grid-cols-3">
          <div>Current cycle: {new Date(usageOverview.periodStart).toLocaleDateString()} to {new Date(usageOverview.periodEnd).toLocaleDateString()}</div>
          <div>Percent used: {usageOverview.summary.percentUsed.toFixed(1)}%</div>
          <div>Monthly cap: {usageOverview.summary.eventLimitMonthly === null || usageOverview.summary.eventLimitMonthly === -1 ? "∞" : formatCompact(usageOverview.summary.eventLimitMonthly)}</div>
        </div>
        <AreaChart data={eventSeries} color="var(--brand)" height={220} label="billing-usage-events" />
      </SectionCard>

      <SectionCard title="Activity calendar">
        <p className="mb-4 text-sm text-[var(--text2)]">Last 12 weeks of event usage, shown day-by-day like an activity graph.</p>
        <Heatmap rows={heatmapRows} columns={12} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {limitCards.map((card) => (
          <SectionCard key={card.label}>
            <div className="text-sm font-medium text-[var(--text)]">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold text-[var(--text)]">
              {formatCompact(card.used)}
              <span className="ml-2 text-sm font-normal text-[var(--text3)]">/ {card.limit === null || card.limit === -1 ? "∞" : formatCompact(card.limit)}</span>
            </div>
            {"pending" in card && card.pending ? <div className="mt-2 text-xs text-[var(--text3)]">Pending: {formatCompact(card.pending)}</div> : null}
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
