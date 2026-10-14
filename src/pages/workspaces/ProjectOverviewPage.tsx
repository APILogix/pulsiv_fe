import { useState } from "react";
import { Link } from "react-router";

import { projectPath } from "@/modules/projects/navigation/project-routes";
import { useProjectOverview, useProjectStats } from "@/modules/projects/hooks/useProjects";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  ProjectPageHeader,
  Readouts,
  Sheet,
  SheetError,
  TextLink,
  WorkspacePage,
  type Readout,
} from "@/modules/projects/components/project-page";
import { ChartTooltip, Panel, Pill, Sparkline, type ChartTooltipState } from "@/shared/ui/pulse";
import {
  DetailSkeleton,
  EmptyNote,
  KeyValueList,
  Timestamp,
  formatBytes,
  formatCompact,
  formatNumber,
  type KeyValueItem,
} from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrentProject } from "./ProjectShellPage";

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

const HOUR_TICKS = ["00:00", "06:00", "12:00", "18:00", "23:00"];

const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

const signedPercent = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

// ── hourly distribution ──────────────────────────────────────
// Neutral volume bars (design/observe/DESIGN.md): the shape of the day is the
// reading, so no bar is coloured unless it is the one under the pointer.

function HourlyBars({ hours, peakHour }: { hours: Array<{ hour: number; eventCount: number }>; peakHour: number }) {
  const [hoverHour, setHoverHour] = useState<number | null>(null);

  const byHour = new Array<number>(24).fill(0);
  for (const entry of hours) {
    if (entry.hour >= 0 && entry.hour < 24) byHour[entry.hour] = entry.eventCount;
  }
  const max = Math.max(...byHour, 1);
  const total = byHour.reduce((sum, value) => sum + value, 0);

  const tooltip: ChartTooltipState | null =
    hoverHour !== null
      ? {
          x: `${((hoverHour + 0.5) / 24) * 100}%`,
          y: 0,
          title: hourLabel(hoverHour),
          rows: [{ label: "Events", value: formatNumber(byHour[hoverHour]), color: "var(--text2)" }],
        }
      : null;

  return (
    <figure className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={`${formatNumber(total)} events today. Busiest hour ${hourLabel(peakHour)} with ${formatNumber(byHour[peakHour] ?? 0)} events.`}
        className="relative flex h-32 items-end gap-[3px] border-b border-[var(--border)]"
        onPointerLeave={() => setHoverHour(null)}
      >
        {byHour.map((value, hour) => {
          const pct = (value / max) * 100;
          const hovered = hoverHour === hour;
          return (
            <div
              key={hour}
              onPointerEnter={() => setHoverHour(hour)}
              className="flex h-full flex-1 cursor-crosshair items-end"
            >
              <div
                className={cn(
                  "w-full rounded-t-[2px] transition-colors duration-150",
                  hovered ? "bg-[var(--text3)]" : "bg-[var(--border2)]",
                )}
                style={{ height: `${Math.max(pct, value > 0 ? 3 : 0)}%` }}
              />
            </div>
          );
        })}
        <ChartTooltip state={tooltip} />
      </div>
      <figcaption className="flex justify-between font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">
        {HOUR_TICKS.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </figcaption>
    </figure>
  );
}

// ── breakdown list ───────────────────────────────────────────

function Breakdown({ data, emptyLabel }: { data: Record<string, number>; emptyLabel: string }) {
  const entries = Object.entries(data ?? {})
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (entries.length === 0) {
    return <EmptyNote>{emptyLabel}</EmptyNote>;
  }

  const max = Math.max(...entries.map(([, value]) => value), 1);

  return (
    <ul className="flex flex-col gap-3">
      {entries.map(([key, value]) => {
        const label = key.replace(/_/g, " ");
        return (
          <li key={key} className="group flex flex-col gap-1.5" title={`${label}: ${formatNumber(value)} events`}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] text-[var(--text2)] first-letter:uppercase group-hover:text-[var(--text)]">
                {label}
              </span>
              <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text)]">
                {formatCompact(value)}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[var(--bg3)]">
              <div
                className="h-full rounded-full bg-[var(--text3)] transition-colors duration-150 group-hover:bg-[var(--text2)]"
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── on/off reading ───────────────────────────────────────────

function OnOff({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text)]">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--green)]" />
      On
    </span>
  ) : (
    <span className="text-[13px] text-[var(--text3)]">Off</span>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectOverviewPage() {
  const { projectId, project, orgSlug, publicId } = useCurrentProject();
  const { data: overview, isLoading, error, refetch } = useProjectOverview(projectId);
  const { data: stats } = useProjectStats(projectId);

  const analyticsPath = projectPath(orgSlug, publicId, "analytics");
  const settingsPath = projectPath(orgSlug, publicId, "settings/general");

  if (isLoading) return <DetailSkeleton />;

  if (error || !overview) {
    return (
      <WorkspacePage>
        <ProjectPageHeader title={project.name} description={project.description || undefined} />
        <Sheet label="Overview">
          <SheetError
            title="Could not load the overview"
            message={apiErrorMessage(error, "The overview is unavailable right now.")}
            onRetry={() => void refetch()}
          />
        </Sheet>
      </WorkspacePage>
    );
  }

  const usage = overview.usage;
  const settings = overview.settings;
  const details = overview.project;
  const dailyTrend = usage.dailyTrend ?? [];
  const trend = dailyTrend.map((point) => point.totalEvents);
  const latestTrend = dailyTrend[dailyTrend.length - 1];
  const peakHour = usage.peakHour ?? 0;

  const readouts: Readout[] = [
    {
      label: "Events today",
      value: formatCompact(usage.totalEventsToday ?? 0),
      sub: latestTrend ? `${signedPercent(latestTrend.changePercent)} on ${latestTrend.date}` : "No earlier day to compare",
    },
    { label: "Ingested today", value: formatBytes(usage.totalBytesToday ?? 0), sub: `Busiest hour ${hourLabel(peakHour)}` },
    { label: "Current hour", value: formatCompact(usage.currentHourEvents ?? 0), sub: "Events in the open hourly bucket" },
    {
      label: "Environments",
      value: formatNumber(stats?.stats.environmentCount ?? 0),
      sub: `${formatCompact(stats?.stats.totalRequests ?? 0)} requests recorded`,
    },
    {
      label: "Members",
      value: formatNumber(overview.memberCount ?? 0),
      sub: `${formatNumber(overview.apiKeyCount ?? 0)} ingestion keys`,
    },
  ];

  const dataHandling: KeyValueItem[] = [
    {
      label: "Retention",
      value: settings ? `${formatNumber(settings.dataRetentionDays)} days` : "—",
      mono: true,
    },
    {
      label: "Sampling",
      value: settings ? `${(settings.samplingRate * 100).toFixed(0)}% of events kept` : "—",
    },
    {
      label: "PII scrubbing",
      value: settings ? (
        <Pill tone={settings.piiScrubbingEnabled ? "green" : "amber"}>{settings.piiScrubbingEnabled ? "On" : "Off"}</Pill>
      ) : (
        "—"
      ),
    },
    {
      label: "IP addresses",
      value: settings ? (
        <Pill tone={settings.ipCollectionEnabled ? "amber" : "green"}>
          {settings.ipCollectionEnabled ? "Collected" : "Not collected"}
        </Pill>
      ) : (
        "—"
      ),
    },
  ];

  const pipelines: KeyValueItem[] = INGESTION_TOGGLES.map((toggle) => ({
    label: toggle.label,
    value: <OnOff on={Boolean(settings?.[toggle.key])} />,
  }));

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title={project.name}
        description={project.description || "Today's ingestion, the shape of its traffic, and how this project handles data."}
        meta={[
          { label: "Slug", value: details.slug, mono: true },
          { label: "Timezone", value: details.timezone, mono: true },
          { label: "Created", value: <Timestamp value={details.createdAt} /> },
          { label: "Updated", value: <Timestamp value={details.updatedAt} /> },
          details.archivedAt ? { label: "Archived", value: <Timestamp value={details.archivedAt} /> } : null,
          project.tags.length > 0 ? { label: "Tags", value: project.tags.join(", ") } : null,
        ]}
        actions={
          <UiButton variant="outline" size="lg" asChild>
            <Link to={analyticsPath}>Open analytics</Link>
          </UiButton>
        }
      />

      <Readouts cells={readouts} label="Today" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="Hourly ingestion"
          description={`Events per hour today, in ${details.timezone}.`}
          actions={
            <TextLink to={analyticsPath} size="sm" arrow>
              Full analytics
            </TextLink>
          }
        >
          {usage.hourlyBreakdown?.length ? (
            <HourlyBars hours={usage.hourlyBreakdown} peakHour={peakHour} />
          ) : (
            <EmptyNote title="No events yet today">
              Events appear here within a minute of arriving. Send one with any SDK configured with this project's
              ingestion key.
            </EmptyNote>
          )}
        </Panel>

        <Panel title="Daily trend" description="Events per day and the change from the day before.">
          {trend.length > 1 ? (
            <div className="flex flex-col gap-4">
              <Sparkline
                data={trend}
                labels={dailyTrend.map((point) => point.date)}
                color="var(--text2)"
                height={64}
                interactive
                valueFormatter={formatCompact}
              />
              <ul className="flex flex-col divide-y divide-[var(--border)]">
                {dailyTrend
                  .slice(-5)
                  .reverse()
                  .map((point) => (
                    <li key={point.date} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">{point.date}</span>
                      <span className="ml-auto font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text)]">
                        {formatCompact(point.totalEvents)}
                      </span>
                      <span className="w-16 text-right font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text3)]">
                        {signedPercent(point.changePercent)}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : (
            <EmptyNote title="Not enough history yet">The trend needs at least two days of ingestion.</EmptyNote>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="By category" description="Share of today's events, by category.">
          <Breakdown data={usage.categoryBreakdown} emptyLabel="No categorised events today." />
        </Panel>
        <Panel title="By event type" description="The most frequent event types today.">
          <Breakdown data={usage.eventTypeBreakdown} emptyLabel="No typed events today." />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Ingestion"
          description="Telemetry this project accepts from its SDKs."
          actions={
            <TextLink to={settingsPath} size="sm">
              Edit in settings
            </TextLink>
          }
          bodyClassName="px-5 py-1 [&_dl>div:last-child]:border-b-0 md:[&_dl>div:nth-last-child(2)]:border-b-0"
        >
          <KeyValueList items={pipelines} columns={2} labelWidth={132} />
        </Panel>

        <Panel
          title="Data handling"
          description="How long events are kept, how many are sampled, and which personal data is collected."
          actions={
            <TextLink to={settingsPath} size="sm">
              Edit in settings
            </TextLink>
          }
          bodyClassName="px-5 py-1 [&_dl>div:last-child]:border-b-0"
        >
          <KeyValueList items={dataHandling} columns={1} labelWidth={132} />
        </Panel>
      </div>
    </WorkspacePage>
  );
}
