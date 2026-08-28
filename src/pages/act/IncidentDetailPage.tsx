/**
 * Incident detail page (Phase 20).
 *
 * Sections: header, trigger, timeline, notifications, resolution.
 *
 * Data comes from three separately-paginated endpoints (incident, timeline,
 * notifications) rather than one fat payload, so the detail view cannot become an
 * unbounded response. Telemetry evidence is deliberately NOT embedded - the
 * incident carries the observed/threshold snapshot only, and deeper forensics
 * link out to the telemetry surfaces.
 */
import { useParams, useNavigate, Link } from "react-router";
import {
  Activity,
  ArrowLeft,
  BellRing,
  CheckCircle2,
  Clock,
  Gauge,
  ShieldCheck,
  Target,
} from "lucide-react";
import {
  useIncident,
  useIncidentTimeline,
  useIncidentNotifications,
  useIncidentMutations,
} from "@/modules/alerting/hooks/useAlerting";
import { SeverityBadge } from "@/shared/observe";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { IncidentStatus } from "@/modules/alerting/api/types";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function StatusPill({ status }: { status: IncidentStatus }) {
  const styles: Record<IncidentStatus, string> = {
    open: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    acknowledged: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    resolved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  };
  return (
    <span className={cn("inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", styles[status])}>
      {status}
    </span>
  );
}

function Fact({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Gauge }) {
  return (
    <div>
      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--text)]">
        {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
        {value}
      </span>
    </div>
  );
}

/** Delivery status colour. `sent` is the only success state. */
function deliveryTone(status: string): string {
  if (status === "sent") return "text-emerald-400";
  if (status === "failed") return "text-rose-400";
  if (status === "queued" || status === "pending") return "text-amber-400";
  return "text-muted-foreground";
}

