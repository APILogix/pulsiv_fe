import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "../layouts/RootLayout";
import { publicRoutes } from "./public-routes";
import { protectedRoutes } from "./protected-routes";
import { RouteErrorBoundary } from "@/shared/components/error-boundary/AppErrorBoundary";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      ...publicRoutes,
      ...protectedRoutes,
    ],
  },
]);
