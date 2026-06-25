import { SidebarTrigger } from '@/components/ui/sidebar';
import { OrgSwitcher } from './OrgSwitcher';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';
import { HelpMenu } from './HelpMenu';

export function AppHeader() {
  return (
    <header className="h-14 shrink-0 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 sticky top-0 z-10 w-full transition-all">
      {/* Left Section */}
      <div className="flex items-center gap-2 md:gap-4 flex-1">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-transparent" />
        <OrgSwitcher />
      </div>

      {/* Center Section (Empty for breathing room) */}
      <div className="hidden lg:flex flex-1" />

      {/* Right Section */}
      <div className="flex items-center gap-1 md:gap-2 flex-1 justify-end">
        <GlobalSearch />
        <NotificationCenter />
        <HelpMenu />
      </div>
    </header>
  );
}
