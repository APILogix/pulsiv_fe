import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
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
import { orgPath } from '@/app/router/org-routes';
import {
  navGroupChevronClass,
  navGroupHeaderClass,
  navRowClass,
  navRowIconClass,
} from '@/shared/ui/nav/nav-classes';


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
  const matchPath = (p: string) => (activeOrgSlug ? orgPath(activeOrgSlug, p) : p);

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

  const groupedItems = Object.entries(
    navItemsToRender.reduce(
      (acc, child) => {
        const groupName = child.group || activeRailItem?.label || 'Navigation';
        (acc[groupName] ??= []).push(child);
        return acc;
      },
      {} as Record<string, ModuleNavItem[]>,
    ),
  );
  const isSingleGroup =
    groupedItems.length === 1 && !navItemsToRender.some((child) => child.group);

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
        inert={!isFlyoutOpen}
      >
        <div className="h-[var(--header-height)] flex items-center justify-between gap-2 px-4 border-b border-[var(--border)] shrink-0">
          <div className="min-w-0">
            {flyoutContext && (
              <span className="block text-[11px] leading-4 text-[var(--text3)]">
                {flyoutContext}
              </span>
            )}
            <span className="block truncate text-[14px] font-semibold leading-5 tracking-[-0.01em] text-[var(--text)]">
              {flyoutTitle}
            </span>
          </div>
        </div>

        <nav
          aria-label={flyoutTitle ? `${flyoutTitle} navigation` : 'Section navigation'}
          className="grow flex flex-col min-h-0"
        >
          <div
            className={clsx(
              'px-2 pt-2',
              activeRailItem?.label !== 'Workspaces'
                ? 'grow overflow-y-auto sidebar-scroll pb-3'
                : 'shrink-0',
            )}
          >
            {groupedItems.map(([groupName, items], index) => {
              // A module with a single, unnamed group lists its pages directly:
              // a collapsible heading that repeats the flyout title is noise.
              const showHeading = !isSingleGroup;
              const expanded = !showHeading || (expandedGroups[groupName] ?? false);
              const panelId = `flyout-group-${groupName.toLowerCase().replace(/\W+/g, '-')}`;

              return (
                <div key={groupName} className={clsx(showHeading && index > 0 && 'mt-3')}>
                  {showHeading && (
                    <button
                      type="button"
                      className={navGroupHeaderClass(expanded)}
                      onClick={() => toggleGroup(groupName)}
                      aria-expanded={expanded}
                      aria-controls={panelId}
                    >
                      <span className="truncate">{groupName}</span>
                      <ChevronRight className={navGroupChevronClass(expanded)} aria-hidden="true" />
                    </button>
                  )}
                  <div
                    id={panelId}
                    className={clsx('nav-group-children', expanded && 'open')}
                    inert={!expanded}
                  >
                    {/* Single grid child — the accordion animates
                        `grid-template-rows: 0fr → 1fr` on the parent, so the
                        open height always equals the real content height. */}
                    <ul className="nav-group-rows flex flex-col gap-px pt-0.5">
                      {items.map((child) => {
                        const Icon = child.icon;
                        const cp = matchPath(child.path);
                        const isChildActive = child.exact
                          ? location.pathname === cp
                          : location.pathname === cp ||
                            location.pathname.startsWith(`${cp}/`);

                        if (child.external) {
                          return (
                            <li key={child.path}>
                              <a
                                href={child.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={child.description}
                                className={navRowClass(false)}
                              >
                                <Icon className={navRowIconClass(false)} aria-hidden="true" />
                                <span className="truncate">{child.label}</span>
                                <ArrowUpRight
                                  className="ml-auto size-3.5 shrink-0 text-[var(--text3)]"
                                  aria-hidden="true"
                                />
                                <span className="sr-only">(opens in a new tab)</span>
                              </a>
                            </li>
                          );
                        }

                        return (
                          <li key={child.path}>
                            <Link
                              to={cp}
                              aria-current={isChildActive ? 'page' : undefined}
                              title={child.description}
                              onPointerEnter={() => prefetchRoute(cp)}
                              onFocus={() => prefetchRoute(cp)}
                              className={navRowClass(isChildActive)}
                            >
                              {isChildActive && (
                                <span className="nav-row-indicator left-0" aria-hidden="true" />
                              )}
                              <Icon className={navRowIconClass(isChildActive)} aria-hidden="true" />
                              <span className="truncate">{child.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              );
            })}
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
        </nav>

        {/* Fixed Ingest Quota / AI Credit flip widget at the bottom */}
        {navItemsToRender.length > 0 && <QuotaCardWidget />}
      </div>
    </>
  );
}
