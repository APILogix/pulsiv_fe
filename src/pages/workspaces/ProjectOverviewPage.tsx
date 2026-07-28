import { Link } from "react-router";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Clock,
  Database,
  HardDrive,
  KeyRound,
  Layers,
  ShieldCheck,
  Sliders,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { useProjectOverview, useProjectStats } from "@/modules/projects/hooks/useProjects";
import { useCurrentProject } from "./ProjectShellPage";
import {
  IconChip,
  KeyValueGrid,
  Panel,
  Pill,
  SectionHeading,
  Sparkline,
  StatCard,
  type KeyValueItem,
} from "@/shared/ui/pulse";
import { DetailSkeleton, Timestamp, formatBytes, formatCompact, formatNumber } from "@/shared/observe";
import { AsyncPanel } from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md §1.2) ───────────────────

const INGESTION_TOGGLES = [
  { key: "errorMonitoringEnabled", label: "Errors" },
  { key: "performanceMonitoringEnabled", label: "Performance" },
  { key: "logIngestionEnabled", label: "Logs" },
  { key: "metricIngestionEnabled", label: "Metrics" },
  { key: "traceIngestionEnabled", label: "Traces" },
  { key: "profileIngestionEnabled", label: "Profiles" },
  { key: "sessionReplayEnabled", label: "Session replay" },
  { key: "releaseTrackingEnabled", label: "Release tracking" },
] as const;

const QUICK_ACTIONS = [
  {
    icon: KeyRound,
    label: "Create an API key",
    description: "Generate a new ingestion key for your SDK",
    to: "api-keys",
    tone: "brand" as const,
  },
  {
    icon: UserPlus,
    label: "Add a member",
    description: "Invite collaborators to this project",
    to: "members",
    tone: "violet" as const,
  },
  {
    icon: Bell,
    label: "Configure alerts",
    description: "Set up notification rules and channels",
    to: "alert-channels",
    tone: "amber" as const,
  },
  {
    icon: Zap,
    label: "Set up a connector",
    description: "Route events to external services",
    to: "connectors",
    tone: "green" as const,
  },
];

// ── hourly distribution ──────────────────────────────────────

function HourlyBars({ hours }: { hours: Array<{ hour: number; eventCount: number }> }) {
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
              className="group relative flex-1"
              style={{ height: "100%" }}
            >
              {/* background track */}
              <div className="absolute inset-0 rounded-t-[4px] bg-[var(--bg3)]/50" />
              {/* filled bar with gradient */}
              <div
                className="absolute bottom-0 w-full rounded-t-[4px] transition-[height] duration-500"
                style={{
                  height: `${Math.max(pct, value > 0 ? 4 : 0)}%`,
                  background: "linear-gradient(to top, var(--brand), color-mix(in srgb, var(--brand) 40%, transparent))",
                }}
              />
              {/* hover tooltip */}
              <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[6px] bg-[var(--bg1)] px-2 py-1 text-[10.5px] font-medium tabular-nums text-[var(--text)] opacity-0 shadow-lg ring-1 ring-[var(--border)] transition-opacity group-hover:opacity-100">
                {String(hour).padStart(2, "0")}:00 &middot; {formatNumber(value)}
              </div>
              {/* hover highlight */}
              <div className="absolute inset-0 rounded-t-[4px] bg-[var(--brand)]/0 transition-colors group-hover:bg-[var(--brand)]/10" />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between font-[family-name:var(--mono)] text-[10.5px] text-[var(--text3)]">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>
    </div>
  );
}

// ── breakdown list ───────────────────────────────────────────

