import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client/axios';
import { useOrgStore } from '@/modules/organizations/store/org.store';

export type JsonRecord = Record<string, unknown>;
export type AIIntent = 'explain' | 'root_cause' | 'find_similar' | 'performance' | 'security' | 'optimization' | 'incident_summary' | 'ask';

export interface ObservabilityTimelineBucket {
  bucket: string;
  count: number;
  errorCount: number;
}

export interface ObservabilityCorrelations {
  traceId: string | null;
  requestId: string | null;
  spanId: string | null;
  sessionId: string | null;
  userId: string | null;
}

export interface ObservabilityEventDetail {
  resource: string;
  entity: JsonRecord;
  attributes: unknown;
  metadata: unknown;
  payload: unknown;
  trace: JsonRecord | null;
  spanTree: unknown;
  spans: JsonRecord[];
  logs: JsonRecord[];
  relatedErrors: JsonRecord[];
  relatedRequests: JsonRecord[];
  metrics: JsonRecord[];
  profiles: JsonRecord[];
  crons: JsonRecord[];
  correlations: ObservabilityCorrelations;
  counts: Record<string, number>;
  timeline: ObservabilityTimelineBucket[];
  aiContext: { intents: readonly AIIntent[]; facts: string[] };
}

export interface ObservabilityAIResult {
  intent: AIIntent;
  summary: string;
  findings: string[];
  rootCause: string | null;
  recommendations: string[];
  confidence: number;
  source: 'ai' | 'heuristic';
  model: string | null;
}

type LegacyResponseMap = Record<string, unknown>;

export interface ExplorerPagination {
  nextCursor?: string | null;
  previousCursor?: string | null;
  hasNext?: boolean;
  hasPrevious?: boolean;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface ExplorerListResponse<T = unknown> {
  success: boolean;
  items: T[];
  pagination: ExplorerPagination;
  summary: LegacyResponseMap;
  statistics: LegacyResponseMap;
  availableFilters: LegacyResponseMap;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeExplorerListResponse<T = unknown>(payload: unknown): ExplorerListResponse<T> {
  const envelope = isRecord(payload) && isRecord(payload.data) && Array.isArray(payload.data.items)
    ? payload.data
    : payload;
  const source = isRecord(envelope) ? envelope : {};
  const items = Array.isArray(source.items)
    ? source.items
    : Array.isArray(source.data)
      ? source.data
      : Array.isArray(payload)
        ? payload
        : [];

  return {
    success: source.success === false ? false : true,
    items: items as T[],
    pagination: isRecord(source.pagination) ? source.pagination as ExplorerPagination : {},
    summary: isRecord(source.summary) ? source.summary : {},
    statistics: isRecord(source.statistics) ? source.statistics : {},
    availableFilters: isRecord(source.availableFilters) ? source.availableFilters : {},
  };
}

/** Unwrap the `{ success, data }` envelope when present. */
function unwrap<T>(payload: unknown): T {
  if (isRecord(payload) && 'data' in payload && payload.data !== undefined) return payload.data as T;
  return payload as T;
}

/* ─────────────────────────── query keys ─────────────────────────── */

/**
 * One key hierarchy for every explorer read, so the same request made by two
 * pages (e.g. requests counts on the overview and the requests list) is
 * fetched once and shared from cache.
 */
export const observabilityKeys = {
  all: ['observability'] as const,
  org: (orgId: string) => [...observabilityKeys.all, orgId] as const,
  resource: (orgId: string, resource: string) => [...observabilityKeys.org(orgId), resource] as const,
  list: (orgId: string, resource: string, params: Record<string, unknown>) =>
    [...observabilityKeys.resource(orgId, resource), 'list', params] as const,
  detail: (orgId: string, resource: string, id: string) =>
    [...observabilityKeys.resource(orgId, resource), 'detail', id] as const,
  related: (orgId: string, resource: string, id: string, relation: string) =>
    [...observabilityKeys.resource(orgId, resource), 'detail', id, 'related', relation] as const,
};

/** Explorer data is live telemetry: fresh for 30s, then refreshed on revisit. */
const EXPLORER_STALE_MS = 30_000;

function cleanParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

/* ─────────────────────────── hooks ─────────────────────────── */

/**
 * Explorer list. Previously a `useEffect` + `useState` fetch: no cache, no
 * dedupe, no cancellation, a refetch on every mount. Now:
 *  - cached per (org, resource, params); back-navigation renders instantly
 *  - superseded requests are aborted via `signal` when filters change
 *  - `keepPreviousData` keeps the current rows on screen while the next
 *    page/filter loads, instead of blanking the table; `isFetching` lets the
 *    caller mark the table as refreshing.
 */
export function useObservabilityList<T = unknown>(resource: string, params: Record<string, unknown> = {}) {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const query = cleanParams(params);

  const result = useQuery({
    queryKey: observabilityKeys.list(activeOrgId ?? '', resource, query),
    queryFn: async ({ signal }) => {
      const res = await apiClient.get(`/organizations/${activeOrgId}/observability/${encodeURIComponent(resource)}`, {
        params: query,
        signal,
      });
      return normalizeExplorerListResponse<T>(res.data);
    },
    enabled: Boolean(activeOrgId && resource),
    staleTime: EXPLORER_STALE_MS,
    placeholderData: keepPreviousData,
  });

  return {
    data: result.data ?? null,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isPlaceholderData: result.isPlaceholderData,
    error: result.error,
    refetch: result.refetch,
  };
}

export function useObservabilityDetail<T = unknown>(resource: string, id: string) {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);

  const result = useQuery({
    queryKey: observabilityKeys.detail(activeOrgId ?? '', resource, id),
    queryFn: async ({ signal }) => {
      const res = await apiClient.get(
        `/organizations/${activeOrgId}/observability/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`,
        { signal },
      );
      return unwrap<T>(res.data);
    },
    enabled: Boolean(activeOrgId && resource && id),
    // An event is immutable once written; keep it for the session.
    staleTime: 10 * 60 * 1000,
  });

  return {
    data: (result.data ?? null) as T | null,
    isLoading: result.isLoading,
    error: result.error,
  };
}

export function useObservabilityRelated<T = unknown>(resource: string, id: string, relation: string) {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);

