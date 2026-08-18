import React from "react";
import { Sparkles, Download, RefreshCw, X, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableToolbarProps {
  children?: React.ReactNode;
  selectedCount?: number;
  onClearSelection?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  onAskAi: () => void;
  resourceName?: string;
  className?: string;
}

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
        "flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] px-4 py-2.5 transition-colors",
        hasSelection && "border-[var(--brand)]/40 bg-[var(--brand)]/5",
        className
      )}
    >
      {hasSelection ? (
        /* Selection Toolbar Active State */
        <div className="flex w-full items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-[family-name:var(--mono)] text-[12px] font-semibold text-[var(--brand)]">
              <CheckSquare className="size-4" />
              {selectedCount} {resourceName} selected
            </span>

            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="inline-flex items-center gap-1 text-[12px] text-[var(--text2)] transition-colors hover:text-[var(--text)] cursor-pointer"
              >
                <X className="size-3.5" />
                <span>Clear selection</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onExport && (
              <button
                type="button"
                onClick={onExport}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg1)] px-2.5 py-1.5 text-[12px] text-[var(--text2)] transition-colors hover:border-[var(--text3)] hover:text-[var(--text)] cursor-pointer"
              >
                <Download className="size-3.5" />
                <span>Export selected</span>
              </button>
            )}

            <button
              type="button"
              onClick={onAskAi}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-[var(--brand)] px-3 py-1.5 text-[12px] font-medium text-[var(--bg)] shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
            >
              <Sparkles className="size-3.5" />
              <span>✨ Ask AI About Selected ({selectedCount})</span>
            </button>
          </div>
        </div>
      ) : (
        /* Default Toolbar State */
        <>
          <div className="flex flex-1 flex-wrap items-center gap-2.5 min-w-0">
            {children}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onExport && (
              <button
                type="button"
                onClick={onExport}
                title="Export dataset"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border2)] bg-transparent px-2.5 py-1.5 text-[12px] text-[var(--text2)] transition-colors hover:border-[var(--text3)] hover:text-[var(--text)] cursor-pointer"
              >
                <Download className="size-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="Refresh table"
                className="inline-flex size-7 items-center justify-center rounded-[var(--radius)] border border-[var(--border2)] bg-transparent text-[var(--text2)] transition-colors hover:border-[var(--text3)] hover:text-[var(--text)] cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onAskAi}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--brand)]/40 bg-[var(--brand)]/10 px-3 py-1.5 font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--brand)] transition-colors hover:bg-[var(--brand)]/20 cursor-pointer"
            >
              <Sparkles className="size-3.5" />
              <span>✨ Ask AI</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
