import { Link, useNavigate } from "react-router";
import { ArrowLeft, ExternalLink, GitBranch, Sparkles, Clock, Copy, MoreHorizontal } from "lucide-react";
import {
  Button,
  CopyButton,
  EnvironmentBadge,
  StatusBadge,
  Timestamp,
} from "@/shared/observe";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <header className="sticky top-0 z-30 -mx-6 border-b border-[var(--border)] bg-[var(--bg)]/90 px-6 py-4 backdrop-blur-md">
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Top metadata / breadcrumb row */}
            <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[12px]">
              <button
                type="button"
                onClick={() => navigate("/observability/traces")}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[var(--text3)] hover:bg-[var(--bg2)] hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Traces</span>
              </button>
              <span className="text-[var(--text3)]">/</span>
              <span className="font-[family-name:var(--mono)] font-semibold text-[var(--text)]">
                {publicId}
              </span>
              <CopyButton value={publicId} label="Copy ID" className="h-6 px-1.5 text-[11px]" />
              {entity.environment && <EnvironmentBadge environment={entity.environment} />}
              {entity.project && (
                <span className="inline-flex items-center rounded-md bg-[var(--bg2)] px-2 py-0.5 text-[11px] font-medium text-[var(--text2)]">
                  {entity.project}
                </span>
              )}
            </div>

            {/* Title & metrics row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--violet-bg)] text-[var(--violet)]">
                <GitBranch className="size-4" />
              </div>
              <h1
                className="min-w-0 max-w-2xl truncate font-[family-name:var(--mono)] text-[17px] font-semibold tracking-[-0.01em] text-[var(--text)]"
                title={traceName}
              >
                {traceName}
              </h1>
              <StatusBadge status={status} />
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg2)] px-2.5 py-0.5 font-[family-name:var(--mono)] text-[12px] tabular-nums font-semibold text-[var(--text2)]">
                <Clock className="size-3 text-[var(--text3)]" />
                {formatDurationMs(durationMs)}
              </span>
              <Timestamp value={entity.occurredAt} />
            </div>

            {/* SDK & Service context row */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--text3)]">
              {entity.service && (
                <span>
                  Service: <strong className="text-[var(--text2)]">{entity.service}</strong>
                </span>
              )}
              {entity.release && (
                <span>
                  Release: <strong className="text-[var(--text2)]">{entity.release}</strong>
                </span>
              )}
              {entity.sdkName && (
                <span className="font-[family-name:var(--mono)] text-[11.5px]">
                  SDK: {entity.sdkName}{entity.sdkVersion ? `@${entity.sdkVersion}` : ""}
                </span>
              )}
              {requestId && (
                <Link
                  to={`/observability/requests/${encodeURIComponent(requestId)}`}
                  className="inline-flex items-center gap-1 font-[family-name:var(--mono)] text-[11.5px] text-[var(--blue)] hover:underline"
                >
                  <ExternalLink className="size-3" />
                  Request {requestId.slice(0, 8)}…
                </Link>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <CopyButton value={publicId} label="Copy trace ID" className="h-9 px-3 text-[12px]" />
            <Button
              variant="primary"
              className="h-9 gap-1.5 bg-[var(--ai)] text-[var(--ai-fg)] hover:opacity-90"
              onClick={onAnalyze}
              disabled={analyzing}
            >
              <Sparkles className="size-3.5" />
              {analyzing ? "Analyzing…" : "Investigate with AI"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More actions"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text2)] transition-colors hover:border-[var(--text3)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] cursor-pointer"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[190px]">
                <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(publicId)}>
                  <Copy className="size-3.5" />
                  Copy trace ID
                </DropdownMenuItem>
                {requestId && (
                  <DropdownMenuItem onClick={() => navigate(`/observability/requests/${encodeURIComponent(requestId)}`)}>
                    <ExternalLink className="size-3.5" />
                    Open linked request
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
