import { useRef } from "react";
import { Outlet } from "react-router";

import { RouteBoundary, useScrollRestoration } from "@/shared/motion";

/**
 * Full-width, full-height module shell. This is the single scroll container for
 * "dashboard" style pages. List pages use the FillPage shell to pin their header
 * and scroll only their table body (see src/shared/observe/primitives.tsx).
 *
 * Two things happen here beyond layout:
 *  - `useScrollRestoration` resets this container to the top on a forward
 *    navigation and restores the previous offset on back. Without it, moving
 *    between pages inside one module inherited the previous page's scrollTop,
 *    which is the "page opened halfway down" jump.
 *  - the page-level `RouteBoundary` swaps in a route-specific skeleton on every
 *    page change, since the module-level boundary in AppLayout deliberately does
 *    not remount within a module.
 */
export function ModuleLayout() {
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollRestoration(scrollRef);

  return (
    <div ref={scrollRef} className="scroll-region h-full w-full overflow-y-auto sidebar-scroll">
      <div className="w-full px-6 py-6">
        <RouteBoundary scope="page">
          <Outlet />
        </RouteBoundary>
      </div>
    </div>
  );
}
