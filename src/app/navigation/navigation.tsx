import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  Bell,
  BellRing,
  BrainCircuit,
  Building2,
  Cable,
  CreditCard,
  Database,
  FolderOpen,
  Gauge,
  Globe,
  Key,
  KeyRound,
  Laptop,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  ListChecks,
  ListTree,
  Logs,
  Package,
  Plug,
  Radar,
  Receipt,
  ScrollText,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Webhook,
  Workflow,
  Wrench,
  Terminal,
  LifeBuoy,
  FileDown,
  Cpu,
  GitFork,
  Award,
  UserCheck,
} from "lucide-react";

export type NavStatus = "live" | "partial" | "coming-soon";

export interface ModuleNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  status: NavStatus;
  exact?: boolean;
  description: string;
  group?: string; // Added for flyout grouping
}

export interface MainNavItem extends ModuleNavItem {
  children?: ModuleNavItem[];
}

export const navStatusLabel: Record<NavStatus, string> = {
  live: "Live",
  partial: "Partial",
  "coming-soon": "Coming soon",
};

export const navStatusClassName: Record<NavStatus, string> = {
  live: "bg-[var(--green-bg)] text-[var(--green)]",
  partial: "bg-[var(--yellow-bg)] text-[var(--yellow)]",
  "coming-soon": "bg-[var(--brand-bg)] text-[var(--brand)]",
};

