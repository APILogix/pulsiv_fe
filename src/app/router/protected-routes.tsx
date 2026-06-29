import { lazy } from "react";
import { RouteObject } from "react-router";
import { RequireAuth, RequireAdmin } from "./route-guards";
import { AppLayout } from "../layouts/AppLayout";

const DashboardPage = lazy(() => import("@/modules/dashboard/index").then((m) => ({ default: m.DashboardPage ?? (() => null) })));
const SecurityCenterPage = lazy(() => import("@/modules/auth/pages/SecurityCenterPage").then((m) => ({ default: m.default })));
const SessionsPage = lazy(() => import("@/modules/auth/pages/SessionsPage").then((m) => ({ default: m.default })));
const StepUpPage = lazy(() => import("@/modules/auth/pages/StepUpPage").then((m) => ({ default: m.default })));
const AdminUsersPage = lazy(() => import("@/modules/auth/pages/AdminUsersPage").then((m) => ({ default: m.default })));

const SettingsLayout = lazy(() => import("../layouts/SettingsLayout"));
const ModuleLayout = lazy(() => import("../layouts/ModuleLayout").then((m) => ({ default: m.ModuleLayout })));
const SettingsGeneralPage = lazy(() => import("@/modules/settings/pages/SettingsGeneralPage"));
const SettingsBillingPage = lazy(() => import("@/modules/settings/pages/SettingsBillingPage"));
const SettingsUsagePage = lazy(() => import("@/modules/settings/pages/SettingsUsagePage"));

const PersonalDetailsPanel = lazy(() => import("@/modules/auth/components/profile/PersonalDetailsPanel").then(m => ({ default: m.PersonalDetailsPanel })));
const ChangePasswordPanel = lazy(() => import("@/modules/auth/components/profile/ChangePasswordPanel").then(m => ({ default: m.ChangePasswordPanel })));
const MfaSecurityPanel = lazy(() => import("@/modules/auth/components/profile/MfaSecurityPanel").then(m => ({ default: m.MfaSecurityPanel })));
const ActiveSessionsPanel = lazy(() => import("@/modules/auth/components/profile/ActiveSessionsPanel").then(m => ({ default: m.ActiveSessionsPanel })));
const BackupCodesPanel = lazy(() => import("@/modules/auth/components/profile/BackupCodesPanel").then(m => ({ default: m.BackupCodesPanel })));
const AuditLogsPanel = lazy(() => import("@/modules/auth/components/profile/AuditLogsPanel").then(m => ({ default: m.AuditLogsPanel })));

// ── Custom dashboards (lazy — rules.md §5.3) ──
const DashboardsOverview = lazy(() => import("@/pages/dashboards/DashboardsOverview"));
const ExecutiveCommandCenter = lazy(() => import("@/pages/dashboards/ExecutiveCommandCenter"));
const PerformanceDeepDive = lazy(() => import("@/pages/dashboards/PerformanceDeepDive"));
const ErrorTriage = lazy(() => import("@/pages/dashboards/ErrorTriage"));
const GeoAnalytics = lazy(() => import("@/pages/dashboards/GeoAnalytics"));
const RealtimeTraffic = lazy(() => import("@/pages/dashboards/RealtimeTraffic"));
const TracingDependencyMap = lazy(() => import("@/pages/dashboards/TracingDependencyMap"));
const InfrastructureCost = lazy(() => import("@/pages/dashboards/InfrastructureCost"));
const SecurityThreat = lazy(() => import("@/pages/dashboards/SecurityThreat"));
const ReleaseQuality = lazy(() => import("@/pages/dashboards/ReleaseQuality"));
const BusinessMetrics = lazy(() => import("@/pages/dashboards/BusinessMetrics"));

