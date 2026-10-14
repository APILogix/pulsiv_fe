import { Link, useNavigate } from "react-router";
import { Sparkles, Copy, MoreHorizontal, GitBranch } from "lucide-react";
import { useAiDrawerStore } from "@/modules/ai/store/ai-drawer.store";
import {
  DetailHeader,
  EnvironmentBadge,
  MethodBadge,
  StatusCodeBadge,
  Timestamp,
  formatAbsoluteTime,
  TRACE_CHIP,
} from "@/shared/observe";
import { aiButtonClass, ghostButtonClass } from "@/shared/observe/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RequestDetailHeader } from "./types";
import { displayValue } from "./helpers";

/** Request detail header: breadcrumb, method + endpoint headline, state, one meta line. */
export function StickyRequestHeader({
  header,
}: {
  header: RequestDetailHeader;
  onAnalyze?: () => void;
}) {
  const navigate = useNavigate();
  const endpoint = header.endpoint ?? "—";
  const tracePath = header.tracePublicId ? `/observability/traces/${encodeURIComponent(header.tracePublicId)}` : null;
  const meta = (label: string, value: string | null | undefined, mono = false) => {
    const text = displayValue(value ?? null);
    return text === "—" ? null : { label, value: text, mono };
  };

  return (
    <DetailHeader
      crumbs={[
        { label: "Observe", to: "/observability" },
        { label: "Requests", to: "/observability/requests" },
        { label: header.publicId, mono: true },
      ]}
      copyId={header.publicId}
      lead={<MethodBadge method={header.method} />}
      title={<span className="font-[family-name:var(--mono)] text-[20px] tracking-[-0.01em]" title={endpoint}>{endpoint}</span>}
      badges={
        <>
          <StatusCodeBadge code={header.statusCode} />
          {header.environment && <EnvironmentBadge environment={header.environment} />}
          {tracePath && (
            <Link to={tracePath} className={TRACE_CHIP}>
              <GitBranch className="size-3" aria-hidden="true" />
              {header.tracePublicId}
            </Link>
          )}
        </>
      }
      meta={[
        header.timestamp ? { label: "At", value: <span title={formatAbsoluteTime(header.timestamp)}><Timestamp value={header.timestamp} /></span> } : null,
        meta("Service", header.service),
        meta("Project", header.project),
        meta("Release", header.release, true),
      ]}
      actions={
        <>
          {tracePath && (
            <button type="button" className={ghostButtonClass} onClick={() => navigate(tracePath)}>
              <GitBranch className="size-3.5" aria-hidden="true" />
              Open trace
            </button>
          )}
          <button
            type="button"
            className={aiButtonClass}
            onClick={() => useAiDrawerStore.getState().openInvestigate({ resourceType: "request", publicId: header.publicId })}
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            Investigate
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="More actions" className={`${ghostButtonClass} w-9 px-0`}>
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[190px]">
              <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(header.publicId)}>
                <Copy className="size-3.5" /> Copy request ID
              </DropdownMenuItem>
              {endpoint !== "—" && (
                <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(endpoint)}>
                  <Copy className="size-3.5" /> Copy endpoint
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(window.location.href)}>
                <Copy className="size-3.5" /> Copy link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}
