import { useRef, useState } from "react";
import { Link } from "react-router";
import { projectPath } from "@/modules/projects/navigation/project-routes";
import {
  ArrowRight,
  BarChart3,
  Sliders,
} from "lucide-react";
import { useProjectOverview, useProjectStats } from "@/modules/projects/hooks/useProjects";
import { useCurrentProject } from "./ProjectShellPage";
import {
  ChartTooltip,
  type ChartTooltipState,
} from "@/shared/ui/pulse";
import { DetailSkeleton, Timestamp, formatBytes, formatCompact, formatNumber } from "@/shared/observe";
import { AsyncPanel } from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

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
              className="group relative flex-1 cursor-pointer rounded-t-[2px] bg-[var(--surface-2)] transition-colors hover:bg-[var(--brand-muted)]"
              style={{ height: "100%" }}
            >
              <div
                className={cn(
                  "absolute bottom-0 w-full rounded-t-[2px] bg-[var(--brand)] transition-[height,opacity,transform] duration-200 origin-bottom",
                  isHovered && "brightness-125 shadow-[0_0_10px_var(--brand)]",
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
      <div className="flex justify-between font-[family-name:var(--mono)] text-[10.5px] text-[var(--text-tertiary)]">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>
    </div>
  );
}

function Breakdown({ data, emptyLabel }: { data: Record<string, number>; emptyLabel: string }) {
  const entries = Object.entries(data ?? {})
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (entries.length === 0) {
    return <p className="py-4 text-[12px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">{emptyLabel}</p>;
  }

  const max = Math.max(...entries.map(([, value]) => value), 1);

  return (
    <ul className="flex flex-col gap-2.5">
      {entries.map(([key, value]) => (
        <li key={key} className="group flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-[12px]">
            <span className="truncate font-[family-name:var(--mono)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
              {key.replace(/_/g, " ")}
            </span>
            <span className="font-[family-name:var(--mono)] font-semibold tabular-nums text-[var(--text-primary)]">
              {formatCompact(value)}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-all duration-300 group-hover:brightness-125"
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

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

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 font-sans">
      
      {/* ── 1. Page Command Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span className="inline-block size-1.5 rounded-full bg-[var(--brand)]" />
            <span>Workspace Fleet</span>
            <span>/</span>
            <span className="text-[var(--text-secondary)]">{project.name}</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] font-[family-name:var(--display)]">
            Project Overview &amp; Telemetry Profile
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Active ingestion health, daily throughput trends, pipeline toggles, and infrastructure metadata.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to={projectPath(orgSlug, publicId, "analytics")}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
          >
            <BarChart3 className="size-3.5" />
            <span>Full Analytics</span>
          </Link>
          <Link
            to={projectPath(orgSlug, publicId, "settings/general")}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--brand-border)] bg-[var(--brand-muted)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--brand)] hover:text-white transition-all"
          >
            <Sliders className="size-3.5 text-[var(--brand)]" />
            <span>Configure Pipelines</span>
          </Link>
        </div>
      </div>

      {/* ── 2. Unified Hero Telemetry Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] divide-x divide-y md:divide-y-0 divide-[var(--border-subtle)]">
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Events Today</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {formatCompact(usage.totalEventsToday ?? 0)}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--success)]">
            {latestTrend?.changePercent ? `${latestTrend.changePercent > 0 ? "+" : ""}${latestTrend.changePercent.toFixed(1)}% vs yesterday` : "Baseline active"}
          </div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Ingested Volume</span>
            <span className="size-2 rounded-full bg-[var(--brand)]" />
          </div>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--brand)] font-[family-name:var(--mono)] tabular-nums">
            {formatBytes(usage.totalBytesToday ?? 0)}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
            Peak at {String(usage.peakHour ?? 0).padStart(2, "0")}:00
          </div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Current Hour Rate</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {formatCompact(usage.currentHourEvents ?? 0)}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Active buffer slice</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Ingestion Credentials</span>
            <span className="size-2 rounded-full bg-[var(--success)]" />
          </div>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {formatNumber(overview.apiKeyCount ?? 0)}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
            Across {formatNumber(overview.memberCount ?? 0)} team members
          </div>
        </div>
      </div>

      {/* ── 3. Traffic Shape Visualizer ── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        
        {/* Hourly Distribution */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-4">
            <div>
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
                Hourly Ingestion Distribution
              </h3>
              <p className="text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
                Ingested payload volume per 60-minute window
              </p>
            </div>
            <Link
              to={projectPath(orgSlug, publicId, "analytics")}
              className="text-[11.5px] font-[family-name:var(--mono)] text-[var(--brand)] hover:underline flex items-center gap-1"
            >
              <span>Detailed view</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>

          {usage.hourlyBreakdown?.length ? (
            <HourlyBars hours={usage.hourlyBreakdown} />
          ) : (
            <p className="py-8 text-center text-[12px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
              No events ingested yet today.
            </p>
          )}
        </div>

        {/* Daily Trend Summary */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-3">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
              7-Day Rolling Trajectory
            </h3>
            <span className="text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
              Daily aggregates
            </span>
          </div>

          {trend.length > 0 ? (
            <div className="divide-y divide-[var(--border-subtle)]">
              {(usage.dailyTrend ?? [])
                .slice(-5)
                .reverse()
                .map((point) => (
                  <div key={point.date} className="flex items-center justify-between py-2 hover:bg-[var(--surface-2)]/40 px-1.5 rounded-[3px] transition-colors">
                    <span className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text-secondary)]">
                      {point.date}
                    </span>
                    <span className="font-[family-name:var(--mono)] text-[12px] font-semibold tabular-nums text-[var(--text-primary)]">
                      {formatCompact(point.totalEvents)}
                    </span>
                    <span
                      className={cn(
                        "font-[family-name:var(--mono)] text-[11px] font-medium tabular-nums",
                        point.changePercent > 0
                          ? "text-[var(--success)]"
                          : point.changePercent < 0
                            ? "text-[var(--error)]"
                            : "text-[var(--text-tertiary)]",
                      )}
                    >
                      {point.changePercent > 0 ? "+" : ""}
                      {point.changePercent.toFixed(1)}%
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="py-8 text-center text-[12px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
              Not enough daily history yet.
            </p>
          )}
        </div>
      </div>

      {/* ── 4. Breakdowns Grid ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-3">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
              Breakdown by Category
            </h3>
            <span className="text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Share of traffic</span>
          </div>
          <Breakdown data={usage.categoryBreakdown} emptyLabel="No categorized events recorded today." />
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-3">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
              Breakdown by Event Type
            </h3>
            <span className="text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Top signal sources</span>
          </div>
          <Breakdown data={usage.eventTypeBreakdown} emptyLabel="No typed events recorded today." />
        </div>
      </div>

      {/* ── 5. Pipelines & Metadata ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        
        {/* Pipelines State */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-3">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
              Active Ingestion Pipelines
            </h3>
            <Link
              to={projectPath(orgSlug, publicId, "settings/general")}
              className="text-[11.5px] font-[family-name:var(--mono)] text-[var(--brand)] hover:underline"
            >
              Configure →
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {INGESTION_TOGGLES.map((toggle) => {
              const enabled = Boolean(settings?.[toggle.key]);
              return (
                <span
                  key={toggle.key}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1 text-[11px] font-medium font-[family-name:var(--mono)]",
                    enabled
                      ? "border-[var(--success)]/25 bg-[var(--success-muted)] text-[var(--success)]"
                      : "border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-tertiary)]"
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", enabled ? "bg-[var(--success)]" : "bg-[var(--text-tertiary)]")} />
                  <span>{toggle.label}</span>
                </span>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-[var(--border-subtle)] pt-3 font-[family-name:var(--mono)] text-[11px]">
            <div>
              <span className="text-[var(--text-tertiary)] uppercase tracking-wider">Retention</span>
              <div className="mt-0.5 text-[13px] font-semibold text-[var(--text-primary)]">{settings?.dataRetentionDays ?? 30} days</div>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)] uppercase tracking-wider">Sampling Rate</span>
              <div className="mt-0.5 text-[13px] font-semibold text-[var(--text-primary)]">{settings ? `${(settings.samplingRate * 100).toFixed(0)}%` : "100%"}</div>
            </div>
          </div>
        </div>

        {/* Project Metadata */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-3">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
              Project Environment Profile
            </h3>
            <span className="text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
              {stats?.stats.environmentCount ?? 1} environments
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[12px] font-[family-name:var(--mono)]">
            <div>
              <span className="text-[10.5px] uppercase tracking-wider text-[var(--text-tertiary)]">Slug Identifier</span>
              <div className="mt-0.5 text-[var(--text-primary)] font-semibold">{overview.project.slug}</div>
            </div>
            <div>
              <span className="text-[10.5px] uppercase tracking-wider text-[var(--text-tertiary)]">Assigned Timezone</span>
              <div className="mt-0.5 text-[var(--text-primary)]">{overview.project.timezone || "UTC"}</div>
            </div>
            <div>
              <span className="text-[10.5px] uppercase tracking-wider text-[var(--text-tertiary)]">Fleet Requests (Total)</span>
              <div className="mt-0.5 text-[var(--text-primary)] font-semibold">{formatCompact(stats?.stats.totalRequests ?? 0)}</div>
            </div>
            <div>
              <span className="text-[10.5px] uppercase tracking-wider text-[var(--text-tertiary)]">Created</span>
              <div className="mt-0.5 text-[var(--text-secondary)]"><Timestamp value={overview.project.createdAt} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

