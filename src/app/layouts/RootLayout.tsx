import { Suspense } from "react";
import { Outlet } from "react-router";
import { RouteSkeleton } from "@/shared/skeletons";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Suspense fallback={<RouteSkeleton padded className="min-h-screen p-6" />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
