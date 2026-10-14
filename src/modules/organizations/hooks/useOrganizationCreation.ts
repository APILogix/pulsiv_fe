import { useBootstrapStore, type BootstrapOwnedOrganization } from '@/modules/bootstrap';
import { useOrganizations } from './useOrganizations';

export interface OrganizationCreationState {
  /** Whether POST /organizations would accept a new organization from this user. */
  allowed: boolean;
  /** The organization the user owns, which is what blocks creation. */
  ownedOrganization: BootstrapOwnedOrganization | null;
  /** True until there is enough data to decide. */
  isResolving: boolean;
}

/**
 * Each account can own one organization; being a member, admin, or developer
 * elsewhere does not count. The backend's bootstrap flag is authoritative (it
 * also counts archived organizations). Without it, fall back to the owner role
 * in the organization list, which the backend keeps in sync with ownership.
 */
export function useOrganizationCreation(): OrganizationCreationState {
  const flag = useBootstrapStore((s) => s.bootstrap?.organizationCreation);
  const { organizations, isLoading } = useOrganizations();

  if (flag) {
    return { allowed: flag.allowed, ownedOrganization: flag.ownedOrganization, isResolving: false };
  }

  const owned = organizations.find((org) => org.role === 'owner');
  return {
    allowed: !owned,
    ownedOrganization: owned ? { id: owned.id, name: owned.name, slug: owned.slug, status: 'active' } : null,
    isResolving: isLoading && organizations.length === 0,
  };
}
