import { Menu } from 'lucide-react';
import { OrgSwitcher } from './OrgSwitcher';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';
import { HelpMenu } from './HelpMenu';

interface AppHeaderProps {
  onMenuClick?: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  return (
    <header className="h-14 shrink-0 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 sticky top-0 z-10 w-full transition-all gap-2 md:gap-4">
      {/* Mobile Menu Button */}
      <button 
        onClick={onMenuClick}
        className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Left Section */}
      <div className="flex items-center flex-1 min-w-0">
        <OrgSwitcher />
      </div>

      {/* Center Section */}
      <div className="hidden lg:flex flex-1 justify-center max-w-2xl px-4">
        <GlobalSearch />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 md:gap-2 flex-1 justify-end">
        <NotificationCenter />
        <HelpMenu />
      </div>
    </header>
  );
}
