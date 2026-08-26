import { apiClient } from '@/infrastructure/api-client/axios';
import { tokenService } from '@/modules/auth/services/token.service';
import { useOrgStore } from '@/modules/organizations/store/org.store';
import { orgApi } from '@/modules/organizations/api/org.api';
import { useBootstrapStore, STALE_THRESHOLD_MS } from '../store/bootstrap.store';
import type { BootstrapData } from '../types/bootstrap.types';

let inFlightPromise: Promise<BootstrapData> | null = null;

export class BootstrapService {
  /**
   * Primary application bootstrap fetcher.
   * Single in-flight promise guard prevents duplicate network requests.
   * Stale-while-revalidate pattern updates Zustand store atomically.
   */
  async fetchBootstrap(options?: { force?: boolean; orgId?: string }): Promise<BootstrapData> {
    const store = useBootstrapStore.getState();

    // If an in-flight request is already running and not forcing a new org ID, collapse into existing promise
    if (inFlightPromise && !options?.force && !options?.orgId) {
      return inFlightPromise;
    }

    // Check if current cache is fresh (< 5 min) and force is false
    if (
      !options?.force &&
      !options?.orgId &&
      store.bootstrap &&
      store.lastSuccessfulFetchAt &&
      Date.now() - store.lastSuccessfulFetchAt < STALE_THRESHOLD_MS
    ) {
      return store.bootstrap;
    }

    // Set loading / refreshing status
    if (store.bootstrap) {
      store.setStatus('refreshing');
    } else {
      store.setStatus('loading');
    }

    const headers: Record<string, string> = {};
    const targetOrgId = options?.orgId ?? tokenService.getCurrentOrgId();
    if (targetOrgId) {
      headers['x-org-id'] = targetOrgId;
      headers['x-organization-id'] = targetOrgId;
    }

    inFlightPromise = (async () => {
      try {
        let response: any;
        try {
          response = await apiClient.get('/api/v1/me/bootstrap', { headers });
        } catch (err: any) {
          // Fallback route if /api/v1/me/bootstrap isn't reachable
          if (err.response?.status === 404) {
            response = await apiClient.get('/me/bootstrap', { headers });
          } else {
            throw err;
          }
        }

        const data: BootstrapData = response.data?.data ?? response.data;
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid bootstrap response received from backend');
        }

        // Atomically replace Zustand bootstrap store
        useBootstrapStore.getState().setBootstrap(data);

        // Sync tokenService & useOrgStore with authoritative backend state
        if (data.currentOrganizationId) {
          const currentOrg = data.organizations.find((o) => o.id === data.currentOrganizationId) ?? data.organizations[0];
          const orgId = data.currentOrganizationId;
          const orgSlug = currentOrg?.slug ?? null;

          tokenService.setCurrentOrgId(orgId);
          if (orgSlug) tokenService.setCurrentOrgSlug(orgSlug);

          // Sync useOrgStore
          const orgStore = useOrgStore.getState();
          if (orgStore.activeOrgId !== orgId) {
            orgStore.setActiveOrgId(orgId);
          }
          if (orgSlug && orgStore.activeOrgSlug !== orgSlug) {
            orgStore.setActiveOrgSlug(orgSlug);
          }

          // Validate current project against returned organization projects
          const activeProjId = tokenService.getCurrentProjectId();
          const validProject = data.projects.find((p) => p.id === activeProjId) ?? data.projects[0] ?? null;

          if (validProject) {
            tokenService.setCurrentProjectId(validProject.id);
            tokenService.setCurrentProjectSlug(validProject.slug);
            orgStore.setActiveProjectId(validProject.id);
            orgStore.setActiveProjectSlug(validProject.slug);
          } else {
            tokenService.setCurrentProjectId(null);
            tokenService.setCurrentProjectSlug(null);
            orgStore.setActiveProjectId(null);
            orgStore.setActiveProjectSlug(null);
          }
        }

        return data;
      } catch (error: any) {
        const isNetworkError = !error.response || error.code === 'ERR_NETWORK';
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch application bootstrap';

        if (isNetworkError && store.bootstrap) {
          // Retain cached UI snapshot during transient network loss
          store.setStatus('offline');
        } else {
          store.setError(errorMessage);
        }

        throw error;
      } finally {
        inFlightPromise = null;
      }
    })();

    return inFlightPromise;
  }

  /**
   * Centralized Organization Switching Workflow.
   * Updates backend session context, clears old project selections, and replaces bootstrap state atomically.
   */
  async switchOrganization(orgId: string): Promise<BootstrapData> {
    try {
      // Call backend organization switch endpoint
      await orgApi.switchOrganization(orgId).catch(() => undefined);
    } catch {
      // Continue even if backend switch route returns non-fatal warning
    }

    // Force-fetch fresh bootstrap for new organization context
    return this.fetchBootstrap({ force: true, orgId });
  }

  /**
   * Manually invalidate bootstrap cache (e.g. after adding project or changing plan).
   */
  async refreshBootstrap(): Promise<BootstrapData> {
    return this.fetchBootstrap({ force: true });
  }
}

export const bootstrapService = new BootstrapService();
