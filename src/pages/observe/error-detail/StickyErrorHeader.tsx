import { Link as RouterLink, useNavigate } from "react-router";
import { ArrowLeft, Brain, Sparkles, Copy, MoreHorizontal, GitBranch, AlertTriangle, ExternalLink } from "lucide-react";
import { useAiDrawerStore } from "@/modules/ai/store/ai-drawer.store";

import {
  Button,
  CopyButton,
  EnvironmentBadge,
  SeverityBadge,
  Timestamp,
} from "@/shared/observe";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ErrorDetailResponse } from "./types";
import { displayValue } from "./helpers";

export function StickyErrorHeader({
  detail,
  onAnalyze,
  onCopyJson,
}: {
  detail: ErrorDetailResponse;
  onAnalyze: () => void;
  onCopyJson: () => void;
}) {
  const navigate = useNavigate();
  const errorName = detail.error?.name ?? "Error";
  const errorMessage = detail.error?.message ?? "No message provided";
  const isHandled = detail.error?.handled ?? true;
  const severity = detail.error?.severity ?? "error";

  const issuePublicId = detail.errorGroup?.publicId ?? detail.related?.errorGroup?.publicId;
  const tracePublicId = detail.trace?.publicId ?? detail.related?.trace?.publicId;
  const requestPublicId = detail.request?.publicId ?? detail.related?.request?.publicId;

  const issuePath = issuePublicId ? `/observability/error-groups/${encodeURIComponent(issuePublicId)}` : null;
  const tracePath = tracePublicId ? `/observability/traces/${encodeURIComponent(tracePublicId)}` : null;
  const requestPath = requestPublicId ? `/observability/requests/${encodeURIComponent(requestPublicId)}` : null;

  const projectName = typeof detail.project === "object" ? detail.project?.name : detail.project;
  const serverName = typeof detail.server === "object" ? detail.server?.name : detail.server;

  return (
    <header className="sticky top-0 z-30 -mx-6 border-b border-[var(--border)] bg-[var(--bg)]/90 px-6 py-3.5 backdrop-blur-md">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Breadcrumb & Public ID */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                className="h-8 px-2 text-[var(--text3)]"
                onClick={() => navigate("/observability/errors")}
              >
                <ArrowLeft className="size-3.5" />
                Errors
              </Button>
              <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text)]">
                {detail.publicId}
              </span>
              <CopyButton value={detail.publicId} label="Copy ID" className="h-7" />
              {issuePublicId && (
                <RouterLink
                  to={issuePath!}
                  className="inline-flex items-center gap-1 font-[family-name:var(--mono)] text-[11px] text-[var(--brand)] hover:underline"
                >
                  <AlertTriangle className="size-3" />
                  {issuePublicId}
                </RouterLink>
              )}
            </div>

            {/* Error Hero Title */}
            <div className="flex flex-wrap items-center gap-2.5">
              <SeverityBadge severity={severity} />
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.08em] ${
                  isHandled
                    ? "bg-[var(--green-bg)] text-[var(--green)]"
                    : "bg-[var(--red-bg)] text-[var(--red)]"
                }`}
              >
                {isHandled ? "Handled" : "Unhandled"}
              </span>
              <span className="font-[family-name:var(--mono)] text-[15px] font-semibold text-[var(--red)]">
                {errorName}
              </span>
              <span className="text-[14px] text-[var(--text3)]">:</span>
              <h1
                className="min-w-0 truncate font-[family-name:var(--mono)] text-[14px] font-medium tracking-[-0.01em] text-[var(--text)] max-w-[500px]"
                title={errorMessage}
              >
                {errorMessage}
              </h1>
              <Timestamp value={detail.occurredAt} />
            </div>

            {/* Context Chips */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--text3)]">
              {detail.environment && <EnvironmentBadge environment={detail.environment} />}
              <MetaChip label="Project" value={projectName} />
              <MetaChip label="Service" value={detail.service} />
              <MetaChip label="Server" value={serverName} />
              <MetaChip label="Release" value={detail.release} />
              {detail.sdk && (
                <MetaChip label="SDK" value={`${detail.sdk.name ?? "sdk"} v${detail.sdk.version ?? ""}`} />
              )}
              {tracePublicId && (
                <RouterLink
                  to={tracePath!}
                  className="inline-flex items-center gap-1 font-[family-name:var(--mono)] text-[var(--text2)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:underline"
                >
                  <GitBranch className="size-3" />
                  {tracePublicId}
                </RouterLink>
              )}
              {requestPublicId && (
                <RouterLink
                  to={requestPath!}
                  className="inline-flex items-center gap-1 font-[family-name:var(--mono)] text-[var(--text2)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:underline"
                >
                  <ExternalLink className="size-3" />
                  {requestPublicId}
                </RouterLink>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <CopyButton value={errorMessage} label="Copy Message" />
            {issuePath && (
              <Button variant="secondary" className="h-9" onClick={() => navigate(issuePath)}>
                <AlertTriangle className="size-3.5 text-[var(--amber)]" />
                View Issue
              </Button>
            )}
            {requestPath && (
              <Button variant="secondary" className="h-9" onClick={() => navigate(requestPath)}>
                <ExternalLink className="size-3.5" />
                Open Request
              </Button>
            )}
            {tracePath && (
              <Button variant="secondary" className="h-9" onClick={() => navigate(tracePath)}>
                <GitBranch className="size-3.5" />
                Open Trace
              </Button>
            )}
            <Button
              variant="primary"
              className="h-9 gap-1.5"
              onClick={() => {
                useAiDrawerStore.getState().openInvestigate({
                  resourceType: "error",
                  publicId: detail.publicId,
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
              <DropdownMenuContent align="end" className="min-w-[190px]">
                <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(detail.publicId)}>
                  <Copy className="size-3.5" />
                  Copy Error ID
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(errorMessage)}>
                  <Copy className="size-3.5" />
                  Copy Exception Message
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCopyJson}>Copy Detail JSON</DropdownMenuItem>
                {issuePath && (
                  <DropdownMenuItem onClick={() => navigate(issuePath)}>Open Issue Group</DropdownMenuItem>
                )}
                {requestPath && (
                  <DropdownMenuItem onClick={() => navigate(requestPath)}>Open Request Detail</DropdownMenuItem>
                )}
                {tracePath && (
                  <DropdownMenuItem onClick={() => navigate(tracePath)}>Open Correlated Trace</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}

function MetaChip({ label, value }: { label: string; value: string | null | undefined }) {
  const text = displayValue(value);
  if (text === "—") return null;
  return (
    <span>
      <span className="text-[var(--text3)]">{label} </span>
      <span className="text-[var(--text2)]">{text}</span>
    </span>
  );
}
