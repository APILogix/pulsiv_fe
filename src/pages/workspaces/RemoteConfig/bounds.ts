/**
 * Client-side mirror of the backend's SDK-config validation contract.
 *
 * Source of truth (do not drift from these without checking the backend
 * first):
 *   - pulse/src/modules/projects/sdk-config/schema-v1.ts   (keys & enums)
 *   - pulse/src/modules/projects/sdk-config/validator.ts   (bounds & cross-field rules)
 *   - pulse/src/modules/projects/sdk-config/editable-allowlist.ts (what the UI may send)
 *
 * The backend is the final authority — it re-validates and recompiles the
 * full document server-side regardless of what the client sends. This module
 * exists purely so the UI can reject invalid input immediately instead of
 * round-tripping to the server for a 422.
 */

export interface NumericBound {
  min: number;
  max: number;
  integer: boolean;
}

export const BOUNDS = {
  "limits.maxSpansPerTrace": { min: 1, max: 5000, integer: true },
  "limits.maxSpanAttributes": { min: 1, max: 500, integer: true },
  "limits.maxAttributeLength": { min: 1, max: 16384, integer: true },
  "limits.maxPayloadSize": { min: 1024, max: 4194304, integer: true },
  "limits.maxQueueSize": { min: 1, max: 100000, integer: true },
  "limits.maxMemoryMb": { min: 16, max: 1024, integer: true },
  "transport.retry.maxRetries": { min: 0, max: 10, integer: true },
  "transport.retry.baseDelayMs": { min: 100, max: 30000, integer: true },
  "transport.queue.maxSize": { min: 1, max: 100000, integer: true },
  "transport.queue.criticalReserve": { min: 0, max: 100000, integer: true },
  "transport.connections.maxTotalConnections": { min: 1, max: 500, integer: true },
  "transport.connections.acquireTimeoutMs": { min: 100, max: 60000, integer: true },
  "runtime.configTtlSeconds": { min: 30, max: 86400, integer: true },
  "route.batchSize": { min: 1, max: 5000, integer: true },
  "route.flushIntervalMs": { min: 0, max: 300000, integer: true },
  "route.timeoutMs": { min: 250, max: 60000, integer: true },
  "tenant.maxTenantsTracked": { min: 1, max: 100000, integer: true },
  "tenant.quotaPerWindow": { min: 1, max: 1000000, integer: true },
  "tenant.windowDurationMs": { min: 1000, max: 3600000, integer: true },
  "tenant.criticalReserve": { min: 0, max: 100000, integer: true },
} as const satisfies Record<string, NumericBound>;

export type BoundKey = keyof typeof BOUNDS;

export const SAMPLING_RATE_BOUND: NumericBound = { min: 0, max: 1, integer: false };
export const MAX_SCRUB_PATTERNS = 500;
export const MAX_PATTERN_BYTES = 512;

export const COMPRESSION_MODES = ["gzip", "none"] as const;
export type CompressionMode = (typeof COMPRESSION_MODES)[number];

export const TRANSPORT_PRIORITIES = ["critical", "high", "normal", "low"] as const;
export type TransportPriority = (typeof TRANSPORT_PRIORITIES)[number];

export const RETRY_BACKOFF_MODES = ["exponential", "linear", "fixed"] as const;
export type RetryBackoff = (typeof RETRY_BACKOFF_MODES)[number];

export const QUEUE_OVERFLOW_STRATEGIES = ["drop_oldest", "drop_newest", "reject"] as const;
export type QueueOverflowStrategy = (typeof QUEUE_OVERFLOW_STRATEGIES)[number];

export interface FieldError {
  /** Dot-delimited path matching the SdkConfigState shape, e.g. "limits.maxQueueSize". */
  path: string;
  message: string;
}

export function checkNumber(path: string, value: unknown, bound: NumericBound, errors: FieldError[]): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push({ path, message: "Must be a number" });
    return;
  }
  if (bound.integer && !Number.isInteger(value)) {
    errors.push({ path, message: "Must be a whole number" });
    return;
  }
  if (value < bound.min || value > bound.max) {
    errors.push({ path, message: `Must be between ${bound.min} and ${bound.max}` });
  }
}

export function checkStringArrayField(path: string, value: string[], errors: FieldError[]): void {
  if (value.length > MAX_SCRUB_PATTERNS) {
    errors.push({ path, message: `At most ${MAX_SCRUB_PATTERNS} entries are allowed` });
  }
  const seen = new Set<string>();
  value.forEach((entry) => {
    const bytes = new TextEncoder().encode(entry).length;
    if (entry.length === 0) errors.push({ path, message: "Entries cannot be empty" });
    if (bytes > MAX_PATTERN_BYTES) errors.push({ path, message: `"${entry}" exceeds ${MAX_PATTERN_BYTES} bytes` });
    if (seen.has(entry)) errors.push({ path, message: `Duplicate entry "${entry}"` });
    seen.add(entry);
  });
}
