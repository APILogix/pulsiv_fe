import { useId, useState, type ReactNode } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import {
  useAlertEvent,
  useAlertEventDeliveries,
  useAlertEventMutations,
} from "@/modules/alerting/hooks/useAlerting";
import { IncidentStateBadge } from "@/modules/alerting/components/IncidentStateBadge";
import { DeliveryStatusPill, labelize } from "@/modules/alerting/components/alerting-ui";
import type { AlertDeliveryAttempt, AlertEvent, Json } from "@/modules/alerting/api/types";
import { ConfirmDialog, DialogField, apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  ProjectPageHeader,
  Readouts,
  RowTitle,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  TextLink,
  WorkspacePage,
  type HeaderCrumb,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Panel, fieldInputClass, fieldTextareaClass } from "@/shared/ui/pulse";
import {
  EmptyNote,
  JsonViewer,
  KeyValueList,
  SeverityBadge,
  Timestamp,
  formatAbsoluteTime,
  formatDuration,
  formatNumber,
  formatRelativeTime,
  type KeyValueItem,
} from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";

// ── module-level constants ───────────────────────────────────

const EVENTS_PATH = "/alerts/events";

type LifecycleAction = "acknowledge" | "resolve" | "silence";

const SILENCE_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "60", label: "1 hour" },
  { value: "240", label: "4 hours" },
  { value: "1440", label: "24 hours" },
];

const DELIVERY_COLUMNS: SheetColumn[] = [
  { key: "status", header: "Status", className: "w-[120px]" },
  { key: "channel", header: "Channel" },
  { key: "attempt", header: "Attempt", className: "w-[96px]" },
  { key: "latency", header: "Latency", className: `w-[96px] ${HIDE_BELOW_MD}`, align: "right" },
  { key: "response", header: "Response", className: `w-[220px] ${HIDE_BELOW_LG}` },
  { key: "time", header: "Attempted", className: "w-[120px]" },
];

const MONO = "font-[family-name:var(--mono)] tabular-nums";

// ── helpers ──────────────────────────────────────────────────

