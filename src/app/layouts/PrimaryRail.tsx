import { Link } from 'react-router';
import { PulsivLogo } from '@/shared/components/PulsivLogo';
import { mainNavigation, MainNavItem } from '@/app/navigation/navigation';
import clsx from 'clsx';

export function PrimaryRail({
  activeRailItem,
  handleRailClick,
}: any) {
  return (
    <nav className="w-[var(--rail-width)] bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col items-center py-4 z-[100] shrink-0 relative font-sans">
      <Link to="/dashboard" aria-label="Go to dashboard" className="flex items-center justify-center mb-6 cursor-pointer text-foreground">
        <PulsivLogo size={32} animate={true} />
      </Link>

      <div className="flex flex-col gap-2 w-full items-center grow">
        {mainNavigation.map((item: MainNavItem) => {
          const Icon = item.icon;
          const isActive = activeRailItem?.label === item.label;
          const sharedClasses = clsx(
            "rail-item w-9 h-9 rounded-[var(--radius)] flex items-center justify-center cursor-pointer transition-colors duration-150 relative group",
            isActive ? "bg-[var(--brand-bg)] text-[var(--brand)]" : "text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
          );

          if (!item.children || item.children.length === 0) {
            return (
              <Link
                key={item.label}
                to={item.path}
                aria-label={item.label}
                className={sharedClasses}
                data-title={item.label}
              >
                {isActive && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-sm bg-[var(--brand)] shadow-[0_0_8px_var(--brand-bg)]"
                    style={{ left: 'calc(-1 * (var(--rail-width) - 36px) / 2)' }}
                  />
                )}
                <Icon className="w-[18px] h-[18px] stroke-[1.5]" />
              </Link>
            );
          }

          return (
            <button
              key={item.label}
              type="button"
              aria-label={`Open ${item.label}`}
              className={sharedClasses}
              data-title={item.label}
              onClick={() => handleRailClick(item)}
            >
              {isActive && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-sm bg-[var(--brand)] shadow-[0_0_8px_var(--brand-bg)]"
                  style={{ left: 'calc(-1 * (var(--rail-width) - 36px) / 2)' }}
                />
              )}
              <Icon className="w-[18px] h-[18px] stroke-[1.5]" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
