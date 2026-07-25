import { Outlet, useLocation, Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

import { findAvatarMenuItem } from './AppHeader/AvatarDropdown';

export default function SettingsLayout() {
  const location = useLocation();
  const breadcrumb = findAvatarMenuItem(location.pathname);

  return (
    <div className="flex-1 overflow-y-auto">
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
        <Outlet />
      </div>
    </div>
  );
}
