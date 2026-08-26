import { useNavigate } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, Check, Plus, Loader2, Building2 } from 'lucide-react';
import { useOrganizations } from '@/modules/organizations/hooks/useOrganizations';
import { orgApi } from '@/modules/organizations/api/org.api';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { orgRoutes } from '@/app/router/org-routes';

export function OrgSwitcher() {
  const { organizations, activeOrgId, setActiveOrgId, setActiveOrgSlug, isLoading } = useOrganizations();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);

  const activeOrg = organizations.find((org) => org.id === activeOrgId);
  const switchOrg = async (orgId: string) => {
    if (orgId === activeOrgId) return;
    setSwitchingOrgId(orgId);
    try {
      await orgApi.switchOrganization(orgId);
      const targetOrg = organizations.find((o) => o.id === orgId);
      setActiveOrgId(orgId);
      if (targetOrg) {
        setActiveOrgSlug(targetOrg.slug);
      }
      // Invalidate all organization and project scoped queries so no stale data leaks
      await queryClient.invalidateQueries();
      setSwitchingOrgId(null);
      if (targetOrg?.slug) {
        navigate(orgRoutes.dashboard(targetOrg.slug), { replace: true });
      }
    } catch {
      setSwitchingOrgId(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="group flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 h-8 sm:h-9 text-[var(--text)] hover:bg-[var(--bg2)] hover:border-[var(--border2)] border border-[var(--border)] bg-[var(--bg2)]/50 rounded-[var(--radius)] text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)] shrink min-w-0"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="size-3.5 animate-spin text-[var(--text3)] shrink-0" />
          ) : (
            <>
              <div className="flex size-5 items-center justify-center rounded-[4px] bg-[var(--brand-bg)] font-mono text-[10px] font-semibold uppercase text-[var(--brand)] ring-1 ring-inset ring-[var(--brand)]/20 shrink-0">
                {activeOrg?.name?.charAt(0) || 'O'}
              </div>
              <span className="font-medium text-[12px] sm:text-[13px] truncate max-w-[70px] xs:max-w-[100px] sm:max-w-[130px] md:max-w-[150px] lg:max-w-[180px]">
                {activeOrg?.name || 'Select org'}
              </span>
              <ChevronsUpDown className="size-3.5 text-[var(--text3)] group-hover:text-[var(--text2)] shrink-0 transition-colors" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px] p-1">
        <DropdownMenuLabel className="px-2 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">
          Organizations
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[var(--border)] -mx-1 my-1" />

        <div className="max-h-[260px] overflow-y-auto space-y-0.5">
          {organizations.map((org) => {
            const isSelected = activeOrgId === org.id;
            return (
              <DropdownMenuItem
                key={org.id}
                onClick={() => void switchOrg(org.id)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)] cursor-pointer text-[13px] hover:bg-[var(--bg2)] text-[var(--text)] focus:bg-[var(--bg2)] focus:text-[var(--text)] transition-colors"
              >
                <div className="flex size-5 items-center justify-center rounded-[4px] bg-[var(--bg3)] font-mono text-[10px] font-medium uppercase text-[var(--text2)] shrink-0">
                  {org.name?.charAt(0) || 'O'}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate text-[13px] font-medium leading-tight text-[var(--text)]">
                    {org.name}
                  </span>
                  <span className="truncate font-mono text-[10px] text-[var(--text3)] leading-tight">
                    {org.slug}
                  </span>
                </div>
                {switchingOrgId === org.id ? (
                  <Loader2 className="size-3.5 animate-spin text-[var(--text3)] shrink-0 ml-auto" />
                ) : isSelected ? (
                  <Check className="size-3.5 text-[var(--brand)] shrink-0 ml-auto" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator className="bg-[var(--border)] -mx-1 my-1" />
        <DropdownMenuItem 
          onClick={() => navigate('/onboarding/organization')} 
          className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] cursor-pointer text-[12px] sm:text-[13px] font-medium text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)] group transition-colors"
        >
          <Plus className="size-3.5 text-[var(--text3)] group-hover:text-[var(--brand)] shrink-0 transition-colors" />
          <span>Create organization</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

