import { apiClient } from '@/infrastructure/api-client/axios';
import { tokenService } from '@/modules/auth/services/token.service';
import type * as t from '../types/org.types';

const withOrgHeaders = (orgId: string) => ({
  headers: { 'x-org-id': orgId },
});

function mapInvoice(invoice: any): t.Invoice {
  return {
    id: invoice.id,
    number: invoice.invoiceNumber,
    amount: Number(invoice.total ?? invoice.amountDue ?? 0),
    status: invoice.status,
    issueDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    pdfUrl: invoice.pdfUrl ?? undefined,
    items: Array.isArray(invoice.lineItems)
      ? invoice.lineItems.map((item: any) => ({
          description: item.description,
          amount: Number(item.amount ?? 0),
        }))
      : [],
  };
}

function mapPaymentMethod(paymentMethod: any): t.PaymentMethod {
  return {
    id: paymentMethod.id,
    type: paymentMethod.type,
    brand: paymentMethod.cardBrand ?? paymentMethod.bankName ?? paymentMethod.type,
    last4: paymentMethod.cardLast4 ?? paymentMethod.bankAccountLast4 ?? '----',
    expMonth: paymentMethod.cardExpMonth ?? 0,
    expYear: paymentMethod.cardExpYear ?? 0,
    isDefault: Boolean(paymentMethod.isDefault),
  };
}