  const result = useQuery({
    queryKey: observabilityKeys.related(activeOrgId ?? '', resource, id, relation),
    queryFn: async ({ signal }) => {
      // Every path segment is encoded; ids can carry `/` or `#`.
      const res = await apiClient.get(
        `/organizations/${activeOrgId}/observability/${encodeURIComponent(resource)}/${encodeURIComponent(id)}/related/${encodeURIComponent(relation)}`,
        { signal },
      );
      const data = unwrap<T[] | null>(res.data);
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(activeOrgId && resource && id && relation),
    staleTime: EXPLORER_STALE_MS,
  });

  return {
    data: result.data ?? null,
    isLoading: result.isLoading,
    error: result.error,
  };
}

/* ─────────────────────────── AI actions (mutations) ─────────────────────────── */

export async function askObservabilityEvent(
  orgId: string,
  resource: string,
  id: string,
  intent: AIIntent,
  question?: string,
): Promise<ObservabilityAIResult> {
  const res = await apiClient.post(
    `/organizations/${orgId}/observability/${encodeURIComponent(resource)}/${encodeURIComponent(id)}/ask`,
    {
      intent,
      ...(question ? { question } : {}),
    },
  );
  return unwrap<ObservabilityAIResult>(res.data);
}

export interface BulkAnalysisResponse {
  summary?: string;
  facts?: string[];
  answer?: string;
  /** Some deployments return credit exhaustion in-band rather than as a 402. */
  code?: string;
  error?: { code?: string; message?: string };
}

export async function analyzeBulkObservability(
  orgId: string,
  resource: string,
  payload: {
    selectionMode?: 'selected' | 'filtered';
    selectedIds?: string[];
    selectAll?: boolean;
    filters?: Record<string, unknown>;
    search?: string;
    timeRange?: unknown;
    prompt?: string;
  }
): Promise<BulkAnalysisResponse> {
  const res = await apiClient.post(`/organizations/${orgId}/observability/${encodeURIComponent(resource)}/analyze`, payload);
  return unwrap<BulkAnalysisResponse>(res.data);
}
