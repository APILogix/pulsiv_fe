/**
 * React Query hooks for Analytics V2 Read API.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useOrgStore } from '@/modules/organizations/store/org.store';
import { useTimeRangeStore } from '@/stores/timeRangeStore';
import {
  analyticsV2Api,
  type AnalyticsQueryParams,
} from '../api/analytics-v2.api';
import type {
  AnalyticsOverviewData,
  AnalyticsResponse,
  DataTable,
  EndpointRow,
  ErrorGroupRow,
  ErrorSummaryData,
  LatencyHistogramData,
  LogsSummaryData,
  MetricCard,
  MetricSeries,
  ProjectsHealthData,
  ProjectsHealthItem,
  ProjectHealthItem,
  RankedList,
  RequestSummaryData,
  ServiceRow,
  StatusDistributionData,
  SystemHealthData,
  TracesSummaryData,
  WorkerHealthSnapshot,
} from '../types/analytics-v2.types';

export function calculateTimeRangeParams(timeRange: string): {
  from: string;
  to: string;
  window: '1m' | '5m' | '1h' | '1d';
  refetchInterval: number;
} {
  const now = new Date();
  const to = now.toISOString();

  switch (timeRange) {
    case '15m':
      return {
        from: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
        to,
        window: '1m',
        refetchInterval: 15_000,
      };
    case '1h':
      return {
        from: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        to,
        window: '1m',
        refetchInterval: 30_000,
      };
    case '6h':
      return {
        from: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        to,
        window: '5m',
        refetchInterval: 60_000,
      };
    case '24h':
      return {
        from: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        to,
        window: '5m',
        refetchInterval: 60_000,
      };
    case '7d':
      return {
        from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        to,
        window: '1h',
        refetchInterval: 120_000,
      };
    case '30d':
      return {
        from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to,
        window: '1d',
        refetchInterval: 300_000,
      };
    default:
      return {
        from: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        to,
        window: '1m',
        refetchInterval: 30_000,
      };
  }
}

export function useAnalyticsScope() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const activeProjectId = useOrgStore((s) => s.activeProjectId);
  const timeRange = useTimeRangeStore((s) => s.timeRange);

  const rangeParams = calculateTimeRangeParams(timeRange);

  return {
    orgId: activeOrgId,
    projectId: activeProjectId,
    timeRange,
    ...rangeParams,
    isEnabled: Boolean(activeOrgId || activeProjectId),
  };
}

export function useAnalyticsOverview(
  overrides?: AnalyticsQueryParams,
): UseQueryResult<AnalyticsResponse<AnalyticsOverviewData>> {
  const scope = useAnalyticsScope();

  return useQuery({
    queryKey: ['analytics-v2', 'overview', scope.orgId, scope.projectId, scope.timeRange, overrides],
    queryFn: () =>
      analyticsV2Api.getOverview(
        { orgId: scope.orgId, projectId: scope.projectId },
        {
          from: scope.from,
          to: scope.to,
          window: scope.window,
          ...overrides,
        },
      ),
    enabled: scope.isEnabled,
    refetchInterval: scope.refetchInterval,
    staleTime: 10_000,
  });
}

export function useRequestSummary(
  overrides?: AnalyticsQueryParams,
): UseQueryResult<AnalyticsResponse<RequestSummaryData>> {
  const scope = useAnalyticsScope();

  return useQuery({
    queryKey: ['analytics-v2', 'requests-summary', scope.orgId, scope.projectId, scope.timeRange, overrides],
    queryFn: () =>
      analyticsV2Api.getRequestSummary(
        { orgId: scope.orgId, projectId: scope.projectId },
        {
          from: scope.from,
          to: scope.to,
          window: scope.window,
          ...overrides,
        },
      ),
    enabled: scope.isEnabled,
    refetchInterval: scope.refetchInterval,
    staleTime: 10_000,
  });
}

export function useRequestSeries(
  metrics = 'total,errors',
  overrides?: AnalyticsQueryParams,
): UseQueryResult<AnalyticsResponse<{ series: MetricSeries[] }>> {
  const scope = useAnalyticsScope();

  return useQuery({
    queryKey: ['analytics-v2', 'requests-series', metrics, scope.orgId, scope.projectId, scope.timeRange, overrides],
    queryFn: () =>
      analyticsV2Api.getRequestSeries(
        { orgId: scope.orgId, projectId: scope.projectId },
        {
          from: scope.from,
          to: scope.to,
          window: scope.window,
          metrics,
          ...overrides,
        },
      ),
    enabled: scope.isEnabled,
    refetchInterval: scope.refetchInterval,
    staleTime: 10_000,
  });
}

export function useStatusDistribution(
  overrides?: AnalyticsQueryParams,
): UseQueryResult<AnalyticsResponse<StatusDistributionData>> {
  const scope = useAnalyticsScope();

  return useQuery({
    queryKey: ['analytics-v2', 'status-distribution', scope.orgId, scope.projectId, scope.timeRange, overrides],
    queryFn: () =>
      analyticsV2Api.getStatusDistribution(
        { orgId: scope.orgId, projectId: scope.projectId },
        {
          from: scope.from,
          to: scope.to,
          window: scope.window,
          ...overrides,
        },
      ),
    enabled: scope.isEnabled,
    refetchInterval: scope.refetchInterval,
    staleTime: 10_000,
  });
}

export function useLatencyHistogram(
  overrides?: AnalyticsQueryParams,
): UseQueryResult<AnalyticsResponse<LatencyHistogramData>> {
  const scope = useAnalyticsScope();

  return useQuery({
    queryKey: ['analytics-v2', 'latency-histogram', scope.orgId, scope.projectId, scope.timeRange, overrides],
    queryFn: () =>
      analyticsV2Api.getLatencyHistogram(
        { orgId: scope.orgId, projectId: scope.projectId },
        {
          from: scope.from,
          to: scope.to,
          window: scope.window,
          ...overrides,
        },
      ),
    enabled: scope.isEnabled,
    refetchInterval: scope.refetchInterval,
    staleTime: 10_000,
  });
}

export function useEndpointsAnalytics(
  overrides?: AnalyticsQueryParams,
): UseQueryResult<AnalyticsResponse<{ table: DataTable<EndpointRow> }>> {
  const scope = useAnalyticsScope();

  return useQuery({
    queryKey: ['analytics-v2', 'endpoints', scope.orgId, scope.projectId, scope.timeRange, overrides],
    queryFn: () =>
      analyticsV2Api.getEndpoints(
        { orgId: scope.orgId, projectId: scope.projectId },
        {
          from: scope.from,
          to: scope.to,
          window: scope.window,
          ...overrides,
        },
      ),
    enabled: scope.isEnabled,
    refetchInterval: scope.refetchInterval,
    staleTime: 10_000,
  });
}

export function useSlowestEndpoints(
  limit = 10,
  overrides?: AnalyticsQueryParams,
): UseQueryResult<AnalyticsResponse<{ list: RankedList }>> {
  const scope = useAnalyticsScope();

  return useQuery({
    queryKey: ['analytics-v2', 'slowest-endpoints', limit, scope.orgId, scope.projectId, scope.timeRange, overrides],
    queryFn: () =>
      analyticsV2Api.getSlowestEndpoints(
        { orgId: scope.orgId, projectId: scope.projectId },
        {
          from: scope.from,
          to: scope.to,
          window: scope.window,
          limit,
          ...overrides,
        },
      ),
    enabled: scope.isEnabled,
    refetchInterval: scope.refetchInterval,
    staleTime: 10_000,
  });
}

export function useErrorSummary(
  overrides?: AnalyticsQueryParams,
): UseQueryResult<AnalyticsResponse<ErrorSummaryData>> {
  const scope = useAnalyticsScope();

  return useQuery({
    queryKey: ['analytics-v2', 'errors-summary', scope.orgId, scope.projectId, scope.timeRange, overrides],
    queryFn: () =>
      analyticsV2Api.getErrorSummary(
        { orgId: scope.orgId, projectId: scope.projectId },
        {
          from: scope.from,
          to: scope.to,
          window: scope.window,
          ...overrides,
        },
      ),
    enabled: scope.isEnabled,
    refetchInterval: scope.refetchInterval,
    staleTime: 10_000,
  });
}

export function useErrorGroupsAnalytics(
  options?: { status?: string; mechanism?: string } & AnalyticsQueryParams,
): UseQueryResult<AnalyticsResponse<{ table: DataTable<ErrorGroupRow> }>> {
  const scope = useAnalyticsScope();

  return useQuery({
    queryKey: ['analytics-v2', 'error-groups', scope.orgId, scope.projectId, scope.timeRange, options],
    queryFn: () =>
      analyticsV2Api.getErrorGroups(
        { orgId: scope.orgId, projectId: scope.projectId },
        {
          from: scope.from,
          to: scope.to,
          window: scope.window,
          ...options,
        },
      ),
    enabled: scope.isEnabled,
    refetchInterval: scope.refetchInterval,
    staleTime: 10_000,
  });
}

export function useServicesAnalytics(
  overrides?: AnalyticsQueryParams,
): UseQueryResult<AnalyticsResponse<{ table: DataTable<ServiceRow> }>> {
  const scope = useAnalyticsScope();

  return useQuery({
    queryKey: ['analytics-v2', 'services', scope.orgId, scope.projectId, scope.timeRange, overrides],
    queryFn: () =>
      analyticsV2Api.getServices(
        { orgId: scope.orgId, projectId: scope.projectId },
        {
          from: scope.from,
          to: scope.to,
          window: scope.window,
          ...overrides,
        },
      ),
    enabled: scope.isEnabled,
    refetchInterval: scope.refetchInterval,
    staleTime: 10_000,
  });
}

export function useTracesSummary(
  overrides?: AnalyticsQueryParams,
): UseQueryResult<AnalyticsResponse<TracesSummaryData>> {
  const scope = useAnalyticsScope();

  return useQuery({
    queryKey: ['analytics-v2', 'traces-summary', scope.orgId, scope.projectId, scope.timeRange, overrides],
    queryFn: () =>
      analyticsV2Api.getTracesSummary(
        { orgId: scope.orgId, projectId: scope.projectId },
        {
          from: scope.from,
          to: scope.to,
          window: scope.window,
          ...overrides,
        },
      ),
    enabled: scope.isEnabled,
    refetchInterval: scope.refetchInterval,
    staleTime: 10_000,
  });
}

export function useLogsSummary(
  overrides?: AnalyticsQueryParams,
): UseQueryResult<AnalyticsResponse<LogsSummaryData>> {
  const scope = useAnalyticsScope();

  return useQuery({
    queryKey: ['analytics-v2', 'logs-summary', scope.orgId, scope.projectId, scope.timeRange, overrides],
    queryFn: () =>
      analyticsV2Api.getLogsSummary(
        { orgId: scope.orgId, projectId: scope.projectId },
        {
          from: scope.from,
          to: scope.to,
          window: scope.window,
          ...overrides,
        },
      ),
    enabled: scope.isEnabled,
    refetchInterval: scope.refetchInterval,
    staleTime: 10_000,
  });
}

export function useProjectsHealth(
  orgIdOverride?: string,
): UseQueryResult<AnalyticsResponse<ProjectsHealthData>> {
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const targetOrgId = orgIdOverride || activeOrgId;

  return useQuery({
    queryKey: ['analytics-v2', 'projects-health', targetOrgId],
    queryFn: () => analyticsV2Api.getProjectsHealth(targetOrgId!),
    enabled: Boolean(targetOrgId),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useSystemHealth(): UseQueryResult<{ data: SystemHealthData }> {
  return useQuery({
    queryKey: ['analytics-v2', 'system-health'],
    queryFn: () => analyticsV2Api.getSystemHealth(),
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
}

