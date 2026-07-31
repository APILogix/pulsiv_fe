/**
 * Frontend mirror of the backend schema-v1 editable contract.
 *
 * Every key list below must stay in lockstep with:
 *   pulse/src/modules/projects/sdk-config/schema-v1.ts
 * Editability (which of these the PATCH endpoint actually accepts) mirrors:
 *   pulse/src/modules/projects/sdk-config/editable-allowlist.ts
 *
 * `sdk.*`, `meta.*`, `entitlements.*`, `schemaVersion`, and every
 * `transport.routes.<route>.url` are compiler-owned and are never rendered
 * as editable fields — the backend rejects them if sent.
 */
import type {
  CompressionMode,
  QueueOverflowStrategy,
  RetryBackoff,
  TransportPriority,
} from './bounds';

export const FEATURE_KEYS = [
  'tracing',
  'requestCapture',
  'errors',
  'metrics',
  'logging',
  'profiling',
  'crons',
  'sessionReplay',
  'runtimeMetrics',
  'eventLoopMonitoring',
  'gcMonitoring',
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const KILLSWITCH_KEYS = [
  'disableSDK',
  'disableTracing',
  'disableMetrics',
  'disableTransport',
  'disableProfiling',
  'disableErrors',
  'disableLogs',
] as const;
export type KillswitchKey = (typeof KILLSWITCH_KEYS)[number];

export const SAMPLING_SIGNALS = [
  'errors',
  'traces',
  'spans',
  'requests',
  'metrics',
  'logs',
  'events',
  'messages',
  'profiles',
  'replays',
  'crons',
] as const;
export type SamplingSignal = (typeof SAMPLING_SIGNALS)[number];
/** A route override may configure only the signals it needs to replace. */
export type SamplingRouteOverride = Partial<Record<SamplingSignal, number>>;

export const INSTRUMENTATION_KEYS = [
  'http',
  'https',
  'fetch',
  'axios',
  'fastify',
  'express',
  'graphql',
  'prisma',
  'mongodb',
  'redis',
  'bullmq',
  'pg',
  'mysql2',
  'eventEmitterPatch',
] as const;
export type InstrumentationKey = (typeof INSTRUMENTATION_KEYS)[number];

export const PRIVACY_CAPTURE_KEYS = ['headers', 'body', 'response', 'query', 'cookies'] as const;
export type PrivacyCaptureKey = (typeof PRIVACY_CAPTURE_KEYS)[number];

export const PII_DETECTION_KEYS = ['enabled', 'maskEmails', 'maskPhones', 'maskIPs'] as const;
export type PiiDetectionKey = (typeof PII_DETECTION_KEYS)[number];

/** Route keys the backend actually serves (pulse/src/modules/ingestion/route-table.ts). */
export const ROUTE_KEYS = [
  'errors',
  'requests',
  'traces',
  'spans',
  'metrics',
  'logs',
  'profiles',
  'events',
  'crons',
  'replays',
] as const;
export type RouteKey = (typeof ROUTE_KEYS)[number];

export const ROUTE_LABELS: Record<RouteKey, string> = {
  errors: 'Errors',
  requests: 'Requests',
  traces: 'Traces',
  spans: 'Spans',
  metrics: 'Metrics',
  logs: 'Logs',
  profiles: 'Profiles',
  events: 'Events',
  crons: 'Cron check-ins',
  replays: 'Session replays',
};

export interface TransportRouteState {
  batchSize: number;
  flushIntervalMs: number;
  timeoutMs: number;
  compression: CompressionMode;
  priority: TransportPriority;
}

export interface SdkConfigState {
  features: Record<FeatureKey, boolean>;
  killswitches: Record<KillswitchKey, boolean>;
  sampling: Record<SamplingSignal, number> & {
    routes: Record<string, SamplingRouteOverride>;
  };
  instrumentation: Record<InstrumentationKey, boolean>;
  privacy: {
    capture: Record<PrivacyCaptureKey, boolean>;
    scrubbing: {
      enabled: boolean;
      headers: string[];
      fields: string[];
    };
    piiDetection: Record<PiiDetectionKey, boolean>;
  };
  limits: {
    maxSpansPerTrace: number;
    maxSpanAttributes: number;
    maxAttributeLength: number;
    maxPayloadSize: number;
    maxQueueSize: number;
    maxMemoryMb: 'auto' | number;
    tenantGovernance: {
      enabled: boolean;
      maxTenantsTracked: number;
      quotaPerWindow: number;
      windowDurationMs: number;
      criticalReserve: number;
    };
  };
  transport: {
    keepAlive: boolean;
    retry: {
      enabled: boolean;
      maxRetries: number;
      backoff: RetryBackoff;
      baseDelayMs: number;
    };
    queue: {
      overflowStrategy: QueueOverflowStrategy;
      maxSize: number;
      criticalReserve: number;
    };
    connections: {
      maxTotalConnections: number;
      acquireTimeoutMs: number;
    };
    routes: Record<RouteKey, TransportRouteState>;
  };
  runtime: {
    configTtlSeconds: number;
    staleWhileRevalidate: boolean;
  };
}

const DEFAULT_ROUTE: TransportRouteState = {
  batchSize: 100,
  flushIntervalMs: 5000,
  timeoutMs: 10000,
  compression: 'gzip',
  priority: 'normal',
};

export const DEFAULT_SDK_CONFIG: SdkConfigState = {
  features: {
    tracing: true,
    requestCapture: true,
    errors: true,
    metrics: true,
    logging: true,
    profiling: false,
    crons: false,
    sessionReplay: false,
    runtimeMetrics: false,
    eventLoopMonitoring: false,
    gcMonitoring: false,
  },
  killswitches: {
    disableSDK: false,
    disableTracing: false,
    disableMetrics: false,
    disableTransport: false,
    disableProfiling: false,
    disableErrors: false,
    disableLogs: false,
  },
  sampling: {
    errors: 1,
    traces: 1,
    spans: 1,
    requests: 1,
    metrics: 1,
    logs: 1,
    events: 1,
    messages: 1,
    profiles: 0.1,
    replays: 0.1,
    crons: 1,
    routes: {},
  },
  instrumentation: {
    http: true,
    https: true,
    fetch: true,
    axios: false,
    fastify: true,
    express: true,
    graphql: false,
    prisma: false,
    mongodb: false,
    redis: false,
    bullmq: false,
    pg: false,
    mysql2: false,
    eventEmitterPatch: false,
  },
  privacy: {
    capture: {
      headers: false,
      body: false,
      response: false,
      query: false,
      cookies: false,
    },
    scrubbing: {
      enabled: true,
      headers: ['authorization', 'proxy-authorization', 'cookie', 'set-cookie', 'x-api-key'],
      fields: ['password', 'secret', 'token', 'apiKey', 'authorization'],
    },
    piiDetection: {
      enabled: true,
      maskEmails: true,
      maskPhones: true,
      maskIPs: false,
    },
  },
  limits: {
    maxSpansPerTrace: 2000,
    maxSpanAttributes: 128,
    maxAttributeLength: 4096,
    maxPayloadSize: 1048576,
    maxQueueSize: 10000,
    maxMemoryMb: 256,
    tenantGovernance: {
      enabled: false,
      maxTenantsTracked: 1000,
      quotaPerWindow: 100000,
      windowDurationMs: 60000,
      criticalReserve: 1000,
    },
  },
  transport: {
    keepAlive: true,
    retry: {
      enabled: true,
      maxRetries: 3,
      backoff: 'exponential',
      baseDelayMs: 500,
    },
    queue: {
      overflowStrategy: 'drop_oldest',
      maxSize: 10000,
      criticalReserve: 1000,
    },
    connections: {
      maxTotalConnections: 50,
      acquireTimeoutMs: 5000,
    },
    routes: Object.fromEntries(ROUTE_KEYS.map((key) => [key, { ...DEFAULT_ROUTE }])) as Record<
      RouteKey,
      TransportRouteState
    >,
  },
  runtime: {
    configTtlSeconds: 300,
    staleWhileRevalidate: true,
  },
};
