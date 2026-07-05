import { useState } from "react";
import { useNavigate } from "react-router";
import {
  useErrorEvents, useRequestEvents, useLogEvents, useSpanEvents, useMetricEvents,
} from "@/hooks/useDummyData";
import {
  PageHeader, FilterBar, SearchInput, ListShell, EventTypeBadge,
  SeverityBadge, StatusCodeBadge, Timestamp, VirtualList, useInfiniteScroll,
} from "@/shared/observe";
import { cn } from "@/lib/utils";

const TYPES = [
  { id: "error", label: "Errors" },
  { id: "request", label: "Requests" },
  { id: "log", label: "Logs" },
  { id: "span", label: "Spans" },
  { id: "metric", label: "Metrics" },
] as const;

type TypeId = (typeof TYPES)[number]["id"];

function filterList<T>(items: T[], query: string, get: (t: T) => string): T[] {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter((i) => get(i).toLowerCase().includes(q));
}

export default function EventsExplorer() {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<TypeId>("error");
  const [query, setQuery] = useState("");

  const errors = filterList(useErrorEvents().data ?? [], query, (e) => e.message);
  const requests = filterList(useRequestEvents().data ?? [], query, (r) => r.url);
  const logs = filterList(useLogEvents().data ?? [], query, (l) => l.message);
  const spans = filterList(useSpanEvents().data ?? [], query, (s) => s.name);
  const metrics = filterList(useMetricEvents().data ?? [], query, (m) => m.metricName);

  const errPage = useInfiniteScroll(errors, `error|${query}`);
  const reqPage = useInfiniteScroll(requests, `request|${query}`);
  const logPage = useInfiniteScroll(logs, `log|${query}`);
  const spanPage = useInfiniteScroll(spans, `span|${query}`);
  const metricPage = useInfiniteScroll(metrics, `metric|${query}`);

  const counts: Record<TypeId, number> = {
    error: errors.length, request: requests.length, log: logs.length, span: spans.length, metric: metrics.length,
  };

  const footer = (p: { hasMore: boolean; loading: boolean; shown: number; total: number }) => (
    <div className="py-3 text-center text-[12px] text-[var(--text3)]">
      {p.hasMore ? (p.loading ? "Loading more…" : `Showing ${p.shown} of ${p.total}`) : `All ${p.total} loaded`}
    </div>
  );

  return (
    <ListShell
      header={
        <>
          <PageHeader title="Events Explorer" description="Search and inspect ingested telemetry across all event types." />
          <FilterBar>
            <SearchInput placeholder="Search events… (e.g. service:payment status:500)" onSearch={setQuery} defaultValue={query} />
          </FilterBar>
          <div className="flex items-center gap-1 border-b border-[var(--border)]">
            {TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveType(t.id)}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium transition-colors",
                  activeType === t.id ? "text-[var(--text)]" : "text-[var(--text3)] hover:text-[var(--text2)]"
                )}
              >
                {t.label} <span className="ml-1 text-[12px] text-[var(--text3)]">{counts[t.id]}</span>
                {activeType === t.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--brand)]" />}
              </button>
            ))}
          </div>
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]">
        {activeType === "error" && (
          <VirtualList items={errPage.visible} rowHeight={48} height="fill" className="flex-1" getKey={(e) => e.eventId} onEndReached={errPage.loadMore} footer={footer(errPage)}
            renderRow={(e) => (
              <Row onClick={() => navigate(`/observability/events/${e.eventId}`)}>
                <EventTypeBadge type="error" /><SeverityBadge severity={e.severity} />
                <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text2)]">{e.message}</span>
                <Timestamp value={e.timestamp} />
              </Row>
            )} />
        )}
        {activeType === "request" && (
          <VirtualList items={reqPage.visible} rowHeight={48} height="fill" className="flex-1" getKey={(r) => r.eventId} onEndReached={reqPage.loadMore} footer={footer(reqPage)}
            renderRow={(r) => (
              <Row onClick={() => navigate(`/observability/requests/${r.requestId}`)}>
                <EventTypeBadge type="request" /><StatusCodeBadge code={r.statusCode} />
                <span className="min-w-0 flex-1 truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{r.method} {r.url}</span>
                <Timestamp value={r.timestamp} />
              </Row>
            )} />
        )}
        {activeType === "log" && (
          <VirtualList items={logPage.visible} rowHeight={48} height="fill" className="flex-1" getKey={(l) => l.eventId} onEndReached={logPage.loadMore} footer={footer(logPage)}
            renderRow={(l) => (
              <Row onClick={() => navigate(`/observability/logs/${l.eventId}`)}>
                <EventTypeBadge type="log" /><SeverityBadge severity={l.level} />
                <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text2)]">{l.message}</span>
                <Timestamp value={l.timestamp} />
              </Row>
            )} />
        )}
        {activeType === "span" && (
          <VirtualList items={spanPage.visible} rowHeight={48} height="fill" className="flex-1" getKey={(s) => s.eventId} onEndReached={spanPage.loadMore} footer={footer(spanPage)}
            renderRow={(s) => (
              <Row onClick={() => navigate(`/observability/traces/${s.traceId}`)}>
                <EventTypeBadge type="span" />
                <span className="min-w-0 flex-1 truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{s.name}</span>
                <span className="text-[12px] tabular-nums text-[var(--text3)]">{s.duration}ms</span>
                <Timestamp value={s.startTime} />
              </Row>
            )} />
        )}
        {activeType === "metric" && (
          <VirtualList items={metricPage.visible} rowHeight={48} height="fill" className="flex-1" getKey={(m) => m.eventId} onEndReached={metricPage.loadMore} footer={footer(metricPage)}
            renderRow={(m) => (
              <Row>
                <EventTypeBadge type="metric" />
                <span className="min-w-0 flex-1 truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{m.metricName}</span>
                <span className="text-[12px] tabular-nums text-[var(--text3)]">{m.value.toFixed(1)} {m.unit}</span>
                <Timestamp value={m.timestamp} />
              </Row>
            )} />
        )}
      </div>
    </ListShell>
  );
}

function Row({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn("flex h-12 items-center gap-3 border-b border-[var(--border)] px-4", onClick && "cursor-pointer hover:bg-[var(--bg2)]")}
    >
      {children}
    </div>
  );
}
