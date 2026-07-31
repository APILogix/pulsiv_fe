/**
 * Alert event detail — `GET /events/:id` plus the lifecycle actions
 * `POST /events/:id/{acknowledge,resolve,silence}` and
 * `GET /events/:id/deliveries`.
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Check, CheckCheck, BellOff } from "lucide-react";
import {
  PageHeader, SectionCard, Timestamp, DetailSkeleton, JsonViewer, SeverityBadge,
} from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  useAlertEvent,
  useAlertEventDeliveries,
  useAlertEventMutations,
} from "@/modules/alerting/hooks/useAlerting";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  DeliveryStatusPill,
  EventStatusPill,
  MetaCell,
  CodeChip,
} from "@/modules/alerting/components/alerting-ui";

export default function AlertEventDetailPage() {
  const { incidentId: eventId = "" } = useParams();
  const navigate = useNavigate();
  const { data: event, isLoading } = useAlertEvent(eventId);
  const { data: deliveries } = useAlertEventDeliveries(eventId);
  const { acknowledge, resolve, silenceFromEvent } = useAlertEventMutations();
  const [comment, setComment] = useState("");

  if (isLoading) return <DetailSkeleton />;
  if (!event) return <div className="p-8 text-[var(--text2)]">Event not found.</div>;

  const canAcknowledge = event.status === "firing" || event.status === "pending";
  const canResolve = event.status !== "resolved";
  const canSilence = event.status !== "silenced" && event.status !== "resolved";

  const handleAcknowledge = () => {
    acknowledge.mutate(
      { id: eventId, body: comment ? { comment } : {} },
      {
        onSuccess: () => toast.success("Event acknowledged"),
        onError: (err) => toast.error(apiErrorMessage(err, "Could not acknowledge event.")),
      },
    );
  };

  const handleResolve = () => {
    resolve.mutate(
      { id: eventId, body: comment ? { comment } : {} },
      {
        onSuccess: () => toast.success("Event resolved"),
        onError: (err) => toast.error(apiErrorMessage(err, "Could not resolve event.")),
      },
    );
  };

  const handleSilence = () => {
    silenceFromEvent.mutate(
      { id: eventId, body: { durationMinutes: 60, comment: comment || undefined } },
      {
        onSuccess: () => toast.success("Silence created for 60 minutes"),
        onError: (err) => toast.error(apiErrorMessage(err, "Could not create silence.")),
      },
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <UiButton variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to events</UiButton>

      <PageHeader
        title={event.source}
        description={`Fingerprint ${event.fingerprint}`}
        breadcrumbs={[{ label: "Act", to: "/alerts" }, { label: "Events", to: "/alerts" }, { label: event.source }]}
        actions={
          <div className="flex gap-2">
            {canAcknowledge && (
              <UiButton variant="outline" onClick={handleAcknowledge} disabled={acknowledge.isPending}>
                <Check className="size-4" /> Acknowledge
              </UiButton>
            )}
            {canSilence && (
              <UiButton variant="outline" onClick={handleSilence} disabled={silenceFromEvent.isPending}>
                <BellOff className="size-4" /> Silence 60m
              </UiButton>
            )}
            {canResolve && (
              <UiButton onClick={handleResolve} disabled={resolve.isPending}>
                <CheckCheck className="size-4" /> Resolve
              </UiButton>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MetaCell label="Severity"><SeverityBadge severity={event.severity} /></MetaCell>
        <MetaCell label="Status"><EventStatusPill status={event.status} /></MetaCell>
        <MetaCell label="Duplicates">{event.duplicateCount}</MetaCell>
        <MetaCell label="Started"><Timestamp value={event.startedAt} /></MetaCell>
        <MetaCell label="Rule id">{event.ruleId ? <CodeChip>{event.ruleId}</CodeChip> : "—"}</MetaCell>
        <MetaCell label="Project id">{event.projectId ? <CodeChip>{event.projectId}</CodeChip> : "Org-level"}</MetaCell>
        {event.acknowledgedAt && <MetaCell label="Acknowledged"><Timestamp value={event.acknowledgedAt} /></MetaCell>}
        {event.resolvedAt && <MetaCell label="Resolved"><Timestamp value={event.resolvedAt} /></MetaCell>}
        {event.resolutionReason && <MetaCell label="Resolution reason">{event.resolutionReason}</MetaCell>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">
          Comment (used for acknowledge / resolve / silence)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="min-h-[72px] w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] p-3 text-[13px] leading-[1.5] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text3)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-bg)]"
          placeholder="Optional context for the next responder…"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Payload">
          <JsonViewer data={event.payload} maxHeight={280} />
        </SectionCard>
        <SectionCard title="Labels & annotations">
          <JsonViewer data={{ labels: event.labels, annotations: event.annotations }} maxHeight={280} />
        </SectionCard>
      </div>

      <SectionCard title="Delivery attempts">
        {!deliveries || deliveries.length === 0 ? (
          <p className="text-[13px] text-[var(--text2)]">No delivery attempts recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {deliveries.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] p-3">
                <div className="flex items-center gap-3">
                  <DeliveryStatusPill status={d.status} />
                  <span className="text-[12px] text-[var(--text2)]">{d.connectorId ? <CodeChip>{d.connectorId}</CodeChip> : "route"}</span>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-[var(--text3)]">
                  {d.latencyMs != null && <span>{d.latencyMs}ms</span>}
                  <Timestamp value={d.createdAt} />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
