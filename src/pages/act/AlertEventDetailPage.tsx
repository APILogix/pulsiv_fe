import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import {
  Activity,
  AlertOctagon,
  ArrowLeft,
  CheckCircle2,
  CheckSquare,
  Clock,
  Code,
  Eye,
  Layers,
  Mail,
  Send,
  ShieldAlert,
  Sparkles,
  User,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAlertEvent,
  useAlertEventDeliveries,
  useAlertEventMutations,
} from "@/modules/alerting/hooks/useAlerting";
import { IncidentStateBadge } from "@/modules/alerting/components/IncidentStateBadge";
import { SeverityBadge, DetailSkeleton } from "@/shared/observe";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

export default function AlertEventDetailPage() {
  const { incidentId = "" } = useParams();
  const navigate = useNavigate();

  const { data: event, isLoading, refetch } = useAlertEvent(incidentId);
  const { data: deliveries = [] } = useAlertEventDeliveries(event?.id);
  const { acknowledge, resolve, silenceFromEvent } = useAlertEventMutations();

  const [comment, setComment] = useState("");
  const [silenceDuration, setSilenceDuration] = useState("60");

  if (isLoading) return <DetailSkeleton />;
  if (!event) {
    return (
      <div className="mx-auto max-w-[1000px] p-8 text-center">
        <AlertOctagon className="mx-auto size-8 text-muted-foreground" />
        <h2 className="mt-2 text-base font-semibold text-[var(--text)]">Incident not found</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The requested alert incident does not exist or has been pruned.
        </p>
        <Link
          to="/alerts"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-[var(--brand)] hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Back to command center
        </Link>
      </div>
    );
  }

  const isFiring = event.status === "firing" || event.status === "pending";
  const isAcked = event.status === "acknowledged";
  const isResolved = event.status === "resolved";

  const onAcknowledge = () =>
    acknowledge.mutate(
      { id: event.id, body: { comment: comment || undefined } },
      {
        onSuccess: () => {
          toast.success("Incident acknowledged");
          setComment("");
          refetch();
        },
        onError: (error) => toast.error(apiErrorMessage(error, "Could not acknowledge incident.")),
      },
    );

  const onSilence = () =>
    silenceFromEvent.mutate(
      {
        id: event.id,
        body: { durationMinutes: Number.parseInt(silenceDuration, 10) || 60, comment: comment || undefined },
      },
      {
        onSuccess: () => {
          toast.success(`Silenced for ${silenceDuration} minutes`);
          setComment("");
          refetch();
        },
        onError: (error) => toast.error(apiErrorMessage(error, "Could not silence incident.")),
      },
    );

  const onResolve = () =>
    resolve.mutate(
      { id: event.id, body: { reason: comment || "Resolved from incident detail", comment: comment || undefined } },
      {
        onSuccess: () => {
          toast.success("Incident marked resolved");
          setComment("");
          refetch();
        },
        onError: (error) => toast.error(apiErrorMessage(error, "Could not resolve incident.")),
      },
    );

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 p-4 sm:p-6">
      {/* Back button */}
      <button
        onClick={() => navigate("/alerts")}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[var(--text)] transition-colors"
      >
        <ArrowLeft className="size-3.5" /> Back to Incident Command Center
      </button>

      {/* Incident Header Card */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <IncidentStateBadge
                state={event.status === "firing" ? "triggered" : event.status}
                size="md"
              />
              <SeverityBadge severity={event.severity} size="sm" />
              {event.projectId && (
                <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  Project: {event.projectId}
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold text-[var(--text)] tracking-tight">
              {event.source}
            </h1>
            <p className="font-mono text-xs text-muted-foreground">
              Fingerprint: {event.fingerprint}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/30 p-3 text-right">
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                Occurrences
              </span>
              <span className="text-xl font-bold font-mono text-[var(--text)]">
                {event.duplicateCount}x
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Key-Value Strip */}
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/40 bg-muted/20 p-3.5 text-xs sm:grid-cols-4 font-mono">
          <div>
            <span className="text-[10px] uppercase text-muted-foreground block">Started At</span>
            <span className="text-[var(--text)]">{new Date(event.startedAt).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-muted-foreground block">Last Triggered</span>
            <span className="text-[var(--text)]">{new Date(event.updatedAt).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-muted-foreground block">Rule ID</span>
            <span className="text-[var(--text)] truncate block">
              {event.ruleId ? (
                <Link to={`/alerts/rules/${event.ruleId}`} className="text-[var(--brand)] hover:underline">
                  {event.ruleId}
                </Link>
              ) : (
                "Direct signal"
              )}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-muted-foreground block">Auto-Resolve</span>
            <span className="text-[var(--text)]">
              {event.autoResolveAt ? new Date(event.autoResolveAt).toLocaleTimeString() : "Disabled"}
            </span>
          </div>
        </div>

        {/* Resolution or Acknowledgment Audit Info */}
        {(event.acknowledgedAt || event.resolvedAt || event.suppressedAt) && (
          <div className="flex flex-wrap gap-4 border-t border-border/40 pt-3 text-xs text-muted-foreground">
            {event.acknowledgedAt && (
              <div className="flex items-center gap-1.5">
                <Eye className="size-3.5 text-blue-400" />
                <span>
                  Acked by {event.acknowledgedBy || "User"} at{" "}
                  {new Date(event.acknowledgedAt).toLocaleString()}
                </span>
              </div>
            )}
            {event.resolvedAt && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                <span>
                  Resolved by {event.resolvedBy || "System"} at{" "}
                  {new Date(event.resolvedAt).toLocaleString()}
                  {event.resolutionReason ? ` (${event.resolutionReason})` : ""}
                </span>
              </div>
            )}
            {event.suppressedAt && (
              <div className="flex items-center gap-1.5">
                <VolumeX className="size-3.5 text-amber-400" />
                <span>Suppressed at {new Date(event.suppressedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Incident Lifecycle Action Panel */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-5 space-y-4 shadow-sm max-w-[800px]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Activity className="size-3.5" /> Incident Actions & Triage
        </h3>

        <div className="space-y-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Add an optional comment or root-cause reason…"
            className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-[var(--text)] placeholder:text-muted-foreground focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
          />

          <div className="flex flex-wrap items-center gap-2.5">
            {!isAcked && !isResolved && (
              <button
                onClick={onAcknowledge}
                disabled={acknowledge.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3.5 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 disabled:opacity-50"
              >
                <Eye className="size-3.5" />
                Acknowledge
              </button>
            )}

            {!isResolved && (
              <div className="flex items-center gap-1.5">
                <select
                  value={silenceDuration}
                  onChange={(e) => setSilenceDuration(e.target.value)}
                  className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-[var(--text)]"
                >
                  <option value="15">Silence 15m</option>
                  <option value="60">Silence 1h</option>
                  <option value="240">Silence 4h</option>
                  <option value="1440">Silence 24h</option>
                </select>
                <button
                  onClick={onSilence}
                  disabled={silenceFromEvent.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  <VolumeX className="size-3.5" />
                  Mute
                </button>
              </div>
            )}

            {!isResolved && (
              <button
                onClick={onResolve}
                disabled={resolve.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                <CheckSquare className="size-3.5" />
                Resolve Incident
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notification Deliveries Section */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Send className="size-3.5 text-[var(--brand)]" />
            Notification Deliveries ({deliveries.length})
          </h3>
        </div>

        {deliveries.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            No notification deliveries recorded for this incident yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 text-[10px] uppercase font-mono text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Channel / Target</th>
                  <th className="p-2.5">Destination</th>
                  <th className="p-2.5">Attempt</th>
                  <th className="p-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-muted/20">
                    <td className="p-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase font-mono",
                          delivery.status === "delivered" || delivery.status === "sent"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : delivery.status === "failed"
                              ? "bg-rose-500/10 text-rose-400"
                              : "bg-amber-500/10 text-amber-400",
                        )}
                      >
                        {delivery.status}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-[11px]">
                      {delivery.channelType ?? "managed_email"}
                    </td>
                    <td className="p-2.5 font-mono text-[11px] text-muted-foreground">
                      {delivery.destination ?? "Project Owner"}
                    </td>
                    <td className="p-2.5 font-mono text-[11px]">
                      {delivery.attemptNumber} of {delivery.maxAttempts}
                    </td>
                    <td className="p-2.5 font-mono text-[11px] text-muted-foreground">
                      {new Date(delivery.attemptedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Signal & Telemetry Payload */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Code className="size-3.5" />
            Telemetry Context & Evidence Payload
          </h3>
        </div>
        <pre className="max-h-[380px] overflow-auto rounded-lg border border-border/40 bg-muted/30 p-3.5 text-[11px] font-mono leading-relaxed text-[var(--text)]">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      </div>
    </div>
  );
}
