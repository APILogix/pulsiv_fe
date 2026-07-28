import { Link } from "react-router";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Clock,
  Database,
  HardDrive,
  KeyRound,
  Layers,
  Settings,
  ShieldCheck,
  Sliders,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useProjectOverview, useProjectStats } from "@/modules/projects/hooks/useProjects";
import { useCurrentProject } from "./ProjectShellPage";
import {
  KeyValueGrid,
  Panel,
  Pill,
  Sparkline,
  StatCard,
  type KeyValueItem,
} from "@/shared/ui/pulse";
import { DetailSkeleton, Timestamp, formatBytes, formatCompact, formatNumber } from "@/shared/observe";
import { AsyncPanel } from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md) ────────────────────────

const INGESTION_TOGGLES = [
  { key: "errorMonitoringEnabled", label: "Errors" },
  { key: "performanceMonitoringEnabled", label: "Performance" },
  { key: "logIngestionEnabled", label: "Logs" },
  { key: "metricIngestionEnabled", label: "Metrics" },
  { key: "traceIngestionEnabled", label: "Traces" },
  { key: "profileIngestionEnabled", label: "Profiles" },
  { key: "sessionReplayEnabled", label: "Replay" },
  { key: "releaseTrackingEnabled", label: "Releases" },
] as const;

const QUICK_ACTIONS = [
  { label: "Analytics", icon: BarChart3, segment: "analytics", tone: "brand" },
  { label: "API keys", icon: KeyRound, segment: "api-keys", tone: "violet" },
  { label: "Members", icon: Users, segment: "members", tone: "green" },
  { label: "Settings", icon: Settings, segment: "settings/general", tone: "neutral" },
] as const;

// ── hourly bars chart ────────────────────────────────────────

