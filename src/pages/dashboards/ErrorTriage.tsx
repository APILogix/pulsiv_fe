import { useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, Check, EyeOff, TrendingUp } from "lucide-react";
import { useErrorGroups } from "@/hooks/useDummyData";
import { useTimeRangeStore, TIME_RANGES } from "@/stores/timeRangeStore";
import {
  PageHeader, SectionCard, KpiCard, FilterSelect, FilterBar,
  SeverityBadge, MonospaceText, Timestamp, MetricSparkline, formatCompact,
} from "@/shared/observe";
import { EmptyState } from "@/shared/components/EmptyState";
import { Donut, StackedBars, Banner, CHART_COLORS } from "./widgets";
import { seededSeries } from "./lib";
import type { ErrorGroup } from "@/types/events";

const TIME_OPTIONS = TIME_RANGES.map((r) => ({ value: r, label: r }));
const SORT_OPTIONS = [
  { value: "lastSeen", label: "Last seen" },
  { value: "count", label: "Frequency" },
  { value: "users", label: "Users affected" },
  { value: "firstSeen", label: "First seen" },
];
const MECHANISMS = ["uncaughtException", "unhandledRejection", "console.error", "express", "fastify", "manual"];

export default function ErrorTriage() {
  const navigate = useNavigate();
  const timeRange = useTimeRangeStore((s) => s.timeRange);
  const setTimeRange = useTimeRangeStore((s) => s.setTimeRange);
  const groups = useErrorGroups();
  const [sort, setSort] = useState("lastSeen");
  const [mechanismFilter, setMechanismFilter] = useState("all");

  const groupList: ErrorGroup[] = groups.data ?? [];

  if (!groups.isLoading && groupList.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Error Triage & Root Cause" description="Group, prioritize, investigate, and resolve errors efficiently." />
        <EmptyState message="No errors found for the selected time range." />
      </div>
    );
  }

  const totalErrors = groupList.reduce((s, g) => s + g.count, 0);
  const affectedUsers = new Set(groupList.flatMap((g) => [...g.affectedUsers])).size;

  const filtered = mechanismFilter === "all" ? groupList : groupList.filter((g) => g.mechanism === mechanismFilter);
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "count") return b.count - a.count;
    if (sort === "users") return b.affectedUsers.size - a.affectedUsers.size;
    if (sort === "firstSeen") return b.firstSeen - a.firstSeen;
    return b.lastSeen - a.lastSeen;
  });

  const mechanismSegments = MECHANISMS.map((m, i) => ({
    label: m,
    value: groupList.filter((g) => g.mechanism === m).reduce((s, g) => s + g.count, 0) || (6 - i),
    color: CHART_COLORS[i % CHART_COLORS.length],
  })).filter((s) => s.value > 0);

  const services = [...new Set(groupList.flatMap((g) => [...g.services]))].slice(0, 6);
  const serviceImpact = services.map((svc) => {
    const svcGroups = groupList.filter((g) => g.services.has(svc));
    return {
      label: svc,
      segments: [
        { value: svcGroups.filter((g) => g.severity === "fatal").reduce((s, g) => s + g.count, 0) + 2, color: "var(--red)" },
        { value: svcGroups.filter((g) => g.severity === "error").reduce((s, g) => s + g.count, 0) + 5, color: "var(--amber)" },
        { value: svcGroups.filter((g) => g.severity === "warning").reduce((s, g) => s + g.count, 0) + 3, color: "var(--blue)" },
      ],
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Error Triage & Root Cause"
        description="Group, prioritize, investigate, and resolve errors efficiently · auto-refresh 30s."
        actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
      />

      <Banner
        tone="amber"
        icon={TrendingUp}
        title={<>Regression detected — <strong>TypeError: Cannot read properties of undefined</strong> volume anomalous (spike +450% above 7-day baseline).</>}
        action={<button onClick={() => navigate("/dashboards/releases")} className="rounded-[6px] border border-current px-2 py-1 text-[12px]">View affected release</button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total errors (24h)" value={formatCompact(totalErrors)} delta="+18% vs prev" trend="down" icon={AlertTriangle} />
        <KpiCard label="Unique error groups" value={groupList.length} delta="+3 new" trend="down" />
        <KpiCard label="Affected users" value={formatCompact(affectedUsers)} delta="+42" trend="down" />
        <KpiCard label="Resolved today" value={7} delta="Good progress" trend="up" icon={Check} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Error mechanism breakdown">
          <Donut segments={mechanismSegments} centerLabel={formatCompact(totalErrors)} centerSub="errors" />
        </SectionCard>
        <SectionCard title="Error impact by service">
          <StackedBars groups={serviceImpact} horizontal />
          <div className="mt-3 flex gap-4 text-[11px] text-[var(--text2)]">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--red)]" /> Fatal</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--amber)]" /> Error</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--blue)]" /> Warning</span>
          </div>
        </SectionCard>
      </div>

      <FilterBar onClear={() => { setSort("lastSeen"); setMechanismFilter("all"); }}>
        <FilterSelect label="Sort" value={sort} onChange={setSort} options={SORT_OPTIONS} />
        <FilterSelect
          label="Mechanism"
          value={mechanismFilter}
          onChange={setMechanismFilter}
          options={[{ value: "all", label: "All" }, ...MECHANISMS.map((m) => ({ value: m, label: m }))]}
        />
      </FilterBar>

      <div className="flex flex-col gap-3">
        {sorted.map((g) => (
          <ErrorGroupCard key={g.fingerprint} group={g} onOpen={() => navigate(`/observability/errors/${g.fingerprint}`)} />
        ))}
      </div>
    </div>
  );
}

