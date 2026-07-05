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

export function OrgSwitcher() {
  const { organizations, activeOrgId, setActiveOrgId, isLoading } = useOrganizations();
  const navigate = useNavigate();

  const activeOrg = organizations.find((org) => org.id === activeOrgId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 hover:bg-accent text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-accent h-9"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="flex h-5 w-5 items-center justify-center rounded-[4px] border border-border bg-transparent text-[11px] font-bold text-foreground uppercase">
                {activeOrg?.name?.charAt(0) || '?'}
              </div>
              <span className="font-semibold text-[14px] truncate max-w-[120px] md:max-w-[200px]">
                {activeOrg?.name || 'Select Org'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-70" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px] bg-popover border-border text-popover-foreground">
        <DropdownMenuLabel className="font-mono text-xs text-muted-foreground">
          Organizations
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => setActiveOrgId(org.id)}
            className="flex items-center justify-between cursor-pointer focus:bg-accent focus:text-accent-foreground"
          >
            <span>{org.name}</span>
            {activeOrgId === org.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem 
          onClick={() => navigate('/onboarding/organization')} 
          className="cursor-pointer focus:bg-accent focus:text-primary text-muted-foreground group"
        >
          <Plus className="h-4 w-4 mr-2 group-hover:text-primary" />
          Create Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
