import { lazy } from "react";
import { RouteObject } from "react-router";
import { RequireGuest } from "./route-guards";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { LoadingScreen } from "@/shared/components/LoadingScreen";

const LoginPage = lazy(() => import("@/modules/auth/pages/LoginPage").then(m => ({ default: m.default })));
const RegisterPage = lazy(() => import("@/modules/auth/pages/RegisterPage").then(m => ({ default: m.default })));
const ForgotPasswordPage = lazy(() => import("@/modules/auth/pages/ForgotPasswordPage").then(m => ({ default: m.default })));
const ResetPasswordPage = lazy(() => import("@/modules/auth/pages/ResetPasswordPage").then(m => ({ default: m.default })));
const VerifyEmailPage = lazy(() => import("@/modules/auth/pages/VerifyEmailPage").then(m => ({ default: m.default })));
const LoginMfaPage = lazy(() => import("@/modules/auth/pages/LoginMfaPage").then(m => ({ default: m.default })));
const AccountUnlockRequestPage = lazy(() => import("@/modules/auth/pages/AccountUnlockRequestPage").then(m => ({ default: m.default })));
const AccountUnlockConfirmPage = lazy(() => import("@/modules/auth/pages/AccountUnlockConfirmPage").then(m => ({ default: m.default })));
const SsoLoginPage = lazy(() => import("@/modules/auth/pages/SsoLoginPage").then(m => ({ default: m.default })));
const BackupCodesPage = lazy(() => import("@/modules/auth/pages/BackupCodesPage").then(m => ({ default: m.default })));

export const publicRoutes: RouteObject[] = [
  {
    element: <RequireGuest />,
    children: [
      {
        path: "auth",
        element: <AuthLayout />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
          { path: "forgot-password", element: <ForgotPasswordPage /> },
          { path: "reset-password", element: <ResetPasswordPage /> },
          { path: "verify-email", element: <VerifyEmailPage /> },
          { path: "login/mfa", element: <LoginMfaPage /> },
          { path: "unlock", element: <AccountUnlockRequestPage /> },
          { path: "unlock/confirm", element: <AccountUnlockConfirmPage /> },
          { path: "login/sso", element: <SsoLoginPage /> },
          { path: "login/backup-code", element: <BackupCodesPage /> },
        ],
      },
    ],
  },
  {
    path: "/loading",
    element: <LoadingScreen />,
  },
];