import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, PanelRight } from "lucide-react";
import { useAiDrawerStore } from "@/modules/ai/store/ai-drawer.store";
import type { ErrorGroup } from "../types/error-group";

interface AskAICardProps {
  group: ErrorGroup;
}

const DEMO_PROMPTS = [
  "Summarize root cause.",
  "Explain likely causes.",
  "Recommend fixes.",
  "What changed after the regression?",
];

export function AskAICard({ group }: AskAICardProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleOpenDrawer = () => {
    useAiDrawerStore.getState().openInvestigate({
      resourceType: "error",
      publicId: group.publicId ?? group.id ?? group.fingerprint ?? "",
    });
  };

  const handleRunAnalysis = (chip?: string) => {
    const q = chip ?? prompt ?? "Summarize root cause.";
    setPrompt(q);
    setIsLoading(true);
    setAnalysis(null);

    setTimeout(() => {
      setIsLoading(false);
      setAnalysis(
        `### AI Root Cause Analysis for ${group.lastErrorName}\n\n` +
          `**Primary Issue**: The error \`${group.lastErrorMessage}\` occurs in route \`${group.route ?? "/api"}\` due to unhandled null/undefined references when user payload lacks expected attributes.\n\n` +
          `**Impact**: Affects ${group.occurrenceCount} occurrences across release \`${group.latestRelease}\`.\n\n` +
          `**Recommended Fix**:\n` +
          `1. Add optional chaining (\`user?.id\`) in service layer.\n` +
          `2. Validate input payloads prior to controller handler execution.\n` +
          `3. Deploy hotfix tag \`${group.latestRelease}-patch.1\`.`
      );
    }, 1200);
  };

  const handleCopy = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--brand)]/30 bg-[var(--bg1)] p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-[var(--brand)]" />
          <h3 className="text-[14px] font-semibold text-[var(--text)]">AI Error Group Investigation</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
            {group.occurrenceCount} occurrences indexed
          </span>
          <button
            type="button"
            onClick={handleOpenDrawer}
            className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--brand)] hover:underline"
          >
            <PanelRight className="size-3.5" />
            Open in AI Drawer
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {DEMO_PROMPTS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleRunAnalysis(chip)}
            className="rounded-full border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-3 py-1 text-[12px] text-[var(--brand)] hover:bg-[var(--brand)]/20 transition-colors cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-4 text-[13px] text-[var(--brand)]">
          <Loader2 className="size-4 animate-spin" />
          Analyzing error group telemetry and stack frames...
        </div>
      )}

      {analysis && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--brand)] font-semibold uppercase">
              AI Insight Output
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-[12px] text-[var(--text2)] hover:text-[var(--text)] cursor-pointer"
            >
              {copied ? <Check className="size-3.5 text-[var(--green)]" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="text-[13px] leading-relaxed text-[var(--text)] whitespace-pre-wrap font-[family-name:var(--sans)]">
            {analysis}
          </div>
        </div>
      )}
    </div>
  );
}