function ErrorGroupCard({ group, onOpen }: { group: ErrorGroup; onOpen: () => void }) {
  const [status, setStatus] = useState<"unresolved" | "resolved" | "ignored">("unresolved");
  const trend = seededSeries(group.fingerprint, 28, group.count / 4, group.count / 2);
  const topFrames = group.occurrences[0]?.stack?.slice(0, 3) ?? [];

  const StatusIcon = status === "resolved" ? Check : status === "ignored" ? EyeOff : AlertTriangle;
  const statusTone = status === "resolved" ? "var(--green)" : status === "ignored" ? "var(--text3)" : "var(--red)";

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
      <div className="flex items-start gap-3">
        <StatusIcon className="mt-0.5 size-4 shrink-0" style={{ color: statusTone }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onOpen} className="truncate text-left text-[14px] font-semibold text-[var(--text)] hover:text-[var(--brand)]">{group.name}</button>
            <SeverityBadge severity={group.severity} />
            <span className="rounded-[5px] bg-[var(--bg2)] px-2 py-0.5 text-[11px] text-[var(--text2)]">{group.mechanism}</span>
            <MonospaceText value={group.fingerprint.slice(0, 8)} className="text-[var(--text3)]" />
          </div>
          <div className="mt-1 truncate text-[12px] text-[var(--text3)]">{group.message}</div>

          {/* Stack preview */}
          {topFrames.length > 0 && (
            <div className="mt-2 flex flex-col gap-0.5 rounded-[8px] bg-[var(--bg2)] p-2 font-[family-name:var(--mono)] text-[11px]">
              {topFrames.map((f, i) => (
                <div key={i} className={f.inApp ? "border-l-2 border-[var(--amber)] pl-2 font-medium text-[var(--text)]" : "pl-2 text-[var(--text3)]"}>
                  {f.function} <span className="text-[var(--text3)]">({f.filename}:{f.lineno})</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text3)]">
            <span>Count <strong className="text-[var(--text2)]">{group.count}</strong></span>
            <span>Users <strong className="text-[var(--text2)]">{group.affectedUsers.size}</strong></span>
            <span>First seen <Timestamp value={group.firstSeen} /></span>
            <span>Last seen <Timestamp value={group.lastSeen} /></span>
            <span className="flex items-center gap-1">{[...group.services].slice(0, 3).map((s) => <span key={s} className="rounded-full bg-[var(--bg3)] px-1.5 py-0.5">{s}</span>)}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <MetricSparkline data={trend} color="var(--red)" width={120} height={28} />
          <div className="flex items-center gap-1.5">
            <button onClick={() => setStatus(status === "resolved" ? "unresolved" : "resolved")} className="rounded-[6px] border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text2)] hover:text-[var(--green)]">
              {status === "resolved" ? "Unresolve" : "Resolve"}
            </button>
            <button onClick={() => setStatus(status === "ignored" ? "unresolved" : "ignored")} className="rounded-[6px] border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text2)] hover:text-[var(--text)]">
              {status === "ignored" ? "Unignore" : "Ignore"}
            </button>
            <button onClick={onOpen} className="rounded-[6px] border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--brand)]">Details</button>
          </div>
        </div>
      </div>
    </div>
  );
}
