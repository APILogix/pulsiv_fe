import { Outlet } from "react-router";

export function ModuleLayout() {
  return (
    <div className="flex h-full w-full">
      <div className="sidebar-scroll flex-1 overflow-y-auto">
        <div className="max-w-[1080px] px-8 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
