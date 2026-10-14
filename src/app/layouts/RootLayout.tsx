import { Suspense } from "react";
import { Outlet } from "react-router";
import { DocumentHeadManager } from "@/app/router/DocumentHeadManager";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <DocumentHeadManager />
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </div>
  );
}

