import { Link } from "react-router";
import { GitBranch } from "lucide-react";
import { SeverityBadge, StatusCodeBadge, Timestamp, Table, Tr, Td } from "@/shared/observe";
import type { RelatedErrorEvent } from "../types/error-group";

interface RelatedEventsTableProps {
  events: RelatedErrorEvent[];
}

export function RelatedEventsTable({ events }: RelatedEventsTableProps) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 space-y-4">
      <div className="border-b border-[var(--border)] pb-3">
        <h3 className="text-[14px] font-semibold text-[var(--text)]">Related Error Events</h3>
        <p className="text-[12px] text-[var(--text3)]">Individual occurrences in this group</p>
      </div>

      <Table headers={["Occurred At", "Message", "Severity", "Handled", "Route", "Status", "Trace"]}>
        {events.map((evt) => (
          <Tr key={evt.id}>
            <Td><Timestamp value={evt.occurredAt} /></Td>
            <Td className="font-[family-name:var(--mono)] text-[12px]">{evt.message}</Td>
            <Td><SeverityBadge severity={evt.severity} /></Td>
            <Td>{evt.handled ? "Yes" : "No"}</Td>
            <Td className="font-[family-name:var(--mono)] text-[12px]">{evt.route}</Td>
            <Td><StatusCodeBadge code={evt.statusCode} /></Td>
            <Td>
              {(evt.tracePublicId || evt.traceId) ? (
                <Link
                  to={`/observability/traces/${evt.tracePublicId ?? evt.traceId}`}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--violet-bg)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] text-[var(--violet)] hover:underline"
                >
                  <GitBranch className="size-3" />
                  {evt.tracePublicId ?? evt.traceId.slice(0, 6)}
                </Link>
              ) : (
                <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">—</span>
              )}
            </Td>
          </Tr>
        ))}
      </Table>
    </div>
  );
}
