import type { AxiosRequestConfig } from 'axios';
import { apiClient } from '@/infrastructure/api-client/axios';
import { tokenService } from '@/modules/auth/services/token.service';
import type * as t from '../types/org.types';

const withOrgHeaders = (orgId: string) => ({
  headers: { 'x-org-id': orgId },
});

function mapInvoice(invoice: any): t.Invoice {
  const rawTotal = invoice?.total_amount ?? invoice?.total ?? invoice?.amountDue ?? 0;
  const amount = invoice?.total_amount !== undefined ? Number(rawTotal) / 100 : Number(rawTotal);
  return {
    id: invoice?.id,
    number: invoice?.invoice_number ?? invoice?.invoiceNumber ?? 'INV-UNKNOWN',
    amount: Number.isFinite(amount) ? amount : 0,
    status: invoice?.status ?? 'open',
    issueDate: invoice?.created_at ?? invoice?.period_start ?? invoice?.invoiceDate ?? new Date().toISOString(),
    dueDate: invoice?.due_at ?? invoice?.dueDate ?? invoice?.created_at ?? new Date().toISOString(),
    pdfUrl: invoice?.pdf_url ?? invoice?.pdfUrl ?? undefined,
    items: Array.isArray(invoice?.line_items ?? invoice?.lineItems)
      ? (invoice.line_items ?? invoice.lineItems).map((item: any) => ({
          description: item.description ?? 'Charge',
          amount: Number(item.total_amount !== undefined ? item.total_amount / 100 : (item.amount ?? 0)),
        }))
      : [],
  };
}

