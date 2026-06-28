import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSearchStore } from '@/modules/search/store/useSearchStore';

export function GlobalSearch() {
  const setOpen = useSearchStore((state) => state.setOpen);

  return (
    <Button
      variant="outline"
      className="relative h-8 w-8 md:w-[480px] md:justify-start rounded-[8px] bg-transparent text-sm text-muted-foreground border-border hover:bg-accent hover:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 px-0 md:px-3"
      onClick={() => setOpen(true)}
    >
      <Search className="h-4 w-4 md:mr-2" />
      <span className="hidden md:inline-flex">Search...</span>
      <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border border-border bg-card px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
}
