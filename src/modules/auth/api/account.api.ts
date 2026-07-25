import { apiClient } from '@/infrastructure/api-client/axios';

export interface AccountProfile {
  id: string;
  display_name: string;
  full_name: string | null;
  email: string;
  email_verified: boolean;
  avatar_url: string | null;
  timezone: string;
  locale: string;
  preferences: {
    marketing_emails: boolean;
    product_updates: boolean;
  };
}

export interface AccountOverview {
  user: Omit<AccountProfile, 'preferences'>;
  security_health: {
    status: 'secure' | 'attention' | 'critical';
    actions_needed: number;
    checks: {
      email_verified: boolean;
      mfa_enabled: boolean;
      backup_codes_remaining: number;
      has_trusted_devices: boolean;
      has_recovery_method: boolean;
    };
  };
  mfa_summary: {
    enabled: boolean;
    methods: Array<{ method: string; name: string | null; is_default: boolean }>;
  };
  sessions: { active_count: number };
  backup_codes?: { remaining: number };
  trusted_devices?: { count: number };
  passkeys?: { count: number };
  recent_activity: Array<{
    event_type: string;
    description: string | null;
    location: string | null;
    ip_address: string | null;
    created_at: string;
  }>;
}

export interface UpdateAccountProfileInput {
  display_name: string;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  locale: string;
  marketing_emails: boolean;
  product_updates: boolean;
}

export const accountApi = {
  getOverview: () => apiClient.get('/user/account/overview').then((r) => r.data as AccountOverview),
  getProfile: () => apiClient.get('/user/profile').then((r) => r.data as AccountProfile),
  updateProfile: (data: UpdateAccountProfileInput) => apiClient.patch('/user/profile', data).then((r) => r.data as AccountProfile),
  deleteAvatar: () => apiClient.delete('/user/avatar').then((r) => r.data as AccountProfile),
  exportData: (data: { password?: string; mfa_code?: string }) => apiClient.post('/user/account/export-data', data).then((r) => r.data),
  signOutAllDevices: () => apiClient.post('/user/sessions/sign-out-all-devices').then((r) => r.data),
};
