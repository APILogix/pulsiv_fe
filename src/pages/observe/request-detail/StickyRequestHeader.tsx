import { Link, useNavigate } from "react-router";
import { ArrowLeft, Brain, Sparkles, Copy, MoreHorizontal, GitBranch } from "lucide-react";
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
    <header className="sticky top-0 z-30 -mx-6 border-b border-[var(--border)] bg-[var(--bg)]/90 px-6 py-3 backdrop-blur-md">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                className="h-8 px-2 text-[var(--text3)]"
                onClick={() => navigate("/observability/requests")}
              >
                <ArrowLeft className="size-3.5" />
                Requests
              </Button>
              <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text)]">
                {header.publicId}
              </span>
              <CopyButton value={header.publicId} label="Copy ID" className="h-7" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <MethodBadge method={header.method} />
              <h1
                className="min-w-0 truncate font-[family-name:var(--mono)] text-[15px] font-medium tracking-[-0.01em] text-[var(--text)]"
                title={endpoint}
              >
                {endpoint}
              </h1>
              <StatusCodeBadge code={header.statusCode} />
              {header.duration != null && (
                <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                  {formatLatency(header.duration)}
                </span>
              )}
              <Timestamp value={header.timestamp} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--text3)]">
              {header.environment && <EnvironmentBadge environment={header.environment} />}
              <MetaChip label="Project" value={header.project} />
              <MetaChip label="Service" value={header.service} />
              <MetaChip label="Release" value={header.release} />
              {header.tracePublicId && (
                <Link
                  to={tracePath!}
                  className="inline-flex items-center gap-1 font-[family-name:var(--mono)] text-[var(--text2)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:underline"
                >
                  <GitBranch className="size-3" />
                  {header.tracePublicId}
                </Link>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {endpoint !== "—" && <CopyButton value={endpoint} label="Copy endpoint" />}
            {tracePath ? (
              <Button variant="secondary" className="h-9" onClick={() => navigate(tracePath)}>
                <GitBranch className="size-3.5" />
                Open Trace
              </Button>
            ) : (
              <Button variant="secondary" className="h-9" disabled>
                <GitBranch className="size-3.5" />
                Open Trace
              </Button>
            )}
            <Button
              variant="primary"
              className="h-9 gap-1.5"
              onClick={() => {
                useAiDrawerStore.getState().openInvestigate({
                  resourceType: "request",
                  publicId: header.publicId,
                });
              }}
            >
              <Sparkles className="size-3.5 text-[var(--ai)]" />
              Investigate with AI
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More actions"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-[var(--border2)] text-[var(--text2)] transition-colors hover:border-[var(--text3)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(header.publicId)}>
                  <Copy className="size-3.5" />
                  Copy request ID
                </DropdownMenuItem>
                {endpoint !== "—" && (
                  <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(endpoint)}>
                    <Copy className="size-3.5" />
                    Copy endpoint
                  </DropdownMenuItem>
                )}
                {tracePath && (
                  <DropdownMenuItem onClick={() => navigate(tracePath)}>Open trace</DropdownMenuItem>
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
    <span>
      <span className="text-[var(--text3)]">{label} </span>
      <span className="text-[var(--text2)]">{text}</span>
    </span>
  );
}