function Breakdown({ data, emptyLabel }: { data: Record<string, number>; emptyLabel: string }) {
  const entries = Object.entries(data ?? {})
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (entries.length === 0) {
    return <p className="py-2 text-[12.5px] text-[var(--text3)]">{emptyLabel}</p>;
  }

  const max = Math.max(...entries.map(([, value]) => value), 1);

  return (
    <ol className="flex flex-col gap-3">
      {entries.map(([key, value], index) => (
        <li key={key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="w-5 shrink-0 font-[family-name:var(--mono)] text-[10.5px] font-medium text-[var(--text3)]">
                #{index + 1}
              </span>
              <span className="truncate text-[12.5px] text-[var(--text2)]">{key.replace(/_/g, " ")}</span>
            </span>
            <span className="text-[12.5px] font-semibold tabular-nums text-[var(--text)]">
              {formatCompact(value)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg3)]">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-700 ease-out"
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
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
  const trend = (usage.dailyTrend ?? []).map((point) => point.totalEvents);
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
      value: overview.project.archivedAt ? <Timestamp value={overview.project.archivedAt} /> : "---",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* ── section: headline metrics ── */}
      <section className="flex flex-col gap-3">
        <SectionHeading title="At a glance" description="Key metrics from the current day" />
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
            label="Ingested today"
            value={formatBytes(usage.totalBytesToday ?? 0)}
            icon={HardDrive}
            tone="blue"
            footnote={`Peak hour ${String(usage.peakHour ?? 0).padStart(2, "0")}:00`}
          />
          <StatCard
            label="Current hour"
            value={formatCompact(usage.currentHourEvents ?? 0)}
            icon={Clock}
            tone="violet"
            footnote="Events in the active hourly bucket"
          />
          <StatCard
            label="Members"
            value={formatNumber(overview.memberCount ?? 0)}
            icon={Users}
            tone="green"
            footnote={`${formatNumber(overview.apiKeyCount ?? 0)} ingestion keys`}
          />
        </div>
      </section>

      {/* ── section: traffic shape ── */}
      <section className="flex flex-col gap-3">
        <SectionHeading title="Traffic" description="Ingestion patterns over the day" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Panel
            title="Hourly ingestion (today)"
            description="Event volume per hour in the project timezone."
            icon={BarChart3}
            actions={
              <Link
                to={`/projects/${projectId}/analytics`}
                className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--brand)] transition-colors hover:text-[var(--text)] hover:underline"
              >
                Full analytics <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            }
          >
            {usage.hourlyBreakdown?.length ? (
              <HourlyBars hours={usage.hourlyBreakdown} />
            ) : (
              <p className="py-6 text-center text-[12.5px] text-[var(--text3)]">
                No events ingested yet today.
              </p>
            )}
          </Panel>

          <Panel title="Daily trend" description="Rolling event volume." icon={Activity}>
            {trend.length > 1 ? (
              <div className="flex flex-col gap-3">
                <Sparkline data={trend} height={72} />
                <ul className="flex flex-col divide-y divide-[var(--border)]">
                  {(usage.dailyTrend ?? [])
                    .slice(-5)
                    .reverse()
                    .map((point) => (
                      <li key={point.date} className="flex items-center justify-between gap-3 py-2">
                        <span className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">
                          {point.date}
                        </span>
                        <span className="text-[12.5px] font-semibold tabular-nums text-[var(--text)]">
                          {formatCompact(point.totalEvents)}
                        </span>
                        <span
                          className={cn(
                            "w-16 text-right text-[11.5px] font-semibold tabular-nums",
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
        </div>
      </section>

      {/* ── section: breakdowns ── */}
      <section className="flex flex-col gap-3">
        <SectionHeading title="Breakdowns" description="Where today's events originate" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="By category" description="Share of today's ingestion." icon={Layers}>
            <Breakdown data={usage.categoryBreakdown} emptyLabel="No categorised events today." />
          </Panel>
          <Panel title="By event type" description="Top event types today." icon={Database}>
            <Breakdown data={usage.eventTypeBreakdown} emptyLabel="No typed events today." />
          </Panel>
        </div>
      </section>

      {/* ── section: quick actions ── */}
      <section className="flex flex-col gap-3">
        <SectionHeading title="Quick actions" description="Common next steps for this project" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={`/projects/${projectId}/${action.to}`}
              className="group flex items-start gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-all hover:border-[var(--border2)] hover:bg-[var(--bg2)]/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <IconChip icon={action.icon} tone={action.tone} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[var(--text)] group-hover:text-[var(--brand)]">
                  {action.label}
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text3)]">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── section: configuration snapshot ── */}
      <section className="flex flex-col gap-3">
        <SectionHeading title="Configuration" description="Project settings and details" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Panel
            title="Ingestion pipelines"
            description="Which telemetry types this project accepts."
            icon={ShieldCheck}
            actions={
              <Link
                to={`/projects/${projectId}/settings/general`}
                className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--brand)] transition-colors hover:text-[var(--text)] hover:underline"
              >
                Edit <Sliders className="size-3.5" aria-hidden="true" />
              </Link>
            }
          >
            <div className="flex flex-col gap-4">
              {/* visual toggle grid */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {INGESTION_TOGGLES.map((toggle) => {
                  const enabled = Boolean(settings?.[toggle.key]);
                  return (
                    <div
                      key={toggle.key}
                      className={cn(
                        "flex items-center gap-2 rounded-[8px] border px-3 py-2 transition-colors",
                        enabled
                          ? "border-[var(--green)]/20 bg-[var(--green-bg)]/50"
                          : "border-[var(--border)] bg-[var(--bg2)]/50",
                      )}
                    >
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          enabled ? "bg-[var(--green)]" : "bg-[var(--text3)]/40",
                        )}
                        aria-hidden="true"
                      />
                      <span
                        className={cn(
                          "text-[11.5px] font-medium",
                          enabled ? "text-[var(--green)]" : "text-[var(--text3)]",
                        )}
                      >
                        {toggle.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* config details */}
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Retention</dt>
                  <dd className="mt-1 text-[15px] font-semibold tabular-nums text-[var(--text)]">
                    {settings?.dataRetentionDays ?? "---"} days
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Sampling</dt>
                  <dd className="mt-1 text-[15px] font-semibold tabular-nums text-[var(--text)]">
                    {settings ? `${(settings.samplingRate * 100).toFixed(0)}%` : "---"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">PII scrubbing</dt>
                  <dd className="mt-1">
                    <Pill tone={settings?.piiScrubbingEnabled ? "green" : "amber"}>
                      {settings?.piiScrubbingEnabled ? "On" : "Off"}
                    </Pill>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">IP collection</dt>
                  <dd className="mt-1">
                    <Pill tone={settings?.ipCollectionEnabled ? "amber" : "green"}>
                      {settings?.ipCollectionEnabled ? "Collected" : "Not collected"}
                    </Pill>
                  </dd>
                </div>
              </dl>
            </div>
          </Panel>

          <Panel title="Project details" icon={KeyRound}>
            <KeyValueGrid items={details} columns={2} />
            {project.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[var(--bg2)] px-2 py-0.5 text-[11px] font-medium text-[var(--text2)] ring-1 ring-inset ring-[var(--border)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </section>
    </div>
  );
}
