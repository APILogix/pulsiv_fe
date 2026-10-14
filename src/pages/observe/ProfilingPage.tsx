import type { ExplorerPagination } from "./hooks/useObservabilityApi";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { Cpu, MemoryStick } from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, FillPage, TableToolbar, SearchInput, FilterSelect, EnvironmentBadge, Timestamp,
  InfiniteTable, TimeRangePicker, useTimeRangeParams, SignalSheet, useSignalTimeline, useTimeWindow,
  rangeParams, formatCompact, formatDuration, MUTED_DASH, NEUTRAL_CHIP, ENVIRONMENT_OPTIONS, DURATION_OPTIONS,
} from "@/shared/observe";
import type { Column, ReadoutCell } from "@/shared/observe";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useCursorPagination } from "./hooks/useCursorPagination";

interface ProfileRow {
  id: string;
  publicId?: string;
  occurredAt?: string;
  profileType?: string;
  service?: string;
  durationMs?: number;
  requestId?: string;
  environment?: string;
}

const TYPE_OPTS = [
  { value: "", label: "Any profile type" },
  { value: "cpu", label: "CPU" },
  { value: "heap", label: "Heap" },
  { value: "memory", label: "Memory" },
  { value: "wall", label: "Wall clock" },
];

function ProfileType({ type }: { type?: string }) {
  const t = String(type ?? "unknown").toLowerCase();
  const Icon = t.includes("heap") || t.includes("mem") || t.includes("alloc") ? MemoryStick : Cpu;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text)]">
      <Icon className="size-3.5 text-[var(--text3)]" aria-hidden="true" />
      <span className="first-letter:uppercase">{t}</span>
    </span>
  );
}

export default function ProfilingPage() {
  const navigate = useNavigate();
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const [environment, setEnvironment] = useState("");
  const [type, setType] = useState("");
  const [duration, setDuration] = useState("");
  const [query, setQuery] = useState("");
  const { timeRangeState } = useTimeRangeParams();
  const window = useTimeWindow(timeRangeState);
  const [activePagination, setActivePagination] = useState<ExplorerPagination | undefined>(undefined);

  const { cursor, paginationProps, onNextPage, onPreviousPage } = useCursorPagination(activePagination, {
    dependencies: [activeProjectSlug, environment, type, duration, query, timeRangeState],
  });

  const search = [type ? `type:${type}` : "", query].filter(Boolean).join(" ");
  const filters = {
    project: activeProjectSlug ?? undefined,
    environment: environment || undefined,
    duration: duration || undefined,
    search: search || undefined,
    ...rangeParams(timeRangeState),
  };

  const { data, isLoading } = useObservabilityList<ProfileRow>("profiles", { ...filters, cursor });
  const timeline = useSignalTimeline("profiles", filters, window);

  useEffect(() => {
    if (data?.pagination) setActivePagination(data.pagination);
  }, [data?.pagination]);

  const rows = data?.items ?? [];
  const summary = data?.summary ?? {};
  const stats = data?.statistics ?? {};
  const total = Number(summary.total ?? rows.length);
  const types = Number(summary.uniqueTypes ?? new Set(rows.map((r) => r.profileType)).size);
  const services = new Set(rows.map((r) => r.service).filter(Boolean)).size;
  const maxDur = Math.max(1, ...rows.map((r) => r.durationMs ?? 0));

  const cells: ReadoutCell[] = [
    { label: "Profiles", value: formatCompact(total), sub: "captured in this window" },
    { label: "Profile types", value: formatCompact(types), sub: "CPU, heap, wall clock…" },
    { label: "Avg capture", value: stats.avgDuration != null ? formatDuration(Number(stats.avgDuration)) : "—", sub: "sampling window" },
    { label: "Longest capture", value: stats.maxDuration != null ? formatDuration(Number(stats.maxDuration)) : "—" },
    { label: "Services", value: formatCompact(services), sub: `in the loaded ${rows.length} rows` },
  ];

  const baseColumns: Column<ProfileRow>[] = [
    { key: "time", header: "Captured", width: "104px", cell: (r) => <Timestamp value={r.occurredAt} /> },
    { key: "type", header: "Type", width: "120px", cell: (r) => <ProfileType type={r.profileType} /> },
    {
      key: "service",
      header: "Service",
      width: "minmax(180px, 1fr)",
      cell: (r) => (r.service ? <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{r.service}</span> : MUTED_DASH),
    },
    {
      key: "duration",
      header: "Capture window",
      width: "170px",
      cell: (r) =>
        r.durationMs ? (
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--bg3)]" aria-hidden="true">
              <span className="block h-full rounded-full bg-[var(--text2)]" style={{ width: `${Math.max(4, (r.durationMs / maxDur) * 100)}%` }} />
            </span>
            <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">{formatDuration(r.durationMs)}</span>
          </span>
        ) : MUTED_DASH,
    },
    {
      key: "request",
      header: "Request",
      width: "130px",
      cell: (r) =>
        r.requestId ? (
          <Link to={`/observability/requests/${encodeURIComponent(r.requestId)}`} onClick={(e) => e.stopPropagation()} className={NEUTRAL_CHIP} title={`Open request ${r.requestId}`}>
            <span className="truncate">{r.requestId.slice(0, 12)}</span>
          </Link>
        ) : MUTED_DASH,
    },
  ];
  const columns = environment
    ? baseColumns
    : [...baseColumns, { key: "env", header: "Environment", width: "118px", cell: (r: ProfileRow) => <EnvironmentBadge environment={r.environment} /> }];

  return (
    <FillPage>
      <PageHeader
        title="Profiling"
        description="CPU and memory profiles captured from running processes. Open one to see which functions held the CPU."
        actions={<TimeRangePicker />}
      />

      <SignalSheet cells={cells} loading={isLoading && !data} bars={timeline.bars} timelineLoading={timeline.isLoading} countLabel="Profiles" errorLabel="Flagged" />

      <TableToolbar>
        <SearchInput placeholder="Search service, profile id…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect value={environment} onChange={setEnvironment} options={ENVIRONMENT_OPTIONS} />
        <FilterSelect value={type} onChange={setType} options={TYPE_OPTS} />
        <FilterSelect value={duration} onChange={setDuration} options={DURATION_OPTIONS} />
      </TableToolbar>

      <InfiniteTable
        className="min-h-[320px] flex-1"
        loading={isLoading}
        items={rows}
        queryKey={["profiles", activeProjectSlug, environment, type, duration, query, timeRangeState, cursor]}
        columns={columns}
        getKey={(r) => r.publicId ?? r.id}
        onRowClick={(r) => navigate(`/observability/profiling/${encodeURIComponent(r.publicId ?? r.id)}`)}
        emptyTitle="No profiles in this window"
        emptyIllustration="chart"
        emptyMessage="Profiles arrive when a service runs the Pulse SDK profiler. Widen the range or clear filters."
        pagination={paginationProps}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
      />
    </FillPage>
  );
}
