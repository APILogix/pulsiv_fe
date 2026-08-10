import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { tokenService } from '@/modules/auth/services/token.service';

interface OrgState {
  activeOrgId: string | null;
  activeOrgSlug: string | null;
  activeProjectId: string | null;
  activeProjectSlug: string | null;
  setActiveOrgId: (id: string | null) => void;
  setActiveOrgSlug: (slug: string | null) => void;
  setActiveProjectId: (id: string | null) => void;
  setActiveProjectSlug: (slug: string | null) => void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      activeOrgId: tokenService.getCurrentOrgId(),
      activeOrgSlug: tokenService.getCurrentOrgSlug(),
      activeProjectId: tokenService.getCurrentProjectId(),
      activeProjectSlug: tokenService.getCurrentProjectSlug(),
      setActiveOrgId: (id) => {
        tokenService.setCurrentOrgId(id);
        tokenService.setCurrentProjectId(null);
        tokenService.setCurrentProjectSlug(null);
        set({ activeOrgId: id, activeProjectId: null, activeProjectSlug: null });
      },
      setActiveOrgSlug: (slug) => {
        tokenService.setCurrentOrgSlug(slug);
        set({ activeOrgSlug: slug });
      },
      setActiveProjectId: (id) => {
        tokenService.setCurrentProjectId(id);
        set({ activeProjectId: id });
      },
      setActiveProjectSlug: (slug) => {
        tokenService.setCurrentProjectSlug(slug);
        set({ activeProjectSlug: slug });
      },
    }),
    {
      name: 'org-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
