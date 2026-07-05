import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface OrgState {
  activeOrgId: string | null;
  setActiveOrgId: (id: string | null) => void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      activeOrgId: null,
      setActiveOrgId: (id) => set({ activeOrgId: id }),
    }),
    {
      name: 'org-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
