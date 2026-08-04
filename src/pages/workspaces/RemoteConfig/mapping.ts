/**
 * Conversions between:
 *   - the backend's compiled schema-v1 document (GET response, read-only)
 *   - the editor's draft state (SdkConfigState)
 *   - the PATCH payload the backend's editable-allowlist actually accepts
 *
 * Only fields listed in editable-allowlist.ts are ever sent back. Protected
 * fields (schemaVersion, sdk.*, meta.*, entitlements.*, transport.routes.*.url)
 * are never read from the draft and never sent — the backend rejects them
 * with a 422 if they appear in the PATCH body, so we don't build them in the
 * first place.
 */
import {
  DEFAULT_SDK_CONFIG,
  FEATURE_KEYS,
  INSTRUMENTATION_KEYS,
  KILLSWITCH_KEYS,
  PII_DETECTION_KEYS,
  PRIVACY_CAPTURE_KEYS,
  ROUTE_KEYS,
  SAMPLING_SIGNALS,
  type RouteKey,
  type SamplingSignal,
  type SdkConfigState,
} from './schema';
import {
  checkNumber,
  checkStringArrayField,
  BOUNDS,
  SAMPLING_RATE_BOUND,
  COMPRESSION_MODES,
  TRANSPORT_PRIORITIES,
  RETRY_BACKOFF_MODES,
  QUEUE_OVERFLOW_STRATEGIES,
  type FieldError,
} from './bounds';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function strArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string') ? value : fallback;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Build a full SdkConfigState draft from whatever the GET endpoint returned. */
export function normalizeSdkConfig(input: unknown): SdkConfigState {
  const root = isRecord(input) ? input : {};
  const d = DEFAULT_SDK_CONFIG;

  const featuresIn = isRecord(root.features) ? root.features : {};
  const killswitchesIn = isRecord(root.killswitches) ? root.killswitches : {};
  const samplingIn = isRecord(root.sampling) ? root.sampling : {};
  const samplingRoutesIn = isRecord(samplingIn.routes) ? samplingIn.routes : {};
  const instrumentationIn = isRecord(root.instrumentation) ? root.instrumentation : {};
  const privacyIn = isRecord(root.privacy) ? root.privacy : {};
  const captureIn = isRecord(privacyIn.capture) ? privacyIn.capture : {};
  const scrubbingIn = isRecord(privacyIn.scrubbing) ? privacyIn.scrubbing : {};
  const piiIn = isRecord(privacyIn.piiDetection) ? privacyIn.piiDetection : {};
  const limitsIn = isRecord(root.limits) ? root.limits : {};
  const tenantIn = isRecord(limitsIn.tenantGovernance) ? limitsIn.tenantGovernance : {};
  const transportIn = isRecord(root.transport) ? root.transport : {};
  const retryIn = isRecord(transportIn.retry) ? transportIn.retry : {};
  const queueIn = isRecord(transportIn.queue) ? transportIn.queue : {};
  const connectionsIn = isRecord(transportIn.connections) ? transportIn.connections : {};
  const routesIn = isRecord(transportIn.routes) ? transportIn.routes : {};
  const runtimeIn = isRecord(root.runtime) ? root.runtime : {};

  const maxMemoryRaw = limitsIn.maxMemoryMb;
  const maxMemoryMb: 'auto' | number =
    maxMemoryRaw === 'auto' ? 'auto' : num(maxMemoryRaw, d.limits.maxMemoryMb === 'auto' ? 256 : d.limits.maxMemoryMb);

  return {
    features: Object.fromEntries(FEATURE_KEYS.map((k) => [k, bool(featuresIn[k], d.features[k])])) as SdkConfigState['features'],
    killswitches: Object.fromEntries(
      KILLSWITCH_KEYS.map((k) => [k, bool(killswitchesIn[k], d.killswitches[k])]),
    ) as SdkConfigState['killswitches'],
    sampling: {
      ...(Object.fromEntries(
        SAMPLING_SIGNALS.map((k) => [k, num(samplingIn[k], d.sampling[k])]),
      ) as Record<SamplingSignal, number>),
      routes: Object.fromEntries(
        Object.entries(samplingRoutesIn).map(([routePath, routeSignals]) => [
          routePath,
          isRecord(routeSignals)
            ? Object.fromEntries(
                SAMPLING_SIGNALS.flatMap((signal) =>
                  typeof routeSignals[signal] === 'number' && Number.isFinite(routeSignals[signal])
                    ? [[signal, routeSignals[signal]]]
                    : [],
                ),
              )
            : {},
        ]),
      ) as SdkConfigState['sampling']['routes'],
    },
    instrumentation: Object.fromEntries(
      INSTRUMENTATION_KEYS.map((k) => [k, bool(instrumentationIn[k], d.instrumentation[k])]),
    ) as SdkConfigState['instrumentation'],
    privacy: {
      capture: Object.fromEntries(
        PRIVACY_CAPTURE_KEYS.map((k) => [k, bool(captureIn[k], d.privacy.capture[k])]),
      ) as SdkConfigState['privacy']['capture'],
      scrubbing: {
        enabled: bool(scrubbingIn.enabled, d.privacy.scrubbing.enabled),
        headers: strArray(scrubbingIn.headers, d.privacy.scrubbing.headers),
        fields: strArray(scrubbingIn.fields, d.privacy.scrubbing.fields),
      },
      piiDetection: Object.fromEntries(
        PII_DETECTION_KEYS.map((k) => [k, bool(piiIn[k], d.privacy.piiDetection[k])]),
      ) as SdkConfigState['privacy']['piiDetection'],
    },
    limits: {
      maxSpansPerTrace: num(limitsIn.maxSpansPerTrace, d.limits.maxSpansPerTrace),
      maxSpanAttributes: num(limitsIn.maxSpanAttributes, d.limits.maxSpanAttributes),
      maxAttributeLength: num(limitsIn.maxAttributeLength, d.limits.maxAttributeLength),
      maxPayloadSize: num(limitsIn.maxPayloadSize, d.limits.maxPayloadSize),
      maxQueueSize: num(limitsIn.maxQueueSize, d.limits.maxQueueSize),
      maxMemoryMb,
      tenantGovernance: {
        enabled: bool(tenantIn.enabled, d.limits.tenantGovernance.enabled),
        maxTenantsTracked: num(tenantIn.maxTenantsTracked, d.limits.tenantGovernance.maxTenantsTracked),
        quotaPerWindow: num(tenantIn.quotaPerWindow, d.limits.tenantGovernance.quotaPerWindow),
        windowDurationMs: num(tenantIn.windowDurationMs, d.limits.tenantGovernance.windowDurationMs),
        criticalReserve: num(tenantIn.criticalReserve, d.limits.tenantGovernance.criticalReserve),
      },
    },
    transport: {
      keepAlive: bool(transportIn.keepAlive, d.transport.keepAlive),
      retry: {
        enabled: bool(retryIn.enabled, d.transport.retry.enabled),
        maxRetries: num(retryIn.maxRetries, d.transport.retry.maxRetries),
        backoff: enumValue(retryIn.backoff, RETRY_BACKOFF_MODES, d.transport.retry.backoff),
        baseDelayMs: num(retryIn.baseDelayMs, d.transport.retry.baseDelayMs),
      },
      queue: {
        overflowStrategy: enumValue(queueIn.overflowStrategy, QUEUE_OVERFLOW_STRATEGIES, d.transport.queue.overflowStrategy),
        maxSize: num(queueIn.maxSize, d.transport.queue.maxSize),
        criticalReserve: num(queueIn.criticalReserve, d.transport.queue.criticalReserve),
      },
      connections: {
        maxTotalConnections: num(connectionsIn.maxTotalConnections, d.transport.connections.maxTotalConnections),
        acquireTimeoutMs: num(connectionsIn.acquireTimeoutMs, d.transport.connections.acquireTimeoutMs),
      },
      routes: Object.fromEntries(
        ROUTE_KEYS.map((key) => {
          const routeIn = isRecord(routesIn[key]) ? (routesIn[key] as Record<string, unknown>) : {};
          const fallback = d.transport.routes[key];
          return [
            key,
            {
              batchSize: num(routeIn.batchSize, fallback.batchSize),
              flushIntervalMs: num(routeIn.flushIntervalMs, fallback.flushIntervalMs),
              timeoutMs: num(routeIn.timeoutMs, fallback.timeoutMs),
              compression: enumValue(routeIn.compression, COMPRESSION_MODES, fallback.compression),
              priority: enumValue(routeIn.priority, TRANSPORT_PRIORITIES, fallback.priority),
            },
          ];
        }),
      ) as Record<RouteKey, SdkConfigState['transport']['routes'][RouteKey]>,
    },
    runtime: {
      configTtlSeconds: num(runtimeIn.configTtlSeconds, d.runtime.configTtlSeconds),
      staleWhileRevalidate: bool(runtimeIn.staleWhileRevalidate, d.runtime.staleWhileRevalidate),
    },
  };
}

