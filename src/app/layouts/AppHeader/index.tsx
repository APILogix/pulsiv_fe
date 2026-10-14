import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { OrgSwitcher } from './OrgSwitcher';
import { ProjectSwitcher } from './ProjectSwitcher';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';
import { HelpMenu } from './HelpMenu';
import { UserAvatarMenu } from './UserAvatarMenu';
import { useSidebarStore } from '@/stores/sidebarStore';

interface AppHeaderProps {
  onMenuClick?: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { isFlyoutOpen, setIsFlyoutOpen, hasInnerItems } = useSidebarStore();

  return (
    <header className="h-[var(--header-height)] shrink-0 border-b border-[var(--border)] bg-[var(--bg1)] flex items-center px-2.5 sm:px-4 sticky top-0 z-10 w-full gap-1.5 sm:gap-3">
      {/* Mobile Menu Button */}
      <button 
        type="button"
        onClick={onMenuClick}
        className="md:hidden p-1.5 -ml-1 text-[var(--text2)] hover:text-[var(--text)] rounded-[var(--radius)] hover:bg-[var(--bg2)] shrink-0"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Left Section */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink">
        {hasInnerItems && (
          <button
            type="button"
            onClick={() => setIsFlyoutOpen(!isFlyoutOpen)}
            className="hidden md:flex size-8 items-center justify-center text-[var(--text3)] hover:text-[var(--text)] rounded-[var(--radius)] hover:bg-[var(--bg2)] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]"
            title={isFlyoutOpen ? "Close inner sidebar" : "Open inner sidebar"}
            aria-label={isFlyoutOpen ? "Close inner sidebar" : "Open inner sidebar"}
            aria-expanded={isFlyoutOpen}
          >
            {isFlyoutOpen ? (
              <PanelLeftClose className="size-[18px] stroke-[1.75]" aria-hidden="true" />
            ) : (
              <PanelLeftOpen className="size-[18px] stroke-[1.75]" aria-hidden="true" />
            )}
          </button>
        )}
        {hasInnerItems && (
          <span aria-hidden="true" className="hidden md:block h-5 w-px shrink-0 bg-[var(--border)]" />
        )}
        <OrgSwitcher />
        <span aria-hidden="true" className="text-[var(--border2)] shrink-0 text-[13px]">/</span>
        <ProjectSwitcher />
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 flex justify-center px-1 sm:px-2 min-w-0 max-w-xs sm:max-w-md lg:max-w-lg">
        <GlobalSearch />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 justify-end ml-auto">
        <NotificationCenter />
        <HelpMenu />
        <UserAvatarMenu />
      </div>
    </header>
  );
}
