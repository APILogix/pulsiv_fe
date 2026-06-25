import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '../types/auth.types';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  mfaVerified: boolean;
  stepUpFresh: boolean;

  setAuth: (user: UserProfile) => void;
  setMfaVerified: (v: boolean) => void;
  setStepUpFresh: (v: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      mfaVerified: false,
      stepUpFresh: false,
      setAuth: (user) => set({ user, isAuthenticated: true, isAdmin: user.is_admin }),
      setMfaVerified: (mfaVerified) => set({ mfaVerified }),
      setStepUpFresh: (stepUpFresh) => set({ stepUpFresh }),
      clearAuth: () => set({ user: null, isAuthenticated: false, isAdmin: false, mfaVerified: false, stepUpFresh: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
        mfaVerified: state.mfaVerified,
      }),
    }
  )
);
