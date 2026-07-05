export type OrgStatus = 'active' | 'trialing' | 'suspended' | 'locked' | 'archived' | 'delinquent';
export type OrgRole = 'owner' | 'admin' | 'developer' | 'billing' | 'security' | 'member' | 'viewer';
export type MemberStatus = 'invited' | 'active' | 'suspended' | 'removed' | 'locked';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical';
export type QuotaRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type SsoProviderType = 'saml' | 'oidc';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  industry: string | null;
  companySize: string | null;
  country: string | null;
  timezone: string;
  billingEmail: string | null;
  supportEmail: string | null;
  ownerUserId: string;
  status: OrgStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: OrgRole;
  status: OrgStatus;
  createdAt: string;
}

export interface OrgSettings {
  enforceSso: boolean;
  enforceMfa: boolean;
  sessionTimeoutMinutes: number;
  dataRegion: string;
  dataRetentionDays: number;
  auditLogRetentionDays: number;
  allowPublicProjects: boolean;
}

export interface Member {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: OrgRole;
  status: MemberStatus;
  joinedAt: string | null;
  lastActiveAt: string | null;
  createdAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: OrgRole;
  status: InvitationStatus;
  expiresAt: string;
  invitedAt: string;
  invitedBy: { id: string; email: string | null; name: string | null };
}

export interface InvitationValidation {
  id: string;
  valid: boolean;
  email: string;
  role: OrgRole;
  orgName: string | null;
  orgSlug: string | null;
  expiresAt: string | null;
  accountExists: boolean;
}

export interface InvitationCreateResult {
  invitation: Invitation;
  accountExists: boolean;
  emailSent: boolean;
}

export interface Environment {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isProduction: boolean;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  role: OrgRole;
  environmentId: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface SsoProvider {
  id: string;
  providerName: string;
  providerType: SsoProviderType;
  entityId: string | null;
  ssoUrl: string | null;
  domain: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateSsoProviderInput {
  providerName: string;
  providerType: SsoProviderType;
  entityId?: string;
  ssoUrl?: string;
  x509Certificate?: string;
  domain?: string;
}

export interface UpdateSsoProviderInput {
  providerName?: string;
  entityId?: string;
  ssoUrl?: string;
  x509Certificate?: string;
  domain?: string;
  isActive?: boolean;
}

export interface ScimToken {
  id: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  scopes: string[];
  allowedIps: string[];
}

export interface CreateScimTokenInput {
  scopes: Array<'read' | 'write' | 'delete'>;
  allowedIps?: string[];
  expiresInDays?: number;
}

export interface SecurityEvent {
  id: string;
  userId: string | null;
  eventType: string;
  severity: SecurityEventSeverity;
  ipAddress: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  status: string;
  createdAt: string;
}

export interface QuotaRequest {
  id: string;
  quotaType: string;
  currentLimit: number;
  requestedLimit: number;
  reason: string;
  status: QuotaRequestStatus;
  reviewedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface OrganizationBillingSummary {
  subscription: {
    id: string | null;
    status: string;
  };
  plan: {
    id: string | null;
    key: string | null;
    tier: string | null;
    eventLimitMonthly: number;
    hardCap: boolean;
    features: Record<string, unknown> | null;
  };
  usage: {
    activeMembers: number;
    pendingInvitations: number;
    environments: number;
    apiKeys: number;
    ssoProviders: number;
    scimTokens: number;
  };
}

export interface UsageLimitBucket {
  used: number | null;
  pending?: number;
  limit: number | null;
  enabled?: boolean;
  hardCap?: boolean;
}

export interface UsageLimitsResponse {
  subscriptionStatus: string;
  planKey: string | null;
  limits: {
    members: UsageLimitBucket;
    environments: UsageLimitBucket;
    apiKeys: UsageLimitBucket;
    ssoProviders: UsageLimitBucket;
    scimTokens: UsageLimitBucket;
    eventsMonthly: UsageLimitBucket;
  };
}

export interface BillingUsageOverview {
  orgId: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  summary: {
    todayEvents: number;
    monthToDateEvents: number;
    eventLimitMonthly: number | null;
    remainingEvents: number | null;
    percentUsed: number;
    projectedMonthEndEvents: number;
  };
  metrics: {
    type: string;
    name: string;
    used: number;
    limit: number | null;
    percentage: number;
    overage: number;
    projected: number;
  }[];
  activity: {
    date: string;
    events: number;
    aiAnalyses: number;
  }[];
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  issueDate: string;
  dueDate: string;
  pdfUrl?: string;
  items: { description: string; amount: number }[];
}

export interface PaymentMethod {
  id: string;
  type: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface Promotion {
  id: string;
  code: string;
  description: string;
  discountAmount?: number;
  discountPercent?: number;
  expiresAt: string | null;
  isValid: boolean;
}

// Request Bodies
export interface CreateOrganizationBody {
  name: string;
  description?: string;
  industry?: string;
  companySize?: string;
  country?: string;
  timezone?: string;
  billingEmail?: string;
}

export interface UpdateOrganizationBody {
  name?: string;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  industry?: string | null;
  companySize?: string | null;
  country?: string | null;
  timezone?: string;
  billingEmail?: string;
  supportEmail?: string | null;
}

export interface TransferOwnershipBody {
  newOwnerUserId: string;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  meta: {
    hasMore: boolean;
    nextCursor: string | null;
    limit: number;
  };
}

export interface SdkConfig {
  id: string;
  orgId: string;
  projectId: string | null;
  configKey: string;
  configType: 'json' | 'yaml' | 'env' | 'feature_flag';
  version: number;
  versionHash: string;
  isLatest: boolean;
  configValue: Record<string, unknown>;
  schemaVersion: string | null;
  environment: string;
  targetSdkVersions: string[] | null;
  targetPlatforms: string[] | null;
  rolloutPercentage: number;
  isActive: boolean;
  isEncrypted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SdkConfigVersion {
  id: string;
  configId: string;
  version: number;
  versionHash: string;
  configValue: Record<string, unknown>;
  changeType: 'create' | 'update' | 'rollback' | 'delete';
  changeSummary: string | null;
  changeDiff: Record<string, unknown> | null;
  rolledBackAt: string | null;
  rolledBackToVersion: number | null;
  createdBy: string | null;
  createdAt: string;
}

export interface SdkConfigDeployment {
  id: string;
  configId: string;
  version: number;
  status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'rolled_back';
  rolloutPercentage: number;
  targetCount: number | null;
  reachedCount: number;
  errorCount: number;
  lastError: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SdkConfigResolved {
  configKey: string;
  configValue: Record<string, unknown>;
  version: number;
  versionHash: string;
  schemaVersion: string | null;
  environment: string;
  targetPlatforms: string[] | null;
}
