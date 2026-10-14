import { lazy, Suspense, useRef } from 'react';
import { Outlet } from 'react-router';
import { AppErrorBoundary } from '@/shared/components/error-boundary/AppErrorBoundary';
import { useSearchShortcuts } from '@/modules/search/hooks/useSearchShortcuts';
import { AppHeader } from './AppHeader';
import { AppDualSidebar } from './AppDualSidebar';
import { PostLoginSetup } from '@/modules/auth/components/PostLoginSetup';
import { LoginMetricsTransition } from '@/modules/auth/components/LoginMetricsTransition';
import { ScrollToTop, useScrollRestoration } from '@/shared/motion';

const PulseCommandPalette = lazy(() =>
  import('@/modules/search/components/PulseCommandPalette').then((m) => ({ default: m.PulseCommandPalette }))
);
const AiDrawer = lazy(() =>
  import('@/modules/ai/components/AiDrawer').then((m) => ({ default: m.AiDrawer }))
);

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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:bg-[var(--brand)] focus:text-[var(--brand-fg)] focus:rounded-[var(--radius)] focus:text-xs focus:font-semibold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-glow)]"
      >
        Skip to main content
      </a>
      <AppDualSidebar />
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden transition-opacity duration-200">
        <AppHeader onMenuClick={handleMenuClick} />
        <main
          id="main-content"
          tabIndex={-1}
          ref={scrollRef}
          className="scroll-region flex-1 overflow-auto relative flex flex-col focus:outline-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          <AppErrorBoundary>
            <div className="flex min-h-0 w-full flex-1 flex-col">
              <Outlet />
            </div>
          </AppErrorBoundary>
        </main>
        <ScrollToTop targetRef={scrollRef} />
      </div>
      <LoginMetricsTransition />
      <PostLoginSetup />
      <Suspense fallback={null}>
        <PulseCommandPalette />
        <AiDrawer />
      </Suspense>
    </div>
  );
}
