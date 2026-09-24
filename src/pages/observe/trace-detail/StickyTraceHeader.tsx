import { Link, useNavigate } from "react-router";
import { ArrowLeft, ExternalLink, GitBranch, Sparkles } from "lucide-react";
import {
  Button,
  CopyButton,
  EnvironmentBadge,
  StatusBadge,
  Timestamp,
} from "@/shared/observe";
import { formatDurationMs } from "./helpers";
import type { TraceDetailData } from "./types";

export function StickyTraceHeader({
  detail,
  onAnalyze,
  analyzing,
}: {
  detail: TraceDetailData;
  onAnalyze: () => void;
  analyzing: boolean;
}) {
  const navigate = useNavigate();
  const entity = detail.entity;
  const publicId = detail.publicId || entity.publicId || detail.id;
  const traceName = entity.rootSpanName || entity.name || "Trace";
  const durationMs = entity.totalDurationMs ?? entity.durationMs ?? 0;
  const status = entity.rootSpanStatus || entity.status || "ok";
  const requestId = entity.requestId || detail.correlations?.requestId;

  return (
    <header className="sticky top-0 z-30 -mx-6 border-b border-[var(--border)] bg-[var(--bg)]/90 px-6 py-3.5 backdrop-blur-md">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Top metadata row */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                className="h-8 px-2 text-[var(--text3)]"
                onClick={() => navigate("/observability/traces")}
              >
                <ArrowLeft className="size-3.5" />
                Traces
              </Button>
              <span className="font-mono text-[12px] font-semibold text-[var(--text)]">
                {publicId}
              </span>
              <CopyButton value={publicId} label="Copy ID" className="h-7" />
              {entity.environment && <EnvironmentBadge environment={entity.environment} />}
              {entity.project && (
                <span className="inline-flex items-center gap-1 rounded-[var(--radius)] bg-[var(--bg2)] px-2 py-0.5 text-[11px] font-medium text-[var(--text2)]">
                  {entity.project}
                </span>
              )}
            </div>

            {/* Title & metrics row */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-[var(--radius)] bg-[var(--violet-bg)] text-[var(--violet)]">
                <GitBranch className="size-4" />
              </div>
              <h1
                className="min-w-0 max-w-xl truncate font-mono text-[16px] font-semibold tracking-[-0.01em] text-[var(--text)]"
                title={traceName}
              >
                {traceName}
              </h1>
              <StatusBadge status={status} />
              <span className="font-mono text-[13px] font-semibold tabular-nums text-[var(--text2)]">
                {formatDurationMs(durationMs)}
              </span>
              <Timestamp value={entity.occurredAt} />
            </div>

            {/* SDK & Service context row */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--text3)]">
              {entity.service && <span>Service: <strong className="text-[var(--text2)]">{entity.service}</strong></span>}
              {entity.release && <span>Release: <strong className="text-[var(--text2)]">{entity.release}</strong></span>}
              {entity.sdkName && (
                <span className="font-mono text-[11px]">
                  SDK: {entity.sdkName}{entity.sdkVersion ? `@${entity.sdkVersion}` : ""}
                </span>
              )}
              {requestId && (
                <Link
                  to={`/observability/requests/${encodeURIComponent(requestId)}`}
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--blue)] hover:underline"
                >
                  <ExternalLink className="size-3" />
                  Request: {requestId.slice(0, 8)}…
                </Link>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant="primary"
              className="h-9 gap-1.5 bg-[var(--ai)] text-[var(--ai-fg)] hover:opacity-90"
              onClick={onAnalyze}
              disabled={analyzing}
            >
              <Sparkles className="size-3.5" />
              {analyzing ? "Analyzing…" : "Investigate with AI"}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
