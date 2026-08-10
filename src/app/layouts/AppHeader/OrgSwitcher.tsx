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
import { ChevronDown, Check, Plus, Loader2 } from 'lucide-react';
import { useOrganizations } from '@/modules/organizations/hooks/useOrganizations';
import { orgApi } from '@/modules/organizations/api/org.api';
import { useState } from 'react';

export function OrgSwitcher() {
  const { organizations, activeOrgId, setActiveOrgId, setActiveOrgSlug, isLoading } = useOrganizations();
  const navigate = useNavigate();
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
      setSwitchingOrgId(null);
    } catch {
      setSwitchingOrgId(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-1.5 px-1.5 sm:px-2 h-8 sm:h-9 text-[var(--text)] hover:bg-[var(--bg2)] focus-visible:ring-0 focus-visible:ring-offset-0 shrink min-w-0"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text3)] shrink-0" />
          ) : (
            <>
              <div className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-[4px] border border-[var(--border)] bg-transparent font-mono text-[9px] sm:text-[10px] font-medium uppercase text-[var(--text2)] shrink-0">
                {activeOrg?.name?.charAt(0) || '?'}
              </div>
              <span className="font-semibold text-[12px] sm:text-[13px] truncate max-w-[65px] xs:max-w-[95px] sm:max-w-[130px] md:max-w-[150px] lg:max-w-[180px]">
                {activeOrg?.name || 'Select org'}
              </span>
              <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[var(--text3)] shrink-0" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
          onClick={() => void switchOrg(org.id)}
          className="flex items-center justify-between cursor-pointer"
        >
          <span>{org.name}</span>
            {switchingOrgId === org.id ? (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--text3)]" />
            ) : activeOrgId === org.id ? (
              <Check className="h-4 w-4 text-[var(--brand)]" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => navigate('/onboarding/organization')} 
          className="cursor-pointer text-[var(--text2)] group"
        >
          <Plus className="h-4 w-4 mr-2 group-hover:text-[var(--brand)]" />
          Create organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
