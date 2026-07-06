import { apiClient } from '@/infrastructure/api-client/axios';
import { tokenService } from '../services/token.service';
import { useOrgStore } from '@/modules/organizations/store/org.store';
import type {
  AuthSession,
  LoginMfaChallenge,
} from '../types/auth.types';
import type * as s from '../schemas/auth.schema';

function storeSession(p: AuthSession) {
  tokenService.setAccessToken(p.access_token, p.expires_at);
  tokenService.setCurrentOrgId(p.current_org_id);
  if (p.current_org_id !== undefined) {
    useOrgStore.getState().setActiveOrgId(p.current_org_id ?? null);
  }
}

export const authApi = {
  async login(data: s.LoginFormData): Promise<AuthSession | LoginMfaChallenge> {
    const r = await apiClient.post('/auth/login', data);
    const p = r.data.data;
    if (p.mfa_required) return p as LoginMfaChallenge;
    storeSession(p); return p as AuthSession;
  },
  async loginMfa(data: s.LoginMfaFormData): Promise<AuthSession> {
    const r = await apiClient.post('/auth/login/mfa', data);
    storeSession(r.data.data); return r.data.data;
  },
  async loginBackupCode(data: s.BackupCodeLoginFormData): Promise<AuthSession> {
    const r = await apiClient.post('/auth/login/backup-code', data);
    storeSession(r.data.data); return r.data.data;
  },
  async switchLoginMfaMethod(challenge_id: string, device_id: string): Promise<{ message: string }> {
    const r = await apiClient.post('/auth/login/mfa/switch', { challenge_id, device_id });
    return r.data.data;
  },
  async register(data: s.RegisterFormData): Promise<{ message: string }> {
    const r = await apiClient.post('/auth/register', data);
    return { message: r.data.message };
  },
  getCurrentUser: () => apiClient.get('/auth/users/me').then(r => r.data.data),
  getUserSecuritySummary: () => apiClient.get('/auth/users/me/security-summary').then(r => r.data.data),
  updateCurrentUser: (d: s.UpdateProfileFormData) => apiClient.patch('/auth/users/me', d).then(r => r.data.data),
  deleteCurrentUser: () => apiClient.delete('/auth/users/me'),
  listUsers: (p: s.ListUsersQueryFormData) => apiClient.get('/auth/users', { params: p }).then(r => ({ data: r.data.data, meta: r.data.meta })),
  getUserById: (id: string) => apiClient.get(`/auth/users/${id}`).then(r => r.data.data),
  restoreUser: (id: string) => apiClient.post(`/auth/users/${id}/restore`).then(r => r.data.data),
  suspendUser: (id: string, d: s.AdminLockUserFormData) => apiClient.post(`/auth/users/${id}/suspend`, d).then(r => r.data.data),
  unsuspendUser: (id: string) => apiClient.post(`/auth/users/${id}/unsuspend`).then(r => r.data.data),
  lockUser: (id: string, d: s.AdminLockUserFormData) => apiClient.post(`/auth/users/${id}/lock`, d).then(r => r.data.data),
  unlockUser: (id: string) => apiClient.post(`/auth/users/${id}/unlock`).then(r => r.data.data),
  adminRevokeSessions: (id: string) => apiClient.delete(`/auth/users/${id}/sessions`),
  adminForcePasswordReset: (id: string, d?: s.AdminForcePasswordResetFormData) => apiClient.post(`/auth/users/${id}/password/reset`, d),
  forgotPassword: (d: s.ForgotPasswordFormData) => apiClient.post('/auth/forgot-password', d),
  resetPassword: (d: s.ResetPasswordFormData) => apiClient.post('/auth/reset-password', { token: d.token, new_password: d.new_password }),
  resendVerification: (d: s.ResendVerificationFormData) => apiClient.post('/auth/resend-verification', d),
  verifyEmail: (d: s.VerifyEmailFormData) => apiClient.post('/auth/verify-email/confirm', d),
  changePassword: async (d: s.ChangePasswordFormData): Promise<AuthSession> => {
    const r = await apiClient.post('/auth/password/change', d);
    storeSession(r.data.data); return r.data.data;
  },
  setupMFA: (d: s.MfaSetupFormData) => apiClient.post('/auth/mfa/setup', d).then(r => r.data.data),
  verifyMFASetup: (d: s.MfaVerifySetupFormData) => apiClient.post('/auth/mfa/verify-setup', d),
  requestMFAChallenge: () => apiClient.post('/auth/mfa/challenge').then(r => r.data.data),
  verifyMFAChallenge: (d: s.MfaVerifyStepUpFormData) => apiClient.post('/auth/mfa/verify', d).then(r => r.data.data),
  resendEmailMfaOtp: (device_id: string) => apiClient.post('/auth/mfa/email/resend', { device_id }),
  listMFADevices: () => apiClient.get('/auth/mfa/devices').then(r => r.data.data),
  removeMFADevice: (id: string, cp?: string) => apiClient.delete(`/auth/mfa/devices/${id}`, { data: { current_password: cp } }),
  renameMFADevice: (id: string, dn: string) => apiClient.patch(`/auth/mfa/devices/${id}`, { device_name: dn }),
  setPrimaryMFADevice: (id: string) => apiClient.patch(`/auth/mfa/devices/${id}/primary`),
  regenerateBackupCodes: (d: s.RegenerateBackupCodesFormData) => apiClient.post('/auth/mfa/backup-codes', d).then(r => r.data.data),
  toggleMFA: (d: s.MfaToggleFormData) => apiClient.patch('/auth/mfa/toggle', d).then(r => r.data.data),
  disableMFA: (d: s.MfaDisableRequestFormData = {}) => apiClient.post('/auth/mfa/disable', d).then(r => r.data.data),
  requestDisableMFA: (d: s.MfaDisableRequestFormData = {}) => apiClient.post('/auth/mfa/disable/request', d).then(r => r.data.data),
  listSessions: () => apiClient.get('/auth/sessions').then(r => r.data.data),
  revokeSession: (id: string) => apiClient.delete(`/auth/sessions/${id}`),
  revokeAllSessions: () => apiClient.delete('/auth/sessions').then(r => r.data.data),
  revokeOtherSessions: () => apiClient.delete('/auth/sessions/others').then(r => r.data.data),
  refreshSession: async (): Promise<AuthSession> => { const r = await apiClient.post('/auth/sessions/refresh'); storeSession(r.data.data); return r.data.data; },
  logout: async () => { await apiClient.post('/auth/logout'); tokenService.clearTokens(); },
  getPasswordPolicy: () => apiClient.get('/auth/password/policy').then(r => r.data.data),
  getEmailVerificationStatus: () => apiClient.get('/auth/users/me/verification').then(r => r.data.data),
  getEffectivePolicy: () => apiClient.get('/auth/policy/effective').then(r => r.data.data),
  discoverSSO: (email: string) => apiClient.get('/auth/sso/discovery', { params: { email } }).then(r => r.data.data),
  requestAccountUnlock: (d: s.AccountUnlockRequestFormData) => apiClient.post('/auth/account/unlock/request', d),
  confirmAccountUnlock: (d: s.AccountUnlockConfirmFormData) => apiClient.post('/auth/account/unlock/confirm', d),
  exportUserData: () => apiClient.get('/auth/users/me/export').then(r => r.data.data),
  requestAccountDeletion: (d: s.DeleteAccountFormData) => apiClient.post('/auth/users/me/delete/request', d),
  confirmAccountDeletion: (token: string) => apiClient.post('/auth/users/me/delete/confirm', { token }),
  requestMfaRecovery: (d: s.MfaRecoveryRequestFormData) => apiClient.post('/auth/mfa/recovery/request', d),
  ssoLogin: (d: s.SsoLoginFormData) => apiClient.post('/auth/sso/login', d).then(r => r.data.data),
  socialLogin: (provider: string) => apiClient.post(`/auth/login/social/${provider}`).then(r => r.data.data),
  listTrustedDevices: () => apiClient.get('/auth/trusted-devices').then(r => r.data.data),
  trustDevice: (dn?: string) => apiClient.post('/auth/trusted-devices', { device_name: dn }),
  revokeTrustedDevice: (id: string) => apiClient.delete(`/auth/trusted-devices/${id}`),
  webauthnRegisterOptions: (device_name: string) => apiClient.post('/auth/mfa/webauthn/register/options', { device_name }).then(r => r.data.data),
  webauthnRegisterVerify: (d: { device_name: string; challenge: string; response: unknown }) => apiClient.post('/auth/mfa/webauthn/register/verify', d).then(r => r.data.data),
  webauthnLoginMfaOptions: (challenge_id: string) => apiClient.post('/auth/login/mfa/webauthn/options', { challenge_id }).then(r => r.data.data),
  webauthnLoginMfaVerify: async (d: { challenge_id: string; challenge: string; response: unknown }): Promise<AuthSession> => {
    const r = await apiClient.post('/auth/login/mfa/webauthn/verify', d);
    storeSession(r.data.data); return r.data.data;
  },
  webauthnStepUpOptions: (challenge_id: string) => apiClient.post('/auth/mfa/step-up/webauthn/options', { challenge_id }).then(r => r.data.data),
  webauthnStepUpVerify: (d: { challenge_id: string; challenge: string; response: unknown }) => apiClient.post('/auth/mfa/step-up/webauthn/verify', d).then(r => r.data.data),
  getUserAuditEvents: (id: string, p: { limit?: number; offset?: number }) => apiClient.get(`/auth/users/${id}/audit-events`, { params: p }).then(r => ({ data: r.data.data, meta: r.data.meta })),
};
