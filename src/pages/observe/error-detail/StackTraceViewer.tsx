import { useState } from "react";
import { CopyButton } from "@/shared/observe";
import { Code, Filter, ChevronRight, ChevronDown, Check } from "lucide-react";
import type { StackFrame } from "./types";
import { formatStackLocation } from "./helpers";

export function StackTraceViewer({ frames }: { frames: StackFrame[] }) {
  const [onlyInApp, setOnlyInApp] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  if (!frames || frames.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[13px] text-[var(--text3)]">
        No stack frames captured for this error.
      </div>
    );
  }

  const displayedFrames = onlyInApp
    ? frames.filter((frame) => frame.inApp ?? frame.in_app ?? true)
    : frames;

  const activeFrames = displayedFrames.length > 0 ? displayedFrames : frames;

  return (
    <div className="flex flex-col gap-4">
      {/* Filter controls header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2 text-[12px] text-[var(--text3)] font-[family-name:var(--mono)]">
          <Code className="size-3.5 text-[var(--brand)]" />
          <span className="font-semibold text-[var(--text)]">
            {activeFrames.length} Stack Frame{activeFrames.length === 1 ? "" : "s"}
          </span>
          {frames.some((f) => f.inApp === false || f.in_app === false) && (
            <span className="text-[11.5px] text-[var(--text3)]">
              ({frames.filter((f) => f.inApp || f.in_app).length} in-app frames)
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOnlyInApp((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11.5px] font-[family-name:var(--mono)] transition-all cursor-pointer ${
            onlyInApp
              ? "border-[var(--brand)] bg-[var(--brand-bg)] text-[var(--brand)] font-semibold shadow-xs"
              : "border-[var(--border)] bg-[var(--bg)] text-[var(--text3)] hover:text-[var(--text)]"
          }`}
        >
          <Filter className="size-3" />
          {onlyInApp ? "Showing In-App Only" : "Filter In-App Code"}
        </button>
      </div>

      {/* Frame List */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg2)]/60 divide-y divide-[var(--border)]">
        {activeFrames.map((frame, index) => {
          const fnName = frame.function ?? frame.functionName ?? "anonymous";
          const fileLoc = formatStackLocation(frame);
          const isInApp = frame.inApp ?? frame.in_app ?? true;
          const pre = frame.preContext ?? frame.pre_context ?? [];
          const post = frame.postContext ?? frame.post_context ?? [];
          const currentLine = frame.contextLine ?? frame.context_line;
          const hasSnippet = Boolean(currentLine || pre.length > 0 || post.length > 0);
          const isExpanded = expandedIndex === index;

          const startLineNumber = frame.lineno != null ? Math.max(1, Number(frame.lineno) - pre.length) : 1;

          return (
            <div
              key={`${fileLoc}-${index}`}
              className={`transition-colors ${
                isInApp ? "bg-[var(--bg1)]" : "bg-[var(--bg)]/40 opacity-85"
              }`}
            >
              {/* Frame summary row */}
              <div
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--bg2)]/80 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {hasSnippet ? (
                    isExpanded ? (
                      <ChevronDown className="size-3.5 text-[var(--text3)] shrink-0" />
                    ) : (
                      <ChevronRight className="size-3.5 text-[var(--text3)] shrink-0" />
                    )
                  ) : (
                    <span className="size-3.5 shrink-0" />
                  )}

                  <span
                    className={`inline-block size-2 rounded-full shrink-0 ${
                      isInApp ? "bg-[var(--red)] ring-2 ring-[var(--red)]/20" : "bg-[var(--text3)]"
                    }`}
                    title={isInApp ? "In-App Code" : "Vendor / Library Code"}
                  />
                  <span className="font-[family-name:var(--mono)] text-[13px] font-semibold text-[var(--text)] truncate">
                    {fnName}
                  </span>
                  <span className="min-w-0 truncate font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">
                    {fileLoc}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {!isInApp && (
                    <span className="rounded bg-[var(--bg3)] px-2 py-0.5 font-[family-name:var(--mono)] text-[9.5px] uppercase tracking-[0.08em] text-[var(--text3)]">
                      Vendor
                    </span>
                  )}
                  {hasSnippet && (
                    <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                      {isExpanded ? "Hide snippet" : "View snippet"}
                    </span>
                  )}
                  <CopyButton value={fileLoc} label="" className="h-6 w-6 border-0 p-0 text-[var(--text3)] hover:text-[var(--text)]" />
                </div>
              </div>

              {/* Code context snippet preview */}
              {isExpanded && hasSnippet && (
                <div className="border-t border-[var(--border)] bg-[var(--bg)] p-4 font-[family-name:var(--mono)] text-[12px] leading-relaxed overflow-x-auto">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg1)] overflow-hidden shadow-xs">
                    {/* Pre-context lines */}
                    {pre.map((line, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-3.5 py-1 text-[var(--text3)] hover:bg-[var(--bg2)]/40">
                        <span className="w-10 shrink-0 text-right select-none text-[var(--text3)]/50 font-medium">
                          {startLineNumber + idx}
                        </span>
                        <pre className="min-w-0 whitespace-pre">{line}</pre>
                      </div>
                    ))}

                    {/* Context / Error Line */}
                    {currentLine && (
                      <div className="flex items-center gap-3 bg-[var(--red-bg)] px-3.5 py-1.5 text-[var(--red)] font-semibold border-y border-[var(--red)]/30">
                        <span className="w-10 shrink-0 text-right select-none font-bold">
                          {frame.lineno ?? startLineNumber + pre.length}
                        </span>
                        <pre className="min-w-0 whitespace-pre">{currentLine}</pre>
                        <span className="ml-auto shrink-0 rounded bg-[var(--red)] px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.08em] text-[var(--red-fg)] select-none">
                          Exception Origin
                        </span>
                      </div>
                    )}

                    {/* Post-context lines */}
                    {post.map((line, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-3.5 py-1 text-[var(--text3)] hover:bg-[var(--bg2)]/40">
                        <span className="w-10 shrink-0 text-right select-none text-[var(--text3)]/50 font-medium">
                          {Number(frame.lineno ?? startLineNumber + pre.length) + 1 + idx}
                        </span>
                        <pre className="min-w-0 whitespace-pre">{line}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
