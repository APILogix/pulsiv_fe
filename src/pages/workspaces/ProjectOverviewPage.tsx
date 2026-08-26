import { useRef, useState } from "react";
import { Link } from "react-router";
import { projectPath } from "@/modules/projects/navigation/project-routes";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Clock,
  Database,
  HardDrive,
  KeyRound,
  Layers,
  ShieldCheck,
  Sliders,
  Users,
} from "lucide-react";
import { useProjectOverview, useProjectStats } from "@/modules/projects/hooks/useProjects";
import { useCurrentProject } from "./ProjectShellPage";
import {
  ChartTooltip,
  KeyValueGrid,
  Panel,
  Pill,
  Sparkline,
  StatCard,
  type ChartTooltipState,
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

// ── hourly distribution ──────────────────────────────────────

function HourlyBars({ hours }: { hours: Array<{ hour: number; eventCount: number }> }) {
  const byHour = new Array(24).fill(0);
  for (const entry of hours) byHour[entry.hour] = entry.eventCount;
  const max = Math.max(...byHour, 1);
  const [hoverHour, setHoverHour] = useState<number | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const tooltip: ChartTooltipState | null =
    hoverHour !== null
      ? {
          x: `${((hoverHour + 0.5) / 24) * 100}%`,
          y: 0,
          title: `${String(hoverHour).padStart(2, "0")}:00`,
          rows: [{ label: "Events", value: formatNumber(byHour[hoverHour]), color: "var(--brand)" }],
        }
      : null;

  return (
    <div className="flex flex-col gap-2">
      <div ref={rowRef} className="relative flex h-28 items-end gap-[3px]" onPointerLeave={() => setHoverHour(null)}>
        {byHour.map((value, hour) => {
          const pct = (value / max) * 100;
          const isHovered = hoverHour === hour;
          return (
            <div
              key={hour}
              onPointerEnter={() => setHoverHour(hour)}
              className="group relative flex-1 cursor-pointer rounded-t-[3px] bg-[var(--bg3)] transition-colors hover:bg-[var(--brand)]/15"
              style={{ height: "100%" }}
            >
              <div
                className={cn(
                  "absolute bottom-0 w-full rounded-t-[3px] bg-[var(--brand)] transition-[height,opacity,transform] duration-300 origin-bottom",
                  isHovered && "brightness-125 shadow-[0_0_12px_var(--brand-glow)]",
                )}
                style={{
                  height: `${Math.max(pct, value > 0 ? 3 : 0)}%`,
                  transform: isHovered ? "scaleX(1.15)" : "scaleX(1)",
                }}
              />
            </div>
          );
        })}
        <ChartTooltip state={tooltip} />
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
    <ul className="flex flex-col gap-2.5">
      {entries.map(([key, value]) => (
        <li key={key} className="group flex flex-col gap-1" title={`${key.replace(/_/g, " ")} — ${formatNumber(value)} events`}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[12.5px] text-[var(--text2)] transition-colors group-hover:text-[var(--text)]">
              {key.replace(/_/g, " ")}
            </span>
            <span className="text-[12.5px] font-semibold tabular-nums text-[var(--text)]">
              {formatCompact(value)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg3)]">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-[width,filter] duration-500 group-hover:brightness-125 group-hover:shadow-[0_0_8px_var(--brand-glow)]"
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
  const { projectId, project, orgSlug, publicId } = useCurrentProject();
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
    { label: "Timezone", value: overview.project.timezone },
    { label: "Environments", value: formatNumber(stats?.stats.environmentCount ?? 0) },
    { label: "Total requests", value: formatCompact(stats?.stats.totalRequests ?? 0) },
    { label: "Created", value: <Timestamp value={overview.project.createdAt} /> },
    { label: "Updated", value: <Timestamp value={overview.project.updatedAt} /> },
    {
      label: "Archived",
      value: overview.project.archivedAt ? <Timestamp value={overview.project.archivedAt} /> : "—",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── headline metrics ── */}
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

      {/* ── traffic shape ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="Hourly ingestion (today)"
          description="Event volume per hour in the project timezone."
          icon={BarChart3}
          actions={
            <Link
              to={projectPath(orgSlug, publicId, "analytics")}
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--brand)] hover:underline"
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
              <Sparkline
                data={trend}
                labels={(usage.dailyTrend ?? []).map((point) => point.date)}
                height={72}
                interactive
                valueFormatter={formatCompact}
              />
              <ul className="flex flex-col divide-y divide-[var(--border)]">
                {(usage.dailyTrend ?? [])
                  .slice(-5)
                  .reverse()
                  .map((point) => (
                    <li key={point.date} className="flex items-center justify-between gap-3 py-2 transition-colors hover:bg-[var(--bg2)]/60">
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

      {/* ── breakdowns ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="By category" description="Share of today's ingestion." icon={Layers}>
          <Breakdown data={usage.categoryBreakdown} emptyLabel="No categorised events today." />
        </Panel>
        <Panel title="By event type" description="Top event types today." icon={Database}>
          <Breakdown data={usage.eventTypeBreakdown} emptyLabel="No typed events today." />
        </Panel>
      </div>

      {/* ── configuration snapshot ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel
          title="Ingestion pipelines"
          description="Which telemetry types this project accepts."
          icon={ShieldCheck}
          actions={
            <Link
              to={projectPath(orgSlug, publicId, "settings/general")}
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--brand)] hover:underline"
            >
              Edit <Sliders className="size-3.5" aria-hidden="true" />
            </Link>
          }
        >
          <div className="flex flex-wrap gap-2">
            {INGESTION_TOGGLES.map((toggle) => {
              const enabled = Boolean(settings?.[toggle.key]);
              return (
                <Pill key={toggle.key} tone={enabled ? "green" : "neutral"} dot>
                  {toggle.label}
                </Pill>
              );
            })}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Retention</dt>
              <dd className="mt-1 text-[15px] font-semibold tabular-nums text-[var(--text)]">
                {settings?.dataRetentionDays ?? "—"} days
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Sampling</dt>
              <dd className="mt-1 text-[15px] font-semibold tabular-nums text-[var(--text)]">
                {settings ? `${(settings.samplingRate * 100).toFixed(0)}%` : "—"}
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
    </div>
  );
}
