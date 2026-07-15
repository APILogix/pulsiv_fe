import { Outlet } from "react-router";

// Full-width, full-height module shell. This is the single scroll container for
// "dashboard" style pages. List pages use the FillPage shell to pin their header
// and scroll only their table body (see src/shared/observe/primitives.tsx).
export function ModuleLayout() {
  return (
    <div className="h-full w-full overflow-y-auto sidebar-scroll">
      <div className="w-full px-6 py-6">
        <Outlet />
      </div>
    </div>
  );
}
