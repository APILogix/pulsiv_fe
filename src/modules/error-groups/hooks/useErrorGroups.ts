import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import type {
  ErrorGroup,
  ErrorGroupHistoryItem,
  RelatedErrorEvent,
  ErrorGroupFilterState,
  ErrorGroupStatus,
} from "../types/error-group";
import {
  fetchErrorGroupsApi,
  fetchErrorGroupDetailApi,
  updateErrorGroupStatusApi,
  mergeErrorGroupsApi,
  type FetchErrorGroupsResult,
} from "../services/errorGroupsApi";

/**
 * Error groups used to be fetched with `useEffect` + `useState`: no cache, a
 * refetch on every mount, and status changes followed by a manual `refetch()`
 * that refreshed only the query on screen. They now live in the query cache
 * under one key hierarchy, and every mutation invalidates the whole org's
 * error-group subtree so list, detail and merge picker agree.
 */
export const errorGroupKeys = {
  all: ["error-groups"] as const,
  org: (orgId: string) => [...errorGroupKeys.all, orgId] as const,
  list: (orgId: string, filters: ErrorGroupFilterState) => [...errorGroupKeys.org(orgId), "list", filters] as const,
  detail: (orgId: string, groupId: string) => [...errorGroupKeys.org(orgId), "detail", groupId] as const,
};

// Stable fallbacks: callers put these in effect dependency lists.
const EMPTY_GROUPS: ErrorGroup[] = [];
const EMPTY_PAGINATION: FetchErrorGroupsResult["pagination"] = {};
const EMPTY_SUMMARY: Record<string, unknown> = {};
const EMPTY_HISTORY: ErrorGroupHistoryItem[] = [];
const EMPTY_EVENTS: RelatedErrorEvent[] = [];

export function useErrorGroupsList(filters: ErrorGroupFilterState) {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);

  const query = useQuery({
    queryKey: errorGroupKeys.list(activeOrgId ?? "", filters),
    queryFn: ({ signal }) => fetchErrorGroupsApi(activeOrgId, filters, signal),
    enabled: Boolean(activeOrgId),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  return {
    groups: query.data?.items ?? EMPTY_GROUPS,
    pagination: query.data?.pagination ?? EMPTY_PAGINATION,
    summary: query.data?.summary ?? EMPTY_SUMMARY,
    isLoading: query.isLoading || (query.isPlaceholderData && query.isFetching),
    error: query.error,
    refetch: query.refetch,
  };
}

export function useErrorGroupDetail(groupId: string) {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);

  const query = useQuery({
    queryKey: errorGroupKeys.detail(activeOrgId ?? "", groupId),
    queryFn: ({ signal }) => fetchErrorGroupDetailApi(activeOrgId, groupId, signal),
    enabled: Boolean(activeOrgId && groupId),
    staleTime: 30_000,
  });

  const group = query.data ?? null;
  return {
    group,
    history: group?.history ?? EMPTY_HISTORY,
    relatedEvents: group?.relatedEvents ?? EMPTY_EVENTS,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useErrorGroupMutations() {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const queryClient = useQueryClient();

  const invalidate = () =>
    activeOrgId
      ? queryClient.invalidateQueries({ queryKey: errorGroupKeys.org(activeOrgId) })
      : Promise.resolve();

  const status = useMutation({
    mutationFn: ({ groupId, status: next, reason }: { groupId: string; status: ErrorGroupStatus; reason?: string }) =>
      updateErrorGroupStatusApi(activeOrgId, groupId, next, reason),
    onSettled: invalidate,
  });

  const merge = useMutation({
    mutationFn: ({ sourceGroupId, targetGroupId }: { sourceGroupId: string; targetGroupId: string }) =>
      mergeErrorGroupsApi(activeOrgId, sourceGroupId, targetGroupId),
    onSettled: invalidate,
  });

  return {
    updateStatus: (groupId: string, next: ErrorGroupStatus, reason?: string): Promise<boolean> =>
      status.mutateAsync({ groupId, status: next, reason }),
    mergeGroups: (sourceGroupId: string, targetGroupId: string): Promise<boolean> =>
      merge.mutateAsync({ sourceGroupId, targetGroupId }),
    isSubmitting: status.isPending || merge.isPending,
  };
}
