import { Suspense } from "react";
import { Outlet } from "react-router";
import { RouteLoadingRegion } from "@/shared/ui/loading";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Suspense fallback={<RouteLoadingRegion className="min-h-screen" label="Loading application screen" />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
