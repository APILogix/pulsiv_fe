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
      <AppDualSidebar />
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden transition-opacity duration-200" id="main-content">
        <AppHeader onMenuClick={handleMenuClick} />
        <div
          ref={scrollRef}
          className="scroll-region flex-1 overflow-auto relative flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          <AppErrorBoundary>
            <div className="flex min-h-0 w-full flex-1 flex-col">
              <Outlet />
            </div>
          </AppErrorBoundary>
        </div>
        <ScrollToTop targetRef={scrollRef} />
      </main>
      <LoginMetricsTransition />
      <PostLoginSetup />
      <Suspense fallback={null}>
        <PulseCommandPalette />
        <AiDrawer />
      </Suspense>
    </div>
  );
}
