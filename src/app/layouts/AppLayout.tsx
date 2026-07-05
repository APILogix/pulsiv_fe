import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { AppErrorBoundary } from '@/shared/components/error-boundary/AppErrorBoundary';
import { PageLoader } from '@/components/ui/PageLoader';
import { PulseCommandPalette } from '@/modules/search/components/PulseCommandPalette';
import { useSearchShortcuts } from '@/modules/search/hooks/useSearchShortcuts';
import { AppHeader } from './AppHeader';
import { AppDualSidebar } from './AppDualSidebar';
export function AppLayout() {
  useSearchShortcuts();

  const handleMenuClick = () => {
    window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'));
  };

  return (
    <div className="flex min-h-screen w-full bg-[var(--bg)] font-sans">
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
    </div>
  );
}
