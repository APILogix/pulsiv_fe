import { lazy, type ReactNode } from "react";
import { RouteObject, Navigate } from "react-router";
import { RequireAuth } from "./route-guards";
import { MetricRouteBoundary } from "@/shared/ui/loading";
import NotFoundPage from "@/shared/components/NotFoundPage";

import { AuthenticatedAppLayout } from "../layouts/AuthenticatedAppLayout";

const DashboardPage = lazy(() => import("@/modules/dashboard/index").then((m) => ({ default: m.DashboardPage ?? (() => null) })));
const SecurityCenterPage = lazy(() => import("@/modules/auth/pages/SecurityCenterPage").then((m) => ({ default: m.default })));
const SessionsPage = lazy(() => import("@/modules/auth/pages/SessionsPage").then((m) => ({ default: m.default })));
const StepUpPage = lazy(() => import("@/modules/auth/pages/StepUpPage").then((m) => ({ default: m.default })));
const CreateOrganizationPage = lazy(() => import("@/modules/organizations/pages/CreateOrganizationPage"));
const CheckoutSuccessPage = lazy(() => import("@/modules/billing/pages/CheckoutSuccessPage"));
const CheckoutCancelPage = lazy(() => import("@/modules/billing/pages/CheckoutCancelPage"));

const SettingsLayout = lazy(() => import("../layouts/SettingsLayout"));
const ModuleLayout = lazy(() => import("../layouts/ModuleLayout").then((m) => ({ default: m.ModuleLayout })));
const EffectiveAuthPolicyPage = lazy(() => import("@/modules/auth/pages/EffectiveAuthPolicyPage"));

const PersonalDetailsPanel = lazy(() => import("@/modules/auth/components/profile/PersonalDetailsPanel").then(m => ({ default: m.PersonalDetailsPanel })));
const AccountOverviewPanel = lazy(() => import("@/modules/auth/components/profile/AccountOverviewPanel").then(m => ({ default: m.AccountOverviewPanel })));
const ChangePasswordPanel = lazy(() => import("@/modules/auth/components/profile/ChangePasswordPanel").then(m => ({ default: m.ChangePasswordPanel })));
const MfaSecurityPanel = lazy(() => import("@/modules/auth/components/profile/MfaSecurityPanel").then(m => ({ default: m.MfaSecurityPanel })));
const ActiveSessionsPanel = lazy(() => import("@/modules/auth/components/profile/ActiveSessionsPanel").then(m => ({ default: m.ActiveSessionsPanel })));
const BackupCodesPanel = lazy(() => import("@/modules/auth/components/profile/BackupCodesPanel").then(m => ({ default: m.BackupCodesPanel })));
const AuditLogsPanel = lazy(() => import("@/modules/auth/components/profile/AuditLogsPanel").then(m => ({ default: m.AuditLogsPanel })));
const MfaRecoveryPanel = lazy(() => import("@/modules/auth/components/profile/MfaRecoveryPanel").then(m => ({ default: m.MfaRecoveryPanel })));
const PrivacyAndDeletionPanel = lazy(() => import("@/modules/auth/components/profile/PrivacyAndDeletionPanel").then(m => ({ default: m.PrivacyAndDeletionPanel })));
const LinkedAccountsPanel = lazy(() => import("@/modules/auth/components/profile/LinkedAccountsPanel").then(m => ({ default: m.LinkedAccountsPanel })));

// ── Custom dashboards ──
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
const ScheduledReportsPage = lazy(() => import("@/pages/dashboards/ScheduledReportsPage"));
const CreateReportPage = lazy(() => import("@/pages/dashboards/CreateReportPage"));

// ── Services ──
const ServiceCatalogPage = lazy(() => import("@/pages/services/ServiceCatalogPage"));
const ServiceDependenciesPage = lazy(() => import("@/pages/services/ServiceDependenciesPage"));
const ServiceSlosPage = lazy(() => import("@/pages/services/ServiceSlosPage"));