// ── Pulse observability surfaces (lazy — rules.md §5.3) ──
// Observe
const ExecutiveDashboard = lazy(() => import("@/pages/observe/ExecutiveDashboard"));
const RequestsPage = lazy(() => import("@/pages/observe/RequestsPage"));
const RequestDetailPage = lazy(() => import("@/pages/observe/RequestDetailPage"));
const EventsExplorer = lazy(() => import("@/pages/observe/EventsExplorer"));
const EventDetailPage = lazy(() => import("@/pages/observe/EventDetailPage"));
const ErrorGroupsPage = lazy(() => import("@/pages/observe/ErrorGroupsPage"));
const ErrorDetailPage = lazy(() => import("@/pages/observe/ErrorDetailPage"));
const ServiceHealthPage = lazy(() => import("@/pages/observe/ServiceHealthPage"));
const LatencyPage = lazy(() => import("@/pages/observe/LatencyPage"));
const TracesPage = lazy(() => import("@/pages/observe/TracesPage"));
const TraceDetailPage = lazy(() => import("@/pages/observe/TraceDetailPage"));
const LogsPage = lazy(() => import("@/pages/observe/LogsPage"));
const LogDetailPage = lazy(() => import("@/pages/observe/LogDetailPage"));
// Workspaces
const ProjectsPage = lazy(() => import("@/pages/workspaces/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("@/pages/workspaces/ProjectDetailPage"));
const ProjectOverviewPage = lazy(() => import("@/pages/workspaces/ProjectOverviewPage"));
const ProjectApiKeysPage = lazy(() => import("@/pages/workspaces/ProjectApiKeysPage"));
const ProjectUsagePage = lazy(() => import("@/pages/workspaces/ProjectUsagePage"));
const ProjectSettingsPage = lazy(() => import("@/pages/workspaces/ProjectSettingsPage"));
// Act
const IncidentsPage = lazy(() => import("@/pages/act/IncidentsPage"));
const IncidentDetailPage = lazy(() => import("@/pages/act/IncidentDetailPage"));
const AlertRulesPage = lazy(() => import("@/pages/act/AlertRulesPage"));
const AlertRuleDetailPage = lazy(() => import("@/pages/act/AlertRuleDetailPage"));
const EscalationsPage = lazy(() => import("@/pages/act/EscalationsPage"));
const EscalationDetailPage = lazy(() => import("@/pages/act/EscalationDetailPage"));
const ChannelsPage = lazy(() => import("@/pages/act/ChannelsPage"));
const ChannelDetailPage = lazy(() => import("@/pages/act/ChannelDetailPage"));
// Connections
const ConnectionsOverview = lazy(() => import("@/pages/connections/ConnectionsOverview"));
const ApiEndpointsPage = lazy(() => import("@/pages/connections/ApiEndpointsPage"));
const ConnectionHealthPage = lazy(() => import("@/pages/connections/ConnectionHealthPage"));
const KeysTokensPage = lazy(() => import("@/pages/connections/KeysTokensPage"));
const PipelinePage = lazy(() => import("@/pages/connections/PipelinePage"));
const RateLimitsPage = lazy(() => import("@/pages/connections/RateLimitsPage"));
// Insights
const AiOverviewPage = lazy(() => import("@/pages/insights/AiOverviewPage"));
const RootCausePage = lazy(() => import("@/pages/insights/RootCausePage"));
const AnomaliesPage = lazy(() => import("@/pages/insights/AnomaliesPage"));
const ReleaseImpactPage = lazy(() => import("@/pages/insights/ReleaseImpactPage"));
const CostUsagePage = lazy(() => import("@/pages/insights/CostUsagePage"));
const PoliciesPage = lazy(() => import("@/pages/insights/PoliciesPage"));
// Team
const OrgProfilePage = lazy(() => import("@/pages/team/OrgProfilePage"));
const MembersPage = lazy(() => import("@/pages/team/MembersPage"));
const MemberDetailPage = lazy(() => import("@/pages/team/MemberDetailPage"));
const InvitationsPage = lazy(() => import("@/pages/team/InvitationsPage"));
const SsoPage = lazy(() => import("@/pages/team/SsoPage"));
const ScimPage = lazy(() => import("@/pages/team/ScimPage"));
const SecurityEventsPage = lazy(() => import("@/pages/team/SecurityEventsPage"));
const AuditLogsPage = lazy(() => import("@/pages/team/AuditLogsPage"));
const QuotaRequestsPage = lazy(() => import("@/pages/team/QuotaRequestsPage"));
const OrgApiKeysPage = lazy(() => import("@/pages/team/OrgApiKeysPage"));
const EnvironmentsPage = lazy(() => import("@/pages/team/EnvironmentsPage"));
const EnvironmentDetailPage = lazy(() => import("@/pages/team/EnvironmentDetailPage"));
const CompliancePage = lazy(() => import("@/pages/team/CompliancePage"));
// Billing
const PlanPage = lazy(() => import("@/pages/billing/PlanPage"));
const BillingUsagePage = lazy(() => import("@/pages/billing/BillingUsagePage"));
const InvoicesPage = lazy(() => import("@/pages/billing/InvoicesPage"));
const InvoiceDetailPage = lazy(() => import("@/pages/billing/InvoiceDetailPage"));
const PaymentMethodsPage = lazy(() => import("@/pages/billing/PaymentMethodsPage"));
const BillingQuotasPage = lazy(() => import("@/pages/billing/BillingQuotasPage"));
const PromotionsPage = lazy(() => import("@/pages/billing/PromotionsPage"));
const AdminOpsPage = lazy(() => import("@/pages/billing/AdminOpsPage"));
// Settings (new surfaces — others reuse existing module components)
const SettingsApiKeysPage = lazy(() => import("@/pages/settings/SettingsApiKeysPage"));
const WebhooksPage = lazy(() => import("@/pages/settings/WebhooksPage"));
const WebhookDetailPage = lazy(() => import("@/pages/settings/WebhookDetailPage"));
const IntegrationsPage = lazy(() => import("@/pages/settings/IntegrationsPage"));
const IntegrationDetailPage = lazy(() => import("@/pages/settings/IntegrationDetailPage"));
const DataRetentionPage = lazy(() => import("@/pages/settings/DataRetentionPage"));
const SettingsAlertRulesPage = lazy(() => import("@/pages/settings/SettingsAlertRulesPage"));
const SettingsAuditLogPage = lazy(() => import("@/pages/settings/SettingsAuditLogPage"));
const SettingsScimPage = lazy(() => import("@/pages/settings/SettingsScimPage"));
const RemoteConfigPage = lazy(() => import("@/pages/developer/RemoteConfigPage"));

export const protectedRoutes: RouteObject[] = [
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "dashboard", element: <DashboardPage /> },

          {
            path: "dashboards",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <DashboardsOverview /> },
              { path: "overview", element: <DashboardsOverview /> },
              { path: "executive", element: <ExecutiveCommandCenter /> },
              { path: "performance", element: <PerformanceDeepDive /> },
              { path: "errors", element: <ErrorTriage /> },
              { path: "geo", element: <GeoAnalytics /> },
              { path: "realtime", element: <RealtimeTraffic /> },
              { path: "tracing", element: <TracingDependencyMap /> },
              { path: "infrastructure", element: <InfrastructureCost /> },
              { path: "security", element: <SecurityThreat /> },
              { path: "releases", element: <ReleaseQuality /> },
              { path: "business", element: <BusinessMetrics /> },
            ],
          },

          {
            path: "observability",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <ExecutiveDashboard /> },
              { path: "requests", element: <RequestsPage /> },
              { path: "requests/:requestId", element: <RequestDetailPage /> },
              { path: "events", element: <EventsExplorer /> },
              { path: "events/:eventId", element: <EventDetailPage /> },
              { path: "errors", element: <ErrorGroupsPage /> },
              { path: "errors/:fingerprint", element: <ErrorDetailPage /> },
              { path: "errors/:fingerprint/occurrences/:eventId", element: <ErrorDetailPage /> },
              { path: "service-health", element: <ServiceHealthPage /> },
              { path: "latency", element: <LatencyPage /> },
              { path: "traces", element: <TracesPage /> },
              { path: "traces/:traceId", element: <TraceDetailPage /> },
              { path: "traces/:traceId/spans/:spanId", element: <TraceDetailPage /> },
              { path: "logs", element: <LogsPage /> },
              { path: "logs/:eventId", element: <LogDetailPage /> },
            ],
          },
          {
            path: "projects",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <ProjectsPage /> },
              { path: "overview", element: <ProjectOverviewPage /> },
              { path: "api-keys", element: <ProjectApiKeysPage /> },
              { path: "usage", element: <ProjectUsagePage /> },
              { path: "settings", element: <ProjectSettingsPage /> },
              { path: ":projectId", element: <ProjectDetailPage /> },
              { path: ":projectId/overview", element: <ProjectOverviewPage /> },
              { path: ":projectId/keys", element: <ProjectApiKeysPage /> },
              { path: ":projectId/usage", element: <ProjectUsagePage /> },
              { path: ":projectId/settings", element: <ProjectSettingsPage /> },
            ],
          },
          {
            path: "alerts",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <IncidentsPage /> },
              { path: ":incidentId", element: <IncidentDetailPage /> },
              { path: "rules", element: <AlertRulesPage /> },
              { path: "rules/:ruleId", element: <AlertRuleDetailPage /> },
              { path: "escalations", element: <EscalationsPage /> },
              { path: "escalations/:policyId", element: <EscalationDetailPage /> },
              { path: "channels", element: <ChannelsPage /> },
              { path: "channels/:channelId", element: <ChannelDetailPage /> },
            ],
          },
          {
            path: "ingestion",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <ConnectionsOverview /> },
              { path: "endpoints", element: <ApiEndpointsPage /> },
              { path: "health", element: <ConnectionHealthPage /> },
              { path: "keys", element: <KeysTokensPage /> },
              { path: "replay", element: <PipelinePage /> },
              { path: "rate-limits", element: <RateLimitsPage /> },
            ],
          },
          {
            path: "ai",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <AiOverviewPage /> },
              { path: "root-cause", element: <RootCausePage /> },
              { path: "anomalies", element: <AnomaliesPage /> },
              { path: "release-impact", element: <ReleaseImpactPage /> },
              { path: "costs", element: <CostUsagePage /> },
              { path: "policies", element: <PoliciesPage /> },
            ],
          },
          {
            path: "admin",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <OrgProfilePage /> },
              { path: "members", element: <MembersPage /> },
              { path: "members/:userId", element: <MemberDetailPage /> },
              { path: "invitations", element: <InvitationsPage /> },
              { path: "sso", element: <SsoPage /> },
              { path: "scim", element: <ScimPage /> },
              { path: "security-events", element: <SecurityEventsPage /> },
              { path: "audit-logs", element: <AuditLogsPage /> },
              { path: "quota-requests", element: <QuotaRequestsPage /> },
              { path: "api-keys", element: <OrgApiKeysPage /> },
              { path: "environments", element: <EnvironmentsPage /> },
              { path: "environments/:envId", element: <EnvironmentDetailPage /> },
              { path: "compliance", element: <CompliancePage /> },
            ],
          },
          {
            path: "billing",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <PlanPage /> },
              { path: "usage", element: <BillingUsagePage /> },
              { path: "invoices", element: <InvoicesPage /> },
              { path: "invoices/:invoiceId", element: <InvoiceDetailPage /> },
              { path: "payment-methods", element: <PaymentMethodsPage /> },
              { path: "quotas", element: <BillingQuotasPage /> },
              { path: "promotions", element: <PromotionsPage /> },
              { path: "admin", element: <AdminOpsPage /> },
            ],
          },

          {
            path: "connectors",
            element: <ModuleLayout />,
            children: [
              { path: "webhooks", element: <WebhooksPage /> },
              { path: "webhooks/:webhookId", element: <WebhookDetailPage /> },
              { path: "integrations", element: <IntegrationsPage /> },
              { path: "integrations/:integrationId", element: <IntegrationDetailPage /> },
            ],
          },
          {
            path: "developer",
            element: <ModuleLayout />,
            children: [
              { path: "api-keys", element: <SettingsApiKeysPage /> },
              { path: "data-retention", element: <DataRetentionPage /> },
              { path: "remote-config", element: <RemoteConfigPage /> },
              { path: "custom-settings", element: <div className="p-8 text-[var(--text2)] text-center text-lg">Custom settings coming soon</div> },
            ],
          },
          {
            path: "settings",
            element: <SettingsLayout />,
            children: [
              { index: true, element: <SettingsGeneralPage /> },
              { path: "profile", element: <PersonalDetailsPanel /> },
              { path: "password", element: <ChangePasswordPanel /> },
              { path: "mfa", element: <MfaSecurityPanel /> },
              { path: "sessions", element: <ActiveSessionsPanel /> },
              { path: "backup-codes", element: <BackupCodesPanel /> },
              { path: "personal-logs", element: <AuditLogsPanel /> },
              { path: "security", element: <SecurityCenterPage /> },
              { path: "billing", element: <SettingsBillingPage /> },
              { path: "usage", element: <SettingsUsagePage /> },
              { path: "alert-rules", element: <SettingsAlertRulesPage /> },
              { path: "audit-log", element: <SettingsAuditLogPage /> },
              {
                element: <RequireAdmin />,
                children: [
                  { path: "members", element: <AdminUsersPage /> },
                  { path: "scim", element: <SettingsScimPage /> },
                ],
              },
            ],
          },

          { path: "auth/security", element: <SecurityCenterPage /> },
          { path: "auth/sessions", element: <SessionsPage /> },
          { path: "auth/step-up", element: <StepUpPage /> },
        ],
      },
    ],
  },
];