function mapPaymentMethod(pm: any): t.PaymentMethod {
  return {
    id: pm?.id,
    type: pm?.type ?? 'card',
    brand: pm?.brand ?? pm?.cardBrand ?? pm?.bankName ?? pm?.type ?? 'Card',
    last4: pm?.last4 ?? pm?.cardLast4 ?? pm?.bankAccountLast4 ?? '----',
    expMonth: Number(pm?.expiry_month ?? pm?.cardExpMonth ?? 0),
    expYear: Number(pm?.expiry_year ?? pm?.cardExpYear ?? 0),
    isDefault: Boolean(pm?.is_default ?? pm?.isDefault),
  };
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapCurrentBillingUsage(usage: any): t.CurrentBillingUsage {
  return {
    eventsUsed: toNumber(usage?.eventsUsed),
    eventLimit: toNumber(usage?.eventLimit),
    remainingEvents: toNumber(usage?.remainingEvents),
    aiCreditsUsed: toNumber(usage?.aiCreditsUsed),
    aiCreditLimit: toNumber(usage?.aiCreditLimit),
    remainingAiCredits: toNumber(usage?.remainingAiCredits),
    projectsUsed: toNumber(usage?.projectsUsed),
    membersUsed: toNumber(usage?.membersUsed),
  };
}

/** The error interceptor skips its toast when a caller shows the error itself. */
const silentErrors = (config: AxiosRequestConfig = {}) => ({ ...config, skipToast: true }) as AxiosRequestConfig;

export const orgApi = {
  createOrganization: (data: t.CreateOrganizationBody, options?: { idempotencyKey?: string; silent?: boolean }) => {
    const config: AxiosRequestConfig = {
      headers: options?.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : undefined,
    };
    return apiClient
      .post('/organizations', data, options?.silent ? silentErrors(config) : config)
      .then(r => r.data.data as t.Organization);
  },
  switchOrganization: (orgId: string) => apiClient.post('/organizations/switch', { orgId }).then(r => {
    const session = r.data.data as { access_token: string; expires_at: string; current_org_id: string };
    tokenService.setAccessToken(session.access_token, session.expires_at);
    tokenService.setCurrentOrgId(session.current_org_id);
    return session;
  }),
  listOrganizations: (params?: { cursor?: string; limit?: number; search?: string }) => apiClient.get('/organizations', { params }).then(r => r.data as t.CursorPaginatedResponse<t.UserOrganization>),
  getOrganization: (id: string) => apiClient.get(`/organizations/${id}`).then(r => r.data.data as t.Organization),
  updateOrganization: (id: string, data: t.UpdateOrganizationBody) => apiClient.patch(`/organizations/${id}`, data).then(r => r.data.data as t.Organization),
  deleteOrganization: (id: string) => apiClient.delete(`/organizations/${id}`),
  archiveOrganization: (id: string) => apiClient.post(`/organizations/${id}/archive`).then(() => undefined),
  restoreOrganization: (id: string) => apiClient.post(`/organizations/${id}/restore`).then(r => r.data.data as t.Organization),
  transferOwnership: (id: string, data: t.TransferOwnershipBody) => apiClient.post(`/organizations/${id}/transfer-ownership`, data).then(() => undefined),
  resolveBySlug: (slug: string) => apiClient.get(`/organizations/by-slug/${slug}`).then(r => r.data.data as t.Organization),
  // Background check while typing: failures show inline, never as a toast.
  checkSlugAvailability: (slug: string) => apiClient.get(`/organizations/slug-available/${slug}`, silentErrors()).then(r => r.data.data as { available: boolean }),

  // Settings
  getSettings: (orgId: string) => apiClient.get(`/organizations/${orgId}/settings`).then(r => r.data.data as t.OrgSettings),
  updateSettings: (orgId: string, data: Partial<t.OrgSettings>) => apiClient.patch(`/organizations/${orgId}/settings`, data).then(r => r.data.data as t.OrgSettings),

  // Members
  listMembers: (orgId: string, params?: { cursor?: string; limit?: number; status?: string; role?: string }) => apiClient.get(`/organizations/${orgId}/members`, { params }).then(r => r.data as t.CursorPaginatedResponse<t.Member>),
  getMe: (orgId: string) => apiClient.get(`/organizations/${orgId}/members/me`).then(r => r.data.data as t.Member),
  getMember: (orgId: string, userId: string) => apiClient.get(`/organizations/${orgId}/members/${userId}`).then(r => r.data.data as t.Member),
  updateMemberRole: (orgId: string, userId: string, role: string) => apiClient.patch(`/organizations/${orgId}/members/${userId}/role`, { role }).then(() => undefined),
  removeMember: (orgId: string, userId: string, reason?: string) => apiClient.delete(`/organizations/${orgId}/members/${userId}`, { data: { reason } }),
  suspendMember: (orgId: string, userId: string, reason?: string) => apiClient.post(`/organizations/${orgId}/members/${userId}/suspend`, { reason }).then(() => undefined),
  reactivateMember: (orgId: string, userId: string) => apiClient.post(`/organizations/${orgId}/members/${userId}/reactivate`).then(() => undefined),
  leaveOrganization: (orgId: string) => apiClient.post(`/organizations/${orgId}/leave`),

  // Invitations
  listInvitations: (orgId: string, params?: { cursor?: string; limit?: number; status?: string }) => apiClient.get(`/organizations/${orgId}/invitations`, { params }).then(r => r.data as t.CursorPaginatedResponse<t.Invitation>),
  createInvitation: (orgId: string, data: { email: string; role?: string }) => apiClient.post(`/organizations/${orgId}/invitations`, data).then(r => r.data.data as t.InvitationCreateResult),
  resendInvitation: (orgId: string, invitationId: string) => apiClient.post(`/organizations/${orgId}/invitations/${invitationId}/resend`),
  revokeInvitation: (orgId: string, invitationId: string) => apiClient.delete(`/organizations/${orgId}/invitations/${invitationId}`),
  validateInvitation: (token: string) => apiClient.get('/organizations/invitations/validate', { params: { token } }).then(r => r.data.data as t.InvitationValidation),
  acceptInvitation: (token: string) => apiClient.post('/organizations/invitations/accept', { token }).then(r => r.data.data),
  declineInvitation: (id: string) => apiClient.post(`/organizations/invitations/${id}/decline`),

  // Billing Summary
  getBillingSummary: (orgId: string) => apiClient.get(`/organizations/${orgId}/billing-summary`).then(r => {
    const d = r.data?.data ?? {};
    return {
      ...d,
      subscription: {
        id: d.orgId ?? null,
        status: d.subscriptionStatus ?? 'active',
      },
      plan: {
        id: null,
        key: d.planTier ?? 'enterprise',
        tier: d.planTier ?? 'enterprise',
        eventLimitMonthly: d.eventLimitMonthly ?? 0,
        hardCap: Boolean(d.hardCap),
        features: null,
      },
      usage: {
        ...d.usage,
        activeMembers: typeof d.usage?.activeMembers === 'object' ? (d.usage.activeMembers?.used ?? 0) : (d.usage?.activeMembers ?? 0),
        pendingInvitations: 0,
        environments: 0,
        apiKeys: 0,
      },
    } as t.OrganizationBillingSummary;
  }),
  getEntitlements: (orgId: string) => apiClient.get('/billing/entitlements', withOrgHeaders(orgId)).then(r => r.data.data as Record<string, {
    booleanValue?: boolean | null;
    integerValue?: number | null;
    decimalValue?: number | null;
    stringValue?: string | null;
  }>),
  getUsageLimits: (orgId: string) => apiClient.get(`/organizations/${orgId}/usage-limits`).then(r => r.data.data as t.UsageLimitsResponse),
  getCurrentUsage: (orgId: string) => apiClient.get('/billing/usage/current', withOrgHeaders(orgId)).then(r => mapCurrentBillingUsage(r.data.data)),
  getDailyUsage: (orgId: string) => apiClient.get('/billing/usage/daily', withOrgHeaders(orgId)).then(r => r.data.data as { date: string, eventsCount: number }[]),
  
  // Billing - Invoices
  listInvoices: (orgId: string) => apiClient.get('/billing/invoices', withOrgHeaders(orgId)).then(r => {
    const raw = Array.isArray(r.data?.data) ? r.data.data : (r.data?.data?.invoices ?? []);
    return raw.map(mapInvoice) as t.Invoice[];
  }),
  getInvoice: (orgId: string, invoiceId: string) => apiClient.get(`/billing/invoices/${invoiceId}`, withOrgHeaders(orgId)).then(r => mapInvoice(r.data.data)),
  
  // Billing - Payment Methods
  listPaymentMethods: (orgId: string) => apiClient.get('/billing/payment-methods', withOrgHeaders(orgId)).then(r => (r.data.data ?? []).map(mapPaymentMethod) as t.PaymentMethod[]),
  addPaymentMethod: (orgId: string, data: any) => apiClient.post('/billing/payment-methods', data, withOrgHeaders(orgId)).then(r => mapPaymentMethod(r.data.data)),
  removePaymentMethod: (orgId: string, paymentMethodId: string) => apiClient.delete(`/billing/payment-methods/${paymentMethodId}`, withOrgHeaders(orgId)),
  setDefaultPaymentMethod: (orgId: string, paymentMethodId: string) => apiClient.patch(`/billing/payment-methods/${paymentMethodId}/default`, {}, withOrgHeaders(orgId)),

  // Billing - Plans, Subscriptions & Add-ons (v6.3)
  listBillingPlans: () => apiClient.get('/billing/plans').then(r => (r.data?.data ?? []) as t.BillingPlan[]),
  listAddons: () => apiClient.get('/billing/addons').then(r => (r.data?.data ?? []) as t.AddonCatalogItem[]),
  listSubscriptionAddons: (orgId: string) => apiClient.get('/billing/addons/subscription', withOrgHeaders(orgId)).then(r => (r.data?.data ?? []) as t.SubscriptionAddon[]),
  subscribeAddon: (orgId: string, addonKey: string, quantity: number = 1) => apiClient.post('/billing/addons/subscription', { addonKey, quantity }, withOrgHeaders(orgId)).then(r => r.data.data),
  cancelSubscriptionAddon: (orgId: string, subscriptionAddonId: string) => apiClient.delete(`/billing/addons/subscription/${subscriptionAddonId}`, withOrgHeaders(orgId)).then(r => r.data.data),
  changePlan: (orgId: string, planId: string) => apiClient.post('/billing/subscriptions/change-plan', { planId }, withOrgHeaders(orgId)).then(r => r.data.data),
  previewPlanChange: (orgId: string, newPlanId: string) => apiClient.post('/billing/subscriptions/preview-change', { newPlanId }, withOrgHeaders(orgId)).then(r => r.data.data),


  // Verified domains
  // The domains list route replies with `{ success, data, meta }`, so the
  // paginated envelope is the response body itself (not `data.data`).
  listDomains: (orgId: string, params?: { cursor?: string; limit?: number; search?: string; verified?: boolean }) => apiClient.get(`/organizations/${orgId}/domains`, { params }).then(r => r.data as t.CursorPaginatedResponse<t.VerifiedDomain>),
  getDomain: (orgId: string, domainId: string) => apiClient.get(`/organizations/${orgId}/domains/${domainId}`).then(r => r.data.data as t.VerifiedDomain),
  createDomain: (orgId: string, data: { domain: string; metadata?: Record<string, unknown> }) => apiClient.post(`/organizations/${orgId}/domains`, data).then(r => r.data.data as t.CreatedVerifiedDomain),
  verifyDomain: (orgId: string, domainId: string) => apiClient.post(`/organizations/${orgId}/domains/${domainId}/verify`).then(r => r.data.data as t.VerifiedDomain & { verified: boolean }),
  recheckDomain: (orgId: string, domainId: string) => apiClient.post(`/organizations/${orgId}/domains/${domainId}/recheck`).then(r => r.data.data as t.VerifiedDomain & { verified: boolean }),
  setDomainAutoJoin: (orgId: string, domainId: string, enabled: boolean) => apiClient.post(`/organizations/${orgId}/domains/${domainId}/${enabled ? 'enable-auto-join' : 'disable-auto-join'}`).then(r => r.data.data as t.VerifiedDomain),
  makePrimaryDomain: (orgId: string, domainId: string) => apiClient.post(`/organizations/${orgId}/domains/${domainId}/make-primary`).then(r => r.data.data as t.VerifiedDomain),
  updateDomain: (orgId: string, domainId: string, data: { metadata: Record<string, unknown> }) => apiClient.patch(`/organizations/${orgId}/domains/${domainId}`, data).then(r => r.data.data as t.VerifiedDomain),
  deleteDomain: (orgId: string, domainId: string) => apiClient.delete(`/organizations/${orgId}/domains/${domainId}`),

  // SSO / SCIM
  listSsoProviders: (orgId: string) => apiClient.get(`/organizations/${orgId}/sso`).then(r => r.data.data as t.SsoProvider[]),
  createSsoProvider: (orgId: string, data: t.CreateSsoProviderInput) => apiClient.post(`/organizations/${orgId}/sso`, data).then(r => r.data.data as t.SsoProvider),
  updateSsoProvider: (orgId: string, ssoId: string, data: t.UpdateSsoProviderInput) => apiClient.patch(`/organizations/${orgId}/sso/${ssoId}`, data).then(r => r.data.data as t.SsoProvider),
  deleteSsoProvider: (orgId: string, ssoId: string) => apiClient.delete(`/organizations/${orgId}/sso/${ssoId}`),
  
  listScimTokens: (orgId: string) => apiClient.get(`/organizations/${orgId}/scim-tokens`).then(r => r.data.data as t.ScimToken[]),
  createScimToken: (orgId: string, data: t.CreateScimTokenInput) => apiClient.post(`/organizations/${orgId}/scim-tokens`, data).then(r => r.data.data as t.ScimToken & { rawToken: string }),
  rotateScimToken: (orgId: string, tokenId: string) => apiClient.post(`/organizations/${orgId}/scim-tokens/${tokenId}/rotate`).then(r => r.data.data as t.ScimToken & { rawToken: string }),
  revokeScimToken: (orgId: string, tokenId: string) => apiClient.delete(`/organizations/${orgId}/scim-tokens/${tokenId}`),
  
  // Security / Audit
  listSecurityEvents: (orgId: string, params?: { cursor?: string; limit?: number; severity?: string; eventType?: string }) => apiClient.get(`/organizations/${orgId}/security-events`, { params }).then(r => r.data as t.CursorPaginatedResponse<t.SecurityEvent>),
  listAuditLogs: (orgId: string, params?: { cursor?: string; limit?: number; action?: string; entityType?: string; actorUserId?: string; projectId?: string }) => apiClient.get(`/organizations/${orgId}/audit-logs`, { params }).then(r => r.data as t.CursorPaginatedResponse<t.AuditLog>),
  exportAuditLogs: (orgId: string, params?: { action?: string; entityType?: string; actorUserId?: string; projectId?: string }) => apiClient.get(`/organizations/${orgId}/audit-logs/export`, { params }).then(r => r.data.data as t.AuditLog[]),
  

  // SDK Configs
  listSdkConfigs: (orgId: string, params?: { projectId?: string; environment?: string; configKey?: string; includeInactive?: boolean }) => apiClient.get(`/organizations/${orgId}/sdk-configs`, { params }).then(r => r.data.data as t.SdkConfig[]),
  createSdkConfig: (orgId: string, data: {
    configKey: string;
    configValue: Record<string, unknown>;
    configType?: 'json' | 'yaml' | 'env' | 'feature_flag';
    projectId?: string | null;
    environment?: string;
    schemaVersion?: string;
    targetSdkVersions?: string[];
    targetPlatforms?: string[];
    rolloutPercentage?: number;
    isEncrypted?: boolean;
  }) => apiClient.post(`/organizations/${orgId}/sdk-configs`, data).then(r => r.data.data as t.SdkConfig),
  getSdkConfig: (orgId: string, configId: string) => apiClient.get(`/organizations/${orgId}/sdk-configs/${configId}`).then(r => r.data.data as t.SdkConfig),
  updateSdkConfig: (orgId: string, configId: string, data: {
    configValue?: Record<string, unknown>;
    environment?: string;
    schemaVersion?: string | null;
    targetSdkVersions?: string[] | null;
    targetPlatforms?: string[] | null;
    rolloutPercentage?: number;
    isActive?: boolean;
    changeSummary?: string;
  }) => apiClient.patch(`/organizations/${orgId}/sdk-configs/${configId}`, data).then(r => r.data.data as t.SdkConfig),
  resolveSdkConfigs: (orgId: string, params?: { projectId?: string; environment?: string; platform?: string; sdkVersion?: string }) => apiClient.get(`/organizations/${orgId}/sdk-configs/resolve`, { params }).then(r => r.data.data as t.SdkConfigResolved[]),
  rollbackSdkConfig: (orgId: string, configId: string, data: { toVersion: number; reason: string }) => apiClient.post(`/organizations/${orgId}/sdk-configs/${configId}/rollback`, data).then(r => r.data.data as t.SdkConfig),
  listSdkConfigVersions: (orgId: string, configId: string) => apiClient.get(`/organizations/${orgId}/sdk-configs/${configId}/versions`).then(r => r.data.data as t.SdkConfigVersion[]),
  getSdkConfigVersion: (orgId: string, configId: string, version: number) => apiClient.get(`/organizations/${orgId}/sdk-configs/${configId}/versions/${version}`).then(r => r.data.data as t.SdkConfigVersion),
  listSdkConfigDeployments: (orgId: string, configId: string) => apiClient.get(`/organizations/${orgId}/sdk-configs/${configId}/deployments`).then(r => r.data.data as t.SdkConfigDeployment[]),
  acknowledgeSdkConfigVersion: (orgId: string, configId: string, version: number) => apiClient.post(`/organizations/${orgId}/sdk-configs/${configId}/versions/${version}/ack`).then(() => undefined),
};
