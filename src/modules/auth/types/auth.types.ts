/**
 * Backend-accurate auth types.
 * Source of truth: pulse/src/modules/auth/types.ts
 */

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'deleted';
export type MFAType = 'totp' | 'sms' | 'email' | 'hardware_key' | 'backup_codes';
export type SessionStatus = 'active' | 'expired' | 'revoked' | 'terminated_by_admin';

export interface UserProfile {
  id: string;
  email: string;
  email_verified: boolean;
  full_name: string;
  avatar_url: string | null;
  status: UserStatus;
  is_admin: boolean;
  mfa_enabled: boolean;
  timezone: string;
  locale: string;
  last_login_at: string | null;
  created_at: string;
}

export interface AuthSession {
  access_token: string;
  expires_at: string;
  token_type: string;
  session_id: string;
  user_id?: string;
}

export interface UserSecuritySummary {
  email_verified: boolean;
  mfa_enabled: boolean;
  active_session_count: number;
  verified_mfa_device_count: number;
  last_login_at: string | null;
  last_password_change: string | null;
  account_locked: boolean;
  locked_until: string | null;
  status: UserStatus;
}

export interface MFADeviceDto {
  id: string;
  type: MFAType;
  name: string;
  display_hint?: string | null;
  verified: boolean;
  is_primary: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface MFAChallenge {
  challenge_id: string;
  device_id: string;
  device_type: MFAType;
  expires_at: string;
}

export interface LoginMfaMethod {
  id: string;
  type: MFAType;
  name: string;
  display_hint?: string | null;
  is_primary?: boolean;
  last_used_at?: string | null;
}

export interface LoginMfaChallenge {
  mfa_required: true;
  challenge_id: string;
  expires_at: string;
  device_type: MFAType;
  available_methods?: LoginMfaMethod[];
}

export interface TOTPSetupDto {
  device_id: string;
  device_type: 'totp';
  secret: string;
  qr_code_url: string;
  backup_codes: string[];
  warning: string;
}

export interface EmailMFASetupDto {
  device_id: string;
  device_type: 'email';
  backup_codes: string[];
  warning: string;
}

type MFASetupDto = TOTPSetupDto | EmailMFASetupDto;
export type { MFASetupDto };

export interface BackupCodesDto {
  backup_codes: string[];
  warning: string;
}

export interface SsoDiscoveryResult {
  domain: string;
  sso_available: boolean;
  providers: Array<{
    org_id: string;
    org_name: string;
    provider_id: string;
    provider_type: string;
    provider_name: string;
  }>;
  oidc_login_ready: boolean;
  saml_login_ready: boolean;
  configured_link_providers: Array<'google' | 'github' | 'microsoft'>;
  social_login_ready: boolean;
  linked_social_providers: Array<'google' | 'github' | 'microsoft'>;
}

export interface LinkedIdentity {
  id: string;
  provider: string;
  provider_user_id: string | null;
  linked_at: string;
}

export interface TrustedDevice {
  id: string;
  device_name: string | null;
  trusted_at: string;
  expires_at: string;
  last_seen_at: string;
}

export interface SessionInfo {
  id: string;
  device_name: string | null;
  device_type: string | null;
  ip_address: string;
  ip_geo_country: string | null;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
}

export interface AuditEvent {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  org_id: string | null;
  ip_address: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface UserDataExport {
  exported_at: string;
  user: UserProfile;
  mfa_devices: Array<{
    id: string;
    type: string;
    name: string;
    verified: boolean;
    is_primary: boolean;
    last_used_at: string | null;
  }>;
  sessions: SessionInfo[];
}

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string;
  status: UserStatus;
  is_admin: boolean;
  mfa_enabled: boolean;
  created_at: string;
  last_login_at: string | null;
  locked_until: string | null;
  deleted_at: string | null;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiPaginatedResponse<T> {
  data: T;
  meta: { total: number; limit: number; offset: number };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
