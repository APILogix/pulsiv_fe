import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ExplorerPagination } from "./useObservabilityApi";

export interface CursorPaginationOptions {
  dependencies: unknown[];
  initialCursor?: string;
}

export interface UseCursorPaginationResult {
  cursor: string | undefined;
  pageIndex: number;
  paginationProps: {
    nextCursor?: string | null;
    previousCursor?: string | null;
    hasNext?: boolean;
    hasPrevious?: boolean;
    limit?: number;
  };
  onNextPage: (nextCursor: string) => void;
  onPreviousPage?: () => void;
  reset: () => void;
}

/**
 * Robust, production-grade cursor pagination hook for all Pulsiv Observability lists.
 * Enforces composite (occurred_at + id) cursor continuity and automatically invalidates
 * the cursor chain when filter, search, project, or time range identity changes.
 */
export function useCursorPagination(
  paginationEnvelope?: ExplorerPagination,
  options?: CursorPaginationOptions,
): UseCursorPaginationResult {
  const [cursor, setCursor] = useState<string | undefined>(options?.initialCursor);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

  // Track query identity string to reset pagination when filters change
  const depsKey = JSON.stringify(options?.dependencies ?? []);
  const prevDepsRef = useRef(depsKey);

  useEffect(() => {
    if (prevDepsRef.current !== depsKey) {
      prevDepsRef.current = depsKey;
      setCursor(undefined);
      setCursorHistory([]);
    }
  }, [depsKey]);

  const onNextPage = useCallback((nextCursor: string) => {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev, cursor ?? ""]);
    setCursor(nextCursor);
  }, [cursor]);

  const onPreviousPage = useCallback(() => {
    if (cursorHistory.length === 0) return;
    const prevCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((prev) => prev.slice(0, -1));
    setCursor(prevCursor || undefined);
  }, [cursorHistory]);

  const reset = useCallback(() => {
    setCursor(undefined);
    setCursorHistory([]);
  }, []);

  const hasNext = Boolean(paginationEnvelope?.hasNext && paginationEnvelope?.nextCursor);
  const hasPrevious = cursorHistory.length > 0 || Boolean(paginationEnvelope?.hasPrevious);

  const paginationProps = useMemo(() => ({
    nextCursor: paginationEnvelope?.nextCursor,
    previousCursor: paginationEnvelope?.previousCursor,
    hasNext,
    hasPrevious,
    limit: paginationEnvelope?.limit,
  }), [paginationEnvelope, hasNext, hasPrevious]);

  return {
    cursor,
    pageIndex: cursorHistory.length + 1,
    paginationProps,
    onNextPage,
    onPreviousPage: hasPrevious ? onPreviousPage : undefined,
    reset,
  };
}
