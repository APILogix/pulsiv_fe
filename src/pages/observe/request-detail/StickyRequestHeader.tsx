import { Link, useNavigate } from "react-router";
import { ArrowLeft, Sparkles, Copy, MoreHorizontal, GitBranch, Clock } from "lucide-react";
import { useAiDrawerStore } from "@/modules/ai/store/ai-drawer.store";
import {
  Button,
  CopyButton,
  EnvironmentBadge,
  MethodBadge,
  StatusCodeBadge,
  Timestamp,
  formatLatency,
} from "@/shared/observe";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RequestDetailHeader } from "./types";
import { displayValue } from "./helpers";

export function StickyRequestHeader({
  header,
  onAnalyze,
}: {
  header: RequestDetailHeader;
  onAnalyze: () => void;
}) {
  const navigate = useNavigate();
  const endpoint = header.endpoint ?? "—";
  const tracePath = header.tracePublicId
    ? `/observability/traces/${encodeURIComponent(header.tracePublicId)}`
    : null;

  return (
    <header className="sticky top-0 z-30 -mx-6 border-b border-[var(--border)] bg-[var(--bg)]/90 px-6 py-4 backdrop-blur-md">
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Breadcrumb row */}
            <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[12px]">
              <button
                type="button"
                onClick={() => navigate("/observability/requests")}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[var(--text3)] hover:bg-[var(--bg2)] hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Requests</span>
              </button>
              <span className="text-[var(--text3)]">/</span>
              <span className="font-[family-name:var(--mono)] font-semibold text-[var(--text)]">
                {header.publicId}
              </span>
              <CopyButton value={header.publicId} label="Copy ID" className="h-6 px-1.5 text-[11px]" />
              {header.environment && <EnvironmentBadge environment={header.environment} />}
            </div>

            {/* Request Headline row */}
            <div className="flex flex-wrap items-center gap-3">
              <MethodBadge method={header.method} />
              <h1
                className="min-w-0 max-w-2xl truncate font-[family-name:var(--mono)] text-[17px] font-semibold tracking-[-0.01em] text-[var(--text)]"
                title={endpoint}
              >
                {endpoint}
              </h1>
              <StatusCodeBadge code={header.statusCode} />
              {header.duration != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg2)] px-2.5 py-0.5 font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                  <Clock className="size-3 text-[var(--text3)]" />
                  {formatLatency(header.duration)}
                </span>
              )}
              <Timestamp value={header.timestamp} />
            </div>

            {/* Context chips */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--text3)]">
              <MetaChip label="Project" value={header.project} />
              <MetaChip label="Service" value={header.service} />
              <MetaChip label="Release" value={header.release} />
              {header.tracePublicId && (
                <Link
                  to={tracePath!}
                  className="inline-flex items-center gap-1.5 font-[family-name:var(--mono)] text-[var(--violet)] transition-colors hover:underline"
                >
                  <GitBranch className="size-3" />
                  Trace {header.tracePublicId}
                </Link>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            {endpoint !== "—" && <CopyButton value={endpoint} label="Copy endpoint" className="h-9 px-3 text-[12px]" />}
            {tracePath ? (
              <Button variant="secondary" className="h-9 gap-1.5" onClick={() => navigate(tracePath)}>
                <GitBranch className="size-3.5 text-[var(--violet)]" />
                Open Trace
              </Button>
            ) : (
              <Button variant="secondary" className="h-9 gap-1.5" disabled>
                <GitBranch className="size-3.5" />
                Open Trace
              </Button>
            )}
            <Button
              variant="primary"
              className="h-9 gap-1.5 bg-[var(--ai)] text-[var(--ai-fg)] hover:opacity-90"
              onClick={() => {
                useAiDrawerStore.getState().openInvestigate({
                  resourceType: "request",
                  publicId: header.publicId,
                });
              }}
            >
              <Sparkles className="size-3.5" />
              Investigate with AI
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
                <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(header.publicId)}>
                  <Copy className="size-3.5" />
                  Copy request ID
                </DropdownMenuItem>
                {endpoint !== "—" && (
                  <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(endpoint)}>
                    <Copy className="size-3.5" />
                    Copy endpoint URL
                  </DropdownMenuItem>
                )}
                {tracePath && (
                  <DropdownMenuItem onClick={() => navigate(tracePath)}>
                    <GitBranch className="size-3.5" />
                    Open correlated trace
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

function MetaChip({ label, value }: { label: string; value: string | null }) {
  const text = displayValue(value);
  if (text === "—") return null;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[var(--text3)]">{label}:</span>
      <span className="font-medium text-[var(--text2)]">{text}</span>
    </span>
  );
}
