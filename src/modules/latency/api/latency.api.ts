/**
 * Latency API Client
 * Connects to Fastify `/api/v1/projects/:projectId/latency` endpoints.
 */

import { apiClient } from '@/infrastructure/api-client/axios';
import type {
  ApiResponse,
  EndpointDetailResponse,
  EndpointsResponse,
  HttpStatusSeriesResponse,
  LatencyDistributionResponse,
  LatencyOverview,
  LatencyQueryParams,
  LatencyTimeSeriesResponse,
  SlowRequestItem,
} from '../types/latency.types';

function cleanParams(params?: LatencyQueryParams): Record<string, unknown> | undefined {
  if (!params) return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value;
    }
  }
  return result;
}

export const latencyApi = {
  getOverview: async (
    projectId: string,
    params?: LatencyQueryParams,
  ): Promise<LatencyOverview> => {
    const { data } = await apiClient.get<ApiResponse<LatencyOverview>>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/latency/overview`,
      { params: cleanParams(params) },
    );
    return data.data;
  },

  getTimeSeries: async (
    projectId: string,
    params?: LatencyQueryParams,
  ): Promise<LatencyTimeSeriesResponse> => {
    const { data } = await apiClient.get<ApiResponse<LatencyTimeSeriesResponse>>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/latency/timeseries`,
      { params: cleanParams(params) },
    );
    return data.data;
  },

  getStatusSeries: async (
    projectId: string,
    params?: LatencyQueryParams,
  ): Promise<HttpStatusSeriesResponse> => {
    const { data } = await apiClient.get<ApiResponse<HttpStatusSeriesResponse>>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/latency/status-series`,
      { params: cleanParams(params) },
    );
    return data.data;
  },

  getDistribution: async (
    projectId: string,
    params?: LatencyQueryParams,
  ): Promise<LatencyDistributionResponse> => {
    const { data } = await apiClient.get<ApiResponse<LatencyDistributionResponse>>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/latency/distribution`,
      { params: cleanParams(params) },
    );
    return data.data;
  },

  getEndpoints: async (
    projectId: string,
    params?: LatencyQueryParams,
  ): Promise<EndpointsResponse> => {
    const { data } = await apiClient.get<ApiResponse<EndpointsResponse>>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/latency/endpoints`,
      { params: cleanParams(params) },
    );
    return data.data;
  },

  getEndpointDetail: async (
    projectId: string,
    endpointId: string,
    params?: LatencyQueryParams,
  ): Promise<EndpointDetailResponse> => {
    const { data } = await apiClient.get<ApiResponse<EndpointDetailResponse>>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/latency/endpoints/${encodeURIComponent(endpointId)}`,
      { params: cleanParams(params) },
    );
    return data.data;
  },

  getSlowRequests: async (
    projectId: string,
    params?: LatencyQueryParams,
  ): Promise<SlowRequestItem[]> => {
    const { data } = await apiClient.get<ApiResponse<SlowRequestItem[]>>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/latency/slow-requests`,
      { params: cleanParams(params) },
    );
    return data.data;
  },
};
