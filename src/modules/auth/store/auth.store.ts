import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { UserProfile } from '../types/auth.types';
import { useBootstrapStore } from '../../bootstrap/store/bootstrap.store';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  mfaVerified: boolean;
  stepUpFresh: boolean;
  hasHydrated: boolean;

  setAuth: (user: UserProfile) => void;
  setMfaVerified: (v: boolean) => void;
  setStepUpFresh: (v: boolean) => void;
  setHasHydrated: (v: boolean) => void;
  clearAuth: () => void;

  // Global Step-Up State
  stepUpPromise: { resolve: () => void; reject: (err: any) => void } | null;
  triggerStepUp: () => Promise<void>;
  resolveStepUp: () => void;
  rejectStepUp: (err: any) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      mfaVerified: false,
      stepUpFresh: false,
      hasHydrated: false,
      stepUpPromise: null,
      setAuth: (user) => set({ user, isAuthenticated: true, isAdmin: user.is_admin }),
      setMfaVerified: (mfaVerified) => set({ mfaVerified }),
      setStepUpFresh: (stepUpFresh) => set({ stepUpFresh }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      clearAuth: () => {
        try {
          useBootstrapStore.getState().clearBootstrap();
        } catch {
          // Ignore if store uninitialized
        }
        set({
          user: null,
          isAuthenticated: false,
          isAdmin: false,
          mfaVerified: false,
          stepUpFresh: false,
          stepUpPromise: null,
        });
      },
      triggerStepUp: () => new Promise<void>((resolve, reject) => {
        set({ stepUpPromise: { resolve, reject } });
      }),
      resolveStepUp: () => {
        const { stepUpPromise } = get();
        if (stepUpPromise) {
          stepUpPromise.resolve();
          set({ stepUpPromise: null, stepUpFresh: true });
        }
      },
      rejectStepUp: (err: any) => {
        const { stepUpPromise } = get();
        if (stepUpPromise) {
          stepUpPromise.reject(err);
          set({ stepUpPromise: null });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
        mfaVerified: state.mfaVerified,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    }
  )
);
