import { Suspense, useState } from "react";
import { Outlet, useMatches } from "react-router";
import { cn } from "@/lib/utils";
import { AuthCardSkeleton } from "@/shared/skeletons/AuthCardSkeleton";
import { AuthFocusContext, readAuthAside } from "./auth-shell";
import { AUTH_ASIDES, Wordmark } from "./auth-panels";

/**
 * Auth shell. Two shapes, chosen per route (design/auth/DESIGN.md):
 *
 * - Split (lg+): a panel whose figure answers that page's question, beside the
 *   form column. Only sign in, register, and SSO declare one.
 * - Focus: one centred 400px column under the wordmark, no panel at any width.
 *   Every mid-flow and status page uses it.
 *
 * Below lg both shapes are the same focused column. The Outlet keeps its tree
 * position across shapes, so a page that switches to focus mid-flow (the inline
 * second factor) keeps its state.
 */
export function AuthLayout() {
  const matches = useMatches();
  const [focused, setFocused] = useState(false);

  const routeAside = readAuthAside(matches[matches.length - 1]?.handle);
  const aside = focused ? null : routeAside;
  const Aside = aside ? AUTH_ASIDES[aside] : null;
  const split = Aside !== null;

  return (
    <AuthFocusContext.Provider value={setFocused}>
      <div
        id="sentinel-root"
        className={cn(
          "relative h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-[var(--bg)] font-sans text-[var(--text)] antialiased caret-[var(--text)] selection:bg-[var(--text)] selection:text-[var(--bg)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
          split && "lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(460px,1fr)]"
        )}
      >
        {Aside && <Aside key={aside} />}

        <main className="relative flex min-h-[100dvh] flex-col">
          <header
            className={cn(
              "absolute inset-x-0 top-0 flex items-center px-6 pt-6 sm:px-10 sm:pt-8",
              split && "lg:hidden"
            )}
          >
            <Wordmark />
          </header>

          {/* Symmetric clearance keeps the column on the true centre, not the
              centre of whatever the header leaves over. */}
          <div className={cn("flex flex-1 items-center justify-center px-6 py-24 sm:px-10", split && "lg:py-12")}>
            <div className="pulse-rise w-full max-w-[400px]">
              {/* Lazy pages resolve inside the shell so the panel never flashes away. */}
              <Suspense fallback={<AuthCardSkeleton />}>
                <Outlet />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </AuthFocusContext.Provider>
  );
}
