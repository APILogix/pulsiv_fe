import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CalendarDays, Gauge, LineChart, TrendingUp, TriangleAlert } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { AreaChart, Heatmap } from "@/pages/dashboards/widgets";
import { formatCompact, formatDate, formatNumber } from "@/shared/observe";
import {
  HeroFacts,
  Meter,
  Notice,
  PageHero,
  Panel,
  Ring,
  SegmentedControl,
  StatCard,
  type HeroFact,
  type SegmentOption,
} from "@/shared/ui/pulse";

/* ── Local read-shape for the usage-limits payload ─────────────────
   The API layer is untouched; the endpoint returns more buckets than the
   shared type declares, so the page reads them defensively. */
interface LimitBucket {
  used?: number | null;
  pending?: number | null;
  limit?: number | null;
  remaining?: number | null;
  enabled?: boolean;
}

type LimitKey =
  | "members"
  | "projects"
  | "apiKeys"
  | "connectors"
  | "alertRules"
  | "dashboards"
  | "ssoProviders"
  | "scimTokens";

interface UsageLimits {
  limits?: Partial<Record<LimitKey | "eventsMonthly" | "aiCredits", LimitBucket>>;
}

type RangeKey = "28" | "56" | "84";

const RANGE_OPTIONS: SegmentOption<RangeKey>[] = [
  { value: "28", label: "28 days" },
  { value: "56", label: "56 days" },
  { value: "84", label: "84 days" },
];

const DIMENSIONS: { key: LimitKey; label: string }[] = [
  { key: "members", label: "Team seats" },
  { key: "projects", label: "Projects" },
  { key: "apiKeys", label: "API keys" },
  { key: "connectors", label: "Connectors" },
  { key: "alertRules", label: "Alert rules" },
  { key: "dashboards", label: "Dashboards" },
  { key: "ssoProviders", label: "SSO providers" },
  { key: "scimTokens", label: "SCIM tokens" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SKELETON_KEYS = ["a", "b", "c", "d"];
const UNLIMITED_SENTINEL = 999_999_999;

function normalizeLimit(limit: number | null | undefined): number | null {
  if (limit === null || limit === undefined) return null;
  if (limit === -1 || limit >= UNLIMITED_SENTINEL) return null;
  return limit;
}

function formatLimit(limit: number | null | undefined): string {
  const normalized = normalizeLimit(limit);
  return normalized === null ? "∞" : formatCompact(normalized);
}

function buildHeatmapRows(activity: { date: string; events: number }[]) {
  const byDay = new Map(activity.map((day) => [day.date.slice(0, 10), day.events]));
  const rows = WEEKDAYS.map((label) => ({ label, cells: [] as number[] }));
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

function UsageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Usage" icon={LineChart}>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </Panel>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-[132px] w-full rounded-[14px]" />
        ))}
      </div>
      <Panel title="Events over time" icon={Activity}>
        <Skeleton className="h-[220px] w-full rounded-[12px]" />
      </Panel>
    </div>
  );
}

