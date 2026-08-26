import { useState } from "react";
import { CopyButton } from "@/shared/observe";
import { Code, Filter } from "lucide-react";
import type { StackFrame } from "./types";
import { formatStackLocation } from "./helpers";

export function StackTraceViewer({ frames }: { frames: StackFrame[] }) {
  const [onlyInApp, setOnlyInApp] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  if (!frames || frames.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] p-6 text-center text-[13px] text-[var(--text3)]">
        No stack frames captured for this error.
      </div>
    );
  }

  const displayedFrames = onlyInApp
    ? frames.filter((frame) => frame.inApp ?? frame.in_app ?? true)
    : frames;

  const activeFrames = displayedFrames.length > 0 ? displayedFrames : frames;

  return (
    <div className="flex flex-col gap-3">
      {/* Filter controls header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
        <div className="flex items-center gap-2 text-[12px] text-[var(--text3)] font-[family-name:var(--mono)]">
          <Code className="size-3.5 text-[var(--brand)]" />
          <span>{activeFrames.length} frame{activeFrames.length === 1 ? "" : "s"}</span>
          {frames.some((f) => f.inApp === false || f.in_app === false) && (
            <span className="text-[11px] text-[var(--text3)]">
              ({frames.filter((f) => f.inApp || f.in_app).length} in-app)
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOnlyInApp((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 rounded-[var(--radius)] border px-2.5 py-1 text-[11px] font-[family-name:var(--mono)] transition-colors ${
            onlyInApp
              ? "border-[var(--brand)] bg-[var(--brand-bg)] text-[var(--brand)]"
              : "border-[var(--border2)] text-[var(--text3)] hover:text-[var(--text2)]"
          }`}
        >
          <Filter className="size-3" />
          {onlyInApp ? "Showing In-App only" : "Filter In-App"}
        </button>
      </div>

      {/* Frame List */}
      <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] divide-y divide-[var(--border)]">
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
                isInApp ? "bg-[var(--bg1)]" : "bg-[var(--bg)]/50 opacity-80"
              }`}
            >
              {/* Frame summary row */}
              <div
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 hover:bg-[var(--bg2)]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`inline-block size-2 rounded-full shrink-0 ${
                      isInApp ? "bg-[var(--red)]" : "bg-[var(--text3)]"
                    }`}
                    title={isInApp ? "In-App Code" : "Vendor / Library Code"}
                  />
                  <span className="font-[family-name:var(--mono)] text-[12px] font-semibold text-[var(--brand)] truncate">
                    {fnName}
                  </span>
                  <span className="min-w-0 truncate font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                    {fileLoc}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isInApp && (
                    <span className="rounded bg-[var(--bg3)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[9px] uppercase tracking-[0.08em] text-[var(--text3)]">
                      Vendor
                    </span>
                  )}
                  {hasSnippet && (
                    <span className="font-[family-name:var(--mono)] text-[10px] text-[var(--text3)]">
                      {isExpanded ? "Hide Code" : "View Code"}
                    </span>
                  )}
                  <CopyButton value={fileLoc} label="" className="h-6 border-0 px-1 text-[var(--text3)]" />
                </div>
              </div>

              {/* Code context snippet preview */}
              {isExpanded && hasSnippet && (
                <div className="border-t border-[var(--border)] bg-[var(--bg)] p-3 font-[family-name:var(--mono)] text-[11px] leading-relaxed overflow-x-auto">
                  <div className="rounded border border-[var(--border)] bg-[var(--bg1)] overflow-hidden">
                    {/* Pre-context lines */}
                    {pre.map((line, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-3 py-0.5 text-[var(--text3)]">
                        <span className="w-10 shrink-0 text-right select-none text-[var(--text3)]/50">
                          {startLineNumber + idx}
                        </span>
                        <pre className="min-w-0 whitespace-pre">{line}</pre>
                      </div>
                    ))}

                    {/* Context / Error Line */}
                    {currentLine && (
                      <div className="flex items-center gap-3 bg-[var(--red-bg)] px-3 py-1 text-[var(--red)] font-medium border-y border-[var(--red)]/20">
                        <span className="w-10 shrink-0 text-right select-none font-bold">
                          {frame.lineno ?? startLineNumber + pre.length}
                        </span>
                        <pre className="min-w-0 whitespace-pre">{currentLine}</pre>
                        <span className="ml-auto shrink-0 text-[10px] uppercase tracking-[0.08em] text-[var(--red)] select-none">
                          Error
                        </span>
                      </div>
                    )}

                    {/* Post-context lines */}
                    {post.map((line, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-3 py-0.5 text-[var(--text3)]">
                        <span className="w-10 shrink-0 text-right select-none text-[var(--text3)]/50">
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
