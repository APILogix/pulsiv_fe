import { create } from 'zustand';

export type SearchGroup =
  | 'Navigation'
  | 'Observability'
  | 'Projects'
  | 'Alerts'
  | 'Ingestion'
  | 'AI Ops'
  | 'Administration'
  | 'Billing'
  | 'Settings'
  | 'Actions';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  group: SearchGroup;
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

interface SearchState {
  isOpen: boolean;
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setQuery: (query: string) => void;
  setResults: (results: SearchResult[]) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  isOpen: false,
  query: '',
  results: [],
  isLoading: false,
  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));
