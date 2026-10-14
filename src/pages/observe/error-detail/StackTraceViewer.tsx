import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { CopyButton, EmptyNote } from "@/shared/observe";
import { cn } from "@/lib/utils";
import type { StackFrame } from "./types";
import { formatStackLocation } from "./helpers";

const isInApp = (f: StackFrame) => f.inApp ?? f.in_app ?? true;

/** Call stack, innermost frame first as captured. In-app frames lead visually;
 *  library frames are dimmed and can be hidden. Frames with source context
 *  expand into a line-numbered snippet with the throwing line marked. */
export function StackTraceViewer({ frames }: { frames: StackFrame[] }) {
  const hasVendor = (frames ?? []).some((f) => !isInApp(f));
  const [onlyInApp, setOnlyInApp] = useState(false);
  const firstInApp = Math.max(0, (frames ?? []).findIndex(isInApp));
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([firstInApp]));

  if (!frames || frames.length === 0) {
    return <EmptyNote>No stack frames were captured for this error. Source maps or a thrown Error object (not a string) give the SDK a stack to send.</EmptyNote>;
  }

  const indexed = frames.map((frame, index) => ({ frame, index }));
  const visible = onlyInApp ? indexed.filter(({ frame }) => isInApp(frame)) : indexed;
  const rows = visible.length > 0 ? visible : indexed;
  const inAppCount = frames.filter(isInApp).length;

  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-[var(--text3)]">
          <span className="font-[family-name:var(--mono)] tabular-nums text-[var(--text2)]">{frames.length}</span> frames
          {hasVendor && <> · <span className="font-[family-name:var(--mono)] tabular-nums text-[var(--text2)]">{inAppCount}</span> in your code</>}
        </p>
        {hasVendor && (
          <div role="radiogroup" aria-label="Frames shown" className="flex items-center rounded-[var(--radius)] border border-[var(--border)] p-0.5">
            {[{ v: false, l: "All frames" }, { v: true, l: "In-app only" }].map((o) => (
              <button
                key={o.l}
                type="button"
                role="radio"
                aria-checked={onlyInApp === o.v}
                onClick={() => setOnlyInApp(o.v)}
                className={cn(
                  "h-7 cursor-pointer rounded-[4px] px-2.5 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text3)]",
                  onlyInApp === o.v ? "bg-[var(--bg3)] text-[var(--text)]" : "text-[var(--text3)] hover:text-[var(--text)]",
                )}
              >
                {o.l}
              </button>
            ))}
          </div>
        )}
      </div>

      <ol className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)]">
        {rows.map(({ frame, index }) => {
          const fn = frame.function ?? frame.functionName ?? "<anonymous>";
          const loc = formatStackLocation(frame);
          const inApp = isInApp(frame);
          const pre = frame.preContext ?? frame.pre_context ?? [];
          const post = frame.postContext ?? frame.post_context ?? [];
          const line = frame.contextLine ?? frame.context_line;
          const hasSnippet = Boolean(line || pre.length || post.length);
          const open = hasSnippet && expanded.has(index);
          const lineNo = frame.lineno != null ? Number(frame.lineno) : null;
          const start = lineNo != null ? Math.max(1, lineNo - pre.length) : 1;

          return (
            <li key={`${loc}-${index}`} className={cn("border-b border-[var(--border)] last:border-0", inApp ? "bg-[var(--bg1)]" : "bg-[var(--bg)]")}>
              <div className="group flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => hasSnippet && toggle(index)}
                  disabled={!hasSnippet}
                  aria-expanded={hasSnippet ? open : undefined}
                  className={cn("flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none", hasSnippet ? "cursor-pointer focus-visible:ring-1 focus-visible:ring-[var(--brand)] rounded-[var(--radius-xs)]" : "cursor-default")}
                >
                  <ChevronRight className={cn("size-3.5 shrink-0 text-[var(--text3)] transition-transform duration-150", open && "rotate-90", !hasSnippet && "invisible")} aria-hidden="true" />
                  <span className={cn("shrink-0 font-[family-name:var(--mono)] text-[12px]", inApp ? "font-medium text-[var(--text)]" : "text-[var(--text3)]")}>{fn}</span>
                  <span className="min-w-0 truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]" title={loc}>{loc}</span>
                </button>
                {!inApp && <span className="shrink-0 text-[11px] text-[var(--text3)]">library</span>}
                <CopyButton value={loc} label="" className="h-6 w-6 shrink-0 justify-center border-0 p-0 text-[var(--text3)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100" />
              </div>

              {open && (
                <div className="sidebar-scroll overflow-x-auto border-t border-[var(--border)] bg-[var(--bg)] py-1.5 font-[family-name:var(--mono)] text-[12px] leading-[1.7]">
                  {pre.map((text, i) => (
                    <div key={`pre-${i}`} className="flex gap-4 px-3 text-[var(--text3)]">
                      <span className="w-10 shrink-0 select-none text-right tabular-nums opacity-60">{start + i}</span>
                      <pre className="whitespace-pre">{text}</pre>
                    </div>
                  ))}
                  {line && (
                    <div className="flex gap-4 bg-[var(--red-bg)] px-3 text-[var(--text)]">
                      <span className="w-10 shrink-0 select-none text-right tabular-nums text-[var(--red)]">{lineNo ?? start + pre.length}</span>
                      <pre className="whitespace-pre">{line}</pre>
                    </div>
                  )}
                  {post.map((text, i) => (
                    <div key={`post-${i}`} className="flex gap-4 px-3 text-[var(--text3)]">
                      <span className="w-10 shrink-0 select-none text-right tabular-nums opacity-60">{(lineNo ?? start + pre.length) + 1 + i}</span>
                      <pre className="whitespace-pre">{text}</pre>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
