import { useState, useEffect } from 'react';
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

export function useObservabilityList<T = unknown>(resource: string, params: Record<string, unknown> = {}) {
  const activeOrgId = useOrgStore(state => state.activeOrgId);
  const [data, setData] = useState<ExplorerListResponse<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!activeOrgId || !resource) {
      setIsLoading(false);
      return;
    }
    
    // Clean up empty params
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );

    let isMounted = true;
    setIsLoading(true);
    
    apiClient.get(`/organizations/${activeOrgId}/observability/${resource}`, { params: cleanParams })
      .then(res => {
        if (isMounted) {
          setData(res.data);
          setError(null);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err);
          setData(null);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeOrgId, resource, JSON.stringify(params)]);

  return { data, isLoading, error };
}

export function useObservabilityDetail<T = unknown>(resource: string, id: string) {
  const activeOrgId = useOrgStore(state => state.activeOrgId);
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!activeOrgId || !resource || !id) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    apiClient.get(`/organizations/${activeOrgId}/observability/${resource}/${encodeURIComponent(id)}`)
      .then(res => {
        if (isMounted) {
          // The backend returns `{ success: true, data: EventDetail }` or just the detail.
          // Let's assume it returns `{ data: ... }` based on standard Fastify envelope.
          setData(res.data?.data || res.data);
          setError(null);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err);
          setData(null);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeOrgId, resource, id]);

  return { data, isLoading, error };
}

export function useObservabilityRelated<T = unknown>(resource: string, id: string, relation: string) {
  const activeOrgId = useOrgStore(state => state.activeOrgId);
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!activeOrgId || !resource || !id || !relation) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    apiClient.get(`/organizations/${activeOrgId}/observability/${resource}/${id}/related/${relation}`)
      .then(res => {
        if (isMounted) {
          setData(res.data?.data || res.data || []);
          setError(null);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err);
          setData(null);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeOrgId, resource, id, relation]);

  return { data, isLoading, error };
}

export async function askObservabilityEvent(
  orgId: string,
  resource: string,
  id: string,
  intent: AIIntent,
  question?: string,
): Promise<ObservabilityAIResult> {
  const res = await apiClient.post(`/organizations/${orgId}/observability/${resource}/${encodeURIComponent(id)}/ask`, {
    intent,
    ...(question ? { question } : {}),
  });
  return res.data?.data || res.data;
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
) {
  const res = await apiClient.post(`/organizations/${orgId}/observability/${resource}/analyze`, payload);
  return res.data?.data || res.data;
}
