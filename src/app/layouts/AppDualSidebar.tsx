import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import {
  Activity,
  Cable,
  ChevronRight,
  FileText,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Settings,
  Users,
} from 'lucide-react';
import clsx from 'clsx';

import {
  mainNavigation,
  type MainNavItem,
  type ModuleNavItem,
} from '@/app/navigation/navigation';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useLogout } from '@/modules/auth/hooks/useLogout';
import { useOrganizations } from '@/modules/organizations/hooks/useOrganizations';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useTheme } from '@/theme';

import { PrimaryRail } from './PrimaryRail';

function getDynamicChildren(
  item: MainNavItem | null,
  pathname: string,
): ModuleNavItem[] {
  let children = item?.children || [];
  if (item?.label === 'Workspaces') {
    const projectMatch = pathname.match(/^\/projects\/([a-zA-Z0-9_-]+)(?:\/|$)/);
    if (projectMatch) {
      const possibleId = projectMatch[1];
      if (
        possibleId !== 'overview' &&
        possibleId !== 'usage' &&
        possibleId !== 'new'
      ) {
        children = [
          ...children,
          {
            label: 'Overview',
            path: `/projects/${possibleId}/overview`,
            icon: LayoutDashboard,
            status: 'live',
            description: '',
            group: 'Active Project',
          },
          {
            label: 'Usage',
            path: `/projects/${possibleId}/usage`,
            icon: LineChart,
            status: 'live',
            description: '',
            group: 'Active Project',
          },
          {
            label: 'API Keys',
            path: `/projects/${possibleId}/api-keys`,
            icon: KeyRound,
            status: 'live',
            description: '',
            group: 'Active Project',
          },
          {
            label: 'Activity',
            path: `/projects/${possibleId}/activity`,
            icon: Activity,
            status: 'live',
            description: '',
            group: 'Active Project',
          },
          {
            label: 'Remote Config',
            path: `/projects/${possibleId}/remote-config`,
            icon: Cable,
            status: 'live',
            description: '',
            group: 'Active Project',
          },
          {
            label: 'Alert Routes',
            path: `/projects/${possibleId}/routes`,
            icon: FileText,
            status: 'live',
            description: '',
            group: 'Active Project',
          },
          {
            label: 'Members',
            path: `/projects/${possibleId}/members`,
            icon: Users,
            status: 'live',
            description: '',
            group: 'Active Project',
          },
          {
            label: 'General Settings',
            path: `/projects/${possibleId}/settings/general`,
            icon: Settings,
            status: 'live',
            description: '',
            group: 'Active Project',
          },
        ];
      }
    }
  }
  return children;
}

