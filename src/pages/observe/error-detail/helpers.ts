import type {
  ErrorDetailResponse,
  ErrorSectionId,
  NormalizedErrorAiResponse,
  StackFrame,
} from "./types";

export const ERROR_SECTIONS: { id: ErrorSectionId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "stack-trace", label: "Stack Trace" },
  { id: "breadcrumbs", label: "Breadcrumbs" },
  { id: "http", label: "HTTP & Route" },
  { id: "context", label: "Context" },
  { id: "metadata", label: "Metadata" },
  { id: "ai", label: "AI Analysis" },
  { id: "related", label: "Related Telemetry" },
  { id: "tags", label: "Tags & Extra" },
];

export function sectionDomId(id: ErrorSectionId): string {
  return `error-section-${id}`;
}

export function displayValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function hasJsonValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

export function normalizeAiResponse(raw: unknown): NormalizedErrorAiResponse | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const recommendations = Array.isArray(o.recommendations)
    ? o.recommendations.filter((item): item is string => typeof item === "string")
    : Array.isArray(o.findings)
      ? o.findings.filter((item): item is string => typeof item === "string")
      : [];
  const confidence =
    typeof o.confidence === "number" && Number.isFinite(o.confidence) ? o.confidence : null;
  const summary =
    typeof o.summary === "string" ? o.summary
    : typeof o.explanation === "string" ? o.explanation
    : null;
  const rootCause =
    typeof o.rootCause === "string" ? o.rootCause
    : typeof o.root_cause === "string" ? o.root_cause
    : null;
  const generatedAt =
    typeof o.generatedAt === "string" ? o.generatedAt
    : typeof o.generated_at === "string" ? o.generated_at
    : typeof o.createdAt === "string" ? o.createdAt
    : null;

  if (!summary && !rootCause && recommendations.length === 0) return null;
  return { summary, rootCause, recommendations, confidence, generatedAt };
}

export function toCopyableJson(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, v) => (v instanceof Set ? Array.from(v) : v), 2);
  } catch {
    return String(value);
  }
}

export function formatStackLocation(frame: StackFrame): string {
  const file = frame.filename ?? frame.file ?? frame.module ?? "unknown";
  const line = frame.lineno != null ? `:${frame.lineno}` : "";
  const col = frame.colno != null ? `:${frame.colno}` : "";
  return `${file}${line}${col}`;
}

