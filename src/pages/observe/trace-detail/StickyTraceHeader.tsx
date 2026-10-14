import { Link, useNavigate } from "react-router";
import { Globe, Sparkles, Copy, MoreHorizontal } from "lucide-react";
import {
  DetailHeader,
  EnvironmentBadge,
  StatusBadge,
  Timestamp,
  formatAbsoluteTime,
  NEUTRAL_CHIP,
} from "@/shared/observe";
import { aiButtonClass, ghostButtonClass } from "@/shared/observe/form";
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
  const traceName = entity.rootSpanName || entity.name || entity.endpoint || "Trace";
  const durationMs = entity.totalDurationMs ?? entity.durationMs ?? 0;
  const status = entity.rootSpanStatus || entity.status || "ok";
  const requestId = entity.requestId || detail.correlations?.requestId;
  const requestPath = requestId ? `/observability/requests/${encodeURIComponent(requestId)}` : null;

  return (
    <DetailHeader
      crumbs={[
        { label: "Observe", to: "/observability" },
        { label: "Traces", to: "/observability/traces" },
        { label: publicId, mono: true },
      ]}
      copyId={publicId}
      title={<span className="font-[family-name:var(--mono)] text-[20px] tracking-[-0.01em]" title={traceName}>{traceName}</span>}
      badges={
        <>
          <StatusBadge status={String(status).toLowerCase() === "error" ? "error" : status} />
          <span className={`rounded-[4px] bg-[var(--bg3)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[11px] tabular-nums ${durationMs >= 1000 ? "text-[var(--red)]" : durationMs >= 500 ? "text-[var(--amber)]" : "text-[var(--text)]"}`}>
            {formatDurationMs(durationMs)}
          </span>
          {entity.environment && <EnvironmentBadge environment={entity.environment} />}
          {requestPath && (
            <Link to={requestPath} className={NEUTRAL_CHIP}>
              <Globe className="size-3" aria-hidden="true" />
              {requestId}
            </Link>
          )}
        </>
      }
      meta={[
        entity.occurredAt ? { label: "At", value: <span title={formatAbsoluteTime(entity.occurredAt)}><Timestamp value={entity.occurredAt} /></span> } : null,
        entity.service ? { label: "Service", value: entity.service } : null,
        entity.project ? { label: "Project", value: entity.projectName || entity.project } : null,
        entity.release ? { label: "Release", value: entity.release, mono: true } : null,
        entity.sdkName ? { label: "SDK", value: `${entity.sdkName}${entity.sdkVersion ? `@${entity.sdkVersion}` : ""}`, mono: true } : null,
      ]}
      actions={
        <>
          <button type="button" className={aiButtonClass} onClick={onAnalyze} disabled={analyzing}>
            <Sparkles className="size-3.5" aria-hidden="true" />
            {analyzing ? "Analyzing…" : "Investigate"}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="More actions" className={`${ghostButtonClass} w-9 px-0`}>
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[190px]">
              <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(publicId)}>
                <Copy className="size-3.5" /> Copy trace ID
              </DropdownMenuItem>
              {entity.traceId && entity.traceId !== publicId && (
                <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(entity.traceId!)}>
                  <Copy className="size-3.5" /> Copy W3C trace ID
                </DropdownMenuItem>
              )}
              {requestPath && (
                <DropdownMenuItem onClick={() => navigate(requestPath)}>
                  <Globe className="size-3.5" /> Open request
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}