// ── Pulse observability surfaces ──
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
const MetricsPage = lazy(() => import("@/pages/observe/MetricsPage"));
const ProfilingPage = lazy(() => import("@/pages/observe/ProfilingPage"));
const CronsPage = lazy(() => import("@/pages/observe/CronsPage"));
const ReplayPage = lazy(() => import("@/pages/observe/ReplayPage"));
const RuntimeMetricsPage = lazy(() => import("@/pages/observe/RuntimeMetricsPage"));
const EventLoopPage = lazy(() => import("@/pages/observe/EventLoopPage"));
const GcMonitoringPage = lazy(() => import("@/pages/observe/GcMonitoringPage"));

// Workspaces
const ProjectsPage = lazy(() => import("@/pages/workspaces/ProjectsPage"));
const CreateProjectWizardPage = lazy(() => import("@/pages/workspaces/CreateProjectWizardPage"));
const ProjectOverviewPage = lazy(() => import("@/pages/workspaces/ProjectOverviewPage"));

// Project Shell
const ProjectShellPage = lazy(() => import("@/pages/workspaces/ProjectShellPage").then(m => ({ default: m.ProjectShellPage })));
const ProjectUuidRedirect = lazy(() => import("@/pages/workspaces/ProjectUuidRedirect").then(m => ({ default: m.ProjectUuidRedirect })));
const ProjectAnalyticsPage = lazy(() => import("@/pages/workspaces/ProjectAnalyticsPage"));
const ProjectUsagePage = lazy(() => import("@/pages/workspaces/ProjectUsagePage"));
const ProjectSettingsPage = lazy(() => import("@/pages/workspaces/ProjectSettingsPage"));
const ProjectEnvironmentsPage = lazy(() => import("@/pages/workspaces/ProjectEnvironmentsPage"));
const ProjectApiKeysPage = lazy(() => import("@/pages/workspaces/ProjectApiKeysPage"));
const ProjectActivityPage = lazy(() => import("@/pages/workspaces/ProjectActivityPage"));
const RemoteConfigPage = lazy(() => import("@/pages/workspaces/RemoteConfigPage"));
const ProjectAlertRoutesPage = lazy(() => import("@/pages/workspaces/ProjectAlertRoutesPage"));
const ProjectThresholdsPage = lazy(() => import("@/pages/workspaces/ProjectThresholdsPage"));
const ProjectAlertChannelsPage = lazy(() => import("@/pages/workspaces/ProjectAlertChannelsPage"));
const ProjectConnectorsPage = lazy(() => import("@/pages/workspaces/ProjectConnectorsPage"));


const ProjectMembersPage = lazy(() => import("@/pages/workspaces/ProjectMembersPage"));
const AlertRouteWizardPage = lazy(() => import("@/pages/workspaces/AlertRouteWizardPage"));
const MemberAlertPreferencesPage = lazy(() => import("@/pages/workspaces/MemberAlertPreferencesPage"));
const AlertDeliveryLogsPage = lazy(() => import("@/pages/workspaces/AlertDeliveryLogsPage"));
const DeadLetterQueuePage = lazy(() => import("@/pages/workspaces/DeadLetterQueuePage"));


// Act
const AlertEventsPage = lazy(() => import("@/pages/act/AlertEventsPage"));
const AlertEventDetailPage = lazy(() => import("@/pages/act/AlertEventDetailPage"));
const AlertRulesPage = lazy(() => import("@/pages/act/AlertRulesPage"));
const AlertRuleDetailPage = lazy(() => import("@/pages/act/AlertRuleDetailPage"));
const EscalationsPage = lazy(() => import("@/pages/act/EscalationsPage"));
const EscalationDetailPage = lazy(() => import("@/pages/act/EscalationDetailPage"));
const AlertTemplatesPage = lazy(() => import("@/pages/act/ChannelsPage"));
const SilencesPage = lazy(() => import("@/pages/act/SilencesPage"));
const RoutingRulesPage = lazy(() => import("@/pages/act/RoutingRulesPage"));
const AlertMetricsPage = lazy(() => import("@/pages/act/AlertMetricsPage"));
const AlertDeadLettersPage = lazy(() => import("@/pages/act/DeadLettersPage"));

