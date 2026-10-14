import { createContext, useContext, useLayoutEffect } from "react";

/**
 * Auth shell contract (see design/auth/DESIGN.md).
 *
 * A route earns the split layout by naming the figure that answers its own
 * question. Routes that name none render the focused single column: no panel
 * at any width. Mid-flow and status pages (second factor, callback, recovery,
 * link confirmations, invites) stay focused on purpose.
 */
export type AuthAside =
  /** Sign in: the latency trace crossing its budget. */
  | "signal"
  /** Register: the real path from account to first event. */
  | "setup"
  /** SSO: the round trip through the identity provider. */
  | "handoff";

export interface AuthShellHandle {
  authAside?: AuthAside;
}

/** Route `handle` for an auth page that shows a side panel. */
export function withAuthAside(authAside: AuthAside): AuthShellHandle {
  return { authAside };
}

export function readAuthAside(handle: unknown): AuthAside | null {
  return (handle as AuthShellHandle | undefined)?.authAside ?? null;
}

export const AuthFocusContext = createContext<(focused: boolean) => void>(() => {});

/**
 * Drops the panel while a page shows a mid-flow step inside a route that
 * normally has one, such as the second factor the sign-in page renders inline.
 * Runs as a layout effect so the panel never paints before it is removed.
 */
export function useAuthFocus(focused: boolean) {
  const setFocused = useContext(AuthFocusContext);
  useLayoutEffect(() => {
    if (!focused) return;
    setFocused(true);
    return () => setFocused(false);
  }, [focused, setFocused]);
}
