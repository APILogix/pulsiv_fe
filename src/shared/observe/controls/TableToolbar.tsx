import React from "react";
import { Sparkles, Download, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableToolbarProps {
  children?: React.ReactNode;
  selectedCount?: number;
  onClearSelection?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  onAskAi?: () => void;
  resourceName?: string;
  className?: string;
}

const GHOST =
  "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border2)] bg-transparent px-2.5 text-[12px] text-[var(--text2)] transition-colors hover:border-[var(--text3)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text3)] cursor-pointer";

// Cyan is reserved for model output and model actions (design/DESIGN.md).
const AI =
  "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--ai-d)]/60 bg-[var(--ai-bg)] px-3 text-[12px] font-medium text-[var(--ai)] transition-colors hover:bg-[var(--ai)] hover:text-[var(--ai-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ai-d)] cursor-pointer";

export function TableToolbar({
  children,
  selectedCount = 0,
  onClearSelection,
  onExport,
  onRefresh,
  onAskAi,
  resourceName = "items",
  className,
}: TableToolbarProps) {
  const hasSelection = selectedCount > 0;

  return (
    <div
      className={cn(
        "flex min-h-[50px] flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] px-3 py-2 transition-colors",
        hasSelection && "border-[var(--border2)] bg-[var(--bg2)]",
        className,
      )}
    >
      {hasSelection ? (
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[var(--text)]">
              <span className="font-[family-name:var(--mono)] tabular-nums">{selectedCount}</span> {resourceName} selected
            </span>
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="inline-flex items-center gap-1 text-[12px] text-[var(--text2)] transition-colors hover:text-[var(--text)] cursor-pointer"
              >
                <X className="size-3.5" />
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onExport && (
              <button type="button" onClick={onExport} className={GHOST}>
                <Download className="size-3.5" />
                Export selected
              </button>
            )}
            {onAskAi && (
              <button type="button" onClick={onAskAi} className={AI}>
                <Sparkles className="size-3.5" />
                Ask AI about {selectedCount}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
          <div className="flex shrink-0 items-center gap-2">
            {onExport && (
              <button type="button" onClick={onExport} title="Export dataset" className={GHOST}>
                <Download className="size-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
            {onRefresh && (
              <button type="button" onClick={onRefresh} aria-label="Refresh" className={cn(GHOST, "w-8 justify-center px-0")}>
                <RefreshCw className="size-3.5" />
              </button>
            )}
            {onAskAi && (
              <button type="button" onClick={onAskAi} className={AI}>
                <Sparkles className="size-3.5" />
                Ask AI
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
