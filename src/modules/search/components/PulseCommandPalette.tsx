import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandShortcut,
  Command,
} from '@/components/ui/command';
import { Command as CommandPrimitive } from 'cmdk';
import { useSearchStore } from '../store/useSearchStore';
import type { SearchResult } from '../store/useSearchStore';
import { Search, Loader2, LayoutDashboard, UserPlus } from 'lucide-react';
import { mainNavigation } from '@/app/navigation/navigation';

export function PulseCommandPalette() {
  const navigate = useNavigate();
  const { isOpen, setOpen, query, setQuery, isLoading, results } = useSearchStore();

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

      const allSearchItems: SearchResult[] = [
        ...navResults,
        { id: 'account', title: 'Account', subtitle: 'Personal account overview and profile', group: 'Settings', onSelect: () => navigate('/account/overview') },
        { id: 'security', title: 'Security center', subtitle: 'User security controls and verification', group: 'Settings', onSelect: () => navigate('/account/overview'), shortcut: 'G S' },
      ];

      const lowerQuery = query.toLowerCase();
      const filtered = allSearchItems.filter(
        (r) =>
          r.title.toLowerCase().includes(lowerQuery) ||
          r.group.toLowerCase().includes(lowerQuery) ||
          r.subtitle?.toLowerCase().includes(lowerQuery)
      );
      
      useSearchStore.getState().setResults(filtered);
      useSearchStore.getState().setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [navigate, query]);

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen} className="top-[120px] translate-y-0 sm:max-w-[600px] border border-[var(--border2)] bg-[var(--bg1)] p-0 shadow-[var(--shadow-modal)] overflow-hidden rounded-[var(--radius-lg)] data-[state=open]:duration-150 data-[state=closed]:duration-150">
      <Command shouldFilter={false} className="border-none shadow-none bg-transparent">
        <div className="flex items-center border-b border-[var(--border)] px-4" cmdk-input-wrapper="">
          <Search className="mr-3 h-4 w-4 shrink-0 text-[var(--text3)]" />
          <CommandPrimitive.Input
            placeholder="Search by trace ID, log query, or dashboard"
            value={query}
            onValueChange={setQuery}
            className="flex h-[52px] w-full bg-transparent py-3 text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text3)] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <CommandList className="max-h-[400px] bg-transparent p-2 text-[var(--text)]">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 p-4 text-[13px] text-[var(--text3)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          )}
          
          {!isLoading && results.length === 0 && query && (
            <CommandEmpty>
              <div className="flex flex-col items-center justify-center py-6 text-center text-[var(--text3)]">
                <Search className="mb-4 h-8 w-8 opacity-30" />
                <p className="text-[13px]">No results for “{query}”</p>
              </div>
            </CommandEmpty>
          )}

          {/* Default state when no query is typed */}
          {!isLoading && !query && (
            <div className="py-1">
              <CommandGroup heading="Recent searches">
                <CommandItem onSelect={() => setQuery('status:500 AND service:payment-api')} className="group gap-3 py-2">
                  <span className="font-mono text-[12px] text-[var(--text3)] transition-colors group-data-[selected=true]:text-[var(--brand)]">{'>'}</span>
                  <span className="font-mono text-[12px]">status:500 AND service:payment-api</span>
                </CommandItem>
                <CommandItem onSelect={() => setQuery('tr_8f2a9b1c')} className="group gap-3 py-2">
                  <span className="font-mono text-[12px] text-[var(--text3)] transition-colors group-data-[selected=true]:text-[var(--brand)]">{'>'}</span>
                  <span className="font-mono text-[12px]">tr_8f2a9b1c</span>
                </CommandItem>
              </CommandGroup>

              <CommandGroup heading="Quick actions">
                <CommandItem onSelect={() => { setOpen(false); navigate('/dashboard'); }} className="group gap-3 py-2">
                  <LayoutDashboard className="size-[15px] text-[var(--text3)] transition-colors group-data-[selected=true]:text-[var(--brand)]" />
                  <span className="text-[13px]">Go to API performance dashboard</span>
                </CommandItem>
                <CommandItem onSelect={() => { setOpen(false); navigate('/admin/members'); }} className="group gap-3 py-2">
                  <UserPlus className="size-[15px] text-[var(--text3)] transition-colors group-data-[selected=true]:text-[var(--brand)]" />
                  <span className="text-[13px]">Invite a team member</span>
                </CommandItem>
              </CommandGroup>
            </div>
          )}

          {/* Search Results */}
          {!isLoading && results.length > 0 && query && (
            <div className="py-1">
              <CommandGroup heading="Results">
                {results.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.id}
                    onSelect={() => {
                      result.onSelect();
                      setOpen(false);
                    }}
                    className="group flex items-center justify-between py-2"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-medium text-[var(--text)]">{result.title}</span>
                      {result.subtitle && <span className="text-[12px] text-[var(--text2)]">{result.subtitle}</span>}
                      <span className="font-mono text-[9px] uppercase tracking-[0.09em] text-[var(--text3)]">{result.group}</span>
                    </div>
                    {result.shortcut && <CommandShortcut>{result.shortcut}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          )}
        </CommandList>
        <div className="flex items-center justify-start gap-5 border-t border-[var(--border)] bg-[var(--bg2)] px-4 py-3 text-[12px] text-[var(--text3)]">
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <kbd className="rounded-[4px] border border-[var(--border2)] bg-[var(--bg3)] px-1.5 py-0.5 font-mono text-[10px] leading-none">↑</kbd>
              <kbd className="rounded-[4px] border border-[var(--border2)] bg-[var(--bg3)] px-1.5 py-0.5 font-mono text-[10px] leading-none">↓</kbd>
            </span>
            to navigate
          </span>
          <span className="flex items-center gap-2">
            <kbd className="rounded-[4px] border border-[var(--border2)] bg-[var(--bg3)] px-1.5 py-0.5 font-mono text-[10px] leading-none">Enter</kbd> to select
          </span>
          <span className="flex items-center gap-2">
            <kbd className="rounded-[4px] border border-[var(--border2)] bg-[var(--bg3)] px-1.5 py-0.5 font-mono text-[10px] leading-none">Esc</kbd> to close
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