export default function BillingUsagePage() {
  const { activeOrgId } = useOrganizations();
  const [range, setRange] = useState<RangeKey>("28");

  const { data: currentUsage, isLoading: isUsageLoading } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "currentUsage"],
    queryFn: () => orgApi.getCurrentUsage(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: dailyUsage, isLoading: isDailyLoading } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "dailyUsage"],
    queryFn: () => orgApi.getDailyUsage(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: limits, isLoading: isLimitsLoading } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "usageLimits"],
    queryFn: () => orgApi.getUsageLimits(activeOrgId!),
    enabled: !!activeOrgId,
  });

  if (isUsageLoading || isDailyLoading || isLimitsLoading) return <UsageSkeleton />;

  if (!currentUsage || !dailyUsage || !limits) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          eyebrow="Consumption"
          title="Usage"
          description="Daily ingestion volume, metered dimensions, and quota headroom for this organization."
          icon={LineChart}
        />
        <Notice tone="red" icon={TriangleAlert} title="Usage data unavailable">
          We could not load consumption for this organization. Refresh the page or try again shortly.
        </Notice>
      </div>
    );
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const dayOfMonth = now.getDate();
  const daysInMonth = periodEnd.getDate();

  const activity = dailyUsage.map((day) => ({ date: day.date, events: day.eventsCount }));
  const todayEvents = activity.find((day) => day.date.startsWith(today))?.events ?? 0;
  const monthToDateEvents = currentUsage.eventsUsed ?? 0;
  const eventCeiling = normalizeLimit(currentUsage.eventLimit);
  const remainingEvents = normalizeLimit(currentUsage.remainingEvents);
  const percentUsed = eventCeiling && eventCeiling > 0 ? (monthToDateEvents / eventCeiling) * 100 : 0;
  // Run-rate projection: month-to-date volume extrapolated across the cycle.
  const projectedMonthEnd = Math.round((monthToDateEvents / Math.max(1, dayOfMonth)) * daysInMonth);

  const eventSeries = activity.map((day) => day.events);
  const rangeSeries = eventSeries.slice(-Number(range));
  const recentSeries = eventSeries.slice(-14);
  const heatmapRows = buildHeatmapRows(activity);

  const bucketMap = (limits as unknown as UsageLimits).limits ?? {};
  const meteredDimensions = DIMENSIONS.map((dimension) => ({
    ...dimension,
    bucket: bucketMap[dimension.key],
  })).filter((dimension) => dimension.bucket !== undefined);

  const facts: HeroFact[] = [
    {
      label: "Billing cycle",
      value: `${formatDate(periodStart)} – ${formatDate(periodEnd)}`,
      icon: CalendarDays,
    },
    {
      label: "Cycle used",
      value: eventCeiling ? `${percentUsed.toFixed(1)}%` : "Uncapped",
      tone: percentUsed >= 90 ? "red" : percentUsed >= 75 ? "amber" : "neutral",
      icon: Gauge,
    },
    { label: "Monthly cap", value: formatLimit(currentUsage.eventLimit), icon: Activity },
    { label: "Day of cycle", value: `${dayOfMonth} / ${daysInMonth}`, icon: CalendarDays },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Consumption"
        title="Usage"
        description="Daily ingestion volume, metered dimensions, and quota headroom for this organization."
        icon={LineChart}
      >
        <HeroFacts facts={facts} />
      </PageHero>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Events today"
          value={formatCompact(todayEvents)}
          icon={Activity}
          tone="brand"
          series={recentSeries}
          footnote="Ingested since midnight UTC"
        />
        <StatCard
          label="Events month to date"
          value={formatCompact(monthToDateEvents)}
          icon={Gauge}
          tone="blue"
          series={rangeSeries}
          footnote={eventCeiling ? `${percentUsed.toFixed(1)}% of the monthly cap` : "No monthly cap applied"}
        />
        <StatCard
          label="Remaining this cycle"
          value={remainingEvents === null ? "∞" : formatCompact(remainingEvents)}
          icon={TrendingUp}
          tone={percentUsed >= 90 ? "red" : percentUsed >= 75 ? "amber" : "green"}
          footnote={`${daysInMonth - dayOfMonth} days left in the cycle`}
        />
        <StatCard
          label="Projected month end"
          value={formatCompact(projectedMonthEnd)}
          icon={TrendingUp}
          tone="violet"
          footnote="Run-rate projection from month-to-date volume"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_324px]">
        <Panel
          title="Events over time"
          description="Daily ingestion volume for this organization."
          icon={Activity}
          actions={
            <SegmentedControl value={range} onChange={setRange} options={RANGE_OPTIONS} ariaLabel="Chart range" />
          }
        >
          <AreaChart data={rangeSeries} color="var(--brand)" height={220} label="billing-usage-events" />
        </Panel>

        <Panel title="Cycle consumption" description="Monthly event quota burned so far." icon={Gauge}>
          <div className="flex flex-col items-center gap-4">
            <Ring
              value={eventCeiling ? Math.min(monthToDateEvents, eventCeiling) : 0}
              max={eventCeiling ?? 100}
              size={132}
              label={eventCeiling ? `${percentUsed.toFixed(0)}%` : "∞"}
              sublabel={eventCeiling ? "of cap" : "uncapped"}
            />
            <dl className="w-full">
              <div className="flex items-baseline justify-between gap-3 border-t border-[var(--border)] py-2">
                <dt className="text-[12.5px] text-[var(--text2)]">Used</dt>
                <dd className="font-[family-name:var(--mono)] text-[12.5px] font-semibold tabular-nums text-[var(--text)]">
                  {formatNumber(monthToDateEvents)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-[var(--border)] py-2">
                <dt className="text-[12.5px] text-[var(--text2)]">Remaining</dt>
                <dd className="font-[family-name:var(--mono)] text-[12.5px] font-semibold tabular-nums text-[var(--text)]">
                  {remainingEvents === null ? "∞" : formatNumber(remainingEvents)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-[var(--border)] py-2">
                <dt className="text-[12.5px] text-[var(--text2)]">Cap</dt>
                <dd className="font-[family-name:var(--mono)] text-[12.5px] font-semibold tabular-nums text-[var(--text)]">
                  {formatLimit(currentUsage.eventLimit)}
                </dd>
              </div>
            </dl>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Panel
          title="Metered dimensions"
          description="Resource counts against the ceilings granted by this plan."
          icon={Gauge}
        >
          <div className="flex flex-col gap-5">
            <Meter
              label="Monthly events"
              used={monthToDateEvents}
              limit={eventCeiling}
              format={formatCompact}
              hint={remainingEvents === null ? "No monthly cap applied" : `${formatCompact(remainingEvents)} remaining`}
            />
            <Meter
              label="AI credits"
              used={currentUsage.aiCreditsUsed ?? 0}
              limit={normalizeLimit(currentUsage.aiCreditLimit)}
              format={formatCompact}
              hint={
                normalizeLimit(currentUsage.aiCreditLimit) === null
                  ? "No credit cap applied"
                  : `${formatCompact(currentUsage.remainingAiCredits ?? 0)} credits remaining`
              }
            />
            {meteredDimensions.map((dimension) => (
              <Meter
                key={dimension.key}
                label={dimension.label}
                used={dimension.bucket?.used ?? 0}
                limit={normalizeLimit(dimension.bucket?.limit)}
                format={formatNumber}
                hint={
                  dimension.bucket?.pending
                    ? `${formatNumber(dimension.bucket.pending)} pending`
                    : dimension.bucket?.enabled === false
                      ? "Not included in this plan"
                      : undefined
                }
              />
            ))}
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel
            title="Activity calendar"
            description="Last 12 weeks of ingestion, day by day."
            icon={CalendarDays}
          >
            <Heatmap rows={heatmapRows} columns={12} />
          </Panel>

          <Panel title="Forecast" description="Where this cycle lands at the current run rate." icon={TrendingUp}>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">
                  Projected total
                </dt>
                <dd className="font-[family-name:var(--display)] text-[19px] font-semibold tabular-nums text-[var(--text)]">
                  {formatNumber(projectedMonthEnd)}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">
                  Daily run rate
                </dt>
                <dd className="font-[family-name:var(--display)] text-[19px] font-semibold tabular-nums text-[var(--text)]">
                  {formatNumber(Math.round(monthToDateEvents / Math.max(1, dayOfMonth)))}
                </dd>
              </div>
            </dl>
            {eventCeiling && projectedMonthEnd > eventCeiling ? (
              <Notice
                tone="amber"
                icon={TriangleAlert}
                title="Projected to exceed the monthly cap"
                className="mt-4"
              >
                At the current run rate this cycle lands near {formatCompact(projectedMonthEnd)} events, above the{" "}
                {formatCompact(eventCeiling)} cap.
              </Notice>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}
