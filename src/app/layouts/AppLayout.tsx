import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { AppErrorBoundary } from '@/shared/components/error-boundary/AppErrorBoundary';
import { PageLoader } from '@/components/ui/PageLoader';
import { PulseCommandPalette } from '@/modules/search/components/PulseCommandPalette';
import { useSearchShortcuts } from '@/modules/search/hooks/useSearchShortcuts';
import { AppHeader } from './AppHeader';
import { AppDualSidebar } from './AppDualSidebar';
import { PostLoginSetup } from '@/modules/auth/components/PostLoginSetup';
import { LoginMetricsTransition } from '@/modules/auth/components/LoginMetricsTransition';
const handleMenuClick = () => {
  window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'));
};

export function AppLayout() {
  useSearchShortcuts();



  return (
    <div className="flex min-h-screen w-full bg-[var(--bg)] font-sans relative z-0">
      <div className="fixed inset-0 pointer-events-none -z-10" style={{ background: 'radial-gradient(1200px 600px at 80% -10%, var(--brand-bg) 0%, transparent 60%), radial-gradient(900px 500px at -10% 110%, var(--ai-bg) 0%, transparent 55%)' }} />
      <AppDualSidebar />
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden transition-opacity duration-200" id="main-content">
        <AppHeader onMenuClick={handleMenuClick} />
        <div className="flex-1 overflow-auto relative flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <AppErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </AppErrorBoundary>
        </div>
      </main>
      <PulseCommandPalette />
      <LoginMetricsTransition />
      <PostLoginSetup />
    </div>
  );
}
