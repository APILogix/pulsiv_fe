import React, { useState } from "react";
import { Download, RefreshCw, X, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableToolbarProps {
  children?: React.ReactNode;
  selectedCount?: number;
  onClearSelection?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  resourceName?: string;
  className?: string;
}

const GHOST =
  "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 px-2.5 text-[12px] text-[var(--text2)] transition-all hover:border-[var(--border2)] hover:bg-[var(--bg2)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border2)] cursor-pointer select-none";

export function TableToolbar({
  children,
  selectedCount = 0,
  onClearSelection,
  onExport,
  onRefresh,
  resourceName = "items",
  className,
}: TableToolbarProps) {
  const hasSelection = selectedCount > 0;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const hasActions = Boolean(onExport || onRefresh);

  return (
    <div
      className={cn(
        "flex shrink-0 min-h-[44px] w-full flex-wrap items-center justify-between gap-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] px-3 py-2 transition-all duration-150",
        hasSelection && "border-[var(--border2)] bg-[var(--bg2)]/60 shadow-xs",
        className,
      )}
    >
      {hasSelection ? (
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-[var(--bg3)] px-2.5 py-1 text-[12px] font-medium text-[var(--text)]">
              <CheckSquare className="size-3.5 text-[var(--text2)]" />
              <span className="font-[family-name:var(--mono)] tabular-nums">{selectedCount}</span>
              <span>{resourceName} selected</span>
            </div>
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="inline-flex items-center gap-1 rounded-[var(--radius)] px-2 py-1 text-[12px] text-[var(--text2)] transition-colors hover:bg-[var(--bg3)] hover:text-[var(--text)] cursor-pointer"
              >
                <X className="size-3.5" />
                Deselect
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onExport && (
              <button
                type="button"
                onClick={onExport}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border2)] bg-[var(--bg2)] px-3 text-[12px] font-medium text-[var(--text)] transition-all hover:bg-[var(--bg3)] cursor-pointer"
              >
                <Download className="size-3.5" />
                Export selected ({selectedCount})
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
          {hasActions && (
            <div className="flex shrink-0 items-center gap-1.5 self-center">
              {onExport && (
                <button type="button" onClick={onExport} title="Export dataset" className={GHOST}>
                  <Download className="size-3.5 text-[var(--text3)]" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              )}
              {onRefresh && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  aria-label="Refresh data"
                  title="Refresh data"
                  className={cn(GHOST, "w-8 justify-center px-0")}
                >
                  <RefreshCw className={cn("size-3.5 text-[var(--text3)] transition-transform duration-500", isRefreshing && "animate-spin text-[var(--text)]")} />
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

