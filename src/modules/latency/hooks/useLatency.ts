/**
 * React Query hooks for Latency Observability Module
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useOrgStore } from '@/modules/organizations/store/org.store';
import { latencyApi } from '../api/latency.api';
import type {
  EndpointDetailResponse,
  EndpointsResponse,
  HttpStatusSeriesResponse,
  LatencyDistributionResponse,
  LatencyOverview,
  LatencyQueryParams,
  LatencyTimeSeriesResponse,
  SlowRequestItem,
} from '../types/latency.types';

export const LATENCY_QUERY_KEYS = {
  all: ['latency'] as const,
  overview: (projectId: string, params?: LatencyQueryParams) =>
    ['latency', 'overview', projectId, params] as const,
  timeseries: (projectId: string, params?: LatencyQueryParams) =>
    ['latency', 'timeseries', projectId, params] as const,
  statusSeries: (projectId: string, params?: LatencyQueryParams) =>
    ['latency', 'status-series', projectId, params] as const,
  distribution: (projectId: string, params?: LatencyQueryParams) =>
    ['latency', 'distribution', projectId, params] as const,
  endpoints: (projectId: string, params?: LatencyQueryParams) =>
    ['latency', 'endpoints', projectId, params] as const,
  endpointDetail: (projectId: string, endpointId: string, params?: LatencyQueryParams) =>
    ['latency', 'endpoint-detail', projectId, endpointId, params] as const,
  slowRequests: (projectId: string, params?: LatencyQueryParams) =>
    ['latency', 'slow-requests', projectId, params] as const,
};

export function useLatencyOverview(
  params?: LatencyQueryParams,
  explicitProjectId?: string,
): UseQueryResult<LatencyOverview, Error> {
  const activeProjectId = useOrgStore((s) => s.activeProjectId || s.activeProjectSlug);
  const projectId = explicitProjectId || activeProjectId;

  return useQuery({
    queryKey: LATENCY_QUERY_KEYS.overview(projectId || '', params),
    queryFn: () => latencyApi.getOverview(projectId!, params),
    enabled: Boolean(projectId),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useLatencyTimeSeries(
  params?: LatencyQueryParams,
  explicitProjectId?: string,
): UseQueryResult<LatencyTimeSeriesResponse, Error> {
  const activeProjectId = useOrgStore((s) => s.activeProjectId || s.activeProjectSlug);
  const projectId = explicitProjectId || activeProjectId;

  return useQuery({
    queryKey: LATENCY_QUERY_KEYS.timeseries(projectId || '', params),
    queryFn: () => latencyApi.getTimeSeries(projectId!, params),
    enabled: Boolean(projectId),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useLatencyStatusSeries(
  params?: LatencyQueryParams,
  explicitProjectId?: string,
): UseQueryResult<HttpStatusSeriesResponse, Error> {
  const activeProjectId = useOrgStore((s) => s.activeProjectId || s.activeProjectSlug);
  const projectId = explicitProjectId || activeProjectId;

  return useQuery({
    queryKey: LATENCY_QUERY_KEYS.statusSeries(projectId || '', params),
    queryFn: () => latencyApi.getStatusSeries(projectId!, params),
    enabled: Boolean(projectId),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useLatencyDistribution(
  params?: LatencyQueryParams,
  explicitProjectId?: string,
): UseQueryResult<LatencyDistributionResponse, Error> {
  const activeProjectId = useOrgStore((s) => s.activeProjectId || s.activeProjectSlug);
  const projectId = explicitProjectId || activeProjectId;

  return useQuery({
    queryKey: LATENCY_QUERY_KEYS.distribution(projectId || '', params),
    queryFn: () => latencyApi.getDistribution(projectId!, params),
    enabled: Boolean(projectId),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useLatencyEndpoints(
  params?: LatencyQueryParams,
  explicitProjectId?: string,
): UseQueryResult<EndpointsResponse, Error> {
  const activeProjectId = useOrgStore((s) => s.activeProjectId || s.activeProjectSlug);
  const projectId = explicitProjectId || activeProjectId;

  return useQuery({
    queryKey: LATENCY_QUERY_KEYS.endpoints(projectId || '', params),
    queryFn: () => latencyApi.getEndpoints(projectId!, params),
    enabled: Boolean(projectId),
    staleTime: 15_000,
  });
}

export function useLatencyEndpointDetail(
  endpointId: string | null,
  params?: LatencyQueryParams,
  explicitProjectId?: string,
): UseQueryResult<EndpointDetailResponse, Error> {
  const activeProjectId = useOrgStore((s) => s.activeProjectId || s.activeProjectSlug);
  const projectId = explicitProjectId || activeProjectId;

  return useQuery({
    queryKey: LATENCY_QUERY_KEYS.endpointDetail(projectId || '', endpointId || '', params),
    queryFn: () => latencyApi.getEndpointDetail(projectId!, endpointId!, params),
    enabled: Boolean(projectId && endpointId),
    staleTime: 15_000,
  });
}

export function useLatencySlowRequests(
  params?: LatencyQueryParams,
  explicitProjectId?: string,
): UseQueryResult<SlowRequestItem[], Error> {
  const activeProjectId = useOrgStore((s) => s.activeProjectId || s.activeProjectSlug);
  const projectId = explicitProjectId || activeProjectId;

  return useQuery({
    queryKey: LATENCY_QUERY_KEYS.slowRequests(projectId || '', params),
    queryFn: () => latencyApi.getSlowRequests(projectId!, params),
    enabled: Boolean(projectId),
    staleTime: 15_000,
  });
}
