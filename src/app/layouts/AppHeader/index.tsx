import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { OrgSwitcher } from './OrgSwitcher';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';
import { HelpMenu } from './HelpMenu';
import { UserAvatarMenu } from './UserAvatarMenu';
import { ThemeSwitcher } from '@/theme';
import { useSidebarStore } from '@/stores/sidebarStore';

interface AppHeaderProps {
  onMenuClick?: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { isFlyoutOpen, setIsFlyoutOpen, hasInnerItems } = useSidebarStore();

  return (
    <header className="h-[var(--header-height)] shrink-0 border-b border-[var(--border)] bg-[var(--bg1)]/80 backdrop-blur-md flex items-center px-4 sticky top-0 z-10 w-full gap-2 md:gap-4">
      {/* Mobile Menu Button */}
      <button 
        type="button"
        onClick={onMenuClick}
        className="md:hidden p-2 -ml-2 text-[var(--text2)] hover:text-[var(--text)] rounded-[var(--radius)] hover:bg-[var(--bg2)]"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Left Section */}
      <div className="flex items-center flex-1 min-w-0 gap-2">
        {hasInnerItems && (
          <button
            type="button"
            onClick={() => setIsFlyoutOpen(!isFlyoutOpen)}
            className="hidden md:flex p-2 -ml-2 text-[var(--text2)] hover:text-[var(--text)] rounded-[var(--radius)] hover:bg-[var(--bg2)] transition-colors"
            title={isFlyoutOpen ? "Close inner sidebar" : "Open inner sidebar"}
            aria-label={isFlyoutOpen ? "Close inner sidebar" : "Open inner sidebar"}
          >
            {isFlyoutOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        )}
        <OrgSwitcher />
      </div>

      {/* Center Section */}
      <div className="hidden lg:flex flex-1 justify-center max-w-2xl px-4">
        <GlobalSearch />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 md:gap-2 flex-1 justify-end">
        {/* Theme switcher lives in the topbar (§1) */}
        <ThemeSwitcher className="hidden sm:inline-flex" />
        <NotificationCenter />
        <HelpMenu />
        <UserAvatarMenu />
      </div>
    </header>
  );
}
