import { useState } from "react";
import {
  AlertTriangle,
  Bug,
  FlaskConical,
  GitBranch,
  GitCommit,
  ListTree,
  Loader2,
  Play,
  ScrollText,
  Terminal,
} from "lucide-react";
import { PageHero, Panel, SegmentedControl, fieldInputClass, fieldTextareaClass, EmptyPanel } from "@/shared/ui/pulse";
import { Button } from "@/shared/observe";
import { AiErrorState } from "@/modules/ai/components/states";
import { InvestigationResult } from "@/modules/ai/components/InvestigationResult";
import { aiApi } from "@/modules/ai/api/ai.api";
import { useActiveOrgId, useInvestigation } from "@/modules/ai/hooks/useAi";
import type { InvestigationInput, InvestigationKind } from "@/modules/ai/types";

const KINDS: { value: InvestigationKind; label: string; icon: typeof Bug }[] = [
  { value: "error", label: "Error", icon: Bug },
  { value: "stack_trace", label: "Stack trace", icon: AlertTriangle },
  { value: "trace", label: "Trace", icon: ListTree },
  { value: "span", label: "Span", icon: GitBranch },
  { value: "log", label: "Logs", icon: ScrollText },
  { value: "deployment", label: "Deployment", icon: GitCommit },
];

const PLACEHOLDERS: Record<InvestigationKind, string> = {
  error: "What was happening when this error occurred? (optional context)",
  stack_trace: "Any additional context about when this stack trace appeared…",
  trace: "What do you want to understand about this trace?",
  span: "What do you want to understand about these spans?",
  log: "What should the AI look for in these logs?",
  deployment: "Which deployment or release window should the AI correlate?",
};

function parseJsonSafe(value: string): { ok: true; data: unknown } | { ok: false; error: string } {
  if (!value.trim()) return { ok: true, data: undefined };
  try {
    return { ok: true, data: JSON.parse(value) };
  } catch {
    return { ok: false, error: "Enter valid JSON." };
  }
}

