import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { tokenService } from '@/modules/auth/services/token.service';

interface OrgState {
  activeOrgId: string | null;
  activeOrgSlug: string | null;
  activeProjectId: string | null;
  activeProjectSlug: string | null;
  setActiveOrg: (org: { id: string; slug: string | null } | null) => void;
  setActiveOrgId: (id: string | null) => void;
  setActiveOrgSlug: (slug: string | null) => void;
  setActiveProjectId: (id: string | null) => void;
  setActiveProjectSlug: (slug: string | null) => void;
  clearOrgState: () => void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      activeOrgId: tokenService.getCurrentOrgId(),
      activeOrgSlug: tokenService.getCurrentOrgSlug(),
      activeProjectId: tokenService.getCurrentProjectId(),
      activeProjectSlug: tokenService.getCurrentProjectSlug(),
      setActiveOrg: (org) => {
        const id = org?.id ?? null;
        const slug = org?.slug ?? null;
        tokenService.setCurrentOrgId(id);
        tokenService.setCurrentOrgSlug(slug);
        tokenService.setCurrentProjectId(null);
        tokenService.setCurrentProjectSlug(null);
        set({
          activeOrgId: id,
          activeOrgSlug: slug,
          activeProjectId: null,
          activeProjectSlug: null,
        });
      },
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
      clearOrgState: () => {
        tokenService.setCurrentOrgId(null);
        tokenService.setCurrentOrgSlug(null);
        tokenService.setCurrentProjectId(null);
        tokenService.setCurrentProjectSlug(null);
        set({
          activeOrgId: null,
          activeOrgSlug: null,
          activeProjectId: null,
          activeProjectSlug: null,
        });
      },
    }),
    {
      name: 'org-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

