import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlarmClock,
  AlertTriangle,
  BadgeDollarSign,
  Bell,
  BellOff,
  BellRing,
  Building2,
  Cable,
  CreditCard,
  Database,
  FileStack,
  FolderOpen,
  Inbox,
  Gauge,
  Globe,
  KeyRound,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  ListChecks,
  ListTree,
  Logs,
  MemoryStick,
  Package,
  Plug,
  Radar,
  Receipt,
  Recycle,
  Route,
  ScrollText,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Timer,
  Users,
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
  isDrawerTrigger?: boolean;
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
    description: "Ten persona-specific custom dashboards mapped to LynkTrace SDK event types.",
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
      { label: "Overview", path: "/observability", icon: LayoutDashboard, status: "live", exact: true, description: "High-level service overview backed by analytics dashboard endpoints.", group: "Overview" },
      { label: "Requests", path: "/observability/requests", icon: Gauge, status: "live", description: "Traffic and request-overview surfaces.", group: "Events" },
      { label: "Errors", path: "/observability/errors", icon: AlertTriangle, status: "live", description: "Triage grouped errors and resolution state.", group: "Events" },
      { label: "Error Groups", path: "/observability/error-groups", icon: Layers, status: "live", description: "Fingerprint-grouped error issue triage and resolution.", group: "Events" },
      { label: "Traces", path: "/observability/traces", icon: ListTree, status: "live", description: "Distributed traces across services and spans.", group: "Events" },
      { label: "Logs", path: "/observability/logs", icon: Logs, status: "live", description: "Searchable, tailing log stream across services.", group: "Events" },
      { label: "Latency", path: "/observability/latency", icon: LineChart, status: "live", description: "Latency percentiles, distribution, and the endpoints that own the tail.", group: "Performance" },
      { label: "Metrics", path: "/observability/metrics", icon: Activity, status: "live", description: "Custom counters, gauges, and histograms.", group: "Performance" },
      { label: "Runtime Metrics", path: "/observability/runtime-metrics", icon: MemoryStick, status: "live", description: "V8 / Node.js internals: heap usage and active handles.", group: "Performance" },
      { label: "Profiling", path: "/observability/profiling", icon: Cpu, status: "live", description: "CPU and memory profiles captured from running processes.", group: "Performance" },
      { label: "Event Loop", path: "/observability/event-loop", icon: Timer, status: "live", description: "Event loop lag and utilization for Node.js services.", group: "Performance" },
      { label: "GC Monitoring", path: "/observability/gc-monitoring", icon: Recycle, status: "live", description: "Garbage collection pauses and long collection events.", group: "Performance" },
      { label: "Cron Check-ins", path: "/observability/crons", icon: AlarmClock, status: "live", description: "Scheduled job check-ins and missed-execution monitoring.", group: "Jobs" },
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
    label: "Alerts & Incidents",
    path: "/alerts",
    icon: Bell,
    status: "live",
    description: "Alert events, rules, escalation policies, templates, silences, and routing.",
    children: [
      { label: "Overview", path: "/alerts/overview", icon: LayoutDashboard, status: "live", description: "Centralized alerting health, volume, and operational status.", group: "Command Center" },
      { label: "Incidents", path: "/alerts", icon: AlertTriangle, status: "live", exact: true, description: "Incident command center for live events and triage.", group: "Command Center" },
      { label: "Events", path: "/alerts/events", icon: Radar, status: "live", description: "Raw evaluated telemetry events and breach triggers.", group: "Command Center" },
      { label: "Alert rules", path: "/alerts/rules", icon: BellRing, status: "live", description: "Rule authoring for thresholds, anomalies, and conditions.", group: "Rules & Catalogs" },
      { label: "Escalations", path: "/alerts/escalations", icon: Workflow, status: "live", description: "Ordered escalation policies and steps.", group: "Rules & Catalogs" },
      { label: "Templates", path: "/alerts/templates", icon: FileStack, status: "live", description: "Message templates for notifications.", group: "Rules & Catalogs" },
      { label: "Routing", path: "/alerts/routing", icon: Route, status: "live", description: "Match alerts to connector and route targets.", group: "Delivery & Routing" },
      { label: "Connectors", path: "/connectors/integrations", icon: Cable, status: "live", description: "Slack, Teams, PagerDuty, and third-party integrations.", group: "Delivery & Routing" },
      { label: "Webhooks", path: "/connectors/webhooks", icon: Plug, status: "live", description: "Custom HTTP endpoints, webhooks, and retry policies.", group: "Delivery & Routing" },
      { label: "Silences", path: "/alerts/silences", icon: BellOff, status: "live", description: "Time-boxed suppression windows and scheduled silences.", group: "Delivery & Routing" },
      { label: "Delivery logs", path: "/connectors/audit", icon: ScrollText, status: "live", description: "Audit trail for all notifications dispatched across connectors.", group: "Operations" },
      { label: "Dead letters", path: "/alerts/dead-letters", icon: Inbox, status: "live", description: "Failed batch jobs and notifications awaiting retry or discard.", group: "Operations" },
      { label: "Metrics", path: "/alerts/metrics", icon: Gauge, status: "live", description: "Rolled-up firing and delivery counters.", group: "Operations" },
    ],
  },
  {
    label: "AI Intelligence",
    path: "/ai",
    icon: Sparkles,
    status: "live",
    description: "Enterprise observability AI: root-cause investigation, chat assistant, reliability analysis, and token quota management.",
    children: [
      { label: "Overview", path: "/ai", icon: Sparkles, status: "live", exact: true, description: "AI intelligence overview, fleet health analysis, and triage queue.", group: "Intelligence" },
      { label: "Assistant", path: "/ai/assistant", icon: MessagesSquare, status: "live", description: "Conversational AI assistant for telemetry querying and debugging.", group: "Intelligence" },
      { label: "Investigations", path: "/ai/investigations", icon: FlaskConical, status: "live", description: "Autonomous root-cause analysis and incident investigations.", group: "Intelligence" },
      { label: "Reliability reports", path: "/ai/reports", icon: FileBarChart, status: "live", description: "Automated reliability assessments and executive summaries.", group: "Reports" },
      { label: "Knowledge base", path: "/ai/knowledge", icon: BookOpen, status: "live", description: "Operational runbooks, documentation, and schema context for AI.", group: "Platform" },
      { label: "Token usage & costs", path: "/ai/usage", icon: BadgeDollarSign, status: "live", description: "Token consumption, model breakdown, and organization AI quotas.", group: "Platform" },
      { label: "Model settings", path: "/ai/settings", icon: SlidersHorizontal, status: "live", description: "Model selection, guardrails, temperature, and custom prompts.", group: "Platform" },
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
      { label: "Members", path: "/admin/members", icon: Users, status: "live", description: "Members and pending invitations.", group: "Access" },
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
];