export default function AiInvestigationsPage() {
  const orgId = useActiveOrgId();
  const investigation = useInvestigation();
  const [kind, setKind] = useState<InvestigationKind>("error");

  // Shared context
  const [service, setService] = useState("");
  const [environment, setEnvironment] = useState("");
  const [severity, setSeverity] = useState("");
  const [query, setQuery] = useState("");

  // Kind-specific
  const [exceptionType, setExceptionType] = useState("");
  const [exceptionMessage, setExceptionMessage] = useState("");
  const [stackTrace, setStackTrace] = useState("");
  const [payload, setPayload] = useState(""); // trace / spans / logs / deployment payload
  const [jsonError, setJsonError] = useState<string | null>(null);

  const buildInput = (): InvestigationInput | null => {
    setJsonError(null);
    const base: InvestigationInput = {};
    if (query.trim()) base.user_query = query.trim();
    if (service.trim()) base.service_name = service.trim();
    if (environment.trim()) base.environment_name = environment.trim();
    if (severity.trim()) base.severity = severity.trim();

    switch (kind) {
      case "error": {
        if (exceptionType.trim()) base.exception_type = exceptionType.trim();
        if (exceptionMessage.trim()) base.exception_message = exceptionMessage.trim();
        const parsed = parseJsonSafe(payload);
        if (!parsed.ok) {
          setJsonError(parsed.error);
          return null;
        }
        if (parsed.data && typeof parsed.data === "object") {
          base.error_payload = parsed.data as Record<string, unknown>;
        }
        break;
      }
      case "stack_trace": {
        if (exceptionType.trim()) base.exception_type = exceptionType.trim();
        base.stack_trace = stackTrace;
        break;
      }
      case "trace": {
        const parsed = parseJsonSafe(payload);
        if (!parsed.ok) {
          setJsonError(parsed.error);
          return null;
        }
        if (parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data)) {
          base.trace = parsed.data as Record<string, unknown>;
        }
        break;
      }
      case "span": {
        const parsed = parseJsonSafe(payload);
        if (!parsed.ok) {
          setJsonError(parsed.error);
          return null;
        }
        if (Array.isArray(parsed.data)) base.spans = parsed.data;
        break;
      }
      case "log": {
        if (payload.trim()) {
          const parsed = parseJsonSafe(payload);
          base.logs = parsed.ok && Array.isArray(parsed.data)
            ? parsed.data
            : payload.split("\n").map((line) => line.trim()).filter(Boolean);
        }
        break;
      }
      case "deployment": {
        const parsed = parseJsonSafe(payload);
        if (!parsed.ok) {
          setJsonError(parsed.error);
          return null;
        }
        if (Array.isArray(parsed.data)) base.deployment_events = parsed.data;
        break;
      }
    }
    return base;
  };

  const handleRun = () => {
    const input = buildInput();
    if (!input) return;
    investigation.mutate({ kind, input });
  };

  const handleFeedback = async (helpful: boolean) => {
    if (!orgId || !investigation.data) return;
    await aiApi.submitFeedback(orgId, investigation.data.request_id, { helpful });
  };

  const showStack = kind === "stack_trace";
  const showError = kind === "error";
  const showJsonPayload = kind === "trace" || kind === "span" || kind === "deployment";
  const showLogs = kind === "log";

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Artificial Intelligence"
        title="AI Investigations"
        description="Investigate errors, traces, logs, spans, stack traces, and deployments in one place. The AI selects the right analysis for the resource you choose."
        icon={FlaskConical}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* Composer */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          <Panel title="What are you investigating?" icon={FlaskConical} tone="ai">
            <div className="flex flex-col gap-4">
              <SegmentedControl
                ariaLabel="Investigation type"
                value={kind}
                onChange={(v) => {
                  setKind(v);
                  setJsonError(null);
                }}
                options={KINDS}
                className="flex-wrap"
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-[var(--text2)]">Service</span>
                  <input
                    className={fieldInputClass}
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    placeholder="payments-api"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-[var(--text2)]">Environment</span>
                  <input
                    className={fieldInputClass}
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    placeholder="production"
                  />
                </label>
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-[12px] font-medium text-[var(--text2)]">Severity</span>
                  <select
                    className={fieldInputClass}
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  >
                    <option value="">Unspecified</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>
              </div>

              {showError && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-medium text-[var(--text2)]">Exception type</span>
                    <input
                      className={fieldInputClass}
                      value={exceptionType}
                      onChange={(e) => setExceptionType(e.target.value)}
                      placeholder="TypeError"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-medium text-[var(--text2)]">Exception message</span>
                    <textarea
                      className={fieldTextareaClass}
                      value={exceptionMessage}
                      onChange={(e) => setExceptionMessage(e.target.value)}
                      placeholder="Cannot read properties of undefined…"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-medium text-[var(--text2)]">
                      Error payload <span className="text-[var(--text3)]">(JSON, optional)</span>
                    </span>
                    <textarea
                      className={`${fieldTextareaClass} font-[family-name:var(--mono)] text-[12px]`}
                      value={payload}
                      onChange={(e) => setPayload(e.target.value)}
                      placeholder='{ "statusCode": 500 }'
                    />
                  </label>
                </>
              )}

              {showStack && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-medium text-[var(--text2)]">Exception type</span>
                    <input
                      className={fieldInputClass}
                      value={exceptionType}
                      onChange={(e) => setExceptionType(e.target.value)}
                      placeholder="NullPointerException"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-medium text-[var(--text2)]">Stack trace</span>
                    <textarea
                      className={`${fieldTextareaClass} min-h-[160px] font-[family-name:var(--mono)] text-[12px]`}
                      value={stackTrace}
                      onChange={(e) => setStackTrace(e.target.value)}
                      placeholder="Paste the full stack trace here…"
                    />
                  </label>
                </>
              )}

              {showJsonPayload && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-[var(--text2)]">
                    {kind === "trace" ? "Trace" : kind === "span" ? "Spans" : "Deployment events"}{" "}
                    <span className="text-[var(--text3)]">
                      (JSON {kind === "trace" ? "object" : "array"})
                    </span>
                  </span>
                  <textarea
                    className={`${fieldTextareaClass} min-h-[160px] font-[family-name:var(--mono)] text-[12px]`}
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    placeholder={kind === "trace" ? '{ "traceId": "…", "spans": [] }' : "[ { … } ]"}
                  />
                </label>
              )}

              {showLogs && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-[var(--text2)]">
                    Log lines <span className="text-[var(--text3)]">(one per line, or JSON array)</span>
                  </span>
                  <textarea
                    className={`${fieldTextareaClass} min-h-[160px] font-[family-name:var(--mono)] text-[12px]`}
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    placeholder="2026-07-27T10:00:00Z ERROR connection reset…"
                  />
                </label>
              )}

              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-[var(--text2)]">Question / context</span>
                <textarea
                  className={fieldTextareaClass}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={PLACEHOLDERS[kind]}
                />
              </label>

              {jsonError && <p className="text-[12.5px] text-[var(--red)]">{jsonError}</p>}

              <Button variant="primary" onClick={handleRun} disabled={investigation.isPending} className="w-full justify-center">
                {investigation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Investigating…
                  </>
                ) : (
                  <>
                    <Play className="size-4" /> Run investigation
                  </>
                )}
              </Button>
            </div>
          </Panel>
        </div>

        {/* Results */}
        <div className="min-w-0">
          {investigation.isPending ? (
            <Panel title="Analysis in progress" icon={Terminal} tone="ai">
              <div className="flex items-center gap-3 text-[13px] text-[var(--text2)]">
                <Loader2 className="size-4 animate-spin text-[var(--ai)]" />
                Correlating telemetry and generating a grounded analysis…
              </div>
            </Panel>
          ) : investigation.isError ? (
            <AiErrorState error={investigation.error} onRetry={handleRun} />
          ) : investigation.data ? (
            <InvestigationResult answer={investigation.data} onFeedback={handleFeedback} />
          ) : (
            <EmptyPanel
              icon={FlaskConical}
              title="No investigation yet"
              description="Choose a resource type, add the context you have, and run an investigation. Results include root cause, evidence, a timeline, suggested fixes, and confidence."
            />
          )}
        </div>
      </div>
    </div>
  );
}