export function AppDualSidebar() {
  const { setHasInnerItems, isFlyoutOpen, setIsFlyoutOpen } = useSidebarStore();
  const location = useLocation();
  const derivedActive =
    mainNavigation.find(
      (item) =>
        location.pathname === item.path ||
        location.pathname.startsWith(`${item.path}/`),
    ) ??
    mainNavigation[0] ??
    null;

  const [selectedRailItemLabel, setSelectedRailItemLabel] = useState<string | null>(
    () => sessionStorage.getItem('pulsiv_selected_rail')
  );
  const [previousPathname, setPreviousPathname] = useState(location.pathname);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (previousPathname !== location.pathname) {
    setPreviousPathname(location.pathname);
    setSelectedRailItemLabel(null);
    sessionStorage.removeItem('pulsiv_selected_rail');
  }

  const selectedRailItem = selectedRailItemLabel 
    ? mainNavigation.find(item => item.label === selectedRailItemLabel) ?? null 
    : null;

  const activeRailItem = selectedRailItem ?? derivedActive;

  const { user } = useAuth();
  const { organizations, activeOrgId } = useOrganizations();
  const logout = useLogout();
  const { resolvedTheme, toggleTheme } = useTheme();

  const flyoutRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!activeRailItem) return;

    const currentChildren = getDynamicChildren(activeRailItem, location.pathname);
    setExpandedGroups((prev) => {
      const next = { ...prev };
      let changed = false;

      if (currentChildren.length > 0) {
        currentChildren.forEach((child) => {
          const group = child.group || activeRailItem.label;
          if (!next[group]) {
            next[group] = true;
            changed = true;
          }
        });
      } else if (!next[activeRailItem.label]) {
        next[activeRailItem.label] = true;
        changed = true;
      }

      return changed ? next : prev;
    });

    if (currentChildren.length === 0) {
      setIsFlyoutOpen(false);
    }
  }, [activeRailItem, location.pathname, setIsFlyoutOpen]);

  const navItemsToRender = getDynamicChildren(activeRailItem, location.pathname);

  useEffect(() => {
    setHasInnerItems(navItemsToRender.length > 0);
  }, [navItemsToRender.length, setHasInnerItems]);

  useEffect(() => {
    if (!isProfileOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        profileRef.current &&
        !profileRef.current.contains(target) &&
        railRef.current &&
        !railRef.current.contains(target)
      ) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  useEffect(() => {
    const handleToggleMobileSidebar = () => {
      setIsFlyoutOpen((prev) => !prev);
    };

    window.addEventListener('toggle-mobile-sidebar', handleToggleMobileSidebar);
    return () =>
      window.removeEventListener(
        'toggle-mobile-sidebar',
        handleToggleMobileSidebar,
      );
  }, [setIsFlyoutOpen]);

  const handleRailClick = (item: MainNavItem) => {
    setSelectedRailItemLabel(item.label);
    sessionStorage.setItem('pulsiv_selected_rail', item.label);
    const dynamicChildren = getDynamicChildren(item, location.pathname);

    if (dynamicChildren.length === 0) {
      setIsFlyoutOpen(false);
    } else if (!isFlyoutOpen) {
      setIsFlyoutOpen(true);
    }

    setExpandedGroups((prev) => {
      const next = { ...prev };
      if (dynamicChildren.length > 0) {
        dynamicChildren.forEach((child) => {
          next[child.group || item.label] = true;
        });
      } else {
        next[item.label] = true;
      }
      return next;
    });
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const activeOrg = organizations.find((org) => org.id === activeOrgId);
  const flyoutTitle =
    activeRailItem?.label === 'Organization' && activeOrg
      ? activeOrg.name
      : activeRailItem?.label;
  const flyoutContext =
    activeRailItem?.label === 'Organization' && activeOrg
      ? 'Organization'
      : undefined;

  return (
    <>
      <PrimaryRail
        activeRailItem={activeRailItem}
        handleRailClick={handleRailClick}
        isProfileOpen={isProfileOpen}
        setIsProfileOpen={setIsProfileOpen}
        user={user}
        resolvedTheme={resolvedTheme}
        toggleTheme={toggleTheme}
        logout={logout}
      />

      <div
        ref={flyoutRef}
        className={clsx(
          'flyout-container font-sans bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col z-[90] transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap relative shrink-0',
          isFlyoutOpen ? 'w-[var(--flyout-width)] opacity-100' : 'w-0 opacity-0 border-r-0',
        )}
      >
        <div className="h-[var(--header-height)] flex items-center justify-between px-4 border-b border-[var(--border)] shrink-0">
          <div className="min-w-0">
            {flyoutContext && (
              <span className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text3)]">
                {flyoutContext}
              </span>
            )}
            <span className="block truncate text-[14px] font-semibold text-[var(--text)] tracking-normal">
              {flyoutTitle}
            </span>
          </div>
        </div>

        <div className="grow overflow-y-auto p-2 sidebar-scroll">
          {navItemsToRender.length > 0 ? (
            <div className="category-view active">
              {Object.entries(
                navItemsToRender.reduce(
                  (acc, child) => {
                    const groupName =
                      child.group || activeRailItem?.label || 'Navigation';
                    if (!acc[groupName]) acc[groupName] = [];
                    acc[groupName].push(child);
                    return acc;
                  },
                  {} as Record<string, ModuleNavItem[]>,
                ),
              ).map(([groupName, items]) => (
                <div key={groupName} className="nav-group mb-1">
                  <button
                    type="button"
                    className={clsx(
                      'w-full flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-[13.5px] font-medium transition-colors hover:bg-[var(--bg2)] hover:text-[var(--text)]',
                      expandedGroups[groupName]
                        ? 'text-[var(--text)]'
                        : 'text-[var(--text2)]',
                    )}
                    onClick={() => toggleGroup(groupName)}
                    aria-expanded={expandedGroups[groupName] ?? false}
                  >
                    <div className="flex items-center gap-2.5">{groupName}</div>
                    <ChevronRight
                      size={14}
                      className={clsx(
                        'transition-transform duration-200',
                        expandedGroups[groupName] && 'rotate-90',
                      )}
                    />
                  </button>
                  <div
                    className={clsx(
                      'nav-group-children pl-3',
                      expandedGroups[groupName] && 'open',
                    )}
                  >
                    {items.map((child) => {
                      const isChildActive = child.exact
                        ? location.pathname === child.path
                        : location.pathname === child.path ||
                          location.pathname.startsWith(`${child.path}/`);

                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={clsx(
                            'flex items-center py-2 px-3 pl-6 my-0.5 rounded-md cursor-pointer text-[13px] no-underline relative',
                            isChildActive
                              ? 'text-[var(--brand)] font-medium bg-[var(--bg2)]'
                              : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg2)]',
                          )}
                        >
                          <div className="absolute left-2 top-0 bottom-0 w-[1px] bg-[var(--border)]" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-[13px] text-[var(--text2)] text-center mt-4" />
          )}
        </div>
      </div>
    </>
  );
}
