import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type {
  BootstrapData,
  BootstrapStatus,
  BootstrapQuota,
  BootstrapUsage,
} from '../types/bootstrap.types';

const EMPTY_ARRAY: any[] = [];
const EMPTY_OBJECT: Record<string, any> = {};

export const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export interface BootstrapState {
  bootstrap: BootstrapData | null;
  status: BootstrapStatus;
  error: string | null;
  lastFetchedAt: number | null;
  lastSuccessfulFetchAt: number | null;
  isStale: boolean;
  hasHydrated: boolean;

  // Actions
  setBootstrap: (data: BootstrapData) => void;
  setStatus: (status: BootstrapStatus) => void;
  setError: (error: string | null) => void;
  updateUsage: (usage: Partial<BootstrapUsage>) => void;
  clearBootstrap: () => void;
  markStale: () => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useBootstrapStore = create<BootstrapState>()(
  persist(
    (set, get) => ({
      bootstrap: null,
      status: 'idle',
      error: null,
      lastFetchedAt: null,
      lastSuccessfulFetchAt: null,
      isStale: false,
      hasHydrated: false,

      setBootstrap: (data: BootstrapData) => {
        const now = Date.now();
        set({
          bootstrap: data,
          status: 'ready',
          error: null,
          lastFetchedAt: now,
          lastSuccessfulFetchAt: now,
          isStale: false,
        });
      },

      setStatus: (status: BootstrapStatus) => set({ status }),

      setError: (error: string | null) =>
        set((state) => ({
          error,
          status: state.bootstrap ? 'offline' : 'error',
        })),

      updateUsage: (partialUsage: Partial<BootstrapUsage>) => {
        const current = get().bootstrap;
        if (!current) return;
        const updatedUsage: BootstrapUsage = {
          monthlyEvents: partialUsage.monthlyEvents
            ? { ...current.usage.monthlyEvents, ...partialUsage.monthlyEvents }
            : current.usage.monthlyEvents,
          aiCredits: partialUsage.aiCredits
            ? { ...current.usage.aiCredits, ...partialUsage.aiCredits }
            : current.usage.aiCredits,
        };

        set({
          bootstrap: {
            ...current,
            usage: updatedUsage,
          },
        });
      },

      clearBootstrap: () => {
        localStorage.removeItem('app-bootstrap-storage');
        set({
          bootstrap: null,
          status: 'idle',
          error: null,
          lastFetchedAt: null,
          lastSuccessfulFetchAt: null,
          isStale: false,
        });
      },

      markStale: () => set({ isStale: true }),

      setHasHydrated: (hasHydrated: boolean) => set({ hasHydrated }),
    }),
    {
      name: 'app-bootstrap-storage',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        bootstrap: state.bootstrap,
        lastSuccessfulFetchAt: state.lastSuccessfulFetchAt,
        lastFetchedAt: state.lastFetchedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.setHasHydrated(true);

        // Check if persisted state is stale (> 5 minutes old)
        if (state.lastSuccessfulFetchAt) {
          const age = Date.now() - state.lastSuccessfulFetchAt;
          if (age >= STALE_THRESHOLD_MS) {
            state.markStale();
          }
        }
      },
    }
  )
);

// ── Selectors for optimized rendering ────────────────────────────────────────

export function useBootstrap() {
  return useBootstrapStore((s) => s.bootstrap);
}

export function useBootstrapStatus() {
  return useBootstrapStore(
    useShallow((s) => ({
      status: s.status,
      isStale: s.isStale,
      hasHydrated: s.hasHydrated,
      error: s.error,
    }))
  );
}

export function useBootstrapOrganizations() {
  return useBootstrapStore((s) => s.bootstrap?.organizations ?? EMPTY_ARRAY);
}

export function useBootstrapCurrentOrg() {
  return useBootstrapStore((s) => {
    const orgs = s.bootstrap?.organizations ?? EMPTY_ARRAY;
    const currentId = s.bootstrap?.currentOrganizationId;
    return orgs.find((o) => o.id === currentId) ?? orgs[0] ?? null;
  });
}

export function useBootstrapProjects() {
  return useBootstrapStore((s) => s.bootstrap?.projects ?? EMPTY_ARRAY);
}

export function useBootstrapBilling() {
  return useBootstrapStore((s) => s.bootstrap?.billing ?? null);
}

export function useBootstrapFeatures() {
  return useBootstrapStore((s) => s.bootstrap?.features ?? EMPTY_OBJECT);
}

export function useFeature(featureKey: string): boolean {
  return useBootstrapStore((s) => s.bootstrap?.features?.[featureKey] === true);
}

export function useBootstrapIntegrations() {
  return useBootstrapStore((s) => s.bootstrap?.integrations ?? EMPTY_OBJECT);
}

export function useIntegration(providerKey: string): boolean {
  return useBootstrapStore((s) => s.bootstrap?.integrations?.[providerKey] === true);
}

export function useBootstrapQuotas() {
  return useBootstrapStore((s) => s.bootstrap?.quotas ?? EMPTY_OBJECT);
}

export function useQuota(quotaKey: string): BootstrapQuota | null {
  return useBootstrapStore((s) => s.bootstrap?.quotas?.[quotaKey] ?? null);
}

export function useBootstrapUsage() {
  return useBootstrapStore((s) => s.bootstrap?.usage ?? null);
}
