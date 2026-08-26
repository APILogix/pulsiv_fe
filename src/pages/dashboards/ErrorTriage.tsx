import { useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, Check, EyeOff, BookOpen, ExternalLink } from "lucide-react";
import { useTimeRangeStore, TIME_RANGES } from "@/stores/timeRangeStore";
import {
  useErrorGroupsAnalytics,
  useErrorSummary,
  type ErrorGroupRow,
} from "@/modules/analytics";
import {
  PageHeader, FilterSelect, FilterBar,
  SeverityBadge, MonospaceText, Timestamp, formatCompact,
} from "@/shared/observe";
import { AnimatedEmptyState } from "@/shared/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Donut, StackedBars, ChartCard, HeroBand, ZoneLabel, CHART_COLORS } from "./widgets";

const TIME_OPTIONS = TIME_RANGES.map((r) => ({ value: r, label: r }));
const SORT_OPTIONS = [
  { value: "lastSeen", label: "Last seen" },
  { value: "occurrences", label: "Frequency" },
  { value: "users", label: "Users affected" },
  { value: "firstSeen", label: "First seen" },
  { value: "regressionScore", label: "Regression score" },
];
const MECHANISMS = ["uncaughtException", "unhandledRejection", "console.error", "express", "fastify", "manual"];

export default function ErrorTriage() {
  const navigate = useNavigate();
  const timeRange = useTimeRangeStore((s) => s.timeRange);
  const setTimeRange = useTimeRangeStore((s) => s.setTimeRange);
  const [sort, setSort] = useState("lastSeen");
  const [mechanismFilter, setMechanismFilter] = useState("all");

  const { data: errorGroupsRes, isLoading: isGroupsLoading } = useErrorGroupsAnalytics({
    mechanism: mechanismFilter === "all" ? undefined : mechanismFilter,
    limit: 100,
  });
  const { data: errorSummaryRes, isLoading: isSummaryLoading } = useErrorSummary();

  const isLoading = isGroupsLoading || isSummaryLoading;

  const groupList: ErrorGroupRow[] = errorGroupsRes?.data?.table?.rows ?? [];

  const summaryCards = errorSummaryRes?.data?.cards ?? [];
  const totalErrorsCard = summaryCards.find((c) => c.key === "errors.total");
  const affectedUsersCard = summaryCards.find((c) => c.key === "errors.affected_users");

  const totalErrors = totalErrorsCard?.value ?? groupList.reduce((s, g) => s + g.occurrences, 0);
  const affectedUsers = affectedUsersCard?.value ?? groupList.reduce((s, g) => s + (g.affectedUsers ?? 0), 0);
  const fatalErrors = groupList.filter((g) => g.severity === "fatal" || g.severity === "critical").reduce((s, g) => s + g.occurrences, 0);

  const sorted = [...groupList].sort((a, b) => {
    if (sort === "occurrences") return b.occurrences - a.occurrences;
    if (sort === "users") return (b.affectedUsers ?? 0) - (a.affectedUsers ?? 0);
    if (sort === "firstSeen") return new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime();
    if (sort === "regressionScore") return (b.regressionScore ?? 0) - (a.regressionScore ?? 0);
    return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
  });

  const mechanismSegments = MECHANISMS.map((m, i) => {
    const count = groupList.filter((g) => g.mechanism === m).reduce((s, g) => s + g.occurrences, 0);
    return {
      label: m,
      value: count,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  }).filter((s) => s.value > 0);

  const services = [...new Set(groupList.flatMap((g) => g.services ?? []))].slice(0, 6);
  const serviceImpact = services.map((svc) => {
    const svcGroups = groupList.filter((g) => g.services?.includes(svc));
    return {
      label: svc,
      segments: [
        { value: svcGroups.filter((g) => g.severity === "fatal" || g.severity === "critical").reduce((s, g) => s + g.occurrences, 0), color: "var(--red)" },
        { value: svcGroups.filter((g) => g.severity === "error").reduce((s, g) => s + g.occurrences, 0), color: "var(--amber)" },
        { value: svcGroups.filter((g) => g.severity === "warning" || g.severity === "warn").reduce((s, g) => s + g.occurrences, 0), color: "var(--blue)" },
      ],
    };
  });

  if (isLoading) {
    return <ErrorTriageSkeleton timeRange={timeRange} setTimeRange={setTimeRange} />;
  }

  if (!isLoading && groupList.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <PageHeader
          title="Error Triage & Root Cause"
          description="Group, prioritize, investigate, and resolve errors efficiently · auto-refreshing continuously."
          actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
        />
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-8">
          <AnimatedEmptyState
            illustration="bell"
            title="No Errors Captured"
            description="No runtime errors, uncaught exceptions, or unhandled promise rejections have been recorded for the selected time range."
            action={
              <button
                type="button"
                onClick={() => navigate("/settings/quickstart")}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-[var(--bg)] transition hover:opacity-90"
              >
                <BookOpen className="size-4" />
                SDK Setup Guide
              </button>
            }
            secondaryAction={
              <button
                type="button"
                onClick={() => navigate("/observability/logs")}
                className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-2 text-[13px] font-medium text-[var(--text)] transition hover:bg-[var(--bg3)]"
              >
                <ExternalLink className="size-4" />
                View Raw Logs
              </button>
            }
            hint="Errors captured via @pulsiv/node, @pulsiv/browser, or OpenTelemetry collectors will appear here automatically with root-cause analysis."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <PageHeader
        title="Error Triage & Root Cause"
        description="Group, prioritize, investigate, and resolve errors efficiently · auto-refreshing continuously."
        actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
      />

      <HeroBand
        metrics={[
          { label: `Total errors (${timeRange})`, value: formatCompact(totalErrors), delta: `${groupList.length} unique groups`, trend: "down", sparkColor: "var(--red)" },
          { label: "Unique error groups", value: formatCompact(groupList.length), delta: "Active groups", trend: "neutral" },
          { label: "Affected users", value: formatCompact(affectedUsers), delta: "Total affected", trend: "down", sparkColor: "var(--amber)" },
          { label: "Fatal errors", value: formatCompact(fatalErrors), delta: "Priority 1", trend: fatalErrors > 0 ? "down" : "neutral", sparkColor: "var(--red)" },
        ]}
      />

      <ZoneLabel>Impact analysis</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Error mechanism breakdown" headline={formatCompact(totalErrors)} headlineLabel="total errors">
          <Donut
            segments={mechanismSegments.length > 0 ? mechanismSegments : [{ label: "No errors", value: 1, color: "var(--green)" }]}
            centerLabel={formatCompact(totalErrors)}
            centerSub="errors"
          />
        </ChartCard>
        <ChartCard
          title="Error impact by service"
          legend={[
            { label: "Fatal", color: "var(--red)" },
            { label: "Error", color: "var(--amber)" },
            { label: "Warning", color: "var(--blue)" },
          ]}
        >
          {serviceImpact.length > 0 ? (
            <StackedBars groups={serviceImpact} horizontal />
          ) : (
            <div className="py-12 text-center text-[13px] text-[var(--text3)]">No service error distributions to display</div>
          )}
        </ChartCard>
      </div>

      <ZoneLabel>Triage queue · {sorted.length} groups</ZoneLabel>

      <div className="max-w-[800px]">
        <FilterBar onClear={() => { setSort("lastSeen"); setMechanismFilter("all"); }}>
          <FilterSelect label="Sort" value={sort} onChange={setSort} options={SORT_OPTIONS} />
          <FilterSelect
            label="Mechanism"
            value={mechanismFilter}
            onChange={setMechanismFilter}
            options={[{ value: "all", label: "All" }, ...MECHANISMS.map((m) => ({ value: m, label: m }))]}
          />
        </FilterBar>
      </div>

      <div className="flex flex-col gap-3">
        {sorted.map((g) => (
          <ErrorGroupCardItem key={g.fingerprint} group={g} onOpen={() => navigate(g.href || `/observability/errors/${encodeURIComponent(g.fingerprint)}`)} />
        ))}
      </div>
    </div>
  );
}

function ErrorGroupCardItem({ group, onOpen }: { group: ErrorGroupRow; onOpen: () => void }) {
  const [status, setStatus] = useState<string>(group.status || "unresolved");

  const StatusIcon = status === "resolved" ? Check : status === "ignored" ? EyeOff : AlertTriangle;
  const statusTone = status === "resolved" ? "var(--green)" : status === "ignored" ? "var(--text3)" : "var(--red)";

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-colors hover:border-[var(--border2)]">
      <div className="flex items-start gap-3">
        <StatusIcon className="mt-0.5 size-4 shrink-0" style={{ color: statusTone }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onOpen} className="truncate text-left text-[14px] font-semibold text-[var(--text)] hover:text-[var(--brand)]">
              {group.errorName}
            </button>
            <SeverityBadge severity={group.severity} />
            <span className="rounded-[5px] bg-[var(--bg2)] px-2 py-0.5 text-[11px] text-[var(--text2)]">{group.mechanism || "sdk"}</span>
            <MonospaceText value={group.fingerprint.slice(0, 8)} className="text-[var(--text3)]" />
          </div>
          <div className="mt-1 truncate text-[12px] text-[var(--text3)]">{group.message}</div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text3)]">
            <span>Occurrences <strong className="text-[var(--text2)]">{group.occurrences.toLocaleString()}</strong></span>
            <span>Affected Users <strong className="text-[var(--text2)]">{(group.affectedUsers ?? 0).toLocaleString()}</strong></span>
            <span>First seen <Timestamp value={group.firstSeen} /></span>
            <span>Last seen <Timestamp value={group.lastSeen} /></span>
            <span className="flex items-center gap-1">
              {(group.services ?? []).slice(0, 3).map((s) => (
                <span key={s} className="rounded-full bg-[var(--bg3)] px-1.5 py-0.5 text-[10px] text-[var(--text2)]">{s}</span>
              ))}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatus(status === "resolved" ? "unresolved" : "resolved")}
              className="rounded-[6px] border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text2)] hover:text-[var(--brand)]"
            >
              {status === "resolved" ? "Unresolve" : "Resolve"}
            </button>
            <button
              type="button"
              onClick={() => setStatus(status === "ignored" ? "unresolved" : "ignored")}
              className="rounded-[6px] border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text2)] hover:text-[var(--text)]"
            >
              {status === "ignored" ? "Unignore" : "Ignore"}
            </button>
            <button type="button" onClick={onOpen} className="rounded-[6px] border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--brand)]">
              Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorTriageSkeleton({ timeRange, setTimeRange }: { timeRange: string; setTimeRange: (r: any) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 animate-in fade-in duration-300">
      <PageHeader
        title="Error Triage & Root Cause"
        description="Group, prioritize, investigate, and resolve errors efficiently · auto-refreshing continuously."
        actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
      />

      <div className="grid grid-cols-2 divide-[var(--border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] max-lg:gap-px max-lg:bg-[var(--border)] lg:grid-cols-none lg:auto-cols-fr lg:grid-flow-col lg:divide-x">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2 bg-[var(--bg1)] px-5 py-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      <ZoneLabel>Impact analysis</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
          <Skeleton className="mb-4 h-4 w-44" />
          <div className="flex items-center justify-center py-8">
            <Skeleton className="size-36 rounded-full" />
          </div>
        </div>
        <div className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
          <Skeleton className="mb-4 h-4 w-44" />
          <div className="flex flex-col gap-3 py-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 flex-1 rounded-[5px]" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <ZoneLabel>Triage queue</ZoneLabel>

      <div className="max-w-[800px]">
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-36" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-3 w-3/4" />
                <div className="flex items-center gap-4 pt-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-6 w-16 rounded-[6px]" />
                <Skeleton className="h-6 w-14 rounded-[6px]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
