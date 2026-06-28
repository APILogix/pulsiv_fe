import { useEffect, useMemo } from 'react';
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

  // Pre-compute the flattened navigation array once rather than on every keystroke
  const allSearchItems = useMemo(() => {
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

    return [
      ...navResults,
      { id: 'settings', title: 'Settings', subtitle: 'Organization configuration workspace', group: 'Settings', onSelect: () => navigate('/settings') },
      { id: 'security', title: 'Security Center', subtitle: 'User security controls and verification', group: 'Settings', onSelect: () => navigate('/auth/security'), shortcut: 'G S' },
    ];
  }, [navigate]);

  // Filter the pre-computed list on keystroke
  useEffect(() => {
    if (!query) {
      useSearchStore.getState().setResults([]);
      return;
    }

    useSearchStore.getState().setIsLoading(true);
    const timer = setTimeout(() => {

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
  }, [query, navigate]);

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen} className="top-[120px] translate-y-0 sm:max-w-[600px] bg-[#141414] border-[#2a2a2a] p-0 shadow-2xl overflow-hidden rounded-[12px] data-[state=open]:zoom-in-98 data-[state=open]:duration-150 data-[state=closed]:duration-150">
      <Command shouldFilter={false} className="border-none shadow-none bg-transparent">
        <div className="flex items-center border-b border-[#1f1f1f] px-4" cmdk-input-wrapper="">
          <Search className="mr-3 h-5 w-5 shrink-0 text-[#5C5F66]" />
          <CommandPrimitive.Input
            placeholder="Search by trace ID, log query, or dashboard..."
            value={query}
            onValueChange={setQuery}
            className="flex h-[56px] w-full rounded-md bg-transparent py-3 text-[15px] outline-none placeholder:text-[#5C5F66] disabled:cursor-not-allowed disabled:opacity-50 text-[#e8e8e8] font-normal"
          />
        </div>
        <CommandList className="bg-transparent text-foreground max-h-[400px] p-2">
          {isLoading && (
            <div className="p-4 flex items-center justify-center text-[#8A8F98] text-[13px] gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}
          
          {!isLoading && results.length === 0 && query && (
            <CommandEmpty>
              <div className="flex flex-col items-center justify-center py-6 text-center text-[#8A8F98]">
                <Search className="mb-4 h-8 w-8 opacity-20" />
                <p className="text-[13px]">No results found for "{query}"</p>
              </div>
            </CommandEmpty>
          )}

          {/* Default state when no query is typed */}
          {!isLoading && !query && (
            <div className="py-1">
              <CommandGroup heading="RECENT SEARCHES" className="text-[#5C5F66] font-semibold text-[10px] uppercase tracking-[0.08em] px-3 py-2">
                <CommandItem onSelect={() => setQuery('status:500 AND service:payment-api')} className="flex items-center gap-3 py-[8px] px-3 cursor-pointer text-[#8A8F98] data-[selected=true]:text-white data-[selected=true]:bg-[#1f1f1f] rounded-[6px] transition-all duration-100 group">
                  <span className="text-[#5C5F66] font-mono text-[12px] group-data-[selected=true]:text-[#10b981] transition-colors">{'>'}</span>
                  <span className="text-[12px] font-normal uppercase tracking-wide">status:500 AND service:payment-api</span>
                </CommandItem>
                <CommandItem onSelect={() => setQuery('tr_8f2a9b1c')} className="flex items-center gap-3 py-[8px] px-3 cursor-pointer text-[#8A8F98] data-[selected=true]:text-white data-[selected=true]:bg-[#1f1f1f] rounded-[6px] transition-all duration-100 group">
                  <span className="text-[#5C5F66] font-mono text-[12px] group-data-[selected=true]:text-[#10b981] transition-colors">{'>'}</span>
                  <span className="text-[12px] font-normal uppercase tracking-wide">tr_8f2a9b1c</span>
                </CommandItem>
              </CommandGroup>

              <CommandGroup heading="QUICK ACTIONS" className="text-[#5C5F66] font-semibold text-[10px] uppercase tracking-[0.08em] px-3 pb-2 pt-2">
                <CommandItem onSelect={() => { setOpen(false); navigate('/dashboard'); }} className="flex items-center gap-3 py-[8px] px-3 cursor-pointer text-[#8A8F98] data-[selected=true]:text-white data-[selected=true]:bg-[#1f1f1f] rounded-[6px] transition-all duration-100 group">
                  <LayoutDashboard className="h-[15px] w-[15px] text-[#5C5F66] group-data-[selected=true]:text-[#10b981] transition-colors" />
                  <span className="text-[12px] font-normal uppercase tracking-wide">Go to API Performance Dashboard</span>
                </CommandItem>
                <CommandItem onSelect={() => { setOpen(false); navigate('/admin/members'); }} className="flex items-center gap-3 py-[8px] px-3 cursor-pointer text-[#8A8F98] data-[selected=true]:text-white data-[selected=true]:bg-[#1f1f1f] rounded-[6px] transition-all duration-100 group">
                  <UserPlus className="h-[15px] w-[15px] text-[#5C5F66] group-data-[selected=true]:text-[#10b981] transition-colors" />
                  <span className="text-[12px] font-normal uppercase tracking-wide">Invite a team member</span>
                </CommandItem>
              </CommandGroup>
            </div>
          )}

          {/* Search Results */}
          {!isLoading && results.length > 0 && query && (
            <div className="py-1">
              <CommandGroup heading="RESULTS" className="text-[#5C5F66] font-semibold text-[10px] uppercase tracking-[0.08em] px-3 py-2">
                {results.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.id}
                    onSelect={() => {
                      result.onSelect();
                      setOpen(false);
                    }}
                    className="data-[selected=true]:bg-[#1f1f1f] data-[selected=true]:text-white cursor-pointer flex justify-between items-center py-[8px] px-3 rounded-[6px] transition-all duration-100 group text-[#8A8F98]"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-normal text-[12px] text-[#8A8F98] group-data-[selected=true]:text-white transition-colors">{result.title}</span>
                      {result.subtitle && <span className="text-[11px] text-[#5C5F66]">{result.subtitle}</span>}
                      <span className="text-[9px] text-[#5C5F66] font-mono uppercase tracking-[0.08em]">{result.group}</span>
                    </div>
                    {result.shortcut && <CommandShortcut className="text-[#5C5F66] group-data-[selected=true]:text-[#10b981] transition-colors">{result.shortcut}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          )}
        </CommandList>
        <div className="flex items-center justify-start border-t border-[#222] px-4 py-3 bg-[#111] text-[12px] text-[#666] gap-5 font-sans rounded-b-xl">
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <kbd className="bg-[#1a1a1a] px-1.5 py-0.5 rounded-[4px] border border-[#2a2a2a] font-sans text-[11px] leading-none">↑</kbd>
              <kbd className="bg-[#1a1a1a] px-1.5 py-0.5 rounded-[4px] border border-[#2a2a2a] font-sans text-[11px] leading-none">↓</kbd>
            </span>
            to navigate
          </span>
          <span className="flex items-center gap-2">
            <kbd className="bg-[#1a1a1a] px-1.5 py-0.5 rounded-[4px] border border-[#2a2a2a] font-sans text-[11px] leading-none">Enter</kbd> to select
          </span>
          <span className="flex items-center gap-2">
            <kbd className="bg-[#1a1a1a] px-1.5 py-0.5 rounded-[4px] border border-[#2a2a2a] font-sans text-[11px] leading-none">Esc</kbd> to close
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