export const mainNavigation: MainNavItem[] = [
  {
    label: "Home",
    path: "/dashboard",
    icon: LayoutGrid,
    status: "live",
    exact: true,
    description: "Global landing page for product health, recent activity, and shortcuts.",
  },
  {
    label: "Dashboards",
    path: "/dashboards",
    icon: LayoutDashboard,
    status: "live",
    description: "Ten persona-specific custom dashboards mapped to Pulse SDK event types.",
    children: [
      { label: "Overview", path: "/dashboards", icon: LayoutDashboard, status: "live", exact: true, description: "A single glance across every dashboard with quick links and headline metrics." },
      { label: "Executive overview", path: "/dashboards/executive", icon: LayoutDashboard, status: "live", description: "Single-pane portfolio health: score, errors, latency, revenue at risk." },
      { label: "Performance overview", path: "/dashboards/performance", icon: LineChart, status: "live", description: "Latency percentiles, dependency latency, slow requests, cold starts." },
      { label: "Error overview", path: "/dashboards/errors", icon: AlertTriangle, status: "live", description: "Grouped errors, regressions, mechanism breakdown, service impact." },
      { label: "Geo analytics", path: "/dashboards/geo", icon: Globe, status: "live", description: "Geo distribution, DAU/MAU, device mix, tenant concentration, funnel." },
      { label: "Traffic overview", path: "/dashboards/realtime", icon: Radar, status: "live", description: "Live RPS, status codes, connections, top routes, live stream." },
      { label: "Service map", path: "/dashboards/tracing", icon: ListTree, status: "live", description: "Trace list, service graph, DB query and external-call latency." },
      { label: "Infrastructure overview", path: "/dashboards/infrastructure", icon: Database, status: "live", description: "Cost/1M requests, utilization, pools, cache, queues, storage." },
      { label: "Security & threats", path: "/dashboards/security", icon: ShieldAlert, status: "live", description: "Security score, failed auth, anomalies, key abuse, JWT issues." },
      { label: "Release quality", path: "/dashboards/releases", icon: Activity, status: "live", description: "Release comparison, new errors, canary health, DORA metrics." },
      { label: "Business metrics", path: "/dashboards/business", icon: BadgeDollarSign, status: "live", description: "Endpoint adoption, version migration, churn, revenue attribution." },
      { label: "Scheduled reports", path: "/dashboards/reports", icon: ScrollText, status: "live", description: "Weekly and daily status report distributions." },
    ],
  },
  {
    label: "Observe",
    path: "/observability",
    icon: Activity,
    status: "live",
    description: "Requests, events, errors, and service health across monitored projects.",
    children: [
      { label: "Executive dashboard", path: "/observability", icon: LayoutDashboard, status: "live", exact: true, description: "High-level service overview backed by analytics dashboard endpoints." },
      { label: "Request explorer", path: "/observability/requests", icon: Gauge, status: "live", description: "Traffic and request-overview surfaces." },
      { label: "Events explorer", path: "/observability/events", icon: Radar, status: "live", description: "Search and inspect ingested events." },
      { label: "Error explorer", path: "/observability/errors", icon: AlertTriangle, status: "live", description: "Triage grouped errors and resolution state." },
      { label: "Service health", path: "/observability/service-health", icon: ShieldAlert, status: "live", description: "Project health plus platform readiness signals." },
      { label: "Latency explorer", path: "/observability/latency", icon: LineChart, status: "partial", description: "Latency view based on current aggregate analytics support." },
      { label: "Trace explorer", path: "/observability/traces", icon: ListTree, status: "coming-soon", description: "Reserved for future distributed tracing." },
      { label: "Log explorer", path: "/observability/logs", icon: Logs, status: "coming-soon", description: "Reserved for first-class log search and tailing." },
    ],
  },
  {
    label: "Services",
    path: "/services",
    icon: Cpu,
    status: "live",
    description: "Monitored microservices registry, dependency graph, and objective budgets.",
    children: [
      { label: "Service catalog", path: "/services", icon: FolderOpen, status: "live", exact: true, description: "Monitored microservices directory." },
      { label: "Dependencies", path: "/services/dependencies", icon: GitFork, status: "live", description: "Active service communication topology graph." },
      { label: "SLOs", path: "/services/slos", icon: Award, status: "live", description: "Service level objectives metrics and error budgets." },
    ],
  },
  {
    label: "Workspaces",
    path: "/projects",
    icon: Package,
    status: "live",
    description: "Project lifecycle, project API keys, and project-level usage.",
    children: [
      { label: "All projects", path: "/projects", icon: FolderOpen, status: "live", exact: true, description: "Organization-scoped project inventory." },
    ],
  },
  {
    label: "Act",
    path: "/alerts",
    icon: Bell,
    status: "coming-soon",
    description: "Incidents, alert rules, escalation policies, and notification channels.",
    children: [
      { label: "Incidents", path: "/alerts", icon: AlertTriangle, status: "coming-soon", exact: true, description: "Incident center for triggered alerts and investigations." },
      { label: "Alert rules", path: "/alerts/rules", icon: BellRing, status: "coming-soon", description: "Rule authoring for thresholds, anomalies, and conditions." },
      { label: "Escalations", path: "/alerts/escalations", icon: Workflow, status: "coming-soon", description: "On-call routing and escalation policies." },
      { label: "Channels", path: "/alerts/channels", icon: Webhook, status: "coming-soon", description: "Email, webhook, and chat notification destinations." },
    ],
  },
  {
    label: "Connections",
    path: "/ingestion",
    icon: Plug,
    status: "live",
    description: "Telemetry pipelines, endpoints, health, and ingestion operations.",
    children: [
      { label: "Overview", path: "/ingestion", icon: LayoutDashboard, status: "live", exact: true, description: "Platform ingestion summary and implementation notes." },
      { label: "API endpoints", path: "/ingestion/endpoints", icon: Cable, status: "live", description: "Public ingestion endpoint references." },
      { label: "Health", path: "/ingestion/health", icon: Shield, status: "live", description: "Ingestion health, readiness, and queue state views." },
      { label: "Keys & tokens", path: "/ingestion/keys", icon: KeyRound, status: "partial", description: "Key management routed through current org and project APIs." },
      { label: "Replay & pipeline", path: "/ingestion/replay", icon: ListChecks, status: "coming-soon", description: "Replay, dead-letter recovery, and pipeline controls." },
      { label: "Rate limits", path: "/ingestion/rate-limits", icon: Gauge, status: "partial", description: "Operational rate-limit visibility for ingest traffic." },
    ],
  },
  {
    label: "Insights",
    path: "/ai",
    icon: Sparkles,
    status: "coming-soon",
    description: "AI-assisted triage, anomaly detection, and root cause analysis.",
    children: [
      { label: "AI overview", path: "/ai", icon: Sparkles, status: "coming-soon", exact: true, description: "AI feature landing page and readiness." },
      { label: "Root cause analysis", path: "/ai/root-cause", icon: BrainCircuit, status: "coming-soon", description: "Planned automated incident explanation." },
      { label: "Anomaly detection", path: "/ai/anomalies", icon: Radar, status: "coming-soon", description: "Planned AI-driven anomaly summaries." },
      { label: "Release impact", path: "/ai/release-impact", icon: Activity, status: "coming-soon", description: "Planned release-aware regression insights." },
      { label: "Cost & usage", path: "/ai/costs", icon: BadgeDollarSign, status: "coming-soon", description: "Model spend tracking and governance." },
      { label: "Prompt & policy controls", path: "/ai/policies", icon: Shield, status: "coming-soon", description: "Prompt governance and approval controls." },
    ],
  },
  {
    label: "Organization",
    path: "/admin",
    icon: Building2,
    status: "live",
    description: "Organization access, security, auditability, and enterprise controls.",
    children: [
      { label: "Organization profile", path: "/admin", icon: Building2, status: "live", exact: true, description: "Organization identity, ownership, and base settings.", group: "General" },
      { label: "Environments", path: "/admin/environments", icon: Database, status: "live", description: "Environment management across org contexts.", group: "General" },
      { label: "Admin operations", path: "/admin/admin-ops", icon: Wrench, status: "live", description: "Privileged sync and configuration tools.", group: "General" },
      { label: "Members", path: "/admin/members", icon: Users, status: "live", description: "Membership, role, suspend, and reactivate flows.", group: "Access" },
      { label: "Teams", path: "/admin/teams", icon: UserCheck, status: "live", description: "Functional team organization and rotation rules.", group: "Access" },
      { label: "Invitations", path: "/admin/invitations", icon: Users, status: "live", description: "Invite, resend, validate, decline, and revoke.", group: "Access" },
      { label: "SSO", path: "/admin/sso", icon: Shield, status: "live", description: "Single sign-on configuration and management.", group: "Security" },
      { label: "SCIM", path: "/admin/scim", icon: Workflow, status: "live", description: "Provisioning tokens and SCIM surfaces.", group: "Security" },
      { label: "Security monitoring", path: "/admin/security-events", icon: ShieldAlert, status: "live", description: "Security event review for the org.", group: "Security" },
      { label: "Audit logs", path: "/admin/audit-logs", icon: ScrollText, status: "live", description: "Searchable audit trail and export controls.", group: "Security" },
      { label: "Org API keys", path: "/admin/api-keys", icon: KeyRound, status: "live", description: "Organization-level API key administration.", group: "Security" },
      { label: "Compliance", path: "/admin/compliance", icon: Shield, status: "coming-soon", description: "Reserved for enterprise compliance reporting.", group: "Security" },
    ],
  },
  {
    label: "Usage",
    path: "/billing",
    icon: CreditCard,
    status: "live",
    description: "Plans, invoices, usage, quotas, and payment operations.",
    children: [
      { label: "Plan & subscription", path: "/billing", icon: CreditCard, status: "live", exact: true, description: "Subscription state and plan changes." },
      { label: "Usage", path: "/billing/usage", icon: LineChart, status: "live", description: "Consumption, history, export, and forecast." },
      { label: "Invoices", path: "/billing/invoices", icon: Receipt, status: "live", description: "Invoice history and payment actions." },
      { label: "Payment methods", path: "/billing/payment-methods", icon: CreditCard, status: "live", description: "Stored payment method management." },
      { label: "Quotas", path: "/billing/quotas", icon: Gauge, status: "live", description: "Quota overview and increase requests." },
      { label: "Promotions", path: "/billing/promotions", icon: BadgeDollarSign, status: "live", description: "Coupons and promotional offers." },
    ],
  },
  {
    label: "Connectors",
    path: "/connectors",
    icon: Cable,
    status: "live",
    description: "External integrations, webhooks, and communication channels.",
    children: [
      { label: 'Integrations', path: '/connectors/integrations', icon: Globe, status: "live", description: "Slack, Email, and other 3rd-party connectors.", group: "Connectors" },
      { label: 'Webhooks', path: '/connectors/webhooks', icon: Webhook, status: "live", description: "Outgoing event notifications.", group: "Connectors" },
    ],
  },
  {
    label: "Developer",
    path: "/developer",
    icon: Terminal,
    status: "live",
    description: "API keys, remote config, and SDK configurations.",
    children: [
      { label: 'API keys', path: '/developer/api-keys', icon: KeyRound, status: "live", description: "Developer API keys for integrations.", group: "SDK Settings" },
      { label: 'Data retention policy', path: '/developer/data-retention', icon: Database, status: "live", description: "Configure how long data is retained.", group: "SDK Settings" },
      { label: 'SDK configuration', path: '/developer/custom-settings', icon: Settings, status: "live", description: "Manage custom SDK settings.", group: "SDK Settings" },
    ],
  },
  {
    label: "My Account",
    path: "/settings",
    icon: User,
    status: "live",
    description: "Personal configuration and account preferences.",
    children: [
      { label: 'Personal details', path: '/settings/profile', icon: User, exact: true, status: "live", description: "Your basic profile information.", group: "Personal" },
      { label: 'Change password', path: '/settings/password', icon: Key, status: "live", description: "Update your password.", group: "Personal" },
      { label: 'Security & MFA', path: '/settings/mfa', icon: ShieldCheck, status: "live", description: "Two-factor authentication and security.", group: "Personal" },
      { label: 'Active sessions', path: '/settings/sessions', icon: Laptop, status: "live", description: "Manage logged in sessions.", group: "Personal" },
      { label: 'Backup codes', path: '/settings/backup-codes', icon: KeyRound, status: "live", description: "Recovery backup codes.", group: "Personal" },
      { label: 'Trusted devices', path: '/settings/trusted-devices', icon: Shield, status: "live", description: "Review devices trusted for reduced MFA prompts.", group: "Personal" },
      { label: 'MFA recovery', path: '/settings/mfa-recovery', icon: LifeBuoy, status: "live", description: "Request help when MFA methods are unavailable.", group: "Personal" },
      { label: 'Privacy & deletion', path: '/settings/privacy', icon: FileDown, status: "live", description: "Export account data or request deletion.", group: "Personal" },
      { label: 'My audit logs', path: '/settings/personal-logs', icon: Activity, status: "live", description: "Audit trail for your account actions.", group: "Personal" },
    ],
  },
];

export function findMainNavItem(pathname: string): MainNavItem | undefined {
  return mainNavigation.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
}
