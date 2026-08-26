import { describe, it, expect, beforeEach } from 'vitest';
import { useBootstrapStore } from './store/bootstrap.store';
import type { BootstrapData } from './types/bootstrap.types';

const mockBootstrapData: BootstrapData = {
  currentOrganizationId: 'org_test_123',
  organizations: [
    {
      id: 'org_test_123',
      name: 'Acme Corp',
      slug: 'acme-corp',
      role: 'owner',
      isCurrent: true,
    },
  ],
  projects: [
    {
      id: 'proj_456',
      name: 'Production API',
      slug: 'prod-api',
      status: 'active',
    },
  ],
  billing: {
    plan: {
      id: 'plan_growth',
      key: 'growth',
      name: 'Growth Plan',
    },
    status: 'active',
    currentPeriodEnd: '2026-12-31T23:59:59Z',
    cancelAtPeriodEnd: false,
  },
  features: {
    ai: true,
    alerting: true,
    connectors: true,
  },
  integrations: {
    slack: true,
    webhook: true,
  },
  quotas: {
    projects: { limit: 10, used: 1, remaining: 9 },
    members: { limit: 25, used: 3, remaining: 22 },
  },
  usage: {
    monthlyEvents: { limit: 1000000, used: 250000, remaining: 750000, percentage: 25 },
    aiCredits: { limit: 500, used: 100, remaining: 400, percentage: 20 },
  },
};

describe('BootstrapStore', () => {
  beforeEach(() => {
    useBootstrapStore.getState().clearBootstrap();
  });

  it('initializes with default empty state', () => {
    const state = useBootstrapStore.getState();
    expect(state.bootstrap).toBeNull();
    expect(state.status).toBe('idle');
    expect(state.error).toBeNull();
    expect(state.isStale).toBe(false);
  });

  it('sets bootstrap snapshot atomically', () => {
    useBootstrapStore.getState().setBootstrap(mockBootstrapData);
    const state = useBootstrapStore.getState();

    expect(state.bootstrap).toEqual(mockBootstrapData);
    expect(state.status).toBe('ready');
    expect(state.lastFetchedAt).toBeGreaterThan(0);
    expect(state.lastSuccessfulFetchAt).toBeGreaterThan(0);
    expect(state.isStale).toBe(false);
  });

  it('updates usage snapshot without corrupting bootstrap context', () => {
    useBootstrapStore.getState().setBootstrap(mockBootstrapData);

    useBootstrapStore.getState().updateUsage({
      monthlyEvents: { limit: 1000000, used: 300000, remaining: 700000, percentage: 30 },
      aiCredits: { limit: 500, used: 150, remaining: 350, percentage: 30 },
    });

    const updatedUsage = useBootstrapStore.getState().bootstrap?.usage;
    expect(updatedUsage?.monthlyEvents.used).toBe(300000);
    expect(updatedUsage?.aiCredits.used).toBe(150);
  });

  it('clears bootstrap and persisted storage on logout', () => {
    useBootstrapStore.getState().setBootstrap(mockBootstrapData);
    expect(useBootstrapStore.getState().bootstrap).not.toBeNull();

    useBootstrapStore.getState().clearBootstrap();
    expect(useBootstrapStore.getState().bootstrap).toBeNull();
    expect(useBootstrapStore.getState().status).toBe('idle');
  });
});
