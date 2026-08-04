import { useRef } from 'react';
import { Outlet, useLocation, Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

import { findAvatarMenuItem } from './AppHeader/AvatarDropdown';
import { RouteBoundary, useScrollRestoration } from '@/shared/motion';

export default function SettingsLayout() {
  const location = useLocation();
  const breadcrumb = findAvatarMenuItem(location.pathname);
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollRestoration(scrollRef);

  return (
    <div ref={scrollRef} className="scroll-region flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-6 text-left md:px-8 xl:px-10">
        {breadcrumb && (
          <nav className="mb-5 flex items-center gap-1 text-[12px] text-[var(--text3)]" aria-label="Breadcrumb">
            <Link to="/account/overview" className="cursor-pointer transition-colors hover:text-[var(--text2)] focus-visible:outline-none focus-visible:underline">
              Account
            </Link>
            <ChevronRight className="size-3" aria-hidden="true" />
            <Link to={breadcrumb.group.items[0].path} className="cursor-pointer transition-colors hover:text-[var(--text2)] focus-visible:outline-none focus-visible:underline">
              {breadcrumb.group.label}
            </Link>
            <ChevronRight className="size-3" aria-hidden="true" />
            <span className="font-medium text-[var(--text2)]" aria-current="page">
              {breadcrumb.item.label}
            </span>
          </nav>
        )}
        {/* Account panels are individually lazy-loaded, so each one gets its own
            settings-shaped skeleton rather than an empty column. */}
        <RouteBoundary scope="page">
          <Outlet />
        </RouteBoundary>
      </div>
    </div>
  );
}
