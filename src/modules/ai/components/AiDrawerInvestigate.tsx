import { useState, useEffect } from "react";
import {
  Bug,
  ListTree,
  ArrowLeftRight,
  ScrollText,
  Loader2,
  RefreshCw,
  MessageSquarePlus,
  Play,
} from "lucide-react";
import { Button } from "@/shared/observe";
import { SegmentedControl, fieldInputClass } from "@/shared/ui/pulse";
import { InvestigationResult } from "./InvestigationResult";
import { AiErrorState } from "./states";
import { useActiveOrgId, useInvestigation } from "../hooks/useAi";
import { aiApi } from "../api/ai.api";
import { useAiDrawerStore } from "../store/ai-drawer.store";
import type { InvestigationResource } from "../types";

const RESOURCES: { value: InvestigationResource; label: string; icon: typeof Bug; placeholder: string }[] = [
  { value: "error", label: "Error", icon: Bug, placeholder: "e.g. ERR-000000001 or err_01JXYZ..." },
  { value: "trace", label: "Trace", icon: ListTree, placeholder: "e.g. TRC-000000001 or trace_01JXYZ..." },
  { value: "request", label: "Request", icon: ArrowLeftRight, placeholder: "e.g. REQ-000000001 or req_01JXYZ..." },
  { value: "logs", label: "Logs", icon: ScrollText, placeholder: "e.g. LOG-000000001 or log_01JXYZ..." },
];

