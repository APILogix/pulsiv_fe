import { Link } from "react-router";
import { GitBranch } from "lucide-react";
import { KeyValueList, Panel, StatusCodeBadge, Timestamp } from "@/shared/observe";
import { ghostButtonClass } from "@/shared/observe/form";
import { StackTraceViewer } from "@/pages/observe/error-detail/StackTraceViewer";
import type { StackFrame } from "@/pages/observe/error-detail/types";
import type { ErrorGroup } from "../types/error-group";

export function LatestEventCard({ group }: { group: ErrorGroup }) {
  const trace = group.latestEvent?.trace?.publicId ?? group.tracePublicId ?? group.latestEvent?.trace?.traceId ?? group.traceId ?? group.lastTraceId;
  const latestId = group.latestEvent?.publicId;
  const status = group.latestEvent?.statusCode ?? group.lastStatusCode;

  return (
    <Panel
      title="Latest event"
      description="The most recent occurrence and the stack it was thrown from."
      action={
        <>
          {trace && (
            <Link to={`/observability/traces/${encodeURIComponent(trace)}`} className={ghostButtonClass}>
              <GitBranch className="size-3.5 text-[var(--violet)]" aria-hidden="true" />
              Trace
            </Link>
          )}
          {latestId && (
            <Link to={`/observability/errors/${encodeURIComponent(latestId)}`} className={ghostButtonClass}>
              Open event
            </Link>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <KeyValueList
          columns={2}
          hideEmpty
          items={[
            { label: "Event", value: latestId, mono: true, copyable: true },
            { label: "Seen", value: group.occurrences?.lastSeenAt ?? group.lastSeen ? <Timestamp value={group.occurrences?.lastSeenAt ?? group.lastSeen} /> : null },
            { label: "Route", value: group.route, mono: true },
            { label: "Status", value: status ? <StatusCodeBadge code={status} /> : null },
            { label: "Service", value: group.service },
            { label: "Trace", value: trace, mono: true, copyable: true },
          ]}
        />
        <StackTraceViewer frames={(group.stackFrames ?? []) as unknown as StackFrame[]} />
      </div>
    </Panel>
  );
}
