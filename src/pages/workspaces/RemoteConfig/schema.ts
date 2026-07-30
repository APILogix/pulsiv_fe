export interface SdkConfigState {
  features: {
    errors: boolean;
    logging: boolean;
    metrics: boolean;
    tracing: boolean;
    requestCapture: boolean;
    crons: boolean;
    profiling: boolean;
    gcMonitoring: boolean;
    sessionReplay: boolean;
    runtimeMetrics: boolean;
    eventLoopMonitoring: boolean;
  };
  transport: {
    routes: Array<{
      id: string;
      priority: number;
      name: string;
      batchSize: number;
      flushInterval: number;
      timeout: number;
      compression: string;
    }>;
    maxConnections: number;
    acquireTimeout: number;
    keepAlive: boolean;
    maxRetries: number;
    baseDelay: number;
    queueMaxSize: number;
    criticalReserve: number;
  };
  sampling: {
    errors: number;
    traces: number;
    metrics: number;
    replays: number;
    profiles: number;
    requests: number;
  };
  privacy: {
    enabled: boolean;
    maskEmails: boolean;
    maskCreditCards: boolean;
    maskPhoneNumbers: boolean;
    body: boolean;
    query: boolean;
    cookies: boolean;
    headers: boolean;
    response: boolean;
    scrubFields: string[];
    scrubHeaders: string[];
  };
  instrumentation: {
    http: boolean;
    https: boolean;
    fetch: boolean;
    express: boolean;
    fastify: boolean;
    axios: boolean;
    redis: boolean;
    bullmq: boolean;
    prisma: boolean;
    graphql: boolean;
    mongodb: boolean;
  };
  killswitches: {
    disableSDK: boolean;
    disableTransport: boolean;
    disableErrors: boolean;
    disableLogs: boolean;
    disableMetrics: boolean;
    disableTracing: boolean;
    disableProfiling: boolean;
  };
}

export const DEFAULT_SDK_CONFIG: SdkConfigState = {
  features: {
    errors: true,
    logging: true,
    metrics: true,
    tracing: true,
    requestCapture: true,
    crons: false,
    profiling: false,
    gcMonitoring: false,
    sessionReplay: false,
    runtimeMetrics: false,
    eventLoopMonitoring: false,
  },
  transport: {
    routes: [
      { id: 'r1', priority: 1, name: 'errors', batchSize: 100, flushInterval: 5000, timeout: 10000, compression: 'gzip' },
      { id: 'r2', priority: 2, name: 'traces', batchSize: 100, flushInterval: 5000, timeout: 10000, compression: 'gzip' },
      { id: 'r3', priority: 3, name: 'requests', batchSize: 100, flushInterval: 5000, timeout: 10000, compression: 'gzip' },
      { id: 'r4', priority: 4, name: 'logs', batchSize: 100, flushInterval: 5000, timeout: 10000, compression: 'gzip' },
      { id: 'r5', priority: 5, name: 'metrics', batchSize: 100, flushInterval: 5000, timeout: 10000, compression: 'gzip' },
      { id: 'r6', priority: 6, name: 'events', batchSize: 100, flushInterval: 5000, timeout: 10000, compression: 'gzip' },
      { id: 'r7', priority: 7, name: 'crons', batchSize: 100, flushInterval: 5000, timeout: 10000, compression: 'gzip' },
      { id: 'r8', priority: 8, name: 'profiles', batchSize: 100, flushInterval: 5000, timeout: 10000, compression: 'gzip' },
      { id: 'r9', priority: 9, name: 'replays', batchSize: 100, flushInterval: 5000, timeout: 10000, compression: 'gzip' },
    ],
    maxConnections: 50,
    acquireTimeout: 5000,
    keepAlive: true,
    maxRetries: 3,
    baseDelay: 500,
    queueMaxSize: 10000,
    criticalReserve: 1000,
  },
  sampling: {
    errors: 100,
    traces: 100,
    metrics: 100,
    replays: 10,
    profiles: 10,
    requests: 100,
  },
  privacy: {
    enabled: true,
    maskEmails: true,
    maskCreditCards: true,
    maskPhoneNumbers: true,
    body: false,
    query: false,
    cookies: false,
    headers: false,
    response: false,
    scrubFields: ['password', 'secret', 'token', 'apiKey', 'authorization'],
    scrubHeaders: ['authorization', 'proxy-authorization', 'cookie', 'set-cookie', 'x-api-key'],
  },
  instrumentation: {
    http: true,
    https: true,
    fetch: true,
    express: true,
    fastify: true,
    axios: false,
    redis: false,
    bullmq: false,
    prisma: false,
    graphql: false,
    mongodb: false,
  },
  killswitches: {
    disableSDK: false,
    disableTransport: false,
    disableErrors: false,
    disableLogs: false,
    disableMetrics: false,
    disableTracing: false,
    disableProfiling: false,
  },
};
