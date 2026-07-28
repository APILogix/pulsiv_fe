/**
 * Event inbox — `POST /events`.
 *
 * The automation engine is event-driven: modules publish into an inbox that is
 * deduplicated on `(organizationId, dedupeKey)`. This surface lets operators
 * replay or hand-inject an event to exercise a workflow end to end. A 200
 * response means the dedupe key already existed; 201 means it was queued.
 */
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  CopyCheck,
  Inbox,
  Send,
  Zap,
} from "lucide-react";
import {
  HeroFacts,
  Notice,
  PageHero,
  Panel,
  Pill,
  SetupSteps,
  SplitShell,
  fieldInputClass,
  fieldTextareaClass,
} from "@/shared/ui/pulse";
import { JsonViewer, Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DialogField, apiErrorMessage, optionalText } from "@/modules/projects/components/project-ui";
import { useAutomationScope, useIngestAutomationEvent } from "@/modules/automation/hooks/useAutomation";
import {
  AUTOMATION_LIMITS,
  TRIGGER_TYPES,
  type IngestEventResult,
  type TriggerType,
} from "@/modules/automation/api/types";
import { CodeChip, MetaCell, labelize } from "@/modules/automation/components/automation-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const selectClass = `${fieldInputClass} appearance-none pr-8`;
const monoTextarea = `${fieldTextareaClass} min-h-[140px] font-[family-name:var(--mono)] text-[12px]`;
const DEFAULT_PAYLOAD = '{\n  "severity": "critical",\n  "service": "checkout-api"\n}';

const SETUP_STEPS = [
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

export default function AutomationEventsPage() {
  const { activeOrgId } = useAutomationScope();
  const ingest = useIngestAutomationEvent();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IngestEventResult | null>(null);

  if (!activeOrgId) {
    return (
      <Notice tone="amber" icon={AlertTriangle} title="No organization selected">
        Pick an organization to publish automation events.
      </Notice>
    );
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
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Workflows"
        title="Event inbox"
        description="Publish an automation event by hand to exercise a workflow, or replay one that a module failed to deliver."
        icon={Inbox}
        actions={
          <UiButton asChild variant="outline" size="lg">
            <Link to="/automation/runs">
              <Zap className="size-4" /> Watch runs
            </Link>
          </UiButton>
        }
      >
        <HeroFacts
          facts={[
            { label: "Rate limit", value: "200 / min" },
            { label: "Max payload", value: "256 KB" },
            { label: "Dedupe", value: "org + key" },
            { label: "Delivery", value: "Async worker" },
          ]}
        />
      </PageHero>

      <SplitShell
        rail={
          <>
            <Panel title="How delivery works" icon={Send}>
              <SetupSteps steps={SETUP_STEPS} />
            </Panel>
            {result && (
              <Panel
                title="Last response"
                description={result.created ? "Queued as a new inbox event." : "Deduplicated against an existing event."}
                icon={CopyCheck}
                tone={result.created ? "green" : "amber"}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={result.created ? "green" : "amber"} dot>
                      {result.created ? "201 created" : "200 duplicate"}
                    </Pill>
                    <Pill tone="neutral">{labelize(result.event.status)}</Pill>
                  </div>
                  <MetaCell label="Event id">
                    <CodeChip>{result.event.id}</CodeChip>
                  </MetaCell>
                  <MetaCell label="Received">
                    <Timestamp value={result.event.receivedAt} />
                  </MetaCell>
                  <MetaCell label="Attempts">{result.event.attempts}</MetaCell>
                  {result.event.lastError && (
                    <MetaCell label="Last error">
                      <span className="text-[var(--red)]">{result.event.lastError}</span>
                    </MetaCell>
                  )}
                  <JsonViewer data={result.event.payload} maxHeight={200} />
                </div>
              </Panel>
            )}
          </>
        }
      >
        <Panel
          title="Publish an event"
          description="Matching workflows must be published and switched on for a run to be queued."
          icon={Send}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <DialogField label="Event type" name="eventType" required>
                <select id="eventType" name="eventType" className={selectClass} defaultValue="alert.event.created">
                  {TRIGGER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </DialogField>

              <DialogField label="Source module" name="sourceModule" required hint="Module that owns the event.">
                <input id="sourceModule" name="sourceModule" className={fieldInputClass} defaultValue="alerting" />
              </DialogField>

              <DialogField
                label="Dedupe key"
                name="dedupeKey"
                required
                hint={`Unique per event, up to ${AUTOMATION_LIMITS.DEDUPE_KEY} chars.`}
              >
                <input
                  id="dedupeKey"
                  name="dedupeKey"
                  className={fieldInputClass}
                  maxLength={AUTOMATION_LIMITS.DEDUPE_KEY}
                  defaultValue={`manual-${Date.now()}`}
                />
              </DialogField>

              <DialogField label="Source event id" name="sourceEventId" hint="Optional upstream identifier.">
                <input id="sourceEventId" name="sourceEventId" className={fieldInputClass} maxLength={200} />
              </DialogField>

              <DialogField label="Project id" name="projectId" hint="Optional. Must belong to this organization.">
                <input id="projectId" name="projectId" className={fieldInputClass} />
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
              <Notice tone="red" icon={AlertTriangle}>
                {error}
              </Notice>
            )}

            <div className="flex justify-end">
              <UiButton type="submit" size="lg" disabled={ingest.isPending}>
                <Send className="size-4" /> {ingest.isPending ? "Publishing…" : "Publish event"}
              </UiButton>
            </div>
          </form>
        </Panel>
      </SplitShell>
    </div>
  );
}