// Workflows (automation)
const AutomationOverviewPage = lazy(() => import("@/pages/automation/AutomationOverviewPage"));
const AutomationWorkflowsPage = lazy(() => import("@/pages/automation/AutomationWorkflowsPage"));
const AutomationWorkflowDetailPage = lazy(() => import("@/pages/automation/AutomationWorkflowDetailPage"));
const AutomationRunsPage = lazy(() => import("@/pages/automation/AutomationRunsPage"));
const AutomationRunDetailPage = lazy(() => import("@/pages/automation/AutomationRunDetailPage"));
const AutomationApprovalsPage = lazy(() => import("@/pages/automation/AutomationApprovalsPage"));
const AutomationApprovalDetailPage = lazy(() => import("@/pages/automation/AutomationApprovalDetailPage"));
const AutomationTemplatesPage = lazy(() => import("@/pages/automation/AutomationTemplatesPage"));
const AutomationAuditPage = lazy(() => import("@/pages/automation/AutomationAuditPage"));
const AutomationEventsPage = lazy(() => import("@/pages/automation/AutomationEventsPage"));

// Connections
const ConnectionsOverview = lazy(() => import("@/pages/connections/ConnectionsOverview"));
const ApiEndpointsPage = lazy(() => import("@/pages/connections/ApiEndpointsPage"));
const ConnectionHealthPage = lazy(() => import("@/pages/connections/ConnectionHealthPage"));
const KeysTokensPage = lazy(() => import("@/pages/connections/KeysTokensPage"));
const PipelinePage = lazy(() => import("@/pages/connections/PipelinePage"));
const RateLimitsPage = lazy(() => import("@/pages/connections/RateLimitsPage"));

// AI (enterprise)
const AiOverviewPage = lazy(() => import("@/pages/ai/AiOverviewPage"));
const AiAssistantPage = lazy(() => import("@/pages/ai/AiAssistantPage"));
const AiInvestigationsPage = lazy(() => import("@/pages/ai/AiInvestigationsPage"));
const AiReportsPage = lazy(() => import("@/pages/ai/AiReportsPage"));
const AiUsagePage = lazy(() => import("@/pages/ai/AiUsagePage"));
const AiKnowledgePage = lazy(() => import("@/pages/ai/AiKnowledgePage"));
const AiSettingsPage = lazy(() => import("@/pages/ai/AiSettingsPage"));

// Team
const OrgProfilePage = lazy(() => import("@/pages/team/OrgProfilePage"));
const TeamPage = lazy(() => import("@/pages/team/TeamPage"));
const MemberDetailPage = lazy(() => import("@/pages/team/MemberDetailPage"));
const SsoPage = lazy(() => import("@/pages/team/SsoPage"));
const ScimPage = lazy(() => import("@/pages/team/ScimPage"));
const SecurityEventsPage = lazy(() => import("@/pages/team/SecurityEventsPage"));
const AuditLogsPage = lazy(() => import("@/pages/team/AuditLogsPage"));
const DomainsPage = lazy(() => import("@/pages/team/DomainsPage"));
const OrgSettingsPage = lazy(() => import("@/pages/team/OrgSettingsPage"));
const SdkConfigPage = lazy(() => import("@/pages/team/SdkConfigPage"));
const CompliancePage = lazy(() => import("@/pages/team/CompliancePage"));

// Billing
const PlanPage = lazy(() => import("@/pages/billing/PlanPage"));
const BillingUsagePage = lazy(() => import("@/pages/billing/BillingUsagePage"));
const InvoicesPage = lazy(() => import("@/pages/billing/InvoicesPage"));
const InvoiceDetailPage = lazy(() => import("@/pages/billing/InvoiceDetailPage"));
const PaymentMethodsPage = lazy(() => import("@/pages/billing/PaymentMethodsPage"));