export function AiDrawerInvestigate() {
  const orgId = useActiveOrgId();
  const investigation = useInvestigation();
  const context = useAiDrawerStore((s) => s.context);
  const setContext = useAiDrawerStore((s) => s.setContext);
  const openChat = useAiDrawerStore((s) => s.openChat);

  const [resource, setResource] = useState<InvestigationResource>(context?.resourceType ?? "error");
  const [publicId, setPublicId] = useState<string>(context?.publicId ?? "");
  const [inputError, setInputError] = useState<string | null>(null);

  // Sync with context if set from a detail page
  useEffect(() => {
    if (context?.publicId) {
      setResource(context.resourceType);
      setPublicId(context.publicId);
      setInputError(null);
      investigation.mutate({
        resource: context.resourceType,
        publicId: context.publicId,
      });
    }
  }, [context?.resourceType, context?.publicId]);

  const handleRun = () => {
    const trimmedId = publicId.trim();
    if (!trimmedId) {
      setInputError("Please enter a canonical Public ID to investigate.");
      return;
    }
    setInputError(null);
    setContext({ resourceType: resource, publicId: trimmedId });
    investigation.mutate({ resource, publicId: trimmedId });
  };

  const handleReset = () => {
    setContext(null);
    setPublicId("");
    investigation.reset();
  };

  const handleFollowUpChat = () => {
    if (!investigation.data) return;
    const summary = investigation.data.plain_language_summary;
    const cause = investigation.data.likely_causes[0]?.cause ?? "";
    const prompt = `I'm following up on the AI investigation for ${resource.toUpperCase()} ${publicId}.\n\nRoot cause identified: ${cause || summary}\n\nCould you explain how to fix this step by step?`;
    openChat(prompt);
  };

  const handleFeedback = async (helpful: boolean) => {
    if (!orgId || !investigation.data) return;
    await aiApi.submitFeedback(orgId, investigation.data.request_id, { helpful });
  };

  const activeMeta = RESOURCES.find((r) => r.value === resource) ?? RESOURCES[0];
  const Icon = activeMeta.icon;

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-4">
      {/* If an active contextual investigation is loaded */}
      {context?.publicId ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-6 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--ai-bg)] text-[var(--ai)]">
                <Icon className="size-3.5" />
              </span>
              <span className="text-[12px] font-semibold text-[var(--text)] uppercase tracking-wider">
                {context.resourceType}
              </span>
              <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
                {context.publicId}
              </span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-[11px] text-[var(--text3)] transition-colors hover:bg-[var(--bg3)] hover:text-[var(--text)]"
            >
              <RefreshCw className="size-3" />
              New query
            </button>
          </div>

          {investigation.isPending ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] px-6 py-16 text-center">
              <div className="relative flex size-12 items-center justify-center rounded-full bg-[var(--ai-bg)] text-[var(--ai)]">
                <Loader2 className="size-6 animate-spin" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-[14px] font-semibold text-[var(--text)]">Resolving telemetry & root cause...</h3>
                <p className="text-[12px] text-[var(--text3)]">
                  Correlating traces, requests, error groups, stack traces, and logs for{" "}
                  <code className="font-[family-name:var(--mono)] text-[var(--text2)]">{context.publicId}</code>
                </p>
              </div>
            </div>
          ) : investigation.isError ? (
            <AiErrorState error={investigation.error} onRetry={handleRun} />
          ) : investigation.data ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-[12px] font-medium text-[var(--text3)]">Grounded Root Cause Analysis</span>
                <Button
                  variant="secondary"
                  onClick={handleFollowUpChat}
                  className="h-7 text-[11px] gap-1 text-[var(--ai)] border-[var(--ai)]/30 hover:bg-[var(--ai-bg)]"
                >
                  <MessageSquarePlus className="size-3.5" />
                  Ask follow-up in Chat
                </Button>
              </div>
              <InvestigationResult answer={investigation.data} onFeedback={handleFeedback} />
            </div>
          ) : null}
        </div>
      ) : (
        /* Global Minimal Investigation Prompt */
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-[15px] font-semibold text-[var(--text)]">What are you investigating?</h2>
            <p className="text-[12px] leading-relaxed text-[var(--text2)]">
              Select the resource type and provide its canonical Public ID. The backend will automatically retrieve and correlate all surrounding observability context.
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 shadow-sm">
            <label className="flex flex-col gap-2">
              <span className="text-[12px] font-medium text-[var(--text2)]">Resource Type</span>
              <SegmentedControl
                ariaLabel="Investigation resource"
                value={resource}
                onChange={(v) => {
                  setResource(v);
                  setInputError(null);
                }}
                options={RESOURCES}
                className="w-full flex-wrap"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--text2)]">Public ID</span>
              <input
                className={`${fieldInputClass} font-[family-name:var(--mono)] text-[13px]`}
                value={publicId}
                onChange={(e) => {
                  setPublicId(e.target.value);
                  setInputError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRun();
                }}
                placeholder={activeMeta.placeholder}
                autoFocus
              />
              {inputError ? (
                <p className="text-[11.5px] text-[var(--red)]">{inputError}</p>
              ) : (
                <p className="text-[11px] text-[var(--text3)]">
                  Enter the canonical ID (e.g. <span className="font-[family-name:var(--mono)]">{activeMeta.value === 'error' ? 'ERR-000000001' : activeMeta.value === 'trace' ? 'TRC-000000001' : activeMeta.value === 'request' ? 'REQ-000000001' : 'LOG-000000001'}</span>)
                </p>
              )}
            </label>

            <Button
              variant="primary"
              onClick={handleRun}
              disabled={investigation.isPending || !publicId.trim()}
              className="mt-1 w-full justify-center"
            >
              {investigation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Investigating…
                </>
              ) : (
                <>
                  <Play className="size-4" /> Investigate
                </>
              )}
            </Button>
          </div>

          {investigation.isPending && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] px-4 py-12 text-center">
              <Loader2 className="size-5 animate-spin text-[var(--ai)]" />
              <p className="text-[12.5px] text-[var(--text2)]">Correlating telemetry and generating a grounded analysis…</p>
            </div>
          )}

          {investigation.isError && (
            <AiErrorState error={investigation.error} onRetry={handleRun} />
          )}

          {investigation.data && (
            <div className="flex flex-col gap-4 pt-2">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-[12px] font-medium text-[var(--text3)]">Investigation Result</span>
                <Button
                  variant="secondary"
                  onClick={handleFollowUpChat}
                  className="h-7 text-[11px] gap-1 text-[var(--ai)] border-[var(--ai)]/30 hover:bg-[var(--ai-bg)]"
                >
                  <MessageSquarePlus className="size-3.5" />
                  Ask follow-up in Chat
                </Button>
              </div>
              <InvestigationResult answer={investigation.data} onFeedback={handleFeedback} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
