import { useQuery } from '@tanstack/react-query';
import { orgApi } from '../api/org.api';
import { useOrgStore } from '../store/org.store';
import { useEffect, useCallback } from 'react';
import { tokenService } from '@/modules/auth/services/token.service';
import { useBootstrapOrganizations, bootstrapService } from '@/modules/bootstrap';

export const orgQueryKeys = {
  all: ['organizations'] as const,
  lists: () => [...orgQueryKeys.all, 'list'] as const,
  list: (params: any) => [...orgQueryKeys.lists(), params] as const,
  details: () => [...orgQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...orgQueryKeys.details(), id] as const,
  members: (id: string) => [...orgQueryKeys.detail(id), 'members'] as const,
  invitations: (id: string) => [...orgQueryKeys.detail(id), 'invitations'] as const,
  domains: (id: string) => [...orgQueryKeys.detail(id), 'domains'] as const,
  settings: (id: string) => [...orgQueryKeys.detail(id), 'settings'] as const,
  billing: (id: string) => [...orgQueryKeys.detail(id), 'billing'] as const,
  sso: (id: string) => [...orgQueryKeys.detail(id), 'sso'] as const,
  scim: (id: string) => [...orgQueryKeys.detail(id), 'scim'] as const,
  scimTokens: (id: string) => [...orgQueryKeys.scim(id), 'tokens'] as const,
  securityEvents: (id: string) => [...orgQueryKeys.detail(id), 'securityEvents'] as const,
  auditLogs: (id: string) => [...orgQueryKeys.detail(id), 'auditLogs'] as const,
  invoices: (id: string) => [...orgQueryKeys.billing(id), 'invoices'] as const,
  paymentMethods: (id: string) => [...orgQueryKeys.billing(id), 'paymentMethods'] as const,
  sdkConfigs: (id: string) => [...orgQueryKeys.detail(id), 'sdkConfigs'] as const,
};

export function useOrganizations() {
  const { activeOrgId, setActiveOrgId, activeOrgSlug, setActiveOrgSlug } = useOrgStore();
  const bootstrapOrgs = useBootstrapOrganizations();

  const query = useQuery({
    queryKey: orgQueryKeys.lists(),
    queryFn: () => orgApi.listOrganizations({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  // Prefer bootstrap store organizations, falling back to query data
  const rawOrgs = query.data?.data ?? [];
  const organizations = bootstrapOrgs.length > 0 ? bootstrapOrgs : rawOrgs;

  // Auto-select active org if none is active or sync activeOrgSlug
  useEffect(() => {
    if (!organizations.length) return;

    if (activeOrgId) {
      const currentOrg = organizations.find((org: any) => org.id === activeOrgId);
      if (currentOrg && currentOrg.slug !== activeOrgSlug) {
        setActiveOrgSlug(currentOrg.slug);
      }
      return;
    }

    const currentOrgId = tokenService.getCurrentOrgId();
    const currentOrg = organizations.find((org: any) => org.id === currentOrgId);
    const nextOrg = currentOrg ?? organizations[0];
    if (nextOrg) {
      setActiveOrgId(nextOrg.id);
      setActiveOrgSlug(nextOrg.slug);
    }
  }, [organizations, activeOrgId, activeOrgSlug, setActiveOrgId, setActiveOrgSlug]);

  const switchOrganization = useCallback(async (orgId: string) => {
    return bootstrapService.switchOrganization(orgId);
  }, []);

  return {
    ...query,
    organizations,
    activeOrgId,
    activeOrgSlug,
    setActiveOrgId,
    setActiveOrgSlug,
    switchOrganization,
  };
}
