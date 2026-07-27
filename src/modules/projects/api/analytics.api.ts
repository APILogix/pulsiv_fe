/**
 * Project usage-analytics API.
 *
 * Backend: `pulse/src/modules/projects/usage/analytics.routes.ts` —
 * `/organizations/:orgId/projects/:projectId/analytics/*`.
 * All range endpoints require ISO `from`/`to`.
 */
import { apiClient } from "@/infrastructure/api-client/axios";
import { projectPath } from "./projects.api";
import type {
  ComparisonSeries,
  HeatmapData,
  HeatmapType,
  MonthlyUsageVsPlan,
  TopListDimension,
  TopListItem,
  UsageAnalyticsResponse,
  UsageGranularity,
} from "./types";

const analyticsBase = (orgId: string, projectId: string) => `${projectPath(orgId, projectId)}/analytics`;

export interface UsageRange {
  from: string;
  to: string;
}

export const analyticsApi = {
  usage: async (
    orgId: string,
    projectId: string,
    query: UsageRange & {
      granularity?: UsageGranularity;
      environmentId?: string;
      apiKeyId?: string;
      eventType?: string;
      severity?: string;
      service?: string;
      endpoint?: string;
      region?: string;
      release?: string;
      limit?: number;
    },
  ): Promise<UsageAnalyticsResponse> => {
    const { data } = await apiClient.get(`${analyticsBase(orgId, projectId)}/usage`, { params: query });
    return data.data;
  },

  heatmap: async (
    orgId: string,
    projectId: string,
    query: UsageRange & { type?: HeatmapType; environmentId?: string; apiKeyId?: string },
  ): Promise<HeatmapData> => {
    const { data } = await apiClient.get(`${analyticsBase(orgId, projectId)}/heatmap`, { params: query });
    return data.data;
  },

  top: async (
    orgId: string,
    projectId: string,
    query: UsageRange & { dimension: TopListDimension; environmentId?: string; apiKeyId?: string; limit?: number },
  ): Promise<TopListItem[]> => {
    const { data } = await apiClient.get(`${analyticsBase(orgId, projectId)}/top`, { params: query });
    return data.data ?? [];
  },

  comparison: async (
    orgId: string,
    projectId: string,
    query: UsageRange & { dimension?: "environment" | "apiKey"; limit?: number },
  ): Promise<ComparisonSeries[]> => {
    const { data } = await apiClient.get(`${analyticsBase(orgId, projectId)}/comparison`, { params: query });
    return data.data ?? [];
  },

  monthlyUsage: async (orgId: string, projectId: string): Promise<MonthlyUsageVsPlan> => {
    const { data } = await apiClient.get(`${analyticsBase(orgId, projectId)}/monthly-usage`);
    return data.data;
  },
};
