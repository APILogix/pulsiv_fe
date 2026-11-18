import { Suspense } from "react";
import { Outlet } from "react-router";
import { DocumentHeadManager } from "@/app/router/DocumentHeadManager";
import { RouteSkeleton } from "@/shared/skeletons/RouteSkeleton";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <DocumentHeadManager />
      <Suspense fallback={<RouteSkeleton framed />}>
        <Outlet />
      </Suspense>
    </div>
  );
}

