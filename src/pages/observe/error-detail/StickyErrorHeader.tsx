import { Link, useNavigate } from "react-router";
import { Sparkles, Copy, MoreHorizontal, GitBranch, Layers, Globe } from "lucide-react";
import { useAiDrawerStore } from "@/modules/ai/store/ai-drawer.store";
import {
  DetailHeader,
  EnvironmentBadge,
  SeverityBadge,
  Timestamp,
  formatAbsoluteTime,
  GROUP_CHIP,
  TRACE_CHIP,
  NEUTRAL_CHIP,
} from "@/shared/observe";
import { aiButtonClass, ghostButtonClass } from "@/shared/observe/form";
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
}: {
  detail: ErrorDetailResponse;
  onAnalyze?: () => void;
}) {
  const navigate = useNavigate();
  const errorName = detail.error?.name ?? "Error";
  const errorMessage = detail.error?.message ?? "No message was captured";
  const handled = detail.error?.handled;
  const severity = detail.error?.severity ?? "error";

  const issuePublicId = detail.errorGroup?.publicId ?? detail.related?.errorGroup?.publicId;
  const tracePublicId = detail.trace?.publicId ?? detail.related?.trace?.publicId;
  const requestPublicId = detail.request?.publicId ?? detail.related?.request?.publicId;

  const issuePath = issuePublicId ? `/observability/error-groups/${encodeURIComponent(issuePublicId)}` : null;
  const tracePath = tracePublicId ? `/observability/traces/${encodeURIComponent(tracePublicId)}` : null;
  const requestPath = requestPublicId ? `/observability/requests/${encodeURIComponent(requestPublicId)}` : null;

  const projectName = typeof detail.project === "object" ? detail.project?.name : detail.project;
  const serverName = typeof detail.server === "object" ? detail.server?.name : detail.server;
  const text = (v: string | null | undefined) => (displayValue(v) === "—" ? null : displayValue(v));

  return (
    <DetailHeader
      crumbs={[
        { label: "Observe", to: "/observability" },
        { label: "Errors", to: "/observability/errors" },
        { label: detail.publicId, mono: true },
      ]}
      copyId={detail.publicId}
      title={
        <>
          <span className="text-[var(--red)]">{errorName}</span>
        </>
      }
      description={<span className="font-[family-name:var(--mono)] text-[13px] text-[var(--text)]">{errorMessage}</span>}
      badges={
        <>
          <SeverityBadge severity={severity} />
          {handled !== undefined && handled !== null && (
            <span className={`inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium ${handled ? "bg-[var(--bg3)] text-[var(--text2)]" : "bg-[var(--red-bg)] text-[var(--red)]"}`}>
              {handled ? "Handled" : "Unhandled"}
            </span>
          )}
          {detail.environment && <EnvironmentBadge environment={detail.environment} />}
          {issuePath && (
            <Link to={issuePath} className={GROUP_CHIP}>
              <Layers className="size-3" aria-hidden="true" />
              {issuePublicId}
            </Link>
          )}
          {tracePath && (
            <Link to={tracePath} className={TRACE_CHIP}>
              <GitBranch className="size-3" aria-hidden="true" />
              {tracePublicId}
            </Link>
          )}
          {requestPath && (
            <Link to={requestPath} className={NEUTRAL_CHIP}>
              <Globe className="size-3" aria-hidden="true" />
              {requestPublicId}
            </Link>
          )}
        </>
      }
      meta={[
        detail.occurredAt ? { label: "At", value: <span title={formatAbsoluteTime(detail.occurredAt)}><Timestamp value={detail.occurredAt} /></span> } : null,
        text(detail.service) ? { label: "Service", value: text(detail.service) } : null,
        text(projectName) ? { label: "Project", value: text(projectName) } : null,
        text(serverName) ? { label: "Server", value: text(serverName), mono: true } : null,
        text(detail.release) ? { label: "Release", value: text(detail.release), mono: true } : null,
        detail.sdk?.name ? { label: "SDK", value: `${detail.sdk.name}${detail.sdk.version ? ` ${detail.sdk.version}` : ""}`, mono: true } : null,
      ]}
      actions={
        <>
          {issuePath && (
            <button type="button" className={ghostButtonClass} onClick={() => navigate(issuePath)}>
              <Layers className="size-3.5" aria-hidden="true" />
              View issue
            </button>
          )}
          <button
            type="button"
            className={aiButtonClass}
            onClick={() => useAiDrawerStore.getState().openInvestigate({ resourceType: "error", publicId: detail.publicId })}
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
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(detail.publicId)}>
                <Copy className="size-3.5" /> Copy error ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(`${errorName}: ${errorMessage}`)}>
                <Copy className="size-3.5" /> Copy exception
              </DropdownMenuItem>
              {requestPath && (
                <DropdownMenuItem onClick={() => navigate(requestPath)}>
                  <Globe className="size-3.5" /> Open request
                </DropdownMenuItem>
              )}
              {tracePath && (
                <DropdownMenuItem onClick={() => navigate(tracePath)}>
                  <GitBranch className="size-3.5" /> Open trace
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}
