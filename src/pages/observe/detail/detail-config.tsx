import type { LucideIcon } from "lucide-react";
import { Activity, Bug, Clock3, Gauge, GitBranch, Globe, ScrollText, Waypoints } from "lucide-react";
import type { DetailResource } from "./detail-contract";

export interface DetailResourceConfig {
  label: string;
  singular: string;
  icon: LucideIcon;
  accent: string;
}

export const DETAIL_CONFIG: Record<DetailResource, DetailResourceConfig> = {
  errors: { label: "Errors", singular: "Error", icon: Bug, accent: "var(--red)" },
  requests: { label: "Requests", singular: "Request", icon: Globe, accent: "var(--blue)" },
  traces: { label: "Traces", singular: "Trace", icon: GitBranch, accent: "var(--violet)" },
  spans: { label: "Spans", singular: "Span", icon: Waypoints, accent: "var(--violet)" },
  logs: { label: "Logs", singular: "Log", icon: ScrollText, accent: "var(--text2)" },
  metrics: { label: "Metrics", singular: "Metric", icon: Gauge, accent: "var(--blue)" },
  profiles: { label: "Profiles", singular: "Profile", icon: Activity, accent: "var(--amber)" },
  crons: { label: "Cron check-ins", singular: "Cron check-in", icon: Clock3, accent: "var(--green)" },
};

export function resourceConfig(resource: DetailResource): DetailResourceConfig {
  return DETAIL_CONFIG[resource];
}
