import { useState } from "react";
import { ChevronDown, ChevronRight, GitBranch } from "lucide-react";
import { StatusCodeBadge, EnvironmentBadge, Timestamp } from "@/shared/observe";
import type { ErrorGroup } from "../types/error-group";
import { Link } from "react-router";

interface LatestEventCardProps {
  group: ErrorGroup;
}

export function LatestEventCard({ group }: LatestEventCardProps) {
  const [isStackOpen, setIsStackOpen] = useState(true);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--text)]">Latest Event Sample</h3>
          <p className="text-[12px] text-[var(--text3)]">Captured stack trace and execution context</p>
        </div>
        {(group.tracePublicId || group.traceId) && (
          <Link
            to={`/observability/traces/${group.tracePublicId ?? group.traceId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--violet)]/40 bg-[var(--violet-bg)] px-3 py-1.5 font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--violet)] hover:underline cursor-pointer"
          >
            <GitBranch className="size-3.5" />
            Open Trace ({group.tracePublicId ?? group.traceId?.slice(0, 7)})
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-4 font-[family-name:var(--mono)] bg-[var(--bg2)] p-3 rounded-lg border border-[var(--border)]">
        <div>
          <span className="text-[var(--text3)]">Status Code:</span>{" "}
          {group.lastStatusCode ? <StatusCodeBadge code={group.lastStatusCode} /> : "—"}
        </div>
        <div>
          <span className="text-[var(--text3)]">Route:</span>{" "}
          <span className="text-[var(--text)]">{group.route ?? "—"}</span>
        </div>
        <div>
          <span className="text-[var(--text3)]">Env:</span>{" "}
          <EnvironmentBadge environment={group.environment} />
        </div>
        <div>
          <span className="text-[var(--text3)]">Last Seen:</span>{" "}
          <Timestamp value={group.lastSeen} />
        </div>
      </div>

      {/* Stack Trace Preview */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setIsStackOpen(!isStackOpen)}
          className="flex items-center gap-1.5 font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text2)] hover:text-[var(--text)] cursor-pointer select-none"
        >
          {isStackOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          <span>Stack Frames ({group.stackFrames?.length ?? 0})</span>
        </button>

        {isStackOpen && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 font-[family-name:var(--mono)] text-[12px] space-y-1.5 overflow-x-auto">
             {(group.stackFrames ?? []).map((frame, i) => (
              <div
                key={i}
                className={`p-2 rounded border transition-colors ${
                  frame.inApp
                    ? "border-[var(--brand)]/30 bg-[var(--brand)]/5 text-[var(--text)]"
                    : "border-transparent text-[var(--text3)]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--amber)]">{frame.function}</span>
                  <span className="text-[11px] text-[var(--text3)]">
                    {frame.filename}:{frame.lineno}:{frame.colno}
                  </span>
                </div>
                {frame.contextLine && (
                  <pre className="mt-1 overflow-x-auto rounded bg-black/40 p-2 text-[11px] text-[var(--green)]">
                    {frame.contextLine}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