function HourlyChart({ hours }: { hours: Array<{ hour: number; eventCount: number }> }) {
  const byHour = new Array(24).fill(0);
  for (const entry of hours) byHour[entry.hour] = entry.eventCount;
  const max = Math.max(...byHour, 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-32 items-end gap-[3px]">
        {byHour.map((value, hour) => {
          const pct = (value / max) * 100;
          return (
            <div
              key={hour}
              title={`${String(hour).padStart(2, "0")}:00 - ${formatNumber(value)} events`}
              className="group relative flex-1 overflow-hidden rounded-t-[4px] bg-[var(--bg3)] transition-colors"
              style={{ height: "100%" }}
            >
              <div
                className="absolute bottom-0 w-full rounded-t-[4px] bg-gradient-to-t from-[var(--brand)] to-[var(--brand)]/60 transition-[height] duration-500"
                style={{ height: `${Math.max(pct, value > 0 ? 4 : 0)}%` }}
              />
              <div className="absolute inset-0 bg-white/0 transition-colors group-hover:bg-white/10" />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between font-[family-name:var(--mono)] text-[10px] text-[var(--text3)]">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>
    </div>
  );
}

// ── breakdown component ──────────────────────────────────────

function Breakdown({ data, emptyLabel }: { data: Record<string, number>; emptyLabel: string }) {
  const entries = Object.entries(data ?? {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (entries.length === 0) {
    return <p className="py-4 text-center text-[12.5px] text-[var(--text3)]">{emptyLabel}</p>;
  }

  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <ul className="flex flex-col gap-3">
      {entries.map(([key, value]) => (
        <li key={key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[12.5px] text-[var(--text2)]">{key.replace(/_/g, " ")}</span>
            <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-[var(--text)]">
              {formatCompact(value)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg3)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand)]/60 transition-[width] duration-700"
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectOverviewPage() {
  const { projectId, project } = useCurrentProject();
  const { data: overview, isLoading, error } = useProjectOverview(projectId);
  const { data: stats } = useProjectStats(projectId);

  if (isLoading) return <DetailSkeleton />;

  if (error || !overview) {
    return (
      <AsyncPanel title="Project overview" error={error ?? new Error("Overview unavailable")}>
        <span />
      </AsyncPanel>
    );
  }

  const usage = overview.usage;
  const settings = overview.settings;
  const trend = (usage.dailyTrend ?? []).map((p) => p.totalEvents);
  const latestTrend = usage.dailyTrend?.[usage.dailyTrend.length - 1];

  const details: KeyValueItem[] = [
    { label: "Slug", value: <code className="font-[family-name:var(--mono)]">{overview.project.slug}</code> },
    { label: "Visibility", value: <span className="capitalize">{overview.project.visibility}</span> },
    { label: "Timezone", value: overview.project.timezone },
    { label: "Environments", value: formatNumber(stats?.stats.environmentCount ?? 0) },
    { label: "Total requests", value: formatCompact(stats?.stats.totalRequests ?? 0) },
    { label: "Created", value: <Timestamp value={overview.project.createdAt} /> },
    { label: "Updated", value: <Timestamp value={overview.project.updatedAt} /> },
    {
      label: "Archived",
      value: overview.project.archivedAt ? <Timestamp value={overview.project.archivedAt} /> : "Never",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── bento stat grid (asymmetric) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Events today"
          value={formatCompact(usage.totalEventsToday ?? 0)}
          icon={Activity}
          tone="brand"
          series={trend.length > 1 ? trend : undefined}
          {...(latestTrend
            ? {
                trend: latestTrend.changePercent > 0 ? "up" : latestTrend.changePercent < 0 ? "down" : "flat",
                delta: `${latestTrend.changePercent > 0 ? "+" : ""}${latestTrend.changePercent.toFixed(1)}%`,
              }
            : {})}
        />
        <StatCard
          label="Data ingested"
          value={formatBytes(usage.totalBytesToday ?? 0)}
          icon={HardDrive}
          tone="blue"
          footnote={`Peak at ${String(usage.peakHour ?? 0).padStart(2, "0")}:00`}
        />
        <StatCard
          label="Current hour"
          value={formatCompact(usage.currentHourEvents ?? 0)}
          icon={Clock}
          tone="violet"
          footnote="Active hourly bucket"
        />
        <StatCard
          label="Team"
          value={formatNumber(overview.memberCount ?? 0)}
          icon={Users}
          tone="green"
          footnote={`${formatNumber(overview.apiKeyCount ?? 0)} API keys`}
        />
      </div>

      {/* ── main content area (2-col bento) ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* left column - stacked */}
        <div className="flex flex-col gap-6">
          {/* hourly traffic */}
          <Panel
            title="Hourly ingestion"
            description="Event volume per hour in the project timezone."
            icon={BarChart3}
            actions={
              <Link
                to={`/projects/${projectId}/analytics`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand)]/10 px-3 py-1 text-[11.5px] font-medium text-[var(--brand)] transition-colors hover:bg-[var(--brand)]/20"
              >
                Full analytics <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            }
          >
            {usage.hourlyBreakdown?.length ? (
              <HourlyChart hours={usage.hourlyBreakdown} />
            ) : (
              <div className="flex flex-col items-center gap-2 py-10">
                <Zap className="size-8 text-[var(--text3)]" />
                <p className="text-[13px] text-[var(--text3)]">No events ingested today</p>
              </div>
            )}
          </Panel>

          {/* breakdowns in 2-col */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="By category" icon={Layers}>
              <Breakdown data={usage.categoryBreakdown} emptyLabel="No categorised events today." />
            </Panel>
            <Panel title="By event type" icon={Database}>
              <Breakdown data={usage.eventTypeBreakdown} emptyLabel="No typed events today." />
            </Panel>
          </div>
        </div>

        {/* right column - stacked */}
        <div className="flex flex-col gap-6">
          {/* daily trend sparkline */}
          <Panel title="7-day trend" icon={TrendingUp}>
            {trend.length > 1 ? (
              <div className="flex flex-col gap-4">
                <Sparkline data={trend} height={64} />
                <ul className="flex flex-col divide-y divide-[var(--border)]">
                  {(usage.dailyTrend ?? [])
                    .slice(-5)
                    .reverse()
                    .map((point) => (
                      <li key={point.date} className="flex items-center justify-between gap-2 py-2">
                        <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                          {point.date}
                        </span>
                        <span className="text-[12px] font-semibold tabular-nums text-[var(--text)]">
                          {formatCompact(point.totalEvents)}
                        </span>
                        <span
                          className={cn(
                            "w-14 text-right text-[11px] font-semibold tabular-nums",
                            point.changePercent > 0
                              ? "text-[var(--green)]"
                              : point.changePercent < 0
                                ? "text-[var(--red)]"
                                : "text-[var(--text3)]",
                          )}
                        >
                          {point.changePercent > 0 ? "+" : ""}
                          {point.changePercent.toFixed(1)}%
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ) : (
              <p className="py-6 text-center text-[12.5px] text-[var(--text3)]">Not enough history yet.</p>
            )}
          </Panel>

          {/* quick actions */}
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.segment}
                to={`/projects/${projectId}/${action.segment}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg1)] p-4 text-center transition-all hover:border-[var(--brand)]/30 hover:shadow-sm"
              >
                <action.icon className="size-5 text-[var(--text2)]" aria-hidden="true" />
                <span className="text-[12px] font-medium text-[var(--text)]">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── configuration section (full width bento) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Ingestion pipelines"
          description="Active telemetry types for this project."
          icon={ShieldCheck}
          actions={
            <Link
              to={`/projects/${projectId}/settings/general`}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand)] hover:underline"
            >
              Edit <Sliders className="size-3" aria-hidden="true" />
            </Link>
          }
        >
          <div className="flex flex-wrap gap-2">
            {INGESTION_TOGGLES.map((toggle) => {
              const enabled = Boolean(settings?.[toggle.key]);
              return (
                <span
                  key={toggle.key}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium ring-1 ring-inset",
                    enabled
                      ? "bg-[var(--green)]/8 text-[var(--green)] ring-[var(--green)]/20"
                      : "bg-[var(--bg2)] text-[var(--text3)] ring-[var(--border)]",
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", enabled ? "bg-[var(--green)]" : "bg-[var(--text3)]")} aria-hidden="true" />
                  {toggle.label}
                </span>
              );
            })}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-[var(--bg2)]/50 p-4">
            <div>
              <dt className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--text3)]">Retention</dt>
              <dd className="mt-1 text-[18px] font-bold tabular-nums text-[var(--text)]">
                {settings?.dataRetentionDays ?? "-"}<span className="ml-1 text-[12px] font-normal text-[var(--text3)]">days</span>
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--text3)]">Sampling</dt>
              <dd className="mt-1 text-[18px] font-bold tabular-nums text-[var(--text)]">
                {settings ? `${(settings.samplingRate * 100).toFixed(0)}` : "-"}<span className="ml-1 text-[12px] font-normal text-[var(--text3)]">%</span>
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--text3)]">PII scrubbing</dt>
              <dd className="mt-1">
                <Pill tone={settings?.piiScrubbingEnabled ? "green" : "amber"}>
                  {settings?.piiScrubbingEnabled ? "Active" : "Off"}
                </Pill>
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--text3)]">IP collection</dt>
              <dd className="mt-1">
                <Pill tone={settings?.ipCollectionEnabled ? "amber" : "green"}>
                  {settings?.ipCollectionEnabled ? "Enabled" : "Disabled"}
                </Pill>
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Project details" icon={KeyRound}>
          <KeyValueGrid items={details} columns={2} />
          {project.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-[var(--brand)]/8 px-2.5 py-0.5 text-[11px] font-medium text-[var(--brand)] ring-1 ring-inset ring-[var(--brand)]/15"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
