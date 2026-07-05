import { Suspense } from "react";
import { Outlet } from "react-router";
import { LoadingScreen } from "@/shared/components/LoadingScreen";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Suspense fallback={<LoadingScreen message="Loading..." />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
