import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  Bell,
  BellRing,
  Building2,
  Cable,
  CreditCard,
  Database,
  FolderOpen,
  Gauge,
  Globe,
  KeyRound,
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
  Sparkles,
  Users,
  Webhook,
  Workflow,
  Terminal,
  Cpu,
  GitFork,
  Award,
  MessagesSquare,
  FlaskConical,
  FileBarChart,
  BookOpen,
  SlidersHorizontal,
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
  external?: boolean;
}

export interface MainNavItem extends ModuleNavItem {
  children?: ModuleNavItem[];
}

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
    label: "AI",
    path: "/ai",
    icon: Sparkles,
    status: "live",
    description: "Enterprise AI: assistant, investigations, reports, usage, knowledge, and governance.",
    children: [
      { label: "AI Overview", path: "/ai", icon: Sparkles, status: "live", exact: true, description: "AI health, recommendations, credits, and recent activity." },
      { label: "AI Assistant", path: "/ai/assistant", icon: MessagesSquare, status: "live", description: "Grounded monitoring chat with citations and follow-ups." },
      { label: "AI Investigations", path: "/ai/investigations", icon: FlaskConical, status: "live", description: "Investigate errors, traces, logs, spans, stack traces, and deployments." },
      { label: "AI Reports", path: "/ai/reports", icon: FileBarChart, status: "live", description: "Weekly, incident, and executive reports with history and export." },
      { label: "AI Usage", path: "/ai/usage", icon: Gauge, status: "live", description: "AI credit consumption, limits, and cost visibility." },
      { label: "AI Knowledge", path: "/ai/knowledge", icon: BookOpen, status: "live", description: "Runbooks and documentation the AI can cite." },
      { label: "AI Settings", path: "/ai/settings", icon: SlidersHorizontal, status: "live", description: "Organization AI configuration, budgets, and limits." },
    ],
  },
  {
    label: "Organization",
    path: "/admin",
    icon: Building2,
    status: "live",
    description: "Organization access, security, auditability, and enterprise controls.",
    children: [
      { label: "Dashboard", path: "/admin", icon: LayoutDashboard, status: "live", exact: true, description: "Organization health, quota, security, and recent activity.", group: "Overview" },
      { label: "Team", path: "/admin/team", icon: Users, status: "live", description: "Members and pending invitations.", group: "Access" },
      { label: "SSO", path: "/admin/sso", icon: Shield, status: "live", description: "Single sign-on configuration and management.", group: "Security" },
      { label: "SCIM", path: "/admin/scim", icon: Workflow, status: "live", description: "Provisioning tokens and SCIM surfaces.", group: "Security" },
      { label: "Domains", path: "/admin/domains", icon: Globe, status: "live", description: "DNS verification, auto-join, and identity-domain ownership.", group: "Security" },
      { label: "Security monitoring", path: "/admin/security-events", icon: ShieldAlert, status: "live", description: "Security event review for the org.", group: "Security" },
      { label: "Audit logs", path: "/admin/audit-logs", icon: ScrollText, status: "live", description: "Searchable audit trail and export controls.", group: "Security" },
      { label: "Compliance", path: "/admin/compliance", icon: Shield, status: "live", description: "Residency, retention, export, and terms records.", group: "Security" },
      { label: "Settings", path: "/admin/settings", icon: Settings, status: "live", description: "Profile, preferences, and owner-only danger zone.", group: "Settings" },
    ],
  },
  {
    label: "Billing",
    path: "/billing",
    icon: CreditCard,
    status: "live",
    description: "Plans, invoices, usage, and payment operations.",
    children: [
      { label: "Plan & subscription", path: "/billing", icon: CreditCard, status: "live", exact: true, description: "Subscription state and plan changes." },
      { label: "Usage", path: "/billing/usage", icon: LineChart, status: "live", description: "Consumption, history, export, and forecast." },
      { label: "Invoices", path: "/billing/invoices", icon: Receipt, status: "live", description: "Invoice history and payment actions." },
      { label: "Payment methods", path: "/billing/payment-methods", icon: CreditCard, status: "live", description: "Stored payment method management." },
    ],
  },
  {
    label: "Developer",
    path: "/developer",
    icon: Terminal,
    status: "live",
    description: "API keys, connectors, delivery logs, and documentation.",
    children: [
      { label: 'API Keys', path: '/projects', icon: KeyRound, status: "live", description: "Select a project to manage its supported ingestion API keys.", group: "Developer" },
      { label: 'Connectors', path: '/connectors/integrations', icon: Cable, status: "live", description: "Slack, Teams, Webhooks, etc.", group: "Developer" },
      { label: 'Delivery Logs', path: '/connectors/audit', icon: Activity, status: "live", description: "Audit trail for all connectors.", group: "Developer" },
      { label: 'API Reference', path: 'https://docs.pulsiv.com', icon: FolderOpen, status: "live", description: "External API documentation.", external: true, group: "Developer" },
    ],
  },
];
