import { useState, useEffect } from "react";
import { Sparkles, X, AlertCircle, Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { analyzeBulkObservability } from "@/pages/observe/hooks/useObservabilityApi";

const EXAMPLE_PROMPTS = [
  "What is causing these failures?",
  "Summarize common issues.",
  "Find latency bottlenecks.",
  "Which endpoints are most problematic?",
  "Explain the common root cause.",
];

interface AskAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: string;
  selectedIds: string[];
  filters?: Record<string, any>;
  search?: string;
  timeRange?: any;
}

export function AskAiModal({
  isOpen,
  onClose,
  resource,
  selectedIds,
  filters = {},
  search = "",
  timeRange,
}: AskAiModalProps) {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ summary?: string; facts?: string[]; answer?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreditsExhausted, setIsCreditsExhausted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPrompt("");
      setResult(null);
      setError(null);
      setIsCreditsExhausted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSelectedMode = selectedIds.length > 0;
  const selectedCount = selectedIds.length;
  const isLargeSelection = selectedCount > 100;

  const handleAnalyze = async (customPrompt?: string) => {
    const finalPrompt = customPrompt ?? prompt;
    if (!activeOrgId) return;

    setIsLoading(true);
    setError(null);
    setIsCreditsExhausted(false);

    try {
      const payload = {
        selectionMode: isSelectedMode ? ("selected" as const) : ("filtered" as const),
        selectedIds: isLargeSelection ? [] : selectedIds,
        selectAll: isLargeSelection,
        filters,
        search,
        timeRange,
        prompt: finalPrompt,
      };

      const res = await analyzeBulkObservability(activeOrgId, resource, payload);
      if (res?.error?.code === "INSUFFICIENT_CREDITS" || res?.code === "INSUFFICIENT_CREDITS") {
        setIsCreditsExhausted(true);
        setError("No AI credits remaining. Purchase additional AI credits to continue.");
      } else {
        setResult(res);
      }
    } catch (err: any) {
      if (
        err?.response?.status === 402 ||
        err?.response?.data?.error?.code === "INSUFFICIENT_CREDITS"
      ) {
        setIsCreditsExhausted(true);
        setError("No AI credits remaining. Purchase additional AI credits to continue.");
      } else {
        setError(err?.response?.data?.error?.message ?? err?.message ?? "AI analysis failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const text = result?.summary ?? result?.answer ?? "";
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative flex max-h-[85vh] w-full max-w-[680px] flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--brand)]/10 text-[var(--brand)]">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--text)]">Analyze with AI</h2>
              <p className="text-[12px] text-[var(--text3)]">
                {isSelectedMode
                  ? `Analyzing ${selectedCount} selected ${resource}${isLargeSelection ? " (bulk selection active)" : ""}`
                  : `Analyzing filtered ${resource} matching current criteria`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md text-[var(--text3)] transition-colors hover:bg-[var(--bg2)] hover:text-[var(--text)] cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="sidebar-scroll flex-1 overflow-y-auto p-5 space-y-4">
          {/* Credits Exhausted Warning Banner */}
          {isCreditsExhausted && (
            <div className="flex items-start gap-3 rounded-lg border border-[var(--red)]/30 bg-[var(--red-bg)] p-3.5 text-[13px] text-[var(--red)]">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium">No AI credits remaining.</div>
                <div className="text-[12px] text-[var(--red)]/80 mt-0.5">
                  Purchase additional AI credits to continue analyzing telemetry data with AI.
                </div>
              </div>
            </div>
          )}

          {/* Standard Error Notice */}
          {error && !isCreditsExhausted && (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--red)]/30 bg-[var(--red-bg)] px-3.5 py-2.5 text-[13px] text-[var(--red)]">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Result View */}
          {result && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <span className="font-[family-name:var(--mono)] text-[11px] font-medium uppercase tracking-wider text-[var(--brand)] flex items-center gap-1.5">
                  <Sparkles className="size-3.5" /> AI Analysis Result
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[12px] text-[var(--text2)] hover:text-[var(--text)] cursor-pointer"
                >
                  {copied ? <Check className="size-3.5 text-[var(--green)]" /> : <Copy className="size-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="text-[13px] leading-relaxed text-[var(--text)] whitespace-pre-wrap font-[family-name:var(--sans)]">
                {result.summary ?? result.answer ?? "No analysis summary returned."}
              </div>

              {result.facts && result.facts.length > 0 && (
                <details className="mt-2 pt-2 border-t border-[var(--border)]">
                  <summary className="cursor-pointer font-[family-name:var(--mono)] text-[11px] text-[var(--text3)] hover:text-[var(--text2)] select-none">
                    View telemetry facts used ({result.facts.length})
                  </summary>
                  <ul className="mt-2 space-y-1 pl-4 list-disc text-[11px] font-[family-name:var(--mono)] text-[var(--text3)]">
                    {result.facts.map((fact, idx) => (
                      <li key={idx} className="truncate" title={fact}>
                        {fact}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {/* Prompt Textarea */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-[var(--text2)]">Question or Analysis Directive</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask AI to analyze patterns, root causes, or suggest solutions..."
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2.5 text-[13px] text-[var(--text)] placeholder-[var(--text3)] focus:border-[var(--brand)] focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Preset Example Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-[var(--text3)] uppercase tracking-wider font-[family-name:var(--mono)]">
              Example Prompts
            </span>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_PROMPTS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setPrompt(chip);
                    handleAnalyze(chip);
                  }}
                  disabled={isLoading}
                  className="rounded-full border border-[var(--border)] bg-[var(--bg2)] px-3 py-1 text-[12px] text-[var(--text2)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)] cursor-pointer disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[var(--border)] bg-[var(--bg2)] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] font-medium text-[var(--text2)] hover:bg-[var(--bg1)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleAnalyze()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-[13px] font-medium text-[var(--bg)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Analyzing...
              </>
            ) : result ? (
              <>
                <RefreshCw className="size-4" />
                Re-analyze
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Analyze
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
