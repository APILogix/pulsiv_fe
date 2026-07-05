export const authQueryKeys = {
  currentUser: ['auth', 'current-user'] as const,
  sessions: ['auth', 'sessions'] as const,
  mfaDevices: ['auth', 'mfa-devices'] as const,
  trustedDevices: ['auth', 'trusted-devices'] as const,
  securitySummary: ['auth', 'security-summary'] as const,
  auditEvents: (userId: string) => ['auth', 'audit-events', userId] as const,
};

export const authQueryCache = {
  currentUserStaleMs: 10 * 60 * 1000,
  securityStateStaleMs: 5 * 60 * 1000,
  activityStaleMs: 2 * 60 * 1000,
  gcMs: 30 * 60 * 1000,
};

