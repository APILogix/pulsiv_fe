/**
 * Analytics V2 API Client
 * Connects to Fastify `/analytics/v2` endpoints.
 */

import { apiClient } from '@/infrastructure/api-client/axios';
import type {
  AnalyticsOverviewData,
  AnalyticsResponse,
  DataTable,
  EndpointRow,
  ErrorGroupRow,
  ErrorSummaryData,
  LatencyHistogramData,
  LogsSummaryData,
  MetricSeries,
  ProjectsHealthData,
  RankedList,
  RequestSummaryData,
  ServiceRow,
  StatusDistributionData,
  SystemHealthData,
  TracesSummaryData,
} from '../types/analytics-v2.types';

export interface AnalyticsQueryParams {
  from?: string;
  to?: string;
  window?: '1m' | '5m' | '1h' | '1d';
  environment?: string;
  service?: string;
  compare?: boolean | string;
  limit?: number;
  offset?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export function serializeParams<T extends AnalyticsQueryParams>(params?: T): Record<string, unknown> | undefined {
  if (!params) return undefined;
  const { sort, direction, ...rest } = params;
  const serialized: Record<string, unknown> = { ...rest };
  if (sort) {
    if (direction && !sort.includes(':')) {
      serialized.sort = `${sort}:${direction}`;
    } else {
      serialized.sort = sort;
    }
  }
  return serialized;
}

function buildPath(
  scope: { orgId?: string | null; projectId?: string | null },
  route: string,
): string {
  if (scope.projectId) {
    return `/analytics/v2/projects/${scope.projectId}${route}`;
  }
  if (scope.orgId) {
    return `/analytics/v2/org/${scope.orgId}${route}`;
  }
  throw new Error('Either orgId or projectId must be provided to query Analytics V2');
}

export const analyticsV2Api = {
  getOverview: async (
    scope: { orgId?: string | null; projectId?: string | null },
    params?: AnalyticsQueryParams,
  ): Promise<AnalyticsResponse<AnalyticsOverviewData>> => {
    const { data } = await apiClient.get(buildPath(scope, '/overview'), { params: serializeParams(params) });
    return data;
  },

  getRequestSummary: async (
    scope: { orgId?: string | null; projectId?: string | null },
    params?: AnalyticsQueryParams,
  ): Promise<AnalyticsResponse<RequestSummaryData>> => {
    const { data } = await apiClient.get(buildPath(scope, '/requests/summary'), { params: serializeParams(params) });
    return data;
  },

  getRequestSeries: async (
    scope: { orgId?: string | null; projectId?: string | null },
    params?: AnalyticsQueryParams & { metrics?: string },
  ): Promise<AnalyticsResponse<{ series: MetricSeries[] }>> => {
    const { data } = await apiClient.get(buildPath(scope, '/requests/series'), { params: serializeParams(params) });
    return data;
  },

  getStatusDistribution: async (
    scope: { orgId?: string | null; projectId?: string | null },
    params?: AnalyticsQueryParams,
  ): Promise<AnalyticsResponse<StatusDistributionData>> => {
    const { data } = await apiClient.get(buildPath(scope, '/requests/status-distribution'), { params: serializeParams(params) });
    return data;
  },

  getLatencyHistogram: async (
    scope: { orgId?: string | null; projectId?: string | null },
    params?: AnalyticsQueryParams,
  ): Promise<AnalyticsResponse<LatencyHistogramData>> => {
    const { data } = await apiClient.get(buildPath(scope, '/requests/latency-histogram'), { params: serializeParams(params) });
    return data;
  },

  getEndpoints: async (
    scope: { orgId?: string | null; projectId?: string | null },
    params?: AnalyticsQueryParams,
  ): Promise<AnalyticsResponse<{ table: DataTable<EndpointRow> }>> => {
    const { data } = await apiClient.get(buildPath(scope, '/endpoints'), { params: serializeParams(params) });
    return data;
  },

  getSlowestEndpoints: async (
    scope: { orgId?: string | null; projectId?: string | null },
    params?: AnalyticsQueryParams,
  ): Promise<AnalyticsResponse<{ list: RankedList }>> => {
    const { data } = await apiClient.get(buildPath(scope, '/endpoints/slowest'), { params: serializeParams(params) });
    return data;
  },

  getErrorSummary: async (
    scope: { orgId?: string | null; projectId?: string | null },
    params?: AnalyticsQueryParams,
  ): Promise<AnalyticsResponse<ErrorSummaryData>> => {
    const { data } = await apiClient.get(buildPath(scope, '/errors/summary'), { params: serializeParams(params) });
    return data;
  },

  getErrorGroups: async (
    scope: { orgId?: string | null; projectId?: string | null },
    params?: AnalyticsQueryParams & { status?: string; mechanism?: string },
  ): Promise<AnalyticsResponse<{ table: DataTable<ErrorGroupRow> }>> => {
    const { data } = await apiClient.get(buildPath(scope, '/errors/groups'), { params: serializeParams(params) });
    return data;
  },

  getServices: async (
    scope: { orgId?: string | null; projectId?: string | null },
    params?: AnalyticsQueryParams,
  ): Promise<AnalyticsResponse<{ table: DataTable<ServiceRow> }>> => {
    const { data } = await apiClient.get(buildPath(scope, '/services'), { params: serializeParams(params) });
    return data;
  },

  getTracesSummary: async (
    scope: { orgId?: string | null; projectId?: string | null },
    params?: AnalyticsQueryParams,
  ): Promise<AnalyticsResponse<TracesSummaryData>> => {
    const { data } = await apiClient.get(buildPath(scope, '/traces/summary'), { params: serializeParams(params) });
    return data;
  },

  getLogsSummary: async (
    scope: { orgId?: string | null; projectId?: string | null },
    params?: AnalyticsQueryParams,
  ): Promise<AnalyticsResponse<LogsSummaryData>> => {
    const { data } = await apiClient.get(buildPath(scope, '/logs/summary'), { params: serializeParams(params) });
    return data;
  },

  getProjectsHealth: async (
    orgId: string,
  ): Promise<AnalyticsResponse<ProjectsHealthData>> => {
    const { data } = await apiClient.get(`/analytics/v2/org/${orgId}/projects/health`);
    return data;
  },

  getSystemHealth: async (): Promise<{ data: SystemHealthData }> => {
    const { data } = await apiClient.get('/analytics/v2/system/health');
    return data;
  },
};
