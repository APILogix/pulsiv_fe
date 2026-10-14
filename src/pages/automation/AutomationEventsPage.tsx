/**
 * Event inbox: `POST /events`.
 *
 * The automation engine is event-driven: modules publish into an inbox that is
 * deduplicated on `(organizationId, dedupeKey)`. This surface lets operators
 * replay or hand-inject an event to exercise a workflow end to end. A 200
 * response means the dedupe key already existed; 201 means it was queued.
 */
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { AlertTriangle, Send } from "lucide-react";
import { Notice, Panel, Pill, SplitShell, fieldInputClass, fieldTextareaClass } from "@/shared/ui/pulse";
import { JsonViewer, Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DialogField, apiErrorMessage, optionalText } from "@/modules/projects/components/project-ui";
import { ProjectPageHeader, Sheet, WorkspacePage } from "@/modules/projects/components/project-page";
import { useAutomationScope, useIngestAutomationEvent } from "@/modules/automation/hooks/useAutomation";
import {
  AUTOMATION_LIMITS,
  TRIGGER_TYPES,
  type IngestEventResult,
  type TriggerType,
} from "@/modules/automation/api/types";
import {
  FactGrid,
  NoOrgNotice,
  Sequence,
  SequenceStage,
  labelize,
} from "@/modules/automation/components/automation-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const FORM_ID = "publish-automation-event";
const selectClass = `${fieldInputClass} appearance-none pr-8 font-[family-name:var(--mono)] text-[12px]`;
const monoInput = `${fieldInputClass} font-[family-name:var(--mono)] text-[12px]`;
const monoTextarea = `${fieldTextareaClass} min-h-[160px] font-[family-name:var(--mono)] text-[12px]`;
const DEFAULT_PAYLOAD = '{\n  "severity": "critical",\n  "service": "checkout-api"\n}';

const DELIVERY_STAGES = [
  {
    title: "Pick the event type",
    description: "It must match the trigger type on a published, switched-on workflow.",
  },
  {
    title: "Set a dedupe key",
    description: "Unique per logical event. Re-sending the same key returns the original inbox row instead of queuing again.",
  },
  {
    title: "Send the payload",
    description: "A worker picks the event up, evaluates the conditions, and queues a run when they match.",
  },
];

