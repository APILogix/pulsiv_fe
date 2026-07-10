import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useLogout } from '@/modules/auth/hooks/useLogout';
import { mainNavigation, MainNavItem, ModuleNavItem } from '@/app/navigation/navigation';
import { ChevronRight, Package, LogOut, Sun, Moon, LayoutDashboard, KeyRound, Activity, Cable, FileText, Settings, LineChart, Users } from 'lucide-react';
import { PulsivLogo } from '@/shared/components/PulsivLogo';
import { useTheme } from '@/theme';
import clsx from 'clsx';

export function AppDualSidebar() {
  const [isPinned, setIsPinned] = useState(true);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(true);
  const [activeRailItem, setActiveRailItem] = useState<MainNavItem | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const { user } = useAuth();
  const logout = useLogout();
  const location = useLocation();
  const { resolvedTheme, toggleTheme } = useTheme();

  const flyoutRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);

  // Compute dynamic children for Workspaces
  const getDynamicChildren = (item: MainNavItem | null, pathname: string): ModuleNavItem[] => {
    let children = item?.children || [];
    if (item?.label === "Workspaces") {
      const projectMatch = pathname.match(/^\/projects\/([a-zA-Z0-9_-]+)(?:\/|$)/);
      if (projectMatch) {
        const possibleId = projectMatch[1];
        if (possibleId !== "overview" && possibleId !== "usage" && possibleId !== "new") {
          children = [
            ...children,
            { label: "Overview", path: `/projects/${possibleId}/overview`, icon: LayoutDashboard, status: "live", description: "", group: "Active Project" },
            { label: "Usage", path: `/projects/${possibleId}/usage`, icon: LineChart, status: "live", description: "", group: "Active Project" },
            { label: "API Keys", path: `/projects/${possibleId}/api-keys`, icon: KeyRound, status: "live", description: "", group: "Active Project" },
            { label: "Activity", path: `/projects/${possibleId}/activity`, icon: Activity, status: "live", description: "", group: "Active Project" },
            { label: "Remote Config", path: `/projects/${possibleId}/remote-config`, icon: Cable, status: "live", description: "", group: "Active Project" },
            { label: "Alert Routes", path: `/projects/${possibleId}/routes`, icon: FileText, status: "live", description: "", group: "Active Project" },
            { label: "Members", path: `/projects/${possibleId}/members`, icon: Users, status: "live", description: "", group: "Active Project" },
            { label: "General Settings", path: `/projects/${possibleId}/settings/general`, icon: Settings, status: "live", description: "", group: "Active Project" },
          ];
        }
      }
    }
    return children;
  };

  const navItemsToRender = getDynamicChildren(activeRailItem, location.pathname);

  // Initialize active rail item based on current URL
  useEffect(() => {
    const current = mainNavigation.find(
      (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
    );
    if (current) {
      setActiveRailItem(current);
      // Auto expand all groups for the active item
      const currentChildren = getDynamicChildren(current, location.pathname);
      setExpandedGroups((prev) => {
        const newGroups = { ...prev };
        let changed = false;
        if (currentChildren.length > 0) {
          currentChildren.forEach(c => {
            const g = c.group || current.label;
            if (!newGroups[g]) { newGroups[g] = true; changed = true; }
          });
        } else {
          if (!newGroups[current.label]) { newGroups[current.label] = true; changed = true; }
        }
        return changed ? newGroups : prev;
      });
      
      if (!currentChildren || currentChildren.length === 0) {
        setIsFlyoutOpen(false);
      }
    } else {
       // Default to first if nothing matches
      if (mainNavigation.length > 0) {
        setActiveRailItem(mainNavigation[0]);
      }
    }
  }, [location.pathname]);

  // Handle clicking outside unpinned flyout or profile popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      if (isProfileOpen && profileRef.current && !profileRef.current.contains(target) && railRef.current && !railRef.current.contains(target)) {
        setIsProfileOpen(false);
      }

      if (!isPinned && isFlyoutOpen && flyoutRef.current && railRef.current) {
        if (!flyoutRef.current.contains(target) && !railRef.current.contains(target)) {
          setIsFlyoutOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPinned, isFlyoutOpen, isProfileOpen]);

  // Update body class for overlay
  useEffect(() => {
    if (!isPinned && isFlyoutOpen) {
      document.body.classList.add('flyout-overlay-active');
    } else {
      document.body.classList.remove('flyout-overlay-active');
    }
    
    // Cleanup on unmount
    return () => document.body.classList.remove('flyout-overlay-active');
  }, [isPinned, isFlyoutOpen]);

  // Handle mobile menu toggle
  useEffect(() => {
    const handleToggleMobileSidebar = () => {
      setIsFlyoutOpen(prev => !prev);
    };
    window.addEventListener('toggle-mobile-sidebar', handleToggleMobileSidebar);
    return () => window.removeEventListener('toggle-mobile-sidebar', handleToggleMobileSidebar);
  }, []);

  const handleRailClick = (item: MainNavItem) => {
    setActiveRailItem(item);
    const dynamicChildren = getDynamicChildren(item, location.pathname);
    if (!dynamicChildren || dynamicChildren.length === 0) {
      setIsFlyoutOpen(false);
    } else if (!isFlyoutOpen) {
      setIsFlyoutOpen(true);
    }
    // Auto expand when clicking rail
    const newGroups = { ...expandedGroups };
    if (dynamicChildren && dynamicChildren.length > 0) {
      dynamicChildren.forEach(c => {
        const g = c.group || item.label;
        newGroups[g] = true;
      });
    } else {
      newGroups[item.label] = true;
    }
    setExpandedGroups(newGroups);
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const togglePin = () => {
    setIsPinned(!isPinned);
    if (!isPinned) {
      setIsFlyoutOpen(true);
    }
  };

  return (
    <>
      {/* Primary Rail */}
      <nav ref={railRef} className="w-[var(--rail-width)] bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col items-center py-4 z-[100] shrink-0 relative font-sans">
        
        <Link to="/dashboard" className="flex items-center justify-center mb-6 cursor-pointer text-foreground">
          <PulsivLogo size={32} animate={true} />
        </Link>

        <div className="flex flex-col gap-2 w-full items-center grow">
          {mainNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeRailItem?.label === item.label;
            return (
              <div
                key={item.label}
                className={clsx(
                  "rail-item w-9 h-9 rounded-md flex items-center justify-center cursor-pointer transition-all relative group",
                  isActive ? "bg-[var(--bg2)] text-[var(--brand)]" : "text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
                )}
                data-title={item.label}
                onClick={() => handleRailClick(item)}
              >
                {isActive && (
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-[#10b981] rounded-r-sm shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                    style={{ left: 'calc(-1 * (var(--rail-width) - 36px) / 2)' }}
                  />
                )}
                {/* For top-level items without children, we can use Link directly on the wrapper or inside */}
                {(!item.children || item.children.length === 0) ? (
                   <Link to={item.path} className="flex w-full h-full items-center justify-center">
                     <Icon className="w-[18px] h-[18px] stroke-[1.5]" />
                   </Link>
                ) : (
                  <Icon className="w-[18px] h-[18px] stroke-[1.5]" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-auto pb-2 relative">
          <div 
            className="w-8 h-8 rounded-full bg-[var(--brand-bg)] text-[var(--brand)] flex items-center justify-center font-semibold cursor-pointer border border-[rgba(52,211,153,0.4)] text-[13px]"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          
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
                {/* <span className="text-[12px] text-[var(--text2)]">Pro Plan</span> */}
              </div>
            </div>
            <div className="flex flex-col">
               {/* <Link to="/settings/profile" className="text-[13px] py-2 cursor-pointer text-[var(--text2)] hover:text-[var(--text)] flex items-center gap-2" onClick={() => setIsProfileOpen(false)}>
                 <User size={14} /> Profile Details
               </Link> */}
               <button onClick={toggleTheme} className="text-[13px] py-2 cursor-pointer text-[var(--text2)] hover:text-[var(--text)] flex items-center gap-2 text-left">
                  {resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />} Toggle Theme
               </button>
               {/* <Link to="/settings" className="text-[13px] py-2 cursor-pointer text-[var(--text2)] hover:text-[var(--text)] flex items-center gap-2" onClick={() => setIsProfileOpen(false)}>
                 <Settings size={14} /> Settings
               </Link>
               <hr className="border-t border-[var(--border)] my-2" /> */}
               <button 
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

      {/* Flyout Menu */}
      <div 
        ref={flyoutRef}
        className={clsx(
          "flyout-container font-sans bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col z-[90] transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
          isPinned ? "relative left-0 shadow-none shrink-0" : "fixed top-0 bottom-0 left-[var(--rail-width)] shadow-[10px_0_30px_rgba(0,0,0,0.5)] transform -translate-x-full",
          isFlyoutOpen && !isPinned && "translate-x-0",
          isPinned && isFlyoutOpen ? "w-[var(--flyout-width)] opacity-100" : "",
          isPinned && !isFlyoutOpen ? "w-0 opacity-0 border-r-0" : "",
          !isPinned && "w-[var(--flyout-width)]"
        )}
      >
        <div className="h-[var(--header-height)] flex items-center justify-between px-4 border-b border-[var(--border)] shrink-0">
          <span className="text-[14px] font-semibold text-[var(--text)] uppercase tracking-wider">{activeRailItem?.label}</span>
          <button 
            className={clsx("w-7 h-7 flex items-center justify-center rounded transition-colors", isPinned ? "text-[var(--brand)]" : "text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]")}
            onClick={togglePin}
            title={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}
          >
            <Package size={18} />
          </button>
        </div>

        <div className="grow overflow-y-auto p-2 sidebar-scroll">
          {navItemsToRender.length > 0 ? (
            <div className="category-view active">
              {Object.entries(
                navItemsToRender.reduce((acc, child) => {
                  const groupName = child.group || activeRailItem?.label || "Navigation";
                  if (!acc[groupName]) acc[groupName] = [];
                  acc[groupName].push(child);
                  return acc;
                }, {} as Record<string, ModuleNavItem[]>)
              ).map(([groupName, items]) => (
                <div key={groupName} className="nav-group mb-1">
                  <div 
                    className={clsx("flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-[13.5px] font-medium transition-colors hover:bg-[var(--bg2)] hover:text-[var(--text)]", expandedGroups[groupName] ? "text-[var(--text)]" : "text-[var(--text2)]")}
                    onClick={() => toggleGroup(groupName)}
                  >
                    <div className="flex items-center gap-2.5">
                      {groupName}
                    </div>
                    <ChevronRight size={14} className={clsx("transition-transform duration-200", expandedGroups[groupName] && "rotate-90")} />
                  </div>
                  <div className={clsx("nav-group-children pl-3", expandedGroups[groupName] && "open")}>
                    {items.map((child: ModuleNavItem) => {
                      const isChildActive = child.exact
                        ? location.pathname === child.path
                        : location.pathname === child.path || location.pathname.startsWith(`${child.path}/`);
                        
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={clsx(
                            "flex items-center py-2 px-3 pl-6 my-0.5 rounded-md cursor-pointer text-[13px] no-underline relative",
                            isChildActive ? "text-[var(--brand)] font-medium bg-[var(--bg2)]" : "text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg2)]"
                          )}
                        >
                           <div className="absolute left-2 top-0 bottom-0 w-[1px] bg-[var(--border)]" />
                           {child.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-[13px] text-[var(--text2)] text-center mt-4">
              {/* Optional empty state for items with no children */}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
