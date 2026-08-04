import { useState, useEffect } from 'react';
import { apiClient } from '@/infrastructure/api-client/axios';
import { useOrgStore } from '@/modules/organizations/store/org.store';

export interface ExplorerListResponse<T = any> {
  success: boolean;
  items: T[];
  pagination: any;
  summary: any;
  statistics: any;
  availableFilters: any;
}

export function useObservabilityList<T = any>(resource: string, params: Record<string, any> = {}) {
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

export function useObservabilityDetail<T = any>(resource: string, id: string) {
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

    apiClient.get(`/organizations/${activeOrgId}/observability/${resource}/${id}`)
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

export function useObservabilityRelated<T = any>(resource: string, id: string, relation: string) {
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
