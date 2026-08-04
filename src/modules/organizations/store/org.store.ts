import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { tokenService } from '@/modules/auth/services/token.service';

interface OrgState {
  activeOrgId: string | null;
  activeOrgSlug: string | null;
  setActiveOrgId: (id: string | null) => void;
  setActiveOrgSlug: (slug: string | null) => void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      activeOrgId: tokenService.getCurrentOrgId(),
      activeOrgSlug: tokenService.getCurrentOrgSlug(),
      setActiveOrgId: (id) => {
        tokenService.setCurrentOrgId(id);
        set({ activeOrgId: id });
      },
      setActiveOrgSlug: (slug) => {
        tokenService.setCurrentOrgSlug(slug);
        set({ activeOrgSlug: slug });
      },
    }),
    {
      name: 'org-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
