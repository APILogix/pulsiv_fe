import { lazy } from "react";
import { RouteObject } from "react-router";
import { RequireGuest } from "./route-guards";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { LoadingScreen } from "@/shared/components/LoadingScreen";

// Lazy-load every auth page so the initial bundle stays small and
// auth pages render fast (previously all were eagerly imported).
const LoginPage = lazy(() => import("@/modules/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/modules/auth/pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/modules/auth/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/modules/auth/pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("@/modules/auth/pages/VerifyEmailPage"));
const LoginMfaPage = lazy(() => import("@/modules/auth/pages/LoginMfaPage"));
const AccountUnlockRequestPage = lazy(() => import("@/modules/auth/pages/AccountUnlockRequestPage"));
const AccountUnlockConfirmPage = lazy(() => import("@/modules/auth/pages/AccountUnlockConfirmPage"));
const SsoLoginPage = lazy(() => import("@/modules/auth/pages/SsoLoginPage"));
const BackupCodesPage = lazy(() => import("@/modules/auth/pages/BackupCodesPage"));
const AccountDeletionConfirmPage = lazy(() => import("@/modules/auth/pages/AccountDeletionConfirmPage"));
const AuthCallbackPage = lazy(() => import("@/modules/auth/pages/AuthCallbackPage"));

export const publicRoutes: RouteObject[] = [
  {
    path: "auth/callback",
    element: <AuthCallbackPage />,
  },
  {
    path: "account/delete/confirm",
    element: <AccountDeletionConfirmPage />,
  },
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
