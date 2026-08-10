import { useState, useEffect, useCallback } from "react";
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
} from "../services/errorGroupsApi";

export function useErrorGroupsList(filters: ErrorGroupFilterState) {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const [groups, setGroups] = useState<ErrorGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchErrorGroupsApi(activeOrgId, filters);
      setGroups(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [activeOrgId, JSON.stringify(filters)]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { groups, isLoading, error, refetch };
}

export function useErrorGroupDetail(groupId: string) {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const [group, setGroup] = useState<ErrorGroup | null>(null);
  const [history, setHistory] = useState<ErrorGroupHistoryItem[]>([]);
  const [relatedEvents, setRelatedEvents] = useState<RelatedErrorEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!groupId) return;
    setIsLoading(true);
    try {
      const gData = await fetchErrorGroupDetailApi(activeOrgId, groupId);
      setGroup(gData);
      setHistory(gData?.history ?? []);
      setRelatedEvents(gData?.relatedEvents ?? []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [activeOrgId, groupId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { group, history, relatedEvents, isLoading, error, refetch };
}

export function useErrorGroupMutations() {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateStatus = useCallback(
    async (groupId: string, status: ErrorGroupStatus, reason?: string): Promise<boolean> => {
      setIsSubmitting(true);
      try {
        return await updateErrorGroupStatusApi(activeOrgId, groupId, status, reason);
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeOrgId],
  );

  const mergeGroups = useCallback(
    async (sourceGroupId: string, targetGroupId: string): Promise<boolean> => {
      setIsSubmitting(true);
      try {
        return await mergeErrorGroupsApi(activeOrgId, sourceGroupId, targetGroupId);
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeOrgId],
  );

  return { updateStatus, mergeGroups, isSubmitting };
}