export function normalizeErrorDetail(raw: unknown): ErrorDetailResponse | null {
  if (!raw || typeof raw !== "object") return null;

  const res = raw as Record<string, unknown>;
  const entity = (res.entity && typeof res.entity === "object") ? (res.entity as Record<string, unknown>) : res;

  // Extract public ID
  const publicId = (res.publicId ?? entity.publicId ?? res.id ?? entity.id ?? "ERR-000000000") as string;
  const id = (res.id ?? entity.id ?? publicId) as string;
  const occurredAt = (res.occurredAt ?? entity.occurredAt ?? entity.timestamp ?? res.timestamp ?? new Date().toISOString()) as string;

  // Error object mapping
  const rawError = (res.error ?? entity.error) as Record<string, unknown> | undefined;
  const errorObj = {
    name: (rawError?.name ?? entity.name ?? entity.errorName ?? "Error") as string,
    message: (rawError?.message ?? entity.message ?? entity.errorMessage ?? "An unexpected error occurred") as string,
    severity: (rawError?.severity ?? entity.severity ?? "error") as string,
    handled: (rawError?.handled ?? entity.handled ?? true) as boolean,
    mechanism: (rawError?.mechanism ?? entity.mechanism ?? "runtime") as string,
  };

  // HTTP mapping
  const rawHttp = (res.http ?? entity.http) as Record<string, unknown> | undefined;
  const httpObj = rawHttp ? {
    method: (rawHttp.method ?? null) as string | null,
    route: (rawHttp.route ?? null) as string | null,
    url: (rawHttp.url ?? null) as string | null,
    statusCode: (typeof rawHttp.statusCode === "number" ? rawHttp.statusCode : null),
    statusText: (rawHttp.statusText ?? null) as string | null,
  } : null;

  // Environment & Routing
  const environment = (res.environment ?? entity.environment ?? "production") as string;
  const service = (res.service ?? entity.service ?? "unknown-service") as string;
  const release = (res.release ?? entity.release ?? "1.0.0") as string;

  // Project
  const rawProject = res.project ?? entity.project;
  const projectObj = typeof rawProject === "object" && rawProject !== null
    ? { name: (rawProject as Record<string, unknown>).name as string ?? "Default Project", slug: (rawProject as Record<string, unknown>).slug as string ?? "default" }
    : { name: (typeof rawProject === "string" ? rawProject : "Default Project"), slug: "default" };

  // Server
  const rawServer = res.server ?? entity.server;
  const serverObj = typeof rawServer === "object" && rawServer !== null
    ? { name: (rawServer as Record<string, unknown>).name as string ?? "server-01" }
    : { name: (typeof rawServer === "string" ? rawServer : "server-01") };

  // SDK
  const rawSdk = res.sdk ?? entity.sdk;
  const sdkObj = typeof rawSdk === "object" && rawSdk !== null
    ? { name: (rawSdk as Record<string, unknown>).name as string ?? "pulse-sdk", version: (rawSdk as Record<string, unknown>).version as string ?? "1.0.0" }
    : { name: "pulse-sdk", version: "1.0.0" };

  // References
  const rawTrace = (res.trace ?? entity.trace) as Record<string, unknown> | undefined;
  const traceObj = rawTrace ? {
    publicId: (rawTrace.publicId ?? null) as string | null,
    traceId: (rawTrace.traceId ?? rawTrace.id ?? null) as string | null,
  } : null;

  const rawGroup = (res.errorGroup ?? entity.errorGroup) as Record<string, unknown> | undefined;
  const groupObj = rawGroup ? { publicId: (rawGroup.publicId ?? null) as string | null } : null;

  const rawReq = (res.request ?? entity.request) as Record<string, unknown> | undefined;
  const reqObj = rawReq ? { publicId: (rawReq.publicId ?? null) as string | null } : null;

  // Debugging
  const rawDebugging = (res.debugging ?? entity.debugging) as Record<string, unknown> | undefined;
  const rawStack = (rawDebugging?.stackFrames ?? res.stackFrames ?? entity.stackFrames ?? entity.stack) as StackFrame[] | string | undefined;
  
  let stackFrames: StackFrame[] = [];
  if (Array.isArray(rawStack)) {
    stackFrames = rawStack;
  } else if (typeof rawStack === "string") {
    stackFrames = parseRawStackString(rawStack);
  }

  const breadcrumbs = Array.isArray(rawDebugging?.breadcrumbs)
    ? rawDebugging.breadcrumbs
    : Array.isArray(res.breadcrumbs)
      ? res.breadcrumbs
      : Array.isArray(entity.breadcrumbs)
        ? entity.breadcrumbs
        : [];

  // Context & Metadata
  const context = (res.context ?? entity.context ?? {}) as Record<string, unknown>;
  const metadata = (res.metadata ?? entity.metadata ?? {}) as Record<string, unknown>;
  const tags = (res.tags ?? entity.tags ?? {}) as Record<string, unknown>;
  const extra = (res.extra ?? entity.extra ?? {}) as Record<string, unknown>;
  const aiResponse = res.aiResponse ?? entity.aiResponse ?? null;
  const related = (res.related ?? entity.related ?? {}) as Record<string, unknown>;

  return {
    id,
    publicId,
    occurredAt,
    error: errorObj,
    http: httpObj,
    environment,
    project: projectObj,
    service,
    server: serverObj,
    release,
    sdk: sdkObj,
    trace: traceObj,
    errorGroup: groupObj,
    request: reqObj,
    debugging: {
      stackFrames,
      breadcrumbs,
    },
    context,
    tags,
    extra,
    metadata,
    aiResponse,
    related: {
      logs: (related.logs as { count: number }) ?? { count: 0 },
      trace: traceObj,
      request: reqObj,
      errorGroup: groupObj,
    },
  };
}

function parseRawStackString(stack: string): StackFrame[] {
  const lines = stack.split("\n").filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const trimmed = line.trim();
    const match = trimmed.match(/^at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?$/) || trimmed.match(/^(.*?)[@@](.+?):(\d+):(\d+)$/);
    if (match) {
      const fn = match[1] || "anonymous";
      const file = match[2];
      const lineno = parseInt(match[3], 10);
      const colno = parseInt(match[4], 10);
      const inApp = !file.includes("node_modules") && !file.includes("internal/");
      return {
        function: fn,
        filename: file,
        lineno,
        colno,
        inApp,
        contextLine: line,
      };
    }
    return {
      function: "anonymous",
      filename: trimmed,
      contextLine: line,
      inApp: !trimmed.includes("node_modules"),
    };
  });
}