/** Two units at most: 42s, 3m 12s, 5h 40m, 2d 3h. */
function formatElapsed(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    const seconds = totalSeconds % 60;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest > 0 ? `${days}d ${rest}h` : `${days}d`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${formatNumber(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Start to resolution (or end), or start to the last refresh while the event
 * is still open. `null` when the start is unknown.
 */
function eventDuration(event: AlertEvent, refreshedAt: number): { ms: number; open: boolean } | null {
  const start = Date.parse(event.startedAt);
  if (Number.isNaN(start)) return null;
  const endValue = event.resolvedAt ?? event.endedAt;
  if (endValue) {
    const end = Date.parse(endValue);
    return Number.isNaN(end) ? null : { ms: Math.max(0, end - start), open: false };
  }
  if (refreshedAt <= 0) return null;
  return { ms: Math.max(0, refreshedAt - start), open: true };
}

function jsonEntries(value: Json | null | undefined): KeyValueItem[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).map(([key, raw]) => ({
    label: key,
    value: typeof raw === "string" ? raw : JSON.stringify(raw),
    mono: true,
    copyable: true,
  }));
}

const hasKeys = (value: Json | null | undefined) =>
  Boolean(value && typeof value === "object" && Object.keys(value).length > 0);

const timeValue = (value: string | null | undefined) => (value ? formatAbsoluteTime(value) : null);

// ── page ─────────────────────────────────────────────────────

export default function AlertEventDetailPage() {
  // The route declares `events/:eventId`; `incidentId` is read too so older
  // links that supplied it keep working.
  const { eventId, incidentId } = useParams();
  const id = eventId ?? incidentId ?? "";

  const { data: event, isLoading, error, refetch, dataUpdatedAt } = useAlertEvent(id);
  const {
    data: deliveries = [],
    isLoading: deliveriesLoading,
    error: deliveriesError,
    refetch: refetchDeliveries,
  } = useAlertEventDeliveries(event?.id);
  const { acknowledge, resolve, silenceFromEvent } = useAlertEventMutations();

  const [dialog, setDialog] = useState<LifecycleAction | null>(null);
  const [comment, setComment] = useState("");
  const [silenceDuration, setSilenceDuration] = useState("60");
  const commentId = useId();
  const durationId = useId();

  const crumbs = (label: string): HeaderCrumb[] => [{ label: "Alert events", to: EVENTS_PATH }, { label }];

  if (isLoading) {
    return (
      <WorkspacePage>
        <ProjectPageHeader crumbs={crumbs("Loading")} title="Alert event" description="Loading this event." />
        <Readouts
          loading
          label="Event summary"
          cells={[
            { label: "Occurrences", value: "", sub: "" },
            { label: "Duration", value: "", sub: "" },
            { label: "Deliveries", value: "", sub: "" },
            { label: "Last notified", value: "", sub: "" },
          ]}
        />
        <Sheet label="Loading event details">
          <SheetLoading rows={5} label="Loading event details" />
        </Sheet>
      </WorkspacePage>
    );
  }

  if (!event) {
    return (
      <WorkspacePage>
        <ProjectPageHeader
          crumbs={crumbs(error ? "Unavailable" : "Not found")}
          title={error ? "Could not load this event" : "Alert event not found"}
        />
        <Sheet label="Event status">
          {error ? (
            <SheetError
              title="Could not load this event"
              message={apiErrorMessage(error, "The event is unavailable right now.")}
              onRetry={() => void refetch()}
            />
          ) : (
            <SheetEmpty
              title="This event does not exist"
              description="The requested alert event does not exist or has been pruned."
              action={
                <TextLink to={EVENTS_PATH} arrow>
                  Back to alert events
                </TextLink>
              }
            />
          )}
        </Sheet>
      </WorkspacePage>
    );
  }

  const isAcked = event.status === "acknowledged";
  const isResolved = event.status === "resolved";
  const title = event.source || "Untitled event";

  const openDialog = (action: LifecycleAction) => {
    setComment("");
    setDialog(action);
  };

  const onDialogChange = (open: boolean) => {
    if (!open) setDialog(null);
  };

  const onAcknowledge = () =>
    acknowledge.mutate(
      { id: event.id, body: { comment: comment || undefined } },
      {
        onSuccess: () => {
          toast.success("Event acknowledged");
          setComment("");
          setDialog(null);
          refetch();
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Could not acknowledge the event. Try again.")),
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
          setDialog(null);
          refetch();
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Could not silence the event. Try again.")),
      },
    );

  const onResolve = () =>
    resolve.mutate(
      { id: event.id, body: { reason: comment || "Resolved from incident detail", comment: comment || undefined } },
      {
        onSuccess: () => {
          toast.success("Event resolved");
          setComment("");
          setDialog(null);
          refetch();
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Could not resolve the event. Try again.")),
      },
    );

  // ── readouts ──
  const duration = eventDuration(event, dataUpdatedAt);
  const failedDeliveries = deliveries.filter((d) => d.status === "failed").length;
  const readouts: Readout[] = [
    {
      label: "Occurrences",
      value: formatNumber(event.duplicateCount),
      sub: `Last ${formatRelativeTime(event.updatedAt)}`,
    },
    {
      label: "Duration",
      value: duration ? formatElapsed(duration.ms) : "—",
      sub: duration
        ? duration.open
          ? "Still open, measured to the last refresh"
          : `Ended ${formatRelativeTime(event.resolvedAt ?? event.endedAt)}`
        : "Start time not recorded",
    },
    {
      label: "Deliveries",
      value: deliveriesLoading ? "—" : formatNumber(deliveries.length),
      tone: failedDeliveries > 0 ? "bad" : "neutral",
      sub: deliveriesError
        ? "Could not load deliveries"
        : deliveries.length === 0
          ? "None recorded yet"
          : failedDeliveries > 0
            ? `${formatNumber(failedDeliveries)} failed`
            : "None failed",
    },
    {
      label: "Last notified",
      value: (
        <span className="font-[family-name:var(--sans)]">
          {event.lastNotifiedAt ? formatRelativeTime(event.lastNotifiedAt) : "Not yet"}
        </span>
      ),
      sub: event.lastNotifiedAt ? formatAbsoluteTime(event.lastNotifiedAt) : "No notification sent",
    },
  ];
  if (event.escalationPolicyId) {
    readouts.push({
      label: "Escalation step",
      value: formatNumber(event.escalationStepNumber),
      sub: event.nextEscalationAt
        ? `Next ${formatRelativeTime(event.nextEscalationAt)}`
        : `Repeated ${formatNumber(event.escalationRepeatCount)} times`,
    });
  }

  // ── detail rows ──
  const detailItems: KeyValueItem[] = [
    { label: "Status", value: labelize(event.status) },
    { label: "Source", value: event.source },
    { label: "Source ID", value: event.sourceId, mono: true, copyable: true },
    {
      label: "Rule",
      value: event.ruleId ? (
        <TextLink to={`/alerts/rules/${event.ruleId}`} className="font-[family-name:var(--mono)] text-[12px]">
          {event.ruleId}
        </TextLink>
      ) : (
        "Direct signal"
      ),
      text: event.ruleId ?? undefined,
    },
    { label: "Fingerprint", value: event.fingerprint, mono: true, copyable: true },
    { label: "Project", value: event.projectId, mono: true, copyable: true },
    { label: "Started", value: timeValue(event.startedAt), mono: true },
    { label: "Last triggered", value: timeValue(event.updatedAt), mono: true },
    { label: "Ended", value: timeValue(event.endedAt), mono: true },
    { label: "Auto-resolve", value: event.autoResolveAt ? formatAbsoluteTime(event.autoResolveAt) : "Disabled", mono: Boolean(event.autoResolveAt) },
    { label: "Group key", value: event.groupKey, mono: true, copyable: true },
    { label: "Parent event", value: event.parentEventId, mono: true, copyable: true },
    {
      label: "Escalation policy",
      value: event.escalationPolicyId ? (
        <TextLink to={`/alerts/escalations/${event.escalationPolicyId}`} className="font-[family-name:var(--mono)] text-[12px]">
          {event.escalationPolicyId}
        </TextLink>
      ) : null,
      text: event.escalationPolicyId ?? undefined,
    },
    { label: "Next escalation", value: timeValue(event.nextEscalationAt), mono: true },
    {
      label: "Payload size",
      value: event.payloadSizeBytes === null ? null : formatBytes(event.payloadSizeBytes),
      mono: true,
    },
  ];

  const responseItems: KeyValueItem[] = [
    { label: "Acknowledged by", value: event.acknowledgedAt ? event.acknowledgedBy || "User" : null },
    { label: "Acknowledged at", value: timeValue(event.acknowledgedAt), mono: true },
    { label: "Acknowledgement expires", value: timeValue(event.acknowledgmentExpiresAt), mono: true },
    { label: "Resolved by", value: event.resolvedAt ? event.resolvedBy || "System" : null },
    { label: "Resolved at", value: timeValue(event.resolvedAt), mono: true },
    { label: "Resolution reason", value: event.resolutionReason },
    { label: "Suppressed by", value: event.suppressedBy },
    { label: "Suppressed at", value: timeValue(event.suppressedAt), mono: true },
    { label: "Suppression reason", value: event.suppressionReason },
  ];
  const hasResponse = Boolean(event.acknowledgedAt || event.resolvedAt || event.suppressedAt);

  const labelItems = jsonEntries(event.labels);
  const annotationItems = jsonEntries(event.annotations);

  // ── deliveries sheet body ──
  let deliveriesBody: ReactNode;
  if (deliveriesLoading) {
    deliveriesBody = <SheetLoading rows={3} label="Loading deliveries" />;
  } else if (deliveriesError) {
    deliveriesBody = (
      <SheetError
        title="Could not load deliveries"
        message={apiErrorMessage(deliveriesError, "The delivery log for this event is unavailable right now.")}
        onRetry={() => void refetchDeliveries()}
      />
    );
  } else if (deliveries.length === 0) {
    deliveriesBody = (
      <SheetEmpty
        title="No deliveries recorded yet"
        description="Delivery attempts for this event appear here once routing sends it to a channel."
        action={
          <TextLink to="/alerts/routing" arrow>
            Review routing
          </TextLink>
        }
      />
    );
  } else {
    deliveriesBody = (
      <SheetTable columns={DELIVERY_COLUMNS} caption="Delivery attempts for this event" minWidth={560}>
        {deliveries.map((delivery: AlertDeliveryAttempt) => (
          <SheetRow key={delivery.id}>
            <SheetCell>
              <DeliveryStatusPill status={delivery.status} />
            </SheetCell>
            <SheetCell>
              <RowTitle
                title={delivery.channelType ? labelize(delivery.channelType) : "Channel not recorded"}
                subtitle={delivery.destination ?? "Destination not recorded"}
                subtitleMono={Boolean(delivery.destination)}
              />
            </SheetCell>
            <SheetCell>
              <span className={`${MONO} text-[12px] text-[var(--text2)]`}>
                {delivery.attemptNumber !== undefined
                  ? `${delivery.attemptNumber} of ${delivery.maxAttempts ?? "—"}`
                  : "—"}
              </span>
            </SheetCell>
            <SheetCell className={HIDE_BELOW_MD} align="right">
              <span className={`${MONO} text-[12px] text-[var(--text2)]`}>
                {delivery.latencyMs === null ? "—" : formatDuration(delivery.latencyMs)}
              </span>
            </SheetCell>
            <SheetCell className={HIDE_BELOW_LG}>
              <div className="min-w-0 max-w-[220px]">
                <div className={`${MONO} text-[12px] text-[var(--text2)]`}>
                  {delivery.responseStatusCode ?? "—"}
                </div>
                {delivery.errorMessage && (
                  <div className="mt-0.5 truncate text-[12px] text-[var(--text3)]" title={delivery.errorMessage}>
                    {delivery.errorMessage}
                  </div>
                )}
              </div>
            </SheetCell>
            <SheetCell>
              <Timestamp value={delivery.attemptedAt ?? delivery.createdAt} />
            </SheetCell>
          </SheetRow>
        ))}
      </SheetTable>
    );
  }

  const noteField = (label: string, hint: string) => (
    <DialogField label={label} name={commentId} hint={hint}>
      <textarea
        id={commentId}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Optional"
        className={fieldTextareaClass}
      />
    </DialogField>
  );

  return (
    <WorkspacePage>
      <ProjectPageHeader
        crumbs={crumbs(title)}
        title={title}
        badges={
          <>
            <SeverityBadge severity={event.severity} />
            <IncidentStateBadge state={event.status === "firing" ? "triggered" : event.status} />
          </>
        }
        meta={[
          { label: "Fingerprint", value: event.fingerprint, mono: true },
          event.projectId ? { label: "Project", value: event.projectId, mono: true } : null,
          { label: "Started", value: formatAbsoluteTime(event.startedAt), mono: true },
          {
            label: "Rule",
            value: event.ruleId ? (
              <TextLink to={`/alerts/rules/${event.ruleId}`} size="sm" className="font-[family-name:var(--mono)]">
                {event.ruleId}
              </TextLink>
            ) : (
              "Direct signal"
            ),
          },
        ]}
        actions={
          !isResolved && (
            <>
              {isAcked ? (
                <UiButton size="lg" onClick={() => openDialog("resolve")} disabled={resolve.isPending}>
                  Resolve
                </UiButton>
              ) : (
                <>
                  <UiButton size="lg" onClick={() => openDialog("acknowledge")} disabled={acknowledge.isPending}>
                    Acknowledge
                  </UiButton>
                  <UiButton variant="outline" size="lg" onClick={() => openDialog("resolve")} disabled={resolve.isPending}>
                    Resolve
                  </UiButton>
                </>
              )}
              <UiButton
                variant="outline"
                size="lg"
                onClick={() => openDialog("silence")}
                disabled={silenceFromEvent.isPending}
              >
                Silence
              </UiButton>
            </>
          )
        }
      />

      <Readouts cells={readouts} label="Event summary" />

      <Panel title="Details" description="What fired, where it came from, and when.">
        <KeyValueList items={detailItems} hideEmpty />
      </Panel>

      <Panel title="Response" description="Who acknowledged, resolved, or suppressed this event.">
        {hasResponse ? (
          <KeyValueList items={responseItems} hideEmpty labelWidth={180} />
        ) : (
          <EmptyNote title="No response yet">
            No one has acknowledged, resolved, or suppressed this event.
          </EmptyNote>
        )}
      </Panel>

      <Sheet
        title="Deliveries"
        description="Each attempt to send this event to a notification channel."
        actions={
          !deliveriesLoading && !deliveriesError && deliveries.length > 0 ? (
            <span className={`${MONO} text-[12px] text-[var(--text3)]`}>
              {formatNumber(deliveries.length)} {deliveries.length === 1 ? "attempt" : "attempts"}
            </span>
          ) : undefined
        }
      >
        {deliveriesBody}
      </Sheet>

      <Panel title="Labels" description="Key-value labels attached to this event.">
        {labelItems.length > 0 ? (
          <KeyValueList items={labelItems} />
        ) : (
          <EmptyNote title="No labels">This event was recorded without labels.</EmptyNote>
        )}
      </Panel>

      {annotationItems.length > 0 && (
        <Panel title="Annotations">
          <KeyValueList items={annotationItems} />
        </Panel>
      )}

      <Panel title="Payload" description="The raw payload received with this event.">
        <JsonViewer data={event.payload} maxHeight={380} />
      </Panel>

      {hasKeys(event.normalizedPayload) && (
        <Panel title="Normalized payload" description="The payload after normalization.">
          <JsonViewer data={event.normalizedPayload} maxHeight={380} />
        </Panel>
      )}

      <ConfirmDialog
        open={dialog === "acknowledge"}
        onOpenChange={onDialogChange}
        title="Acknowledge this event"
        description="Marks the event as acknowledged. The note is sent with the acknowledgement."
        confirmLabel="Acknowledge"
        destructive={false}
        pending={acknowledge.isPending}
        onConfirm={onAcknowledge}
      >
        {noteField("Note", "Optional context for whoever reads this event next.")}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "resolve"}
        onOpenChange={onDialogChange}
        title="Resolve this event"
        description="Marks the event as resolved. The note is sent as the resolution reason."
        confirmLabel="Resolve"
        destructive={false}
        pending={resolve.isPending}
        onConfirm={onResolve}
      >
        {noteField("Resolution note", "Optional. Describe the cause or the fix.")}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "silence"}
        onOpenChange={onDialogChange}
        title="Silence this event"
        description="Creates a silence scoped to this event for the chosen duration."
        confirmLabel="Silence"
        destructive={false}
        pending={silenceFromEvent.isPending}
        onConfirm={onSilence}
      >
        <div className="flex flex-col gap-4">
          <DialogField label="Duration" name={durationId}>
            <select
              id={durationId}
              value={silenceDuration}
              onChange={(e) => setSilenceDuration(e.target.value)}
              className={fieldInputClass}
            >
              {SILENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </DialogField>
          {noteField("Note", "Optional. Why this event is being silenced.")}
        </div>
      </ConfirmDialog>
    </WorkspacePage>
  );
}
