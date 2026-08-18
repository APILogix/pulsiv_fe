import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { GitBranch } from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, FillPage, TableToolbar, SearchInput,
  EnvironmentBadge, Timestamp, InfiniteTable, TimeRangePicker, useTimeRangeParams,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";

interface SpanExplorerRow {
  id?: string;
  publicId?: string;
  spanId?: string;
  parentSpanId?: string;
  eventId?: string;
  name?: string;
  spanKind?: string;
  spanType?: string;
  durationMs?: number;
  duration?: number;
  environment?: string;
  metadata?: { environment?: string };
  occurredAt?: string | number;
  timestamp?: string | number;
  startTime?: string | number;
  traceId?: string;
  service?: string;
}

export default function EventsExplorer() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const { timeRangeState } = useTimeRangeParams();

  const handleNextPage = (nextCursor: string) => {
    setCursorHistory((prev) => [...prev, cursor ?? ""]);
    setCursor(nextCursor);
  };

  const handlePreviousPage = () => {
    if (cursorHistory.length === 0) return;
    const prevCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((prev) => prev.slice(0, -1));
    setCursor(prevCursor || undefined);
  };

  const { data, isLoading } = useObservabilityList<SpanExplorerRow>("spans", {
    search: query || undefined,
    range: timeRangeState.mode === "preset" ? timeRangeState.range : undefined,
    from: timeRangeState.from,
    to: timeRangeState.to,
    cursor,
  });
  const items = data?.items ?? [];

  const columns: Column<SpanExplorerRow>[] = [
    {
      key: "time",
      header: "TIME",
      width: "120px",
      cell: (s) => <Timestamp value={s.occurredAt ?? s.timestamp ?? s.startTime} />,
    },
    {
      key: "name",
      header: "OPERATION / SPAN",
      width: "1fr",
      cell: (s) => (
        <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]" title={s.name}>
          {s.name ?? "Span"}
        </span>
      ),
    },
    {
      key: "duration",
      header: "DURATION",
      width: "110px",
      align: "right",
      cell: (s) => (
        <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
          {s.durationMs ?? s.duration ?? 0}ms
        </span>
      ),
    },
    {
      key: "service",
      header: "SERVICE",
      width: "130px",
      cell: (s) => (
        <span className="truncate font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
          {s.service ?? "—"}
        </span>
      ),
    },
    {
      key: "trace",
      header: "TRACE",
      width: "110px",
      cell: (s) =>
        s.traceId ? (
          <Link
            to={`/observability/traces/${s.traceId}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--violet-bg)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium text-[var(--violet)] hover:underline"
          >
            <GitBranch className="size-3 shrink-0" />
            <span>{s.traceId.slice(0, 7)}</span>
          </Link>
        ) : (
          <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">—</span>
        ),
    },
    {
      key: "env",
      header: "ENV",
      width: "110px",
      cell: (s) => <EnvironmentBadge environment={s.environment ?? s.metadata?.environment ?? "production"} />,
    },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Spans Explorer"
        description="Search and inspect distributed tracing spans."
        actions={<TimeRangePicker />}
      />

      <TableToolbar resourceName="spans">
        <SearchInput placeholder="Search spans, operations…" onSearch={setQuery} defaultValue={query} />
      </TableToolbar>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={items}
        queryKey={["spans-explorer", query, timeRangeState, cursor]}
        columns={columns}
        getKey={(s) => s.publicId ?? s.id ?? s.spanId ?? s.eventId ?? String(Math.random())}
        onRowClick={(s) => navigate(`/observability/spans/${encodeURIComponent(s.publicId ?? s.id ?? s.spanId ?? s.eventId ?? '')}`)}
        pagination={{
          nextCursor: data?.pagination?.nextCursor,
          previousCursor: data?.pagination?.previousCursor,
          hasNext: data?.pagination?.hasNext,
          hasPrevious: cursorHistory.length > 0 || !!data?.pagination?.hasPrevious,
          limit: data?.pagination?.limit,
        }}
        onNextPage={handleNextPage}
        onPreviousPage={cursorHistory.length > 0 ? handlePreviousPage : undefined}
      />
    </FillPage>
  );
}