/**
 * Build the exact `editableConfig` object the PATCH endpoint expects, using
 * only allowlisted pointers (editable-allowlist.ts). Nothing protected
 * (schemaVersion/sdk/meta/entitlements/route urls) is ever included.
 */
export function buildEditableConfig(draft: SdkConfigState): Record<string, unknown> {
  return {
    features: { ...draft.features },
    killswitches: { ...draft.killswitches },
    sampling: { 
      ...draft.sampling,
      routes: Object.fromEntries(
        Object.entries(draft.sampling.routes).map(([route, signals]) => [
          route,
          { ...signals }
        ])
      ),
    },
    instrumentation: { ...draft.instrumentation },
    privacy: {
      capture: { ...draft.privacy.capture },
      scrubbing: {
        enabled: draft.privacy.scrubbing.enabled,
        headers: [...draft.privacy.scrubbing.headers],
        fields: [...draft.privacy.scrubbing.fields],
      },
      piiDetection: { ...draft.privacy.piiDetection },
    },
    limits: {
      maxSpansPerTrace: draft.limits.maxSpansPerTrace,
      maxSpanAttributes: draft.limits.maxSpanAttributes,
      maxAttributeLength: draft.limits.maxAttributeLength,
      maxPayloadSize: draft.limits.maxPayloadSize,
      maxQueueSize: draft.limits.maxQueueSize,
      maxMemoryMb: draft.limits.maxMemoryMb,
      tenantGovernance: { ...draft.limits.tenantGovernance },
    },
    transport: {
      keepAlive: draft.transport.keepAlive,
      retry: { ...draft.transport.retry },
      queue: { ...draft.transport.queue },
      connections: { ...draft.transport.connections },
      routes: Object.fromEntries(
        ROUTE_KEYS.map((key) => [
          key,
          {
            batchSize: draft.transport.routes[key].batchSize,
            flushIntervalMs: draft.transport.routes[key].flushIntervalMs,
            timeoutMs: draft.transport.routes[key].timeoutMs,
            compression: draft.transport.routes[key].compression,
            priority: draft.transport.routes[key].priority,
          },
        ]),
      ),
    },
    runtime: { ...draft.runtime },
  };
}

