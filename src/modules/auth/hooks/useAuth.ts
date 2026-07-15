import { useAuthStore } from '../store/auth.store';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const mfaVerified = useAuthStore((state) => state.mfaVerified);
  return { user, isAuthenticated, isAdmin, mfaVerified };
}
