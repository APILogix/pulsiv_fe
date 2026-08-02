import { useRef } from 'react';
import { Outlet } from 'react-router';
import { AppErrorBoundary } from '@/shared/components/error-boundary/AppErrorBoundary';
import { PulseCommandPalette } from '@/modules/search/components/PulseCommandPalette';
import { useSearchShortcuts } from '@/modules/search/hooks/useSearchShortcuts';
import { AppHeader } from './AppHeader';
import { AppDualSidebar } from './AppDualSidebar';
import { PostLoginSetup } from '@/modules/auth/components/PostLoginSetup';
import { LoginMetricsTransition } from '@/modules/auth/components/LoginMetricsTransition';
import { RouteBoundary, ScrollToTop, useScrollRestoration } from '@/shared/motion';

const handleMenuClick = () => {
  window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'));
};

export function AppLayout() {
  useSearchShortcuts();

  // The single app scroll container. Owning the ref here lets scroll
  // restoration and the scroll-to-top affordance share one passive listener
  // instead of each mounting their own.
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollRestoration(scrollRef);

  return (
    <div
      id="sentinel-root"
      className="flex h-screen overflow-hidden w-full bg-[var(--bg)] font-sans relative z-0"
    >
      {/* §3 — app canvas ambient field (brand + AI radial wash) */}
      <div className="sentinel-ambient" aria-hidden="true" />
      <AppDualSidebar />
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden transition-opacity duration-200" id="main-content">
        <AppHeader onMenuClick={handleMenuClick} />
        <div
          ref={scrollRef}
          className="scroll-region flex-1 overflow-auto relative flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          <AppErrorBoundary>
            {/*
              Module-scoped boundary: keyed on the top-level module (or the
              active project), so switching modules paints that module's
              skeleton immediately, while navigating *within* a module leaves
              its layout — and its query cache subscriptions — mounted.
              Page-level skeletons are handled by ModuleLayout / SettingsLayout.

              The wrapper keeps `flex-1 min-h-0 flex flex-col` so child layouts
              that rely on `h-full` (ModuleLayout, ProjectShellPage) still
              resolve their height through the transition element.
            */}
            <RouteBoundary scope="module" padded className="flex min-h-0 w-full flex-1 flex-col">
              <Outlet />
            </RouteBoundary>
          </AppErrorBoundary>
        </div>
        <ScrollToTop targetRef={scrollRef} />
      </main>
      <PulseCommandPalette />
      <LoginMetricsTransition />
      <PostLoginSetup />
    </div>
  );
}
