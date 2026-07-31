import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';

import {
  mainNavigation,
  type MainNavItem,
  type ModuleNavItem,
} from '@/app/navigation/navigation';
import {
  ActiveProjectNav,
  WorkspaceProjectList,
  activeProjectIdFromPath,
} from '@/modules/projects/components/ActiveProjectNav';
import { useOrganizations } from '@/modules/organizations/hooks/useOrganizations';
import { useOrgStore } from '@/modules/organizations/store/org.store';
import { useSidebarStore } from '@/stores/sidebarStore';

import { PrimaryRail } from './PrimaryRail';

/**
 * Children shown in the global flyout for a rail item.
 *
 * Project pages are deliberately NOT injected here. Inside a project, the
 * project sidebar (`modules/projects/components/ProjectSidebar`) is the single
 * navigation surface; duplicating its rows in the global flyout is what made
 * the shell feel cluttered and let the two lists drift out of sync.
 */
function getDynamicChildren(
  item: MainNavItem | null,
  _pathname: string,
): ModuleNavItem[] {
  return item?.children ?? [];
}

export function AppDualSidebar() {
  const { setHasInnerItems, isFlyoutOpen, setIsFlyoutOpen } = useSidebarStore();
  const location = useLocation();
  const accountRoute =
    location.pathname === '/account' ||
    location.pathname.startsWith('/account/') ||
    location.pathname === '/settings' ||
    location.pathname.startsWith('/settings/');

  const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
  const matchPath = (p: string) => (p === '/projects' && activeOrgSlug) ? `/${activeOrgSlug}/projects` : p;

  // Project pages live inside this flyout as an "Active project" section —
  // there is no third sidebar.
  const activeProjectId = activeProjectIdFromPath(location.pathname);

  const derivedActive = accountRoute
    ? null
    : activeProjectId
    ? mainNavigation.find((item) => item.label === 'Workspaces')
    : mainNavigation.find(
        (item) => {
          const p = matchPath(item.path);
          if (location.pathname === p || location.pathname.startsWith(`${p}/`)) {
            return true;
          }
          return item.children?.some((child) => {
            const cp = matchPath(child.path);
            if (child.exact) {
              return location.pathname === cp;
            }
            return (
              location.pathname === cp ||
              location.pathname.startsWith(`${cp}/`)
            );
          });
        }
      ) ??
      mainNavigation[0] ??
      null;

  const [selectedRailItemLabel, setSelectedRailItemLabel] = useState<string | null>(
    () => sessionStorage.getItem('pulsiv_selected_rail'),
  );
  const [previousPathname, setPreviousPathname] = useState(location.pathname);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  if (previousPathname !== location.pathname) {
    setPreviousPathname(location.pathname);
    setSelectedRailItemLabel(null);
    sessionStorage.removeItem('pulsiv_selected_rail');
  }

  const selectedRailItem = selectedRailItemLabel
    ? mainNavigation.find((item) => item.label === selectedRailItemLabel) ?? null
    : null;
  const activeRailItem = accountRoute ? null : selectedRailItem ?? derivedActive ?? null;
  const navItemsToRender = getDynamicChildren(activeRailItem, location.pathname);

  const { organizations, activeOrgId } = useOrganizations();
  const flyoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeRailItem) {
      setIsFlyoutOpen(false);
      return;
    }

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

  useEffect(() => {
    setHasInnerItems(navItemsToRender.length > 0);
  }, [navItemsToRender.length, setHasInnerItems]);

  useEffect(() => {
    const handleToggleMobileSidebar = () => {
      setIsFlyoutOpen((prev) => !prev);
    };

    window.addEventListener('toggle-mobile-sidebar', handleToggleMobileSidebar);
    return () =>
      window.removeEventListener('toggle-mobile-sidebar', handleToggleMobileSidebar);
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
    activeRailItem?.label === 'Organization' && activeOrg ? 'Organization' : undefined;

  return (
    <>
      <PrimaryRail
        activeRailItem={activeRailItem}
        handleRailClick={handleRailClick}
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
              <span className="block font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">
                {flyoutContext}
              </span>
            )}
            <span className="block truncate text-[14px] font-semibold text-[var(--text)] tracking-normal">
              {flyoutTitle}
            </span>
          </div>
        </div>

        <div className="grow flex flex-col min-h-0">
          <div
            className={clsx(
              'p-2',
              activeRailItem?.label !== 'Workspaces'
                ? 'grow overflow-y-auto sidebar-scroll'
                : 'shrink-0 pb-0',
            )}
          >
            {navItemsToRender.length > 0 ? (
              <div className="category-view active">
                {Object.entries(
                  navItemsToRender.reduce(
                    (acc, child) => {
                      const groupName = child.group || activeRailItem?.label || 'Navigation';
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
                        'w-full flex items-center justify-between px-3 h-[34px] rounded-[var(--radius)] cursor-pointer font-mono text-[10px] font-medium uppercase tracking-[0.09em] transition-colors duration-150 hover:bg-[var(--bg2)] hover:text-[var(--text2)]',
                        expandedGroups[groupName]
                          ? 'text-[var(--text2)]'
                          : 'text-[var(--text3)]',
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
                        const cp = matchPath(child.path);
                        const isChildActive = child.exact
                          ? location.pathname === cp
                          : location.pathname === cp ||
                            location.pathname.startsWith(`${cp}/`);

                        if (child.external) {
                          return (
                            <a
                              key={child.path}
                              href={child.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={clsx(
                                'flex items-center h-[34px] px-3 pl-6 my-0.5 rounded-[var(--radius)] cursor-pointer text-[13px] no-underline relative transition-colors duration-150',
                                'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]',
                              )}
                            >
                              <div className="absolute left-2 top-0 bottom-0 w-[1px] bg-[var(--border)]" />
                              {child.label}
                            </a>
                          );
                        }

                        return (
                          <Link
                            key={child.path}
                            to={matchPath(child.path)}
                            className={clsx(
                              'flex items-center h-[34px] px-3 pl-6 my-0.5 rounded-[var(--radius)] cursor-pointer text-[13px] no-underline relative transition-colors duration-150',
                              isChildActive
                                ? 'text-[var(--brand)] font-medium bg-[var(--brand-bg)]'
                                : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]',
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

          {activeRailItem?.label === 'Workspaces' && (
            <div className="grow overflow-y-auto p-2 pt-0 sidebar-scroll">
              {activeProjectId ? (
                <ActiveProjectNav publicId={activeProjectId.publicId} orgSlug={activeProjectId.orgSlug} />
              ) : (
                <WorkspaceProjectList />
              )}
            </div>
          )}
        </div>

        {/* Fixed Ingest Quota / AI Credit flip widget at the bottom */}
        {navItemsToRender.length > 0 && (
          <div className="shrink-0 p-3 mt-auto border-t border-[var(--border)]">
            <div className="group h-[92px] [perspective:1000px]">
              <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                {/* Front: Ingest quota */}
                <div className="absolute inset-0 rounded-[var(--radius)] border border-[var(--border)] bg-transparent p-3 flex flex-col gap-2.5 overflow-hidden [backface-visibility:hidden]">
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-[10px] tracking-[0.09em] text-[var(--text3)] uppercase">Ingest quota</span>
                    <span className="text-[12px] font-medium tabular-nums text-[var(--text)]">68%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--bg3)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--brand)] rounded-full" style={{ width: '68%' }} />
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-[var(--text3)] flex justify-between items-center gap-1 min-w-0">
                    <span className="truncate">6.8 / 10 GB</span>
                    <span className="shrink-0 whitespace-nowrap">&middot; resets in 9d</span>
                  </div>
                </div>

                {/* Back: AI credit usage */}
                <div className="absolute inset-0 rounded-[var(--radius)] border border-[var(--border)] bg-transparent p-3 flex flex-col gap-2.5 overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-[10px] tracking-[0.09em] text-[var(--text3)] uppercase">AI credit</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--bg3)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--brand)] rounded-full" style={{ width: '42%' }} />
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-[var(--text3)] flex justify-between items-center gap-1 min-w-0">
                    <span className="truncate">210 / 500 credits</span>
                    <span className="shrink-0 whitespace-nowrap">&middot; resets in 9d</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
