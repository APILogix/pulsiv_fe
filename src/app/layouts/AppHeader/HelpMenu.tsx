import { HelpCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function HelpMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px] bg-popover border-border text-popover-foreground">
        <DropdownMenuLabel className="font-mono text-xs text-muted-foreground">
          Help & Resources
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-accent-foreground flex justify-between items-center group">
          <span>Documentation</span>
          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-accent-foreground flex justify-between items-center group">
          <span>Support</span>
          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-accent-foreground flex justify-between items-center group">
          <span>Status Page</span>
          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-accent-foreground justify-between flex items-center">
          <span>Keyboard Shortcuts</span>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex text-muted-foreground">
            ?
          </kbd>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
          Release Notes
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
