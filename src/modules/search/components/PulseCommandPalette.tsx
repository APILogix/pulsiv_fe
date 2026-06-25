import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  Command,
} from '@/components/ui/command';
import { useSearchStore } from '../store/useSearchStore';
import type { SearchResult } from '../store/useSearchStore';
import { Search, Loader2 } from 'lucide-react';
import { mainNavigation } from '@/app/navigation/navigation';

export function PulseCommandPalette() {
  const navigate = useNavigate();
  const { isOpen, setOpen, query, setQuery, isLoading, results } = useSearchStore();

  // Mock search effect to simulate API delay
  useEffect(() => {
    if (!query) {
      useSearchStore.getState().setResults([]);
      return;
    }

    useSearchStore.getState().setIsLoading(true);
    const timer = setTimeout(() => {
      const groupMap: Record<string, SearchResult['group']> = {
        Overview: 'Navigation',
        Observability: 'Observability',
        Projects: 'Projects',
        Alerts: 'Alerts',
        Ingestion: 'Ingestion',
        'AI Ops': 'AI Ops',
        Administration: 'Administration',
        Billing: 'Billing',
        Settings: 'Settings',
      };

      const navResults: SearchResult[] = mainNavigation.flatMap((item) => {
        const normalizedGroup = groupMap[item.label] ?? 'Navigation';
        const base: SearchResult[] = [
          {
            id: item.path,
            title: item.label,
            subtitle: item.description,
            group: normalizedGroup,
            onSelect: () => navigate(item.path),
          },
        ];

        const children = (item.children ?? []).map<SearchResult>((child) => ({
          id: child.path,
          title: child.label,
          subtitle: child.description,
          group: normalizedGroup,
          onSelect: () => navigate(child.path),
        }));

        return [...base, ...children];
      });

      const allResults: SearchResult[] = [
        ...navResults,
        { id: 'settings', title: 'Settings', subtitle: 'Organization configuration workspace', group: 'Settings', onSelect: () => navigate('/settings') },
        { id: 'security', title: 'Security Center', subtitle: 'User security controls and verification', group: 'Settings', onSelect: () => navigate('/auth/security'), shortcut: 'G S' },
      ];

      const filtered = allResults.filter(
        (r) =>
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.group.toLowerCase().includes(query.toLowerCase()) ||
          r.subtitle?.toLowerCase().includes(query.toLowerCase())
      );
      
      useSearchStore.getState().setResults(filtered);
      useSearchStore.getState().setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, navigate]);

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <Command shouldFilter={false} className="border-none shadow-none">
        <CommandInput
          placeholder="Search navigation, observability, billing, settings..."
          value={query}
          onValueChange={setQuery}
          className="text-foreground"
        />
        <CommandList className="bg-card border-border text-foreground">
          {isLoading && (
            <div className="p-4 flex items-center justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}
          {!isLoading && results.length === 0 && query && (
            <CommandEmpty>
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <Search className="mb-4 h-8 w-8 opacity-20" />
                <p>No results found for "{query}"</p>
                <p className="text-xs mt-1">Try searching for "Observability", "Billing", or "Members"</p>
              </div>
            </CommandEmpty>
          )}
          
          {!isLoading && !query && (
            <CommandEmpty>
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <Search className="mb-4 h-8 w-8 opacity-20" />
                <p>Start typing to search across Pulse.</p>
              </div>
            </CommandEmpty>
          )}

          {/* In a real app, we'd group by `result.group` dynamically */}
          {!isLoading && results.length > 0 && (
            <>
              <CommandGroup heading="Results">
                {results.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.id}
                    onSelect={() => {
                      result.onSelect();
                      setOpen(false);
                    }}
                    className="focus:bg-accent focus:text-primary cursor-pointer flex justify-between items-center"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-[13px]">{result.title}</span>
                      {result.subtitle && <span className="text-[11px] text-muted-foreground">{result.subtitle}</span>}
                      <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{result.group}</span>
                    </div>
                    {result.shortcut && <CommandShortcut>{result.shortcut}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
