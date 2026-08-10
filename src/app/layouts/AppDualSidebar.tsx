import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronRight, Sparkles } from 'lucide-react';
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
import { prefetchRoute } from '@/app/router/route-prefetch';

import { PrimaryRail } from './PrimaryRail';
import { QuotaCardWidget } from './QuotaCardWidget';

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
    () => sessionStorage.getItem('sentinel_selected_rail'),
  );
  const [previousPathname, setPreviousPathname] = useState(location.pathname);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  if (previousPathname !== location.pathname) {
    setPreviousPathname(location.pathname);
    setSelectedRailItemLabel(null);
    sessionStorage.removeItem('sentinel_selected_rail');
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
    sessionStorage.setItem('sentinel_selected_rail', item.label);
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
          // Only `width` and `opacity` transition. The previous `transition-all`
          // put every animatable property (colours, borders, shadows, transforms)
          // on the clock for 300ms each time the flyout toggled.
          'flyout-container font-sans bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col z-[90] transition-[width,opacity] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden whitespace-nowrap relative shrink-0 motion-reduce:transition-none',
          isFlyoutOpen ? 'w-[var(--flyout-width)] opacity-100' : 'w-0 opacity-0 border-r-0',
        )}
        aria-hidden={!isFlyoutOpen}
        // `inert` (React 19) removes the collapsed flyout from the tab order and
        // the accessibility tree. Without it, `aria-hidden` alone would leave
        // focusable links inside a hidden region — a WCAG failure, and the
        // reason a collapsed sidebar used to swallow Tab presses.
        {...(!isFlyoutOpen ? { inert: true as any } : {})}
      >
        <div className="h-[var(--header-height)] flex items-center justify-between px-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {activeRailItem?.label === 'AI' && (
              <Sparkles className="size-4 text-[var(--brand)] shrink-0" />
            )}
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
          {activeRailItem?.label === 'AI' && (
            <kbd className="hidden sm:inline-flex items-center rounded border border-[var(--border)] bg-[var(--bg2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text3)]">
              ⌘K
            </kbd>
          )}
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
                      {/* Single grid child — the accordion animates
                          `grid-template-rows: 0fr → 1fr` on the parent, so the
                          open height always equals the real content height. */}
                      <div className="nav-group-rows">
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
                            aria-current={isChildActive ? 'page' : undefined}
                            onPointerEnter={() => prefetchRoute(matchPath(child.path))}
                            onFocus={() => prefetchRoute(matchPath(child.path))}
                            className={clsx(
                              'flex items-center h-[34px] px-3 pl-6 my-0.5 rounded-[var(--radius)] cursor-pointer text-[13px] no-underline relative transition-colors duration-150',
                              isChildActive
                                ? 'text-[var(--brand)] font-medium bg-[var(--brand-bg)]'
                                : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]',
                            )}
                          >
                            {/* Hairline rail for every row; the active row swaps it
                                for a brand indicator that scales in from the rail. */}
                            {isChildActive ? (
                              <div className="nav-row-indicator left-2" aria-hidden="true" />
                            ) : (
                              <div className="absolute left-2 top-0 bottom-0 w-[1px] bg-[var(--border)]" aria-hidden="true" />
                            )}
                            {child.label}
                          </Link>
                        );
                      })}
                      </div>
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
        {navItemsToRender.length > 0 && <QuotaCardWidget />}
      </div>
    </>
  );
}
