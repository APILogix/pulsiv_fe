import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, Check, Plus } from 'lucide-react';


// Mock data for now
const organizations = [
  { id: '1', name: 'Acme Corp', role: 'Owner' },
  { id: '2', name: 'Stark Industries', role: 'Admin' },
  { id: '3', name: 'Wayne Enterprises', role: 'Member' },
];

export function OrgSwitcher() {
  const [activeOrgId, setActiveOrgId] = useState(organizations[0].id);

  const activeOrg = organizations.find((org) => org.id === activeOrgId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 hover:bg-accent text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-accent"
        >
          <span className="font-semibold text-sm truncate max-w-[120px] md:max-w-[200px]">
            {activeOrg?.name}
          </span>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
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
        <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-primary text-muted-foreground group">
          <Plus className="h-4 w-4 mr-2 group-hover:text-primary" />
          Create Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
