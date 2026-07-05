
import { RouteObject } from "react-router";
import { RequireGuest } from "./route-guards";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { LoadingScreen } from "@/shared/components/LoadingScreen";

import LoginPage from "@/modules/auth/pages/LoginPage";
import RegisterPage from "@/modules/auth/pages/RegisterPage";
import ForgotPasswordPage from "@/modules/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/modules/auth/pages/ResetPasswordPage";
import VerifyEmailPage from "@/modules/auth/pages/VerifyEmailPage";
import LoginMfaPage from "@/modules/auth/pages/LoginMfaPage";
import AccountUnlockRequestPage from "@/modules/auth/pages/AccountUnlockRequestPage";
import AccountUnlockConfirmPage from "@/modules/auth/pages/AccountUnlockConfirmPage";
import SsoLoginPage from "@/modules/auth/pages/SsoLoginPage";
import BackupCodesPage from "@/modules/auth/pages/BackupCodesPage";
import AccountDeletionConfirmPage from "@/modules/auth/pages/AccountDeletionConfirmPage";
import AuthCallbackPage from "@/modules/auth/pages/AuthCallbackPage";

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
