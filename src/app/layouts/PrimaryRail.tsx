import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Sun, Moon, LogOut } from 'lucide-react';
import { PulsivLogo } from '@/shared/components/PulsivLogo';
import { mainNavigation, MainNavItem } from '@/app/navigation/navigation';
import clsx from 'clsx';

export function PrimaryRail({
  activeRailItem,
  handleRailClick,
  isProfileOpen,
  setIsProfileOpen,
  user,
  resolvedTheme,
  toggleTheme,
  logout
}: any) {
  const profileRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);

  // Handle clicking outside profile popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (isProfileOpen && profileRef.current && !profileRef.current.contains(target) && railRef.current && !railRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen, setIsProfileOpen]);

  return (
    <nav ref={railRef} className="w-[var(--rail-width)] bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col items-center py-4 z-[100] shrink-0 relative font-sans">
      <Link to="/dashboard" aria-label="Go to dashboard" className="flex items-center justify-center mb-6 cursor-pointer text-foreground">
        <PulsivLogo size={32} animate={true} />
      </Link>

      <div className="flex flex-col gap-2 w-full items-center grow">
        {mainNavigation.map((item: MainNavItem) => {
          const Icon = item.icon;
          const isActive = activeRailItem?.label === item.label;
          const sharedClasses = clsx(
            "rail-item w-9 h-9 rounded-md flex items-center justify-center cursor-pointer transition-all relative group",
            isActive ? "bg-[var(--bg2)] text-[var(--brand)]" : "text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
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
                    className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-[#10b981] rounded-r-sm shadow-[0_0_8px_rgba(16,185,129,0.5)]"
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
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-[#10b981] rounded-r-sm shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  style={{ left: 'calc(-1 * (var(--rail-width) - 36px) / 2)' }}
                />
              )}
              <Icon className="w-[18px] h-[18px] stroke-[1.5]" />
            </button>
          );
        })}
      </div>

      <div className="mt-auto pb-2 relative">
        <button
          type="button"
          className="w-8 h-8 rounded-full bg-[var(--brand-bg)] text-[var(--brand)] flex items-center justify-center font-semibold cursor-pointer border border-[rgba(52,211,153,0.4)] text-[13px]"
          aria-label={isProfileOpen ? "Close profile menu" : "Open profile menu"}
          onClick={() => setIsProfileOpen(!isProfileOpen)}
        >
          {user?.email?.charAt(0).toUpperCase() || 'U'}
        </button>
        
        {/* Profile Popover */}
        <div 
          ref={profileRef}
          className={clsx(
            "absolute bottom-0 left-[calc(var(--rail-width)+8px)] bg-[var(--sidebar)] border border-[var(--border)] w-60 rounded-lg p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[200] transition-opacity",
            isProfileOpen ? "opacity-100 block" : "opacity-0 hidden pointer-events-none"
          )}
        >
          <div className="flex gap-3 items-center mb-4 pb-4 border-b border-[var(--border)]">
            <div className="w-9 h-9 rounded-full bg-[var(--brand-bg)] text-[var(--brand)] flex items-center justify-center font-semibold border border-[rgba(52,211,153,0.4)] shrink-0">
               {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <strong className="block text-[13px] text-(--text) truncate">{user?.email || 'User'}</strong>
            </div>
          </div>
          <div className="flex flex-col">
             <button type="button" onClick={toggleTheme} className="text-[13px] py-2 cursor-pointer text-[var(--text2)] hover:text-[var(--text)] flex items-center gap-2 text-left">
                {resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />} Toggle Theme
             </button>
             <button 
              type="button"
              onClick={() => { setIsProfileOpen(false); logout.mutate(); }} 
              className="text-[13px] py-2 cursor-pointer text-[var(--red)] hover:text-[var(--red-d)] flex items-center gap-2 text-left"
              disabled={logout.isPending}
             >
               <LogOut size={14} /> {logout.isPending ? 'Signing out...' : 'Sign Out'}
             </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