export const orgApi = {
  // Core
  createOrganization: (data: t.CreateOrganizationBody) => apiClient.post('/organizations', data).then(r => r.data.data as t.Organization),
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
  checkSlugAvailability: (slug: string) => apiClient.get(`/organizations/slug-available/${slug}`).then(r => r.data.data as { available: boolean }),

  // Settings
  getSettings: (orgId: string) => apiClient.get(`/organizations/${orgId}/settings`).then(r => r.data.data as t.OrgSettings),
  updateSettings: (orgId: string, data: Partial<t.OrgSettings>) => apiClient.patch(`/organizations/${orgId}/settings`, data).then(r => r.data.data as t.OrgSettings),

  // Members
  listMembers: (orgId: string, params?: { cursor?: string; limit?: number; status?: string; role?: string; search?: string }) => apiClient.get(`/organizations/${orgId}/members`, { params }).then(r => r.data as t.CursorPaginatedResponse<t.Member>),
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
  getBillingSummary: (orgId: string) => apiClient.get(`/organizations/${orgId}/billing-summary`).then(r => r.data.data as t.OrganizationBillingSummary),
  getUsageLimits: (orgId: string) => apiClient.get(`/organizations/${orgId}/usage-limits`).then(r => r.data.data as t.UsageLimitsResponse),
  getCurrentUsage: (orgId: string) => apiClient.get('/billing/usage/current', withOrgHeaders(orgId)).then(r => r.data.data),
  getDailyUsage: (orgId: string) => apiClient.get('/billing/usage/daily', withOrgHeaders(orgId)).then(r => r.data.data as { date: string, eventsCount: number }[]),
  
  // Billing - Invoices
  listInvoices: (orgId: string) => apiClient.get('/billing/invoices', withOrgHeaders(orgId)).then(r => (r.data.data?.invoices ?? []).map(mapInvoice) as t.Invoice[]),
  getInvoice: (orgId: string, invoiceId: string) => apiClient.get(`/billing/invoices/${invoiceId}`, withOrgHeaders(orgId)).then(r => mapInvoice(r.data.data)),
  
  // Billing - Payment Methods
  listPaymentMethods: (orgId: string) => apiClient.get('/billing/payment-methods', withOrgHeaders(orgId)).then(r => (r.data.data ?? []).map(mapPaymentMethod) as t.PaymentMethod[]),
  addPaymentMethod: (orgId: string, data: any) => apiClient.post('/billing/payment-methods', data, withOrgHeaders(orgId)).then(r => mapPaymentMethod(r.data.data)),
  removePaymentMethod: (orgId: string, paymentMethodId: string) => apiClient.delete(`/billing/payment-methods/${paymentMethodId}`, withOrgHeaders(orgId)),
  setDefaultPaymentMethod: (orgId: string, paymentMethodId: string) => apiClient.patch(`/billing/payment-methods/${paymentMethodId}/default`, {}, withOrgHeaders(orgId)),
  
  // Billing - Promotions
  listPromotions: (orgId: string) => apiClient.get('/billing/promotions', withOrgHeaders(orgId)).then(r => (r.data.data ?? []) as t.Promotion[]),
  applyPromotion: (orgId: string, code: string) => apiClient.post('/billing/coupons/apply', { code }, withOrgHeaders(orgId)).then(r => r.data.data),
  removePromotion: (orgId: string) => apiClient.delete('/billing/coupons', withOrgHeaders(orgId)),

  // Verified domains
  listDomains: (orgId: string, params?: { cursor?: string; limit?: number; search?: string; verified?: boolean }) => apiClient.get(`/organizations/${orgId}/domains`, { params }).then(r => r.data.data as t.CursorPaginatedResponse<t.VerifiedDomain>),
  createDomain: (orgId: string, data: { domain: string; metadata?: Record<string, unknown> }) => apiClient.post(`/organizations/${orgId}/domains`, data).then(r => r.data.data as t.CreatedVerifiedDomain),
  verifyDomain: (orgId: string, domainId: string) => apiClient.post(`/organizations/${orgId}/domains/${domainId}/verify`).then(r => r.data.data as t.VerifiedDomain & { verified: boolean }),
  recheckDomain: (orgId: string, domainId: string) => apiClient.post(`/organizations/${orgId}/domains/${domainId}/recheck`).then(r => r.data.data as t.VerifiedDomain & { verified: boolean }),
  setDomainAutoJoin: (orgId: string, domainId: string, enabled: boolean) => apiClient.post(`/organizations/${orgId}/domains/${domainId}/${enabled ? 'enable-auto-join' : 'disable-auto-join'}`).then(r => r.data.data as t.VerifiedDomain),
  makePrimaryDomain: (orgId: string, domainId: string) => apiClient.post(`/organizations/${orgId}/domains/${domainId}/make-primary`).then(r => r.data.data as t.VerifiedDomain),
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
  listAuditLogs: (orgId: string, params?: { cursor?: string; limit?: number; action?: string; entityType?: string; actorUserId?: string }) => apiClient.get(`/organizations/${orgId}/audit-logs`, { params }).then(r => r.data as t.CursorPaginatedResponse<t.AuditLog>),
  exportAuditLogs: (orgId: string, params?: { action?: string; entityType?: string; actorUserId?: string }) => apiClient.get(`/organizations/${orgId}/audit-logs/export`, { params }).then(r => r.data.data as t.AuditLog[]),
  
  // Quota Requests
  listQuotaRequests: (orgId: string, params?: { cursor?: string; limit?: number }) => apiClient.get(`/organizations/${orgId}/quota-requests`, { params }).then(r => r.data as t.CursorPaginatedResponse<t.QuotaRequest>),
  createQuotaRequest: (orgId: string, data: { quotaType: string; currentLimit: number; requestedLimit: number; reason: string }) => apiClient.post(`/organizations/${orgId}/quota-requests`, data).then(r => r.data.data as t.QuotaRequest),
  approveQuotaRequest: (orgId: string, requestId: string, notes?: string) => apiClient.post(`/organizations/${orgId}/quota-requests/${requestId}/approve`, { notes }).then(r => r.data.data as t.QuotaRequest),
  rejectQuotaRequest: (orgId: string, requestId: string, notes?: string) => apiClient.post(`/organizations/${orgId}/quota-requests/${requestId}/reject`, { notes }).then(r => r.data.data as t.QuotaRequest),

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
