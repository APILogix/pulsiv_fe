import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { useAuthStore } from '@/modules/auth/store/auth.store';

/**
 * Maps backend error responses ({ error: { code, message, details } })
 * to readable user-facing strings.
 */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Invalid email or password.',
  USER_NOT_FOUND: 'No account found with that email.',
  USER_EXISTS: 'An account with that email already exists.',
  EMAIL_IN_USE: 'An account with that email already exists.',
  EMAIL_NOT_VERIFIED: 'Please verify your email address before signing in.',
  ACCOUNT_LOCKED: 'Your account is locked. Please try again later or contact support.',
  USER_SUSPENDED: 'Your account has been suspended. Contact support for details.',
  USER_DELETED: 'This account has been deleted.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  MFA_REQUIRED: 'Multi-factor authentication is required.',
  MFA_INVALID: 'Invalid MFA code.',
  MFA_CHALLENGE_EXPIRED: 'The MFA challenge has expired. Please start over.',
  STEP_UP_REQUIRED: 'Additional verification is required to complete this action.',
  PASSWORD_INCORRECT: 'Current password is incorrect.',
  PASSWORD_REUSE_NOT_ALLOWED: 'Cannot reuse a recent password.',
  PASSWORD_RESET_INVALID: 'Invalid or expired reset token.',
  PASSWORD_RESET_EXPIRED: 'The reset link has expired. Please request a new one.',
  PASSWORD_EXPIRED: 'Your password has expired. Please reset it.',
  MFA_ALREADY_ENABLED: 'MFA is already enabled.',
  MFA_NOT_ENABLED: 'MFA is not enabled.',
  MFA_DEVICE_NOT_FOUND: 'MFA device not found.',
  SESSION_INVALID: 'Your session is invalid. Please sign in again.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  EMAIL_VERIFICATION_INVALID: 'Invalid or expired verification token.',
  SSO_REQUIRED: 'Single sign-on is required for this account.',
  SSO_NOT_CONFIGURED: 'SSO is not configured for this organization.',
  SAML_NOT_CONFIGURED: 'SAML is not configured for this organization.',
  IDENTITY_ALREADY_LINKED: 'This identity provider is already linked.',
  SOCIAL_LOGIN_FAILED: 'Social login failed. Please try again.',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  INVALID_OPERATION: 'This operation is not allowed in the current state.',
  DELETION_ALREADY_SCHEDULED: 'Account deletion is already scheduled.',
};

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const backendError = error.response?.data?.error;
    if (backendError) {
      if (backendError.code && ERROR_CODE_MESSAGES[backendError.code]) {
        return ERROR_CODE_MESSAGES[backendError.code];
      }
      return backendError.message || 'An error occurred. Please try again.';
    }

    if (error.code === 'ERR_NETWORK') {
      return 'Unable to reach the server. Check your connection.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
  }

  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred. Please try again.';
}

export function getValidationErrors(error: unknown): Record<string, string> | null {
  if (axios.isAxiosError(error)) {
    const details = error.response?.data?.error?.details;
    if (details?.issues && Array.isArray(details.issues)) {
      const fieldErrors = details.issues as Array<{
        path: string[];
        message: string;
      }>;
      const result: Record<string, string> = {};
      for (const issue of fieldErrors) {
        const field = issue.path[issue.path.length - 1] ?? issue.path[0];
        if (issue.message) {
          result[field] = issue.message;
        }
      }
      return Object.keys(result).length > 0 ? result : null;
    }
  }
  return null;
}

export function getErrorCode(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.code ?? null;
  }
  return null;
}

/**
 * Error interceptor — surfaces readable error messages for non-401 failures
 * (401 is handled by the refresh interceptor). Re-throws so callers can
 * map error codes to user-friendly text via getErrorMessage().
 * 
 * Also intercepts 403 STEP_UP_REQUIRED to trigger the global MFA modal and retry.
 */
export function createErrorInterceptor(client: AxiosInstance) {
  return async function errorInterceptor(error: AxiosError) {
    if (error.response?.status === 403) {
      const code = getErrorCode(error);
      if (code === 'STEP_UP_REQUIRED' && error.config) {
        try {
          const { triggerStepUp } = useAuthStore.getState();
          
          // Wait for the user to complete the step-up challenge
          await triggerStepUp();
          
          // Retry the original request
          return client.request(error.config);
        } catch {
          // Step-up failed or was cancelled, reject the original request
          return Promise.reject(error);
        }
      }
    }

    return Promise.reject(error);
  };
}
