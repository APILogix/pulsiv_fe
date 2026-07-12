import { create } from 'zustand';

interface SidebarStore {
  hasInnerItems: boolean;
  setHasInnerItems: (val: boolean) => void;
  isFlyoutOpen: boolean;
  setIsFlyoutOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  hasInnerItems: false,
  setHasInnerItems: (val: boolean) => set({ hasInnerItems: val }),
  isFlyoutOpen: true,
  setIsFlyoutOpen: (val) => set((state) => ({ isFlyoutOpen: typeof val === 'function' ? val(state.isFlyoutOpen) : val })),
}));
