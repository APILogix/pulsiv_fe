import React from "react";
import { IncidentStateHistory, IncidentOccurrence } from "../api/types";
import { IncidentStateBadge } from "./IncidentStateBadge";
import { Clock, User, MessageSquare, Activity } from "lucide-react";

interface IncidentTimelineProps {
  history: IncidentStateHistory[];
  occurrences: IncidentOccurrence[];
  comments?: Array<{ id: string; user: string; comment: string; createdAt: string }>;
}

export const IncidentTimeline: React.FC<IncidentTimelineProps> = ({
  history,
  occurrences,
  comments = [],
}) => {
  // Combine occurrences, state changes, and comments into chronological items
  const timelineItems = [
    ...history.map((h) => ({
      id: h.id,
      type: "state_change" as const,
      timestamp: h.timestamp,
      title: `State changed from ${h.fromState} to ${h.toState}`,
      user: h.changedBy,
      reason: h.reason,
      state: h.toState,
    })),
    ...occurrences.map((o) => ({
      id: o.id,
      type: "occurrence" as const,
      timestamp: o.timestamp,
      title: "Incident triggered / repeated occurrence",
      user: "System Signal Bus",
      reason: undefined,
      payload: o.payload,
    })),
    ...comments.map((c) => ({
      id: c.id,
      type: "comment" as const,
      timestamp: c.createdAt,
      title: "Comment added",
      user: c.user,
      reason: c.comment,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Incident Timeline & Audit Trail
        </h4>
        <span className="text-xs text-muted-foreground font-mono">{timelineItems.length} events</span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
        {timelineItems.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-4">No audit events recorded.</p>
        ) : (
          timelineItems.map((item) => (
            <div key={item.id} className="relative group">
              {/* Point Marker */}
              <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-background border-2 border-primary group-hover:scale-125 transition-transform" />

              <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.type === "state_change" && <IncidentStateBadge state={item.state} size="sm" />}
                    {item.type === "occurrence" && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20 text-[10px]">
                        Trigger Occurrence
                      </span>
                    )}
                    {item.type === "comment" && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20 text-[10px] flex items-center gap-1">
                        <MessageSquare className="w-2.5 h-2.5" />
                        Comment
                      </span>
                    )}
                    <span className="font-medium text-foreground">{item.title}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                  <User className="w-3 h-3" />
                  <span>Actor: {item.user || "System"}</span>
                </div>

                {item.reason && (
                  <p className="p-2 rounded bg-background border border-border/40 text-muted-foreground text-xs font-mono">
                    {item.reason}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