/**
 * Client-side mirror of validator.ts + the two cross-field checks. Returns
 * every violation found; the caller decides whether to block save. This is a
 * pre-check only — the backend re-validates and is the final authority.
 */
export function validateDraft(draft: SdkConfigState): FieldError[] {
  const errors: FieldError[] = [];

  for (const signal of SAMPLING_SIGNALS) {
    checkNumber(`sampling.${signal}`, draft.sampling[signal], SAMPLING_RATE_BOUND, errors);
  }

  for (const [routePath, signals] of Object.entries(draft.sampling.routes)) {
    for (const signal of SAMPLING_SIGNALS) {
      if (signals[signal] !== undefined) {
        checkNumber(`sampling.routes.${routePath}.${signal}`, signals[signal], SAMPLING_RATE_BOUND, errors);
      }
    }
  }

  checkNumber('limits.maxSpansPerTrace', draft.limits.maxSpansPerTrace, BOUNDS['limits.maxSpansPerTrace'], errors);
  checkNumber('limits.maxSpanAttributes', draft.limits.maxSpanAttributes, BOUNDS['limits.maxSpanAttributes'], errors);
  checkNumber('limits.maxAttributeLength', draft.limits.maxAttributeLength, BOUNDS['limits.maxAttributeLength'], errors);
  checkNumber('limits.maxPayloadSize', draft.limits.maxPayloadSize, BOUNDS['limits.maxPayloadSize'], errors);
  checkNumber('limits.maxQueueSize', draft.limits.maxQueueSize, BOUNDS['limits.maxQueueSize'], errors);
  if (draft.limits.maxMemoryMb !== 'auto') {
    checkNumber('limits.maxMemoryMb', draft.limits.maxMemoryMb, BOUNDS['limits.maxMemoryMb'], errors);
  }

  if (draft.limits.tenantGovernance.enabled) {
    checkNumber('limits.tenantGovernance.maxTenantsTracked', draft.limits.tenantGovernance.maxTenantsTracked, BOUNDS['tenant.maxTenantsTracked'], errors);
    checkNumber('limits.tenantGovernance.quotaPerWindow', draft.limits.tenantGovernance.quotaPerWindow, BOUNDS['tenant.quotaPerWindow'], errors);
    checkNumber('limits.tenantGovernance.windowDurationMs', draft.limits.tenantGovernance.windowDurationMs, BOUNDS['tenant.windowDurationMs'], errors);
    checkNumber('limits.tenantGovernance.criticalReserve', draft.limits.tenantGovernance.criticalReserve, BOUNDS['tenant.criticalReserve'], errors);
    if (draft.limits.tenantGovernance.criticalReserve > draft.limits.tenantGovernance.quotaPerWindow) {
      errors.push({ path: 'limits.tenantGovernance.criticalReserve', message: 'Must be ≤ quota per window' });
    }
  }

  checkNumber('transport.retry.maxRetries', draft.transport.retry.maxRetries, BOUNDS['transport.retry.maxRetries'], errors);
  checkNumber('transport.retry.baseDelayMs', draft.transport.retry.baseDelayMs, BOUNDS['transport.retry.baseDelayMs'], errors);
  checkNumber('transport.queue.maxSize', draft.transport.queue.maxSize, BOUNDS['transport.queue.maxSize'], errors);
  checkNumber('transport.queue.criticalReserve', draft.transport.queue.criticalReserve, BOUNDS['transport.queue.criticalReserve'], errors);
  checkNumber('transport.connections.maxTotalConnections', draft.transport.connections.maxTotalConnections, BOUNDS['transport.connections.maxTotalConnections'], errors);
  checkNumber('transport.connections.acquireTimeoutMs', draft.transport.connections.acquireTimeoutMs, BOUNDS['transport.connections.acquireTimeoutMs'], errors);
  checkNumber('runtime.configTtlSeconds', draft.runtime.configTtlSeconds, BOUNDS['runtime.configTtlSeconds'], errors);

  for (const key of ROUTE_KEYS) {
    const route = draft.transport.routes[key];
    checkNumber(`transport.routes.${key}.batchSize`, route.batchSize, BOUNDS['route.batchSize'], errors);
    checkNumber(`transport.routes.${key}.flushIntervalMs`, route.flushIntervalMs, BOUNDS['route.flushIntervalMs'], errors);
    checkNumber(`transport.routes.${key}.timeoutMs`, route.timeoutMs, BOUNDS['route.timeoutMs'], errors);
  }

  checkStringArrayField('privacy.scrubbing.headers', draft.privacy.scrubbing.headers, errors);
  checkStringArrayField('privacy.scrubbing.fields', draft.privacy.scrubbing.fields, errors);

  // Cross-field checks (validator.ts):
  //   transport.queue.criticalReserve <= transport.queue.maxSize
  //   limits.maxQueueSize <= transport.queue.maxSize
  if (draft.transport.queue.criticalReserve > draft.transport.queue.maxSize) {
    errors.push({ path: 'transport.queue.criticalReserve', message: 'Must be ≤ queue max size' });
  }
  if (draft.limits.maxQueueSize > draft.transport.queue.maxSize) {
    errors.push({ path: 'limits.maxQueueSize', message: 'Must be ≤ transport queue max size' });
  }

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────
// Diffing — powers the "Review changes" drawer. Never touches protected
// fields because it only ever compares two SdkConfigState drafts, which by
// construction contain only editable fields.
// ─────────────────────────────────────────────────────────────────────────

export interface DiffEntry {
  /** Dot path matching FieldError.path, e.g. "transport.retry.maxRetries". */
  path: string;
  /** Top-level section this leaf belongs to, e.g. "transport". */
  section: string;
  /** Human label for the leaf, e.g. "Max Retries". */
  label: string;
  oldValue: unknown;
  newValue: unknown;
}

export const SECTION_LABELS: Record<string, string> = {
  features: 'Features',
  killswitches: 'Killswitches',
  sampling: 'Sampling',
  instrumentation: 'Instrumentation',
  privacy: 'Privacy',
  limits: 'Limits',
  transport: 'Transport',
  runtime: 'Runtime',
};

function humanizeSegment(segment: string): string {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

/** Render a leaf value for display in the diff drawer — never raw JSON dumps. */
export function formatDiffValue(path: string, value: unknown): string {
  if (value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  if (typeof value === 'number') {
    if (path.startsWith('sampling.')) return `${Math.round(value * 100)}%`;
    return value.toLocaleString();
  }
  if (Array.isArray(value)) return `${value.length} entr${value.length === 1 ? 'y' : 'ies'}`;
  return String(value);
}

/**
 * Leaf-level diff between two SdkConfigState drafts. Used only to render a
 * human-readable "what changed" summary before publish — the actual PATCH
 * body always comes from buildEditableConfig(draft), not from this diff.
 */
export function diffDraft(base: SdkConfigState, draft: SdkConfigState): DiffEntry[] {
  const entries: DiffEntry[] = [];

  const walk = (a: unknown, b: unknown, path: string[]) => {
    if (Array.isArray(a) || Array.isArray(b)) {
      if (JSON.stringify(a) !== JSON.stringify(b)) pushEntry(path, a, b);
      return;
    }
    if (isRecord(a) && isRecord(b)) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      keys.forEach((key) => walk(a[key], b[key], [...path, key]));
      return;
    }
    if (a !== b) pushEntry(path, a, b);
  };

  function pushEntry(path: string[], oldValue: unknown, newValue: unknown) {
    const section = path[0] ?? '';
    entries.push({
      path: path.join('.'),
      section,
      label: path.slice(1).map(humanizeSegment).join(' \u2192 ') || humanizeSegment(section),
      oldValue,
      newValue,
    });
  }

  walk(base as unknown, draft as unknown, []);
  return entries;
}
