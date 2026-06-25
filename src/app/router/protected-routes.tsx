import { lazy } from "react";
import { RouteObject } from "react-router";
import { RequireAuth, RequireAdmin } from "./route-guards";
import { AppLayout } from "../layouts/AppLayout";

const DashboardPage = lazy(() => import("@/modules/dashboard/index").then((m) => ({ default: m.DashboardPage ?? (() => null) })));
const SecurityCenterPage = lazy(() => import("@/modules/auth/pages/SecurityCenterPage").then((m) => ({ default: m.default })));
const ProfilePage = lazy(() => import("@/modules/auth/pages/ProfilePage").then((m) => ({ default: m.default })));
const ChangePasswordPage = lazy(() => import("@/modules/auth/pages/ChangePasswordPage").then((m) => ({ default: m.default })));
const MfaSetupPage = lazy(() => import("@/modules/auth/pages/MfaSetupPage").then((m) => ({ default: m.default })));
const MfaDevicesPage = lazy(() => import("@/modules/auth/pages/MfaDevicesPage").then((m) => ({ default: m.default })));
const SessionsPage = lazy(() => import("@/modules/auth/pages/SessionsPage").then((m) => ({ default: m.default })));
const StepUpPage = lazy(() => import("@/modules/auth/pages/StepUpPage").then((m) => ({ default: m.default })));
const AdminUsersPage = lazy(() => import("@/modules/auth/pages/AdminUsersPage").then((m) => ({ default: m.default })));

const SettingsLayout = lazy(() => import("../layouts/SettingsLayout"));
const ModuleLayout = lazy(() => import("../layouts/ModuleLayout").then((m) => ({ default: m.ModuleLayout })));
const SettingsGeneralPage = lazy(() => import("@/modules/settings/pages/SettingsGeneralPage"));
const SettingsBillingPage = lazy(() => import("@/modules/settings/pages/SettingsBillingPage"));
const SettingsUsagePage = lazy(() => import("@/modules/settings/pages/SettingsUsagePage"));
const SettingsPlaceholderPage = lazy(() => import("@/modules/settings/pages/SettingsPlaceholderPage"));
const ModulePlaceholderPage = lazy(() => import("@/modules/platform/pages/ModulePlaceholderPage"));

export const protectedRoutes: RouteObject[] = [
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "dashboard", element: <DashboardPage /> },

          {
            path: "observability",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <ModulePlaceholderPage /> },
              { path: "requests", element: <ModulePlaceholderPage /> },
              { path: "events", element: <ModulePlaceholderPage /> },
              { path: "errors", element: <ModulePlaceholderPage /> },
              { path: "service-health", element: <ModulePlaceholderPage /> },
              { path: "latency", element: <ModulePlaceholderPage /> },
              { path: "traces", element: <ModulePlaceholderPage /> },
              { path: "logs", element: <ModulePlaceholderPage /> },
            ],
          },
          {
            path: "projects",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <ModulePlaceholderPage /> },
              { path: "overview", element: <ModulePlaceholderPage /> },
              { path: "api-keys", element: <ModulePlaceholderPage /> },
              { path: "usage", element: <ModulePlaceholderPage /> },
              { path: "settings", element: <ModulePlaceholderPage /> },
            ],
          },
          {
            path: "alerts",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <ModulePlaceholderPage /> },
              { path: "rules", element: <ModulePlaceholderPage /> },
              { path: "escalations", element: <ModulePlaceholderPage /> },
              { path: "channels", element: <ModulePlaceholderPage /> },
            ],
          },
          {
            path: "ingestion",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <ModulePlaceholderPage /> },
              { path: "endpoints", element: <ModulePlaceholderPage /> },
              { path: "health", element: <ModulePlaceholderPage /> },
              { path: "keys", element: <ModulePlaceholderPage /> },
              { path: "replay", element: <ModulePlaceholderPage /> },
              { path: "rate-limits", element: <ModulePlaceholderPage /> },
            ],
          },
          {
            path: "ai",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <ModulePlaceholderPage /> },
              { path: "root-cause", element: <ModulePlaceholderPage /> },
              { path: "anomalies", element: <ModulePlaceholderPage /> },
              { path: "release-impact", element: <ModulePlaceholderPage /> },
              { path: "costs", element: <ModulePlaceholderPage /> },
              { path: "policies", element: <ModulePlaceholderPage /> },
            ],
          },
          {
            path: "admin",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <ModulePlaceholderPage /> },
              { path: "members", element: <AdminUsersPage /> },
              { path: "invitations", element: <ModulePlaceholderPage /> },
              { path: "sso", element: <ModulePlaceholderPage /> },
              { path: "scim", element: <ModulePlaceholderPage /> },
              { path: "security-events", element: <ModulePlaceholderPage /> },
              { path: "audit-logs", element: <ModulePlaceholderPage /> },
              { path: "quota-requests", element: <ModulePlaceholderPage /> },
              { path: "api-keys", element: <ModulePlaceholderPage /> },
              { path: "environments", element: <ModulePlaceholderPage /> },
              { path: "compliance", element: <ModulePlaceholderPage /> },
            ],
          },
          {
            path: "billing",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <ModulePlaceholderPage /> },
              { path: "usage", element: <ModulePlaceholderPage /> },
              { path: "invoices", element: <ModulePlaceholderPage /> },
              { path: "payment-methods", element: <ModulePlaceholderPage /> },
              { path: "quotas", element: <ModulePlaceholderPage /> },
              { path: "promotions", element: <ModulePlaceholderPage /> },
              { path: "admin", element: <ModulePlaceholderPage /> },
            ],
          },

          {
            path: "settings",
            element: <SettingsLayout />,
            children: [
              { index: true, element: <SettingsGeneralPage /> },
              { path: "security", element: <SecurityCenterPage /> },
              { path: "billing", element: <SettingsBillingPage /> },
              { path: "usage", element: <SettingsUsagePage /> },
              { path: "api-keys", element: <SettingsPlaceholderPage /> },
              { path: "webhooks", element: <SettingsPlaceholderPage /> },
              { path: "integrations", element: <SettingsPlaceholderPage /> },
              { path: "data-retention", element: <SettingsPlaceholderPage /> },
              { path: "alert-rules", element: <SettingsPlaceholderPage /> },
              { path: "audit-log", element: <SettingsPlaceholderPage /> },
              {
                element: <RequireAdmin />,
                children: [
                  { path: "members", element: <AdminUsersPage /> },
                  { path: "scim", element: <SettingsPlaceholderPage /> },
                ],
              },
            ],
          },

          { path: "auth/profile", element: <ProfilePage /> },
          { path: "auth/security", element: <SecurityCenterPage /> },
          { path: "auth/change-password", element: <ChangePasswordPage /> },
          { path: "auth/mfa-setup", element: <MfaSetupPage /> },
          { path: "auth/mfa-devices", element: <MfaDevicesPage /> },
          { path: "auth/sessions", element: <SessionsPage /> },
          { path: "auth/step-up", element: <StepUpPage /> },
        ],
      },
    ],
  },
];