export default function IncidentDetailPage() {
  const { incidentId = "" } = useParams();
  const navigate = useNavigate();

  const { data: incident, isLoading, isError, error, refetch } = useIncident(incidentId);
  const { data: timeline } = useIncidentTimeline(incidentId, { limit: 100 });
  const { data: notifications } = useIncidentNotifications(incidentId, { limit: 50 });
  const mutations = useIncidentMutations(incidentId);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1200px] p-6">
        <div className="rounded-xl border border-border/60 bg-card/60 p-12 text-center text-xs text-muted-foreground">
          Loading incident…
        </div>
      </div>
    );
  }

  if (isError || !incident) {
    return (
      <div className="mx-auto w-full max-w-[1200px] p-6">
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
          <p className="text-sm font-semibold text-rose-400">Could not load incident</p>
          <p className="mt-1 text-xs text-muted-foreground">{apiErrorMessage(error)}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => refetch()} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted">
              Retry
            </button>
            <button onClick={() => navigate("/alerts/incidents")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted">
              Back to incidents
            </button>
          </div>
        </div>
      </div>
    );
  }

  const acknowledge = async () => {
    try {
      await mutations.acknowledge.mutateAsync(incident.id);
      toast.success("Incident acknowledged");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const resolve = async () => {
    try {
      await mutations.resolve.mutateAsync({ id: incident.id, reason: "manually_resolved" });
      toast.success("Incident resolved");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 p-6">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4 border-b border-border/60 pb-5">
        <Link to="/alerts/incidents" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[var(--text)]">
          <ArrowLeft className="size-3.5" />
          All incidents
        </Link>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={incident.severity} size="sm" />
              <StatusPill status={incident.status} />
              <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">{incident.title}</h1>
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
              {incident.id} · fingerprint {incident.fingerprint.slice(0, 16)}…
            </p>
          </div>

          <div className="flex gap-2">
            {incident.status === "open" && (
              <button
                onClick={acknowledge}
                disabled={mutations.acknowledge.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
              >
                <ShieldCheck className="size-3.5" />
                Acknowledge
              </button>
            )}
            {incident.status !== "resolved" && (
              <button
                onClick={resolve}
                disabled={mutations.resolve.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <CheckCircle2 className="size-3.5" />
                Resolve
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Fact label="Started" value={new Date(incident.startedAt).toLocaleString()} icon={Clock} />
          <Fact label="Duration" value={formatDuration(incident.durationSeconds)} icon={Activity} />
          <Fact label="Last seen" value={new Date(incident.lastSeenAt).toLocaleString()} />
          <Fact label="Occurrences" value={`${incident.occurrenceCount}x`} />
        </div>
      </div>

      {/* ── TRIGGER ────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border/60 bg-card/60 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          <Target className="size-4 text-muted-foreground" />
          Trigger
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Fact label="Observed value" value={incident.observedValue === null ? "—" : String(incident.observedValue)} icon={Gauge} />
          <Fact label="Threshold" value={incident.thresholdValue === null ? "—" : String(incident.thresholdValue)} />
          <Fact label="Rule" value={incident.ruleId ? `${incident.ruleId.slice(0, 8)} (rev ${incident.ruleRevision ?? "—"})` : "—"} />
          <Fact label="Grouping" value={incident.dimensionKey} />
          <Fact label="Project" value={incident.projectId ?? "organization-level"} />
          <Fact label="Environment" value={incident.environment ?? "—"} />
          <Fact label="Service" value={incident.service ?? "—"} />
          <Fact label="Route" value={incident.route ?? "—"} />
        </div>
        {incident.ruleId ? (
          <Link
            to={`/alerts/rules/${incident.ruleId}`}
            className="mt-4 inline-flex text-xs text-[var(--brand)] hover:underline"
          >
            View alert rule configuration →
          </Link>
        ) : null}
      </section>

      {/* ── TIMELINE ───────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border/60 bg-card/60 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          <Activity className="size-4 text-muted-foreground" />
          Timeline
          <span className="text-[10px] font-normal text-muted-foreground">
            ({timeline?.total ?? 0} entries)
          </span>
        </h2>
        {(timeline?.data.length ?? 0) === 0 ? (
          <p className="mt-4 text-xs text-muted-foreground">No timeline entries recorded.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {timeline!.data.map((entry, index) => (
              <li key={`${entry.at}-${entry.kind}-${index}`} className="flex gap-3">
                <div className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs font-medium text-[var(--text)]">
                      {entry.kind.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(entry.at).toLocaleString()}
                    </span>
                    <span className="rounded bg-muted/60 px-1.5 text-[10px] text-muted-foreground">
                      {entry.actorType}
                    </span>
                  </div>
                  {Object.keys(entry.detail ?? {}).length > 0 && (
                    <pre className="mt-1 overflow-x-auto rounded bg-muted/30 p-2 font-mono text-[10px] text-muted-foreground">
                      {JSON.stringify(entry.detail)}
                    </pre>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── NOTIFICATIONS ──────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border/60 bg-card/60 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          <BellRing className="size-4 text-muted-foreground" />
          Notifications
          <span className="text-[10px] font-normal text-muted-foreground">
            ({notifications?.total ?? 0} attempts)
          </span>
        </h2>
        {(notifications?.data.length ?? 0) === 0 ? (
          <p className="mt-4 text-xs text-muted-foreground">
            No delivery attempts recorded for this incident.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 font-mono text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-3">Channel</th>
                  <th scope="col" className="py-2 pr-3">Status</th>
                  <th scope="col" className="py-2 pr-3">Attempt</th>
                  <th scope="col" className="py-2 pr-3">Latency</th>
                  <th scope="col" className="py-2 pr-3">Failure</th>
                  <th scope="col" className="py-2">At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {notifications!.data.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="py-2 pr-3 capitalize text-[var(--text)]">{attempt.channelKind}</td>
                    <td className={cn("py-2 pr-3 font-medium capitalize", deliveryTone(attempt.status))}>
                      {attempt.status}
                    </td>
                    <td className="py-2 pr-3 font-mono text-muted-foreground">
                      {attempt.attemptNumber ?? "—"}
                    </td>
                    <td className="py-2 pr-3 font-mono text-muted-foreground">
                      {attempt.latencyMs === null ? "—" : `${attempt.latencyMs}ms`}
                    </td>
                    {/* Category only — never a provider response body or credential. */}
                    <td className="py-2 pr-3 text-muted-foreground">{attempt.errorCategory ?? "—"}</td>
                    <td className="py-2 font-mono text-[10px] text-muted-foreground">
                      {new Date(attempt.at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── RESOLUTION ─────────────────────────────────────────────────────── */}
      {incident.status === "resolved" && (
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
            <CheckCircle2 className="size-4 text-emerald-400" />
            Resolution
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Fact label="Resolved at" value={incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : "—"} />
            <Fact label="Reason" value={incident.resolutionReason ?? "—"} />
            <Fact label="Resolved by" value={incident.resolvedBy ?? "system (auto)"} />
          </div>
          {incident.resolutionReason === "auto_resolved" && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Closed by the auto-resolve deadline. This is a timeout, not a verified recovery — the
              condition was not observed returning to normal.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
