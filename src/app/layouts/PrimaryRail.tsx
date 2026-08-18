import { Link } from 'react-router';
import { motion } from 'framer-motion';
import clsx from 'clsx';

import { SentinelLogo } from '@/shared/components/PulsivLogo';
import { mainNavigation, type MainNavItem } from '@/app/navigation/navigation';
import { prefetchRoute } from '@/app/router/route-prefetch';
import { SPRING, DURATION, EASE } from '@/shared/motion';
import { useAiDrawerStore } from '@/modules/ai/store/ai-drawer.store';

/**
 * PrimaryRail — Phase 6 (sidebar motion) + Phase 13 (route prefetch).
 *
 * The active marker is a single shared-layout element (`layoutId`), so switching
 * modules slides one pill between rows via FLIP instead of cross-fading two
 * absolutely positioned divs. Transform-only, so it stays on the compositor.
 *
 * Hovering a rail item warms that module's chunk (see route-prefetch.ts) — the
 * cheapest perceived-performance win in the shell.
 */

interface PrimaryRailProps {
  activeRailItem: MainNavItem | null;
  handleRailClick: (item: MainNavItem) => void;
}

const ROW_CLASSES =
  'rail-item w-9 h-9 rounded-[var(--radius)] flex items-center justify-center cursor-pointer transition-colors duration-150 relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]';

function ActiveMarker() {
  return (
    <motion.span
      layoutId="rail-active-marker"
      transition={SPRING.layout}
      aria-hidden="true"
      className="absolute top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-sm bg-[var(--brand)] shadow-[0_0_8px_var(--brand-bg)]"
      style={{ left: 'calc(-1 * (var(--rail-width) - 36px) / 2)' }}
    />
  );
}

import { useOrgStore } from '@/modules/organizations/store/org.store';
import { orgPath } from '@/app/router/org-routes';

export function PrimaryRail({ activeRailItem, handleRailClick }: PrimaryRailProps) {
  const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
  const dashboardPath = orgPath(activeOrgSlug, '/dashboard');

  return (
    <nav className="w-[var(--rail-width)] bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col items-center py-4 z-[100] shrink-0 relative font-sans">
      <Link
        to={dashboardPath}
        aria-label="Go to dashboard"
        onPointerEnter={() => prefetchRoute(dashboardPath)}
        className="flex items-center justify-center mb-6 cursor-pointer text-foreground"
      >
        <SentinelLogo size={32} animate={true} />
      </Link>


      <div className="flex flex-col gap-2 w-full items-center grow">
        {mainNavigation.map((item: MainNavItem) => {
          const Icon = item.icon;
          const isActive = activeRailItem?.label === item.label;
          const className = clsx(
            ROW_CLASSES,
            isActive
              ? 'bg-[var(--brand-bg)] text-[var(--brand)]'
              : 'text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]',
          );

          // Icon scales a hair on hover and settles on press — the smallest
          // signal that reads as "this is a control", at zero layout cost.
          const icon = (
            <motion.span
              className="flex items-center justify-center"
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.94 }}
              transition={{ duration: DURATION.fast, ease: EASE.standard }}
            >
              <Icon className="w-[18px] h-[18px] stroke-[1.5]" />
            </motion.span>
          );

          if (item.isDrawerTrigger) {
            return (
              <button
                key={item.label}
                type="button"
                aria-label={`Open ${item.label}`}
                className={className}
                data-title={item.label}
                onClick={() => useAiDrawerStore.getState().openChat()}
              >
                {icon}
              </button>
            );
          }

          if (!item.children || item.children.length === 0) {
            const targetPath = orgPath(activeOrgSlug, item.path);
            return (
              <Link
                key={item.label}
                to={targetPath}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={className}
                data-title={item.label}
                onPointerEnter={() => prefetchRoute(targetPath)}
                onFocus={() => prefetchRoute(targetPath)}
              >
                {isActive && <ActiveMarker />}
                {icon}
              </Link>
            );
          }


          return (
            <button
              key={item.label}
              type="button"
              aria-label={`Open ${item.label}`}
              aria-expanded={isActive}
              className={className}
              data-title={item.label}
              onPointerEnter={() => prefetchRoute(item.path)}
              onFocus={() => prefetchRoute(item.path)}
              onClick={() => handleRailClick(item)}
            >
              {isActive && <ActiveMarker />}
              {icon}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