function parseJsonObject(raw: FormDataEntryValue | null, field: string): Record<string, unknown> {
  if (typeof raw !== "string" || raw.trim() === "") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${field} must be valid JSON.`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${field} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

function parseHeaders(raw: FormDataEntryValue | null): Record<string, string> {
  const parsed = parseJsonObject(raw, "Headers");
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string") throw new Error("Header values must be strings.");
    headers[key] = value;
  }
  return headers;
}

function LastResponse({ result }: { result: IngestEventResult }) {
  const { event } = result;
  return (
    <Panel
      title="Last response"
      description={result.created ? "Queued as a new inbox event." : "Deduplicated against an existing event. Nothing new was queued."}
      actions={
        <Pill tone={result.created ? "green" : "amber"} dot>
          {result.created ? "201 created" : "200 duplicate"}
        </Pill>
      }
    >
      <div className="flex flex-col gap-4">
        <FactGrid
          columns={2}
          facts={[
            { label: "Event", value: event.id, mono: true, wide: true },
            { label: "Status", value: labelize(event.status) },
            { label: "Attempts", value: event.attempts, mono: true },
            { label: "Received", value: <Timestamp value={event.receivedAt} /> },
            event.processedAt && { label: "Processed", value: <Timestamp value={event.processedAt} /> },
            { label: "Dedupe key", value: event.dedupeKey, mono: true, wide: true },
            event.lastError && {
              label: "Last error",
              value: <span className="text-[var(--red)]">{event.lastError}</span>,
              wide: true,
            },
          ]}
        />
        <JsonViewer data={event.payload} maxHeight={200} />
      </div>
    </Panel>
  );
}

export default function AutomationEventsPage() {
  const { activeOrgId } = useAutomationScope();
  const ingest = useIngestAutomationEvent();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IngestEventResult | null>(null);

  if (!activeOrgId) {
    return <NoOrgNotice>Pick an organization to publish automation events.</NoOrgNotice>;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);

    const sourceModule = (form.get("sourceModule") as string | null)?.trim() ?? "";
    const dedupeKey = (form.get("dedupeKey") as string | null)?.trim() ?? "";
    if (sourceModule === "") {
      setError("Source module is required.");
      return;
    }
    if (dedupeKey === "") {
      setError("Dedupe key is required.");
      return;
    }

    let payload: Record<string, unknown>;
    let headers: Record<string, string>;
    try {
      payload = parseJsonObject(form.get("payload"), "Payload");
      headers = parseHeaders(form.get("headers"));
    } catch (parseError) {
      setError((parseError as Error).message);
      return;
    }

    const sourceEventId = optionalText(form.get("sourceEventId"));
    const projectId = optionalText(form.get("projectId"));

    ingest.mutate(
      {
        sourceModule,
        eventType: form.get("eventType") as TriggerType,
        dedupeKey,
        ...(sourceEventId ? { sourceEventId } : {}),
        ...(projectId ? { projectId } : {}),
        payload,
        headers,
      },
      {
        onSuccess: (ingestResult) => {
          setResult(ingestResult);
          toast.success(
            ingestResult.created ? "Event queued for processing" : "Duplicate dedupe key — existing event returned",
          );
        },
        onError: (mutationError) => setError(apiErrorMessage(mutationError, "Could not publish the event.")),
      },
    );
  };

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Event inbox"
        description="Publish an automation event by hand to exercise a workflow, or replay one that a module failed to deliver."
        meta={[
          { label: "Rate limit", value: "200 / min", mono: true },
          { label: "Max payload", value: "256 KB", mono: true },
          { label: "Dedupe", value: "Organization + key" },
          { label: "Delivery", value: "Async worker" },
        ]}
        actions={
          <UiButton asChild variant="outline" size="lg">
            <Link to="/automation/runs">Watch runs</Link>
          </UiButton>
        }
      />

      <SplitShell
        rail={
          <>
            {result && <LastResponse result={result} />}
            <Sheet title="How delivery works" description="What happens after you publish.">
              <Sequence label="Event delivery">
                {DELIVERY_STAGES.map((stage, index) => (
                  <SequenceStage key={stage.title} marker={index + 1} title={stage.title}>
                    {stage.description}
                  </SequenceStage>
                ))}
              </Sequence>
            </Sheet>
          </>
        }
      >
        <Panel
          title="Publish an event"
          description="Matching workflows must be published and switched on for a run to be queued."
          footer={
            <UiButton type="submit" form={FORM_ID} size="lg" disabled={ingest.isPending}>
              <Send className="size-4" aria-hidden="true" /> {ingest.isPending ? "Publishing…" : "Publish event"}
            </UiButton>
          }
        >
          <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <DialogField label="Event type" name="eventType" required hint="Matches a workflow's trigger type.">
                <select id="eventType" name="eventType" className={selectClass} defaultValue="alert.event.created">
                  {TRIGGER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </DialogField>

              <DialogField label="Source module" name="sourceModule" required hint="Module that owns the event.">
                <input id="sourceModule" name="sourceModule" className={monoInput} defaultValue="alerting" />
              </DialogField>

              <DialogField
                label="Dedupe key"
                name="dedupeKey"
                required
                hint={`Unique per event, up to ${AUTOMATION_LIMITS.DEDUPE_KEY} characters.`}
              >
                <input
                  id="dedupeKey"
                  name="dedupeKey"
                  className={monoInput}
                  maxLength={AUTOMATION_LIMITS.DEDUPE_KEY}
                  defaultValue={`manual-${Date.now()}`}
                />
              </DialogField>

              <DialogField label="Source event id" name="sourceEventId" hint="Optional upstream identifier.">
                <input id="sourceEventId" name="sourceEventId" className={monoInput} maxLength={200} />
              </DialogField>

              <DialogField label="Project id" name="projectId" hint="Optional. Must belong to this organization.">
                <input id="projectId" name="projectId" className={monoInput} />
              </DialogField>
            </div>

            <DialogField label="Payload (JSON)" name="payload" hint="Conditions read from this object.">
              <textarea
                id="payload"
                name="payload"
                className={monoTextarea}
                defaultValue={DEFAULT_PAYLOAD}
                spellCheck={false}
              />
            </DialogField>

            <DialogField label="Headers (JSON)" name="headers" hint="String values only. Stored with the event.">
              <textarea
                id="headers"
                name="headers"
                className={`${monoTextarea} min-h-[72px]`}
                defaultValue="{}"
                spellCheck={false}
              />
            </DialogField>

            {error && (
              <div role="alert">
                <Notice tone="red" icon={AlertTriangle} title="Event not published">
                  {error}
                </Notice>
              </div>
            )}
          </form>
        </Panel>
      </SplitShell>
    </WorkspacePage>
  );
}
