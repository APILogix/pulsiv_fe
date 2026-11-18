import { create } from 'zustand';

interface SidebarStore {
  hasInnerItems: boolean;
  setHasInnerItems: (val: boolean) => void;
  isFlyoutOpen: boolean;
  setIsFlyoutOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  hasInnerItems: false,
  setHasInnerItems: (val: boolean) =>
    set((state) => (state.hasInnerItems === val ? state : { hasInnerItems: val })),
  isFlyoutOpen: true,
  setIsFlyoutOpen: (val) =>
    set((state) => {
      const nextVal = typeof val === 'function' ? val(state.isFlyoutOpen) : val;
      return state.isFlyoutOpen === nextVal ? state : { isFlyoutOpen: nextVal };
    }),
}));
