import { OrgSwitcher } from './OrgSwitcher';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';
import { HelpMenu } from './HelpMenu';

export function AppHeader() {
  return (
    <header className="h-14 shrink-0 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 sticky top-0 z-10 w-full transition-all">
      {/* Left Section */}
      <div className="flex items-center gap-2 md:gap-4 flex-1">
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
