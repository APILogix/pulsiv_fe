import { Link } from 'react-router';
import { motion } from 'framer-motion';
import clsx from 'clsx';

import { SentinelLogo } from '@/shared/components/PulsivLogo';
import { mainNavigation, type MainNavItem } from '@/app/navigation/navigation';
import { prefetchRoute } from '@/app/router/route-prefetch';
import { SPRING } from '@/shared/motion';
import { useAiDrawerStore } from '@/modules/ai/store/ai-drawer.store';
import { useOrgStore } from '@/modules/organizations/store/org.store';
import { orgPath } from '@/app/router/org-routes';

/**
 * PrimaryRail — the outer icon sidebar.
 *
 * Three zones, top to bottom: product surfaces, AI, and account-level
 * administration pinned to the foot of the rail. The zones are split by
 * hairlines so the rail scans as a map rather than a column of equal icons.
 *
 * The active marker is a single shared-layout element (`layoutId`), so switching
 * modules slides one bar between rows via FLIP. Transform-only, so it stays on
 * the compositor. Hover feedback is plain CSS; there is no per-icon JS motion.
 *
 * Hovering a rail item warms that module's chunk (see route-prefetch.ts).
 */

interface PrimaryRailProps {
  activeRailItem: MainNavItem | null;
  handleRailClick: (item: MainNavItem) => void;
}

/** Rail labels that live in the AI zone and the pinned admin zone. */
const AI_ZONE = new Set(['AI', 'AI Reports']);
const ADMIN_ZONE = new Set(['Organization', 'Billing', 'Developer']);

const ROW_CLASSES =
  'rail-item relative size-10 rounded-[var(--radius-lg)] flex items-center justify-center cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]';

function ActiveMarker() {
  return (
    <motion.span
      layoutId="rail-active-marker"
      transition={SPRING.layout}
      aria-hidden="true"
      className="absolute top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--brand)]"
      style={{ left: 'calc(-1 * (var(--rail-width) - 40px) / 2)' }}
    />
  );
}

function ZoneDivider() {
  return <span aria-hidden="true" className="my-2 h-px w-6 shrink-0 bg-[var(--border)]" />;
}

export function PrimaryRail({ activeRailItem, handleRailClick }: PrimaryRailProps) {
  const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
  const dashboardPath = orgPath(activeOrgSlug, '/dashboard');

  const productItems = mainNavigation.filter(
    (item) => !AI_ZONE.has(item.label) && !ADMIN_ZONE.has(item.label),
  );
  const aiItems = mainNavigation.filter((item) => AI_ZONE.has(item.label));
  const adminItems = mainNavigation.filter((item) => ADMIN_ZONE.has(item.label));

  const renderItem = (item: MainNavItem) => {
    const Icon = item.icon;
    const isActive = activeRailItem?.label === item.label;
    const className = clsx(
      ROW_CLASSES,
      isActive
        ? 'bg-[var(--brand-bg)] text-[var(--text)]'
        : 'text-[var(--text3)] hover:bg-[var(--bg2)] hover:text-[var(--text)]',
    );
    const icon = (
      <Icon
        aria-hidden="true"
        className="size-[18px] stroke-[1.75] transition-transform duration-150 ease-out group-active:scale-95 motion-reduce:transition-none"
      />
    );

    if (item.isDrawerTrigger) {
      return (
        <li key={item.label}>
          <button
            type="button"
            aria-label={`Open ${item.label}`}
            className={clsx(className, 'group')}
            data-title={item.label}
            onClick={() => useAiDrawerStore.getState().openChat()}
          >
            {icon}
          </button>
        </li>
      );
    }

    if (!item.children || item.children.length === 0) {
      const targetPath = orgPath(activeOrgSlug, item.path);
      return (
        <li key={item.label}>
          <Link
            to={targetPath}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className={clsx(className, 'group')}
            data-title={item.label}
            onPointerEnter={() => prefetchRoute(targetPath)}
            onFocus={() => prefetchRoute(targetPath)}
          >
            {isActive && <ActiveMarker />}
            {icon}
          </Link>
        </li>
      );
    }

    return (
      <li key={item.label}>
        <button
          type="button"
          aria-label={`Open ${item.label}`}
          aria-expanded={isActive}
          className={clsx(className, 'group')}
          data-title={item.label}
          onPointerEnter={() => prefetchRoute(item.path)}
          onFocus={() => prefetchRoute(item.path)}
          onClick={() => handleRailClick(item)}
        >
          {isActive && <ActiveMarker />}
          {icon}
        </button>
      </li>
    );
  };

  return (
    <nav
      aria-label="Primary"
      className="w-[var(--rail-width)] bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col items-center z-[100] shrink-0 relative font-sans"
    >
      <Link
        to={dashboardPath}
        aria-label="Go to dashboard"
        onPointerEnter={() => prefetchRoute(dashboardPath)}
        className="flex h-[var(--header-height)] w-full shrink-0 items-center justify-center border-b border-[var(--border)] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border2)]"
      >
        <SentinelLogo size={28} animate={true} />
      </Link>

      {/* No overflow clipping here: rail tooltips render outside the rail. */}
      <div className="flex w-full grow flex-col items-center py-3">
        <ul className="flex flex-col items-center gap-1">{productItems.map(renderItem)}</ul>

        {aiItems.length > 0 && (
          <>
            <ZoneDivider />
            <ul className="flex flex-col items-center gap-1">{aiItems.map(renderItem)}</ul>
          </>
        )}

        {adminItems.length > 0 && (
          <ul className="mt-auto flex flex-col items-center gap-1 pt-3">
            <li aria-hidden="true" className="flex justify-center">
              <ZoneDivider />
            </li>
            {adminItems.map(renderItem)}
          </ul>
        )}
      </div>
    </nav>
  );
}
