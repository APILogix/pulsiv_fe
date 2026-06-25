import { Outlet, Link, useLocation } from 'react-router';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useLogout } from '@/modules/auth/hooks/useLogout';
import { PulsivWordmark, PulsivLogo } from '@/shared/components/PulsivLogo';
import { PulseCommandPalette } from '@/modules/search/components/PulseCommandPalette';
import { useSearchShortcuts } from '@/modules/search/hooks/useSearchShortcuts';
import { AppHeader } from './AppHeader';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChevronUp, User, Moon, Sun } from 'lucide-react';
import { mainNavigation } from '@/app/navigation/navigation';
import { useTheme } from '@/theme';

function AppSidebar() {
  const { user } = useAuth();
  const logout = useLogout();
  const location = useLocation();
  const { state } = useSidebar();
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r border-[var(--border)] group">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-[var(--border)] pt-4">
        <Link to="/dashboard" className="flex items-center justify-center w-full">
          {state === 'expanded' ? (
            <PulsivWordmark size={44} />
          ) : (
            <PulsivLogo size={44} animate={true} />
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="sidebar-scroll mt-5 pb-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 pb-2">Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {mainNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? location.pathname === item.path
                  : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link to={item.path}>
                        <Icon className="size-4 shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden font-medium">{item.label}</span>
                        {/* Keep status metadata in navigation.tsx, but do not render badges in the main sidebar. */}
                        {/* <span
                          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-[family-name:var(--mono)] uppercase group-data-[collapsible=icon]:hidden ${navStatusClassName[item.status]}`}
                        >
                          {navStatusLabel[item.status]}
                        </span> */}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[var(--border)] p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-[var(--brand-bg)] data-[state=open]:text-[var(--brand)] rounded-[6px] group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-8 w-8 rounded-[6px] bg-[var(--brand-bg)] text-[var(--brand)] border border-[var(--brand-bg)] shrink-0">
                    <AvatarFallback className="rounded-[6px] bg-transparent font-[family-name:var(--mono)] text-[10px]">
                      <User size={14} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight text-[var(--text)] group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">{user?.email || 'User'}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4 text-[var(--text2)] group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width] bg-[var(--bg1)] border-[var(--border)] text-[var(--text)]">
                <DropdownMenuLabel className="font-[family-name:var(--mono)] text-[10px] uppercase text-[var(--text3)]">My account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[var(--border)]" />
                <DropdownMenuItem asChild className="focus:bg-[var(--brand-bg)] focus:text-[var(--brand)] cursor-pointer">
                  <Link to="/auth/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => toggleTheme()}
                  className="focus:bg-[var(--brand-bg)] focus:text-[var(--brand)] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                    <span>Toggle theme</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[var(--border)]" />
                <DropdownMenuItem disabled={logout.isPending} onClick={() => logout.mutate()} className="focus:bg-[var(--brand-bg)] focus:text-[var(--brand)] cursor-pointer">
                  {logout.isPending ? 'Signing out...' : 'Sign out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppLayout() {
  useSearchShortcuts();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-[var(--bg)]">
        <AppSidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <AppHeader />
          <div className="flex-1 overflow-hidden relative">
            <Outlet />
          </div>
        </main>
        <PulseCommandPalette />
      </div>
    </SidebarProvider>
  );
}
