import { Link as RouterLink, useNavigate } from "react-router";
import { ArrowLeft, Sparkles, Copy, MoreHorizontal, GitBranch, AlertTriangle, ExternalLink, ShieldAlert } from "lucide-react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ErrorDetailResponse } from "./types";
import { displayValue } from "./helpers";

export function StickyErrorHeader({
  detail,
  onAnalyze,
}: {
  detail: ErrorDetailResponse;
  onAnalyze: () => void;
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
    <header className="sticky top-0 z-30 -mx-6 border-b border-[var(--border)] bg-[var(--bg)]/90 px-6 py-4 backdrop-blur-md">
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Breadcrumb & Public ID */}
            <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[12px]">
              <button
                type="button"
                onClick={() => navigate("/observability/errors")}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[var(--text3)] hover:bg-[var(--bg2)] hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Errors</span>
              </button>
              <span className="text-[var(--text3)]">/</span>
              <span className="font-[family-name:var(--mono)] font-semibold text-[var(--text)]">
                {detail.publicId}
              </span>
              <CopyButton value={detail.publicId} label="Copy ID" className="h-6 px-1.5 text-[11px]" />
              {issuePublicId && (
                <RouterLink
                  to={issuePath!}
                  className="inline-flex items-center gap-1 rounded-md bg-[var(--brand-bg)] px-2 py-0.5 font-[family-name:var(--mono)] text-[11px] font-semibold text-[var(--brand)] hover:underline"
                >
                  <AlertTriangle className="size-3" />
                  Group {issuePublicId}
                </RouterLink>
              )}
            </div>

            {/* Error Hero Title */}
            <div className="flex flex-wrap items-center gap-2.5">
              <SeverityBadge severity={severity} />
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] ${
                  isHandled
                    ? "bg-[var(--green-bg)] text-[var(--green)]"
                    : "bg-[var(--red-bg)] text-[var(--red)]"
                }`}
              >
                {isHandled ? "Handled" : "Unhandled"}
              </span>
              <span className="font-[family-name:var(--mono)] text-[16px] font-bold text-[var(--red)]">
                {errorName}
              </span>
              <span className="text-[14px] text-[var(--text3)] font-semibold">:</span>
              <h1
                className="min-w-0 max-w-2xl truncate font-[family-name:var(--mono)] text-[15px] font-semibold tracking-[-0.01em] text-[var(--text)]"
                title={errorMessage}
              >
                {errorMessage}
              </h1>
              <Timestamp value={detail.occurredAt} />
            </div>

            {/* Context Chips */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--text3)]">
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
                  className="inline-flex items-center gap-1 font-[family-name:var(--mono)] text-[var(--violet)] hover:underline"
                >
                  <GitBranch className="size-3" />
                  Trace {tracePublicId}
                </RouterLink>
              )}
              {requestPublicId && (
                <RouterLink
                  to={requestPath!}
                  className="inline-flex items-center gap-1 font-[family-name:var(--mono)] text-[var(--blue)] hover:underline"
                >
                  <ExternalLink className="size-3" />
                  Request {requestPublicId.slice(0, 8)}…
                </RouterLink>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <CopyButton value={errorMessage} label="Copy Message" className="h-9 px-3 text-[12px]" />
            {issuePath && (
              <Button variant="secondary" className="h-9 gap-1.5" onClick={() => navigate(issuePath)}>
                <AlertTriangle className="size-3.5 text-[var(--amber)]" />
                View Issue
              </Button>
            )}
            {requestPath && (
              <Button variant="secondary" className="h-9 gap-1.5" onClick={() => navigate(requestPath)}>
                <ExternalLink className="size-3.5 text-[var(--blue)]" />
                Open Request
              </Button>
            )}
            {tracePath && (
              <Button variant="secondary" className="h-9 gap-1.5" onClick={() => navigate(tracePath)}>
                <GitBranch className="size-3.5 text-[var(--violet)]" />
                Open Trace
              </Button>
            )}
            <Button
              variant="primary"
              className="h-9 gap-1.5 bg-[var(--ai)] text-[var(--ai-fg)] hover:opacity-90"
              onClick={() => {
                useAiDrawerStore.getState().openInvestigate({
                  resourceType: "error",
                  publicId: detail.publicId,
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
                <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(detail.publicId)}>
                  <Copy className="size-3.5" />
                  Copy Error ID
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(errorMessage)}>
                  <Copy className="size-3.5" />
                  Copy Exception Message
                </DropdownMenuItem>
                {issuePath && (
                  <DropdownMenuItem onClick={() => navigate(issuePath)}>
                    <AlertTriangle className="size-3.5" />
                    Open Issue Group
                  </DropdownMenuItem>
                )}
                {requestPath && (
                  <DropdownMenuItem onClick={() => navigate(requestPath)}>
                    <ExternalLink className="size-3.5" />
                    Open Request Detail
                  </DropdownMenuItem>
                )}
                {tracePath && (
                  <DropdownMenuItem onClick={() => navigate(tracePath)}>
                    <GitBranch className="size-3.5" />
                    Open Correlated Trace
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

function MetaChip({ label, value }: { label: string; value: string | null | undefined }) {
  const text = displayValue(value);
  if (text === "—") return null;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[var(--text3)]">{label}:</span>
      <span className="font-medium text-[var(--text2)]">{text}</span>
    </span>
  );
}
