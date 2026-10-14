import { Link } from "react-router";
import { GitBranch } from "lucide-react";
import { EmptyNote, Panel, SeverityBadge, StatusCodeBadge, Timestamp, TRACE_CHIP, MUTED_DASH } from "@/shared/observe";
import type { RelatedErrorEvent } from "../types/error-group";

const GRID = "grid grid-cols-[96px_84px_minmax(0,1fr)_160px_60px_112px] items-center gap-4";

export function RelatedEventsTable({ events }: { events: RelatedErrorEvent[] }) {
  return (
    <Panel title="Events" description={events.length ? `The latest ${events.length} occurrences in this group` : undefined} flush>
      {events.length === 0 ? (
        <div className="p-5"><EmptyNote>No individual events were returned for this group.</EmptyNote></div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className={`${GRID} border-b border-[var(--border)] px-5 py-2.5 text-[12px] font-medium text-[var(--text3)]`}>
              <span>Time</span><span>Severity</span><span>Message</span><span>Route</span><span>HTTP</span><span>Trace</span>
            </div>
            <ul className="sidebar-scroll max-h-[440px] divide-y divide-[var(--border)] overflow-y-auto">
              {events.map((evt) => {
                const id = evt.publicId ?? evt.id;
                const trace = evt.tracePublicId ?? evt.traceId;
                return (
                  <li key={evt.id} className={`${GRID} px-5 py-2 text-[12px] transition-colors hover:bg-[var(--bg2)]`}>
                    <Timestamp value={evt.occurredAt} />
                    <SeverityBadge severity={evt.severity} />
                    <Link to={`/observability/errors/${encodeURIComponent(id)}`} className="truncate font-[family-name:var(--mono)] text-[var(--text)] underline-offset-2 hover:underline" title={evt.message}>
                      {evt.message || "—"}
                      {evt.handled === false && <span className="ml-2 font-[family-name:var(--sans)] text-[11px] text-[var(--amber)]">unhandled</span>}
                    </Link>
                    <span className="truncate font-[family-name:var(--mono)] text-[var(--text2)]" title={evt.route}>{evt.route || "—"}</span>
                    {evt.statusCode ? <StatusCodeBadge code={evt.statusCode} /> : MUTED_DASH}
                    {trace ? (
                      <Link to={`/observability/traces/${encodeURIComponent(trace)}`} className={TRACE_CHIP}>
                        <GitBranch className="size-3" aria-hidden="true" />
                        <span className="truncate">{evt.tracePublicId ?? trace.slice(0, 8)}</span>
                      </Link>
                    ) : MUTED_DASH}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </Panel>
  );
}
