import { useQuery } from '@tanstack/react-query';
import { orgApi } from '../api/org.api';
import { useOrgStore } from '../store/org.store';
import { useEffect } from 'react';
import { tokenService } from '@/modules/auth/services/token.service';

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

  const query = useQuery({
    queryKey: orgQueryKeys.lists(),
    queryFn: () => orgApi.listOrganizations({ limit: 100 }), // Assume reasonable limit for switcher
  });

  // Auto-select first org if none is active, or ensure activeOrgSlug is synced with activeOrgId
  useEffect(() => {
    if (!query.data?.data?.length) return;

    const orgs = query.data.data;
    if (activeOrgId) {
      const currentOrg = orgs.find((org) => org.id === activeOrgId);
      if (currentOrg) {
        if (currentOrg.slug !== activeOrgSlug) {
          setActiveOrgSlug(currentOrg.slug);
        }
        return;
      }
    }

    const currentOrgId = tokenService.getCurrentOrgId();
    const currentOrg = orgs.find((org) => org.id === currentOrgId);
    const nextOrg = currentOrg ?? orgs[0];
    void orgApi.switchOrganization(nextOrg.id)
      .catch(() => undefined)
      .finally(() => {
        setActiveOrgId(nextOrg.id);
        setActiveOrgSlug(nextOrg.slug);
      });
  }, [query.data, activeOrgId, activeOrgSlug, setActiveOrgId, setActiveOrgSlug]);

  return {
    ...query,
    organizations: query.data?.data ?? [],
    activeOrgId,
    activeOrgSlug,
    setActiveOrgId,
    setActiveOrgSlug,
  };
}

