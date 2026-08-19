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
  ClipboardCheck,
  CreditCard,
  Database,
  FileStack,
  FolderOpen,
  Inbox,
  Play,
  Gauge,
  Globe,
  KeyRound,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  ListTree,
  Logs,
  MemoryStick,
  Package,
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
  Video,
  Workflow,
  Terminal,
  Cpu,
  FileBarChart,
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
      { label: "Overview", path: "/observability", icon: LayoutDashboard, status: "live", exact: true, description: "High-level service overview backed by analytics dashboard endpoints.", group: "Overview" },
      { label: "Requests", path: "/observability/requests", icon: Gauge, status: "live", description: "Traffic and request-overview surfaces.", group: "Events" },
      { label: "Errors", path: "/observability/errors", icon: AlertTriangle, status: "live", description: "Triage grouped errors and resolution state.", group: "Events" },
      { label: "Error Groups", path: "/observability/error-groups", icon: Layers, status: "live", description: "Fingerprint-grouped error issue triage and resolution.", group: "Events" },
      { label: "Traces", path: "/observability/traces", icon: ListTree, status: "live", description: "Distributed traces across services and spans.", group: "Events" },
      { label: "Logs", path: "/observability/logs", icon: Logs, status: "live", description: "Searchable, tailing log stream across services.", group: "Events" },
      { label: "Replays", path: "/observability/replay", icon: Video, status: "live", description: "Recorded browser sessions with DOM and network capture.", group: "Events" },
      { label: "Latency", path: "/observability/latency", icon: LineChart, status: "partial", description: "Latency view based on current aggregate analytics support.", group: "Performance" },
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
    label: "Act",
    path: "/alerts",
    icon: Bell,
    status: "live",
    description: "Alert events, rules, escalation policies, templates, silences, and routing.",
    children: [
      { label: "Overview", path: "/alerts/overview", icon: LayoutDashboard, status: "live", description: "Centralized alerting health, volume, and operational status.", group: "Alerting" },
      { label: "Incidents", path: "/alerts", icon: AlertTriangle, status: "live", exact: true, description: "Incident command center for live events and triage.", group: "Alerting" },
      { label: "Alert rules", path: "/alerts/rules", icon: BellRing, status: "live", description: "Rule authoring for thresholds, anomalies, and conditions.", group: "Alerting" },
      { label: "Escalations", path: "/alerts/escalations", icon: Workflow, status: "live", description: "Ordered escalation policies and steps.", group: "Alerting" },
      { label: "Templates", path: "/alerts/templates", icon: FileStack, status: "live", description: "Message templates for notifications.", group: "Alerting" },
      { label: "Silences", path: "/alerts/silences", icon: BellOff, status: "live", description: "Time-boxed suppression windows.", group: "Operations" },
      { label: "Routing", path: "/alerts/routing", icon: Route, status: "live", description: "Match alerts to connector and route targets.", group: "Operations" },
      { label: "Metrics", path: "/alerts/metrics", icon: Gauge, status: "live", description: "Rolled-up firing and delivery counters.", group: "Operations" },
      { label: "Dead letters", path: "/alerts/dead-letters", icon: Inbox, status: "live", description: "Failed batch jobs awaiting retry or discard.", group: "Operations" },
    ],
  },
  {
    label: "Workflows",
    path: "/automation",
    icon: Workflow,
    status: "live",
    description: "Automation workflows: triggers, conditions, guarded actions, approvals, and run history.",
    children: [
      { label: "Overview", path: "/automation", icon: LayoutDashboard, status: "live", exact: true, description: "Automation health, in-flight runs, and pending approvals.", group: "Automation" },
      { label: "Workflows", path: "/automation/workflows", icon: Workflow, status: "live", description: "Create, publish, and switch automation workflows on or off.", group: "Automation" },
      { label: "Templates", path: "/automation/templates", icon: FileStack, status: "live", description: "Prebuilt automations you can turn into an editable draft.", group: "Automation" },
      { label: "Runs", path: "/automation/runs", icon: Play, status: "live", description: "Execution history with step detail, cancel, and retry.", group: "Operations" },
      { label: "Approvals", path: "/automation/approvals", icon: ClipboardCheck, status: "live", description: "Decision queue for high-risk automation actions.", group: "Operations" },
      { label: "Event inbox", path: "/automation/events", icon: Inbox, status: "live", description: "Publish or replay automation events by hand.", group: "Operations" },
      { label: "Audit", path: "/automation/audit", icon: ScrollText, status: "live", description: "Immutable trail of workflow, run, and approval changes.", group: "Governance" },
    ],
  },
  {
    label: "AI",
    path: "/ai",
    icon: Sparkles,
    status: "live",
    description: "Enterprise observability AI: intelligent chat and contextual investigation drawer.",
    isDrawerTrigger: true,
  },
  {
    label: "AI Reports",
    path: "/ai/reports",
    icon: FileBarChart,
    status: "live",
    description: "Reliability reports, weekly health analysis, and executive summaries.",
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
      { label: 'API Reference', path: 'https://docs.sentinel.com', icon: FolderOpen, status: "live", description: "External API documentation.", external: true, group: "Developer" },
    ],
  },
];
