import { useState } from "react";
import { useNavigate } from "react-router";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, FilterBar, SearchInput, ListShell, EventTypeBadge,
  EnvironmentBadge, AskAiButton, Timestamp, VirtualList,
} from "@/shared/observe";
import { cn } from "@/lib/utils";

export default function EventsExplorer() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const { data, isLoading } = useObservabilityList<any>("spans", { search: query });
  const items = data?.items ?? [];
  const summary = data?.summary ?? {};
  const total = summary.total ?? items.length;

  return (
    <ListShell
      header={
        <>
          <PageHeader title="Spans Explorer" description="Search and inspect distributed tracing spans." />
          <FilterBar>
            <SearchInput placeholder="Search spans…" onSearch={setQuery} defaultValue={query} />
          </FilterBar>
          <div className="flex items-center gap-1 border-b border-[var(--border)]">
            <button type="button" className="relative px-3 py-2 text-sm font-medium text-[var(--text)] transition-colors">
              Spans <span className="ml-1 text-[12px] text-[var(--text3)]">{total}</span>
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--brand)]" />
            </button>
          </div>
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]">
        {isLoading && items.length === 0 ? (
          <div className="p-4 text-center text-sm text-[var(--text3)]">Loading...</div>
        ) : (
          <VirtualList items={items} rowHeight={48} height="fill" className="flex-1" getKey={(s) => s.id ?? s.spanId ?? s.eventId ?? Math.random().toString()}
            renderRow={(s) => (
              <Row onClick={() => navigate(`/observability/events/${s.id ?? s.spanId ?? s.eventId}`)}>
                <EventTypeBadge type="span" />
                <span className="min-w-0 flex-1 truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{s.name ?? "Span"}</span>
                <span className="text-[12px] tabular-nums text-[var(--text3)]">{s.durationMs ?? s.duration ?? 0}ms</span>
                <EnvironmentBadge environment={s.environment ?? s.metadata?.environment} />
                <Timestamp value={s.timestamp ?? s.startTime} />
                <AskAiButton question={`Investigate span "${s.name}" (${s.durationMs ?? s.duration}ms) on trace ${s.traceId}.`} />
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
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={cn("flex h-12 items-center gap-3 border-b border-[var(--border)] px-4", onClick && "cursor-pointer hover:bg-[var(--bg2)]")}
    >
      {children}
    </div>
  );
}
