import React from "react";
import { IncidentState } from "../api/types";
import { CheckCircle2, Clock, AlertOctagon, Eye, TrendingUp, VolumeX, CheckSquare, XCircle } from "lucide-react";

interface IncidentStateBadgeProps {
  state: IncidentState | string;
  size?: "sm" | "md" | "lg";
}

const stateConfig: Record<string, { label: string; bg: string; icon: React.ReactNode }> = {
  healthy: {
    label: "Healthy",
    bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  pending: {
    label: "Pending",
    bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: <Clock className="w-3 h-3" />,
  },
  triggered: {
    label: "Triggered",
    bg: "bg-rose-500/15 text-rose-400 border-rose-500/30 font-semibold animate-pulse",
    icon: <AlertOctagon className="w-3 h-3" />,
  },
  acknowledged: {
    label: "Acknowledged",
    bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: <Eye className="w-3 h-3" />,
  },
  escalated: {
    label: "Escalated",
    bg: "bg-purple-500/15 text-purple-400 border-purple-500/30 font-semibold",
    icon: <TrendingUp className="w-3 h-3" />,
  },
  muted: {
    label: "Muted",
    bg: "bg-muted text-muted-foreground border-border",
    icon: <VolumeX className="w-3 h-3" />,
  },
  resolved: {
    label: "Resolved",
    bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: <CheckSquare className="w-3 h-3" />,
  },
  closed: {
    label: "Closed",
    bg: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    icon: <XCircle className="w-3 h-3" />,
  },
};

export const IncidentStateBadge: React.FC<IncidentStateBadgeProps> = ({ state, size = "md" }) => {
  const normalized = (state || "healthy").toLowerCase();
  const conf = stateConfig[normalized] || stateConfig.healthy;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${conf.bg} ${sizeClasses[size]}`}
    >
      {conf.icon}
      <span>{conf.label}</span>
    </span>
  );
};
