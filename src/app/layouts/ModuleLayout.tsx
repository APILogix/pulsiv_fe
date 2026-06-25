import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { ArrowLeftRight, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  findMainNavItem,
  mainNavigation,
  type MainNavItem,
  type ModuleNavItem,
} from "@/app/navigation/navigation";

function isActive(pathname: string, item: ModuleNavItem) {
  if (item.exact) {
    return pathname === item.path;
  }
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

function ModuleSidebar({
  module,
  collapsed,
  onToggle,
}: {
  module: MainNavItem;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();

  return (
    <nav
      className={`shrink-0 border-r border-[var(--border)] bg-[var(--bg)] transition-[width] duration-200 ${
        collapsed ? "w-[72px]" : "w-[268px]"
      }`}
    >
      <div className="sidebar-scroll h-full overflow-y-auto px-3 py-6">
        <div className={`mb-5 flex items-center ${collapsed ? "justify-center" : "justify-between gap-3 px-2"}`}>
          {!collapsed && (
            <Link
              to="/dashboard"
              className="flex min-w-0 items-center gap-2 text-[var(--text2)] hover:text-[var(--brand)] transition-colors text-sm font-medium"
            >
              <ArrowLeftRight className="size-4 shrink-0" />
              <span>Back to overview</span>
            </Link>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--bg1)] text-[var(--text2)] transition-colors hover:text-[var(--brand)]"
            aria-label={collapsed ? "Expand module sidebar" : "Collapse module sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        {!collapsed && (
          <div className="px-2 pb-4">
            <h2 className="text-base font-semibold text-[var(--text)]">{module.label}</h2>
          </div>
        )}

        <div className="flex flex-col gap-2">

          {module.children?.map((item) => {
            const Icon = item.icon;
            const active = isActive(location.pathname, item);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`rounded-[8px] border transition-colors ${
                  collapsed ? "px-2 py-2" : "px-3 py-2.5"
                } ${
                  active
                    ? "border-[var(--brand)]/20 bg-[var(--brand-bg)]"
                    : "border-transparent hover:border-[var(--border)] hover:bg-[var(--bg1)]"
                }`}
                title={item.label}
              >
                <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
                  <div className={`rounded-[6px] p-1.5 ${active ? "bg-[var(--bg)] text-[var(--brand)]" : "bg-[var(--bg1)] text-[var(--text2)]"}`}>
                    <Icon className="size-4" />
                  </div>
                  {!collapsed && (
                    <>
                      <div className="min-w-0 flex-1">
                        <span className={`text-sm font-medium ${active ? "text-[var(--brand)]" : "text-[var(--text)]"}`}>
                          {item.label}
                        </span>
                      </div>
                      <ChevronRight className={`size-4 shrink-0 ${active ? "text-[var(--brand)]" : "text-[var(--text3)]"}`} />
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function ModuleLayout() {
  const location = useLocation();
  const module = findMainNavItem(location.pathname) ?? mainNavigation[0];
  const [collapsed, setCollapsed] = useState(false);

  if (!module.children?.length) {
    return <Outlet />;
  }

  return (
    <div className="flex h-full w-full">
      <ModuleSidebar
        module={module}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />
      <div className="sidebar-scroll flex-1 overflow-y-auto">
        <div className="max-w-[1080px] px-8 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