// Settings (new surfaces — others reuse existing module components)
const WebhooksPage = lazy(() => import("@/pages/settings/WebhooksPage"));
const WebhookDetailPage = lazy(() => import("@/pages/settings/WebhookDetailPage"));
const IntegrationsPage = lazy(() => import("@/pages/settings/IntegrationsPage"));
const IntegrationDetailPage = lazy(() => import("@/pages/settings/IntegrationDetailPage"));
const SlackSuccessPage = lazy(() => import("@/pages/settings/SlackSuccessPage"));
const SlackErrorPage = lazy(() => import("@/pages/settings/SlackErrorPage"));
const DataRetentionPage = lazy(() => import("@/pages/settings/DataRetentionPage"));
const IntegrationsAuditPage = lazy(() => import("@/pages/settings/IntegrationsAuditPage"));

// Super Admin / Billing Plans
const BillingPlansPage = lazy(() => import("@/pages/admin/BillingPlansPage"));

// New Roles Page
const RolesPermissionsPage = lazy(() => import("@/pages/team/RolesPermissionsPage"));

const withMetricLoading = (content: ReactNode) => (
  <MetricRouteBoundary>{content}</MetricRouteBoundary>
);

export const protectedRoutes: RouteObject[] = [
  {
    element: <AuthenticatedAppLayout />,
    children: [
          { index: true, element: withMetricLoading(<DashboardPage />) },
          { path: "dashboard", element: withMetricLoading(<DashboardPage />) },

          {
            path: "dashboards",
            element: <ModuleLayout />,
            children: [
              { index: true, element: withMetricLoading(<DashboardsOverview />) },
              { path: "overview", element: withMetricLoading(<DashboardsOverview />) },
              { path: "executive", element: withMetricLoading(<ExecutiveCommandCenter />) },
              { path: "performance", element: withMetricLoading(<PerformanceDeepDive />) },
              { path: "errors", element: withMetricLoading(<ErrorTriage />) },
              { path: "geo", element: withMetricLoading(<GeoAnalytics />) },
              { path: "realtime", element: withMetricLoading(<RealtimeTraffic />) },
              { path: "tracing", element: withMetricLoading(<TracingDependencyMap />) },
              { path: "infrastructure", element: withMetricLoading(<InfrastructureCost />) },
              { path: "security", element: withMetricLoading(<SecurityThreat />) },
              { path: "releases", element: withMetricLoading(<ReleaseQuality />) },
              { path: "business", element: withMetricLoading(<BusinessMetrics />) },
              { path: "reports", element: <ScheduledReportsPage /> },
              { path: "reports/new", element: <CreateReportPage /> },
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
              { path: "metrics", element: <MetricsPage /> },
              { path: "profiling", element: <ProfilingPage /> },
              { path: "crons", element: <CronsPage /> },
              { path: "replay", element: <ReplayPage /> },
              { path: "runtime-metrics", element: <RuntimeMetricsPage /> },
              { path: "event-loop", element: <EventLoopPage /> },
              { path: "gc-monitoring", element: <GcMonitoringPage /> },
            ],
          },

          {
            path: "services",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <ServiceCatalogPage /> },
              { path: "dependencies", element: <ServiceDependenciesPage /> },
              { path: "slos", element: <ServiceSlosPage /> },
            ],
          },

          {
            path: ":orgSlug",
            children: [
              {
                path: "projects",
                children: [
                  {
                    element: <ModuleLayout />,
                    children: [
                      { index: true, element: <ProjectsPage /> },
                      { path: "new", element: <CreateProjectWizardPage /> },
                    ]
                  }
                ],
              },
              {
                path: "p/:projectPublicId",
                element: <ProjectShellPage />,
                children: [
                  { index: true, element: <Navigate to="overview" replace /> },

                  // Monitor
                  { path: "overview", element: <ProjectOverviewPage /> },
                  { path: "analytics", element: <ProjectAnalyticsPage /> },
                  { path: "usage", element: <ProjectUsagePage /> },
                  { path: "activity", element: <ProjectActivityPage /> },

                  // Telemetry
                  { path: "environments", element: <ProjectEnvironmentsPage /> },
                  { path: "api-keys", element: <ProjectApiKeysPage /> },
                  { path: "remote-config", element: <RemoteConfigPage /> },

                  // Alerting
                  { path: "alert-rules", element: <ProjectThresholdsPage /> },
                  { path: "alert-channels", element: <ProjectAlertChannelsPage /> },
                  { path: "routes", element: <ProjectAlertRoutesPage /> },
                  { path: "routes/:routeId", element: <AlertRouteWizardPage /> },
                  { path: "connectors", element: <ProjectConnectorsPage /> },
                  { path: "deliveries", element: <AlertDeliveryLogsPage /> },
                  { path: "dlq", element: <DeadLetterQueuePage /> },
                  { path: "preferences", element: <MemberAlertPreferencesPage /> },

                  // Team
                  { path: "members", element: <ProjectMembersPage /> },

                  // Configuration
                  { path: "settings", element: <Navigate to="general" replace /> },
                  { path: "settings/general", element: <ProjectSettingsPage /> },

                  // Legacy paths — kept so existing links and bookmarks resolve.
                  { path: "alert-thresholds", element: <Navigate to="../alert-rules" replace /> },
                  { path: "thresholds", element: <Navigate to="../alert-rules" replace /> },
                  { path: "channels", element: <Navigate to="../alert-channels" replace /> },
                ]
              }
            ],
          },
          {
            path: "projects",
            children: [
              { index: true, element: <Navigate to="/" replace /> },
              { path: "new", element: <Navigate to="/" replace /> },
              { path: ":projectId/*", element: <ProjectUuidRedirect /> },
            ]
          },
          {
            path: "alerts",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <AlertEventsPage /> },
              { path: ":incidentId", element: <AlertEventDetailPage /> },
              { path: "rules", element: <AlertRulesPage /> },
              { path: "rules/:ruleId", element: <AlertRuleDetailPage /> },
              { path: "escalations", element: <EscalationsPage /> },
              { path: "escalations/:policyId", element: <EscalationDetailPage /> },
              { path: "templates", element: <AlertTemplatesPage /> },
              { path: "silences", element: <SilencesPage /> },
              { path: "routing", element: <RoutingRulesPage /> },
              { path: "metrics", element: <AlertMetricsPage /> },
              { path: "dead-letters", element: <AlertDeadLettersPage /> },
              // Legacy paths — kept so existing links and bookmarks resolve.
              { path: "channels", element: <Navigate to="../templates" replace /> },
              { path: "channels/:channelId", element: <Navigate to="../templates" replace /> },
            ],
          },
          {
            path: "automation",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <AutomationOverviewPage /> },
              { path: "workflows", element: <AutomationWorkflowsPage /> },
              { path: "workflows/:workflowId", element: <AutomationWorkflowDetailPage /> },
              { path: "runs", element: <AutomationRunsPage /> },
              { path: "runs/:runId", element: <AutomationRunDetailPage /> },
              { path: "approvals", element: <AutomationApprovalsPage /> },
              { path: "approvals/:approvalId", element: <AutomationApprovalDetailPage /> },
              { path: "templates", element: <AutomationTemplatesPage /> },
              { path: "events", element: <AutomationEventsPage /> },
              { path: "audit", element: <AutomationAuditPage /> },
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
              { index: true, element: withMetricLoading(<AiOverviewPage />) },
              { path: "assistant", element: withMetricLoading(<AiAssistantPage />) },
              { path: "investigations", element: withMetricLoading(<AiInvestigationsPage />) },
              { path: "reports", element: withMetricLoading(<AiReportsPage />) },
              { path: "usage", element: withMetricLoading(<AiUsagePage />) },
              { path: "knowledge", element: withMetricLoading(<AiKnowledgePage />) },
              { path: "settings", element: withMetricLoading(<AiSettingsPage />) },
            ],
          },
          {
            path: "admin",
            element: <ModuleLayout />,
            children: [
              { index: true, element: <OrgProfilePage /> },
              { path: "settings", element: <OrgSettingsPage /> },
              { path: "domains", element: <DomainsPage /> },
              { path: "team", element: <TeamPage /> },
              { path: "teams", element: <Navigate to="/admin/team" replace /> },
              { path: "members", element: <Navigate to="/admin/team" replace /> },
              { path: "members/:userId", element: <MemberDetailPage /> },
              { path: "invitations", element: <Navigate to="/admin/team" replace /> },
              { path: "sso", element: <SsoPage /> },
              { path: "scim", element: <ScimPage /> },
              { path: "roles", element: <RolesPermissionsPage /> },
              { path: "security-events", element: <SecurityEventsPage /> },
              { path: "audit-logs", element: <AuditLogsPage /> },
              { path: "sdk-config", element: <SdkConfigPage /> },
              { path: "compliance", element: <CompliancePage /> },
            ],
          },
          {
            path: "super-admin",
            element: <ModuleLayout />,
            children: [
              { path: "billing", element: <BillingPlansPage /> },
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
            ],
          },

          {
            path: "connectors",
            element: <ModuleLayout />,
            children: [
              { path: "webhooks", element: <WebhooksPage /> },
              { path: "webhooks/:webhookId", element: <WebhookDetailPage /> },
              { path: "integrations", element: <IntegrationsPage /> },
              { path: "integrations/slack/success", element: <SlackSuccessPage /> },
              { path: "integrations/slack/error", element: <SlackErrorPage /> },
              { path: "integrations/:integrationId", element: <IntegrationDetailPage /> },
              { path: "audit", element: <IntegrationsAuditPage /> },
            ],
          },
          {
            path: "developer",
            element: <ModuleLayout />,
            children: [
              { path: "data-retention", element: <DataRetentionPage /> },
              { path: "custom-settings", element: <SdkConfigPage /> },
            ],
          },
          {
            path: "settings",
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="/account/overview" replace /> },
              { path: "profile", element: <Navigate to="/account/profile" replace /> },
              { path: "password", element: <Navigate to="/account/security/password" replace /> },
              { path: "mfa", element: <Navigate to="/account/security/mfa" replace /> },
              { path: "sessions", element: <Navigate to="/account/activity/active-sessions" replace /> },
              { path: "backup-codes", element: <Navigate to="/account/security/recovery-codes" replace /> },
              { path: "trusted-devices", element: <Navigate to="/account/activity/active-sessions" replace /> },
              { path: "linked-accounts", element: <Navigate to="/account/connected/linked-accounts" replace /> },
              { path: "email-verification", element: <Navigate to="/account/profile" replace /> },
              { path: "authentication-policy", element: <EffectiveAuthPolicyPage /> },
              { path: "mfa-recovery", element: <MfaRecoveryPanel /> },
              { path: "privacy", element: <PrivacyAndDeletionPanel /> },
              { path: "personal-logs", element: <Navigate to="/account/activity/login-history" replace /> },
              { path: "security", element: <Navigate to="/account/overview" replace /> },
            ],
          },
          {
            path: "account",
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="overview" replace /> },
              { path: "overview", element: <AccountOverviewPanel /> },
              { path: "profile", element: <PersonalDetailsPanel /> },
              { path: "email", element: <Navigate to="/account/profile" replace /> },
              { path: "security/password", element: <ChangePasswordPanel /> },
              { path: "security/mfa", element: <MfaSecurityPanel /> },
              { path: "security/passkeys", element: <MfaSecurityPanel /> },
              { path: "security/recovery-codes", element: <BackupCodesPanel /> },
              { path: "activity/active-sessions", element: <ActiveSessionsPanel /> },
              { path: "activity/login-history", element: <AuditLogsPanel /> },
              { path: "connected/linked-accounts", element: <LinkedAccountsPanel /> },
            ],
          },

          { path: "auth/security", element: <SecurityCenterPage /> },
          { path: "auth/sessions", element: <SessionsPage /> },
          { path: "auth/step-up", element: <StepUpPage /> },
          // Catch-all for unmatched paths within the authenticated app shell
          { path: "*", element: <NotFoundPage /> },
    ],
  },
  // Routes that require auth but render OUTSIDE the main app shell (no sidebar)
  {
    element: <RequireAuth />,
    children: [
      { path: "onboarding/organization", element: <CreateOrganizationPage /> },
      { path: "billing/checkout/success", element: <CheckoutSuccessPage /> },
      { path: "billing/checkout/cancel", element: <CheckoutCancelPage /> },
    ],
  },
];
