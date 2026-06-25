import { AuthLayout } from "@/app/layouts/AuthLayout";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";

import LoginMfaPage from "../pages/LoginMfaPage";
import SsoLoginPage from "../pages/SsoLoginPage";
import VerifyEmailPage from "../pages/VerifyEmailPage";
import AccountUnlockRequestPage from "../pages/AccountUnlockRequestPage";
import AccountUnlockConfirmPage from "../pages/AccountUnlockConfirmPage";
import BackupCodesPage from "../pages/BackupCodesPage";

export const authRoutes = [
  {
    element: <AuthLayout />,
    children: [
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "login/backup-code",
        element: <BackupCodesPage />,
      },
      {
        path: "login/mfa",
        element: <LoginMfaPage />,
      },
      {
        path: "login/sso",
        element: <SsoLoginPage />,
      },
      {
        path: "register",
        element: <RegisterPage />,
      },
      {
        path: "verify-email",
        element: <VerifyEmailPage />,
      },
      {
        path: "forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        path: "reset-password",
        element: <ResetPasswordPage />,
      },
      {
        path: "unlock",
        element: <AccountUnlockRequestPage />,
      },
      {
        path: "unlock/confirm",
        element: <AccountUnlockConfirmPage />,
      },
    ],
  },
];
