import { useQuery } from "@tanstack/react-query";
import { analyticsApi, type UsageRange } from "../api/analytics.api";
import type { HeatmapType, TopListDimension, UsageGranularity } from "../api/types";
import { projectKeys, useProjectScope } from "./useProjectScope";

export function useUsageAnalytics(
  projectId: string,
  query: UsageRange & { granularity?: UsageGranularity; environmentId?: string; apiKeyId?: string },
) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.analytics(activeOrgId, projectId, "usage", query),
    queryFn: () => analyticsApi.usage(activeOrgId!, projectId, query),
    enabled: !!activeOrgId && !!projectId,
    staleTime: 60_000,
  });
}

export function useUsageHeatmap(
  projectId: string,
  query: UsageRange & { type?: HeatmapType; environmentId?: string },
) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.analytics(activeOrgId, projectId, "heatmap", query),
    queryFn: () => analyticsApi.heatmap(activeOrgId!, projectId, query),
    enabled: !!activeOrgId && !!projectId,
    staleTime: 60_000,
  });
}

export function useUsageTopList(
  projectId: string,
  query: UsageRange & { dimension: TopListDimension; environmentId?: string; limit?: number },
) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.analytics(activeOrgId, projectId, "top", query),
    queryFn: () => analyticsApi.top(activeOrgId!, projectId, query),
    enabled: !!activeOrgId && !!projectId,
    staleTime: 60_000,
  });
}

export function useUsageComparison(
  projectId: string,
  query: UsageRange & { dimension?: "environment" | "apiKey"; limit?: number },
) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.analytics(activeOrgId, projectId, "comparison", query),
    queryFn: () => analyticsApi.comparison(activeOrgId!, projectId, query),
    enabled: !!activeOrgId && !!projectId,
    staleTime: 60_000,
  });
}

export function useMonthlyUsage(projectId: string) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.analytics(activeOrgId, projectId, "monthly"),
    queryFn: () => analyticsApi.monthlyUsage(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
    staleTime: 5 * 60_000,
  });
}
