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
  environments: (id: string) => [...orgQueryKeys.detail(id), 'environments'] as const,
  apiKeys: (id: string) => [...orgQueryKeys.detail(id), 'apiKeys'] as const,
  settings: (id: string) => [...orgQueryKeys.detail(id), 'settings'] as const,
  billing: (id: string) => [...orgQueryKeys.detail(id), 'billing'] as const,
  sso: (id: string) => [...orgQueryKeys.detail(id), 'sso'] as const,
  scim: (id: string) => [...orgQueryKeys.detail(id), 'scim'] as const,
  scimTokens: (id: string) => [...orgQueryKeys.scim(id), 'tokens'] as const,
  securityEvents: (id: string) => [...orgQueryKeys.detail(id), 'securityEvents'] as const,
  auditLogs: (id: string) => [...orgQueryKeys.detail(id), 'auditLogs'] as const,
  quotaRequests: (id: string) => [...orgQueryKeys.detail(id), 'quotaRequests'] as const,
  invoices: (id: string) => [...orgQueryKeys.billing(id), 'invoices'] as const,
  paymentMethods: (id: string) => [...orgQueryKeys.billing(id), 'paymentMethods'] as const,
  promotions: (id: string) => [...orgQueryKeys.billing(id), 'promotions'] as const,
  sdkConfigs: (id: string) => [...orgQueryKeys.detail(id), 'sdkConfigs'] as const,
};

export function useOrganizations() {
  const { activeOrgId, setActiveOrgId } = useOrgStore();

  const query = useQuery({
    queryKey: orgQueryKeys.lists(),
    queryFn: () => orgApi.listOrganizations({ limit: 100 }), // Assume reasonable limit for switcher
  });

  // Auto-select first org if none is active
  useEffect(() => {
    if (!query.data?.data?.length || activeOrgId) return;

    const currentOrgId = tokenService.getCurrentOrgId();
    const currentOrg = query.data.data.find((org) => org.id === currentOrgId);
    const nextOrgId = currentOrg?.id ?? query.data.data[0].id;
    void orgApi.switchOrganization(nextOrgId)
      .catch(() => undefined)
      .finally(() => setActiveOrgId(nextOrgId));
  }, [query.data, activeOrgId, setActiveOrgId]);

  return {
    ...query,
    organizations: query.data?.data ?? [],
    activeOrgId,
    setActiveOrgId,
  };
}
