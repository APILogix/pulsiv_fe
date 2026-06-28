import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { PageLoader } from '@/components/ui/PageLoader';
import { PulseCommandPalette } from '@/modules/search/components/PulseCommandPalette';
import { useSearchShortcuts } from '@/modules/search/hooks/useSearchShortcuts';
import { AppHeader } from './AppHeader';
import { AppDualSidebar } from './AppDualSidebar';
export function AppLayout() {
  useSearchShortcuts();

  return (
    <div className="flex min-h-screen w-full bg-[var(--bg)] font-sans">
      <AppDualSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden transition-opacity duration-200" id="main-content">
        <AppHeader />
        <div className="flex-1 overflow-auto relative flex flex-col">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <PulseCommandPalette />
    </div>
  );
}
