// ============================================================
// Pulse — exhaustive dummy data (single source of truth)
// Every observe/act/team/billing surface consumes these mocks
// through the TanStack Query hooks in src/hooks/useDummyData.ts.
// ============================================================
import type {
  ErrorEvent,
  ErrorGroup,
  RequestEvent,
  SpanEvent,
  TraceEvent,
  AggregatedSpanEvent,
  MetricEvent,
  MetricType,
  LogEvent,
  LogLevel,
  ProfileEvent,
  CronCheckInEvent,
  CronStatus,
  ReplayEvent,
  SeverityLevel,
  BreadcrumbType,
  SpanKind,
} from "@/types/events";

const HEX = "0123456789abcdef";
const hex = (len: number) =>
  Array.from({ length: len }, () => HEX[Math.floor(Math.random() * 16)]).join("");
const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : hex(32);

// Cycle through a base list for larger generated datasets, adding a numeric
// suffix so repeated names stay distinct (keeps infinite-scroll demos populated).
const cyc = <T,>(arr: T[], i: number): T => arr[i % arr.length];
const cycName = (arr: string[], i: number) =>
  arr[i % arr.length] + (i >= arr.length ? ` ${Math.floor(i / arr.length) + 1}` : "");

// ============================================
// ERROR EVENTS
// ============================================
export const dummyErrorEvents: ErrorEvent[] = Array.from({ length: 150 }, (_, i) => ({
  type: "error",
  eventId: `evt-err-${uuid()}`,
  requestId: i % 3 === 0 ? `req-${1000 + i}` : undefined,
  message: [
    "Connection refused to database postgres://pulse-db:5432",
    "Cannot read properties of undefined (reading 'map')",
    "Request timeout after 30000ms",
    "Unhandled promise rejection: Network Error",
    "MongoDB connection lost: topology was destroyed",
    "Redis command QUEUE_ERROR: max queue depth exceeded",
    "JWT verification failed: token expired",
    "TypeError: fn is not a function at /app/src/middleware.ts:42:12",
    "ECONNRESET: socket hang up",
    "PrismaClientKnownRequestError: P2002 Unique constraint failed",
  ][i % 10],
  name: [
    "TypeError", "ConnectionError", "TimeoutError", "UnhandledRejection",
    "MongoError", "RedisError", "AuthError", "TypeError", "NetworkError", "PrismaError",
  ][i % 10],
  stack: Array.from({ length: 8 }, (_, j) => ({
    filename:
      j === 0 ? "/app/src/controllers/user.ts"
      : j === 1 ? "/app/src/services/db.ts"
      : "/app/node_modules/express/lib/router.js",
    function: j === 0 ? "getUserProfile" : j === 1 ? "queryDatabase" : "handleRequest",
    lineno: 42 + j * 3,
    colno: 12 + j,
    inApp: j < 3,
    module: j < 3 ? "user-service" : "express",
    sourceContext:
      j < 3
        ? {
            pre: [
              "  const user = await db.user.findUnique({",
              "    where: { id: userId },",
              "    include: { profile: true }",
              "  });",
              "  if (!user) {",
            ],
            line: "    throw new Error('User not found');",
            post: ["  }", "  return res.json(user);", "};", "", "export const updateUser = async ("],
          }
        : undefined,
  })),
  fingerprint: `fp-${(i % 24).toString().padStart(2, "0")}-${hex(8)}`,
  timestamp: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
  severity: (["debug", "info", "warning", "error", "fatal"] as const)[i % 5 === 0 ? 4 : i % 5],
  context: { endpoint: `/api/v1/users/${i}`, method: "GET", tenantId: `tenant-${(i % 5) + 1}` },
  breadcrumbs:
    i % 2 === 0
      ? Array.from({ length: 5 }, (_, b) => ({
          timestamp: new Date(Date.now() - (5 - b) * 60000).toISOString(),
          category: ["http", "navigation", "console", "query", "ui"][b],
          message: `Breadcrumb step ${b + 1}: ${["Initiated request", "Navigated to route", "Console log emitted", "DB query executed", "UI rendered"][b]}`,
          level: (["info", "info", "debug", "info", "debug"] as SeverityLevel[])[b],
          type: (["default", "http", "navigation", "error", "query"] as BreadcrumbType[])[b],
          data: { step: b + 1 },
        }))
      : undefined,
  traceId: i % 4 === 0 ? `trace-${uuid()}` : undefined,
  spanId: i % 4 === 0 ? `span-${uuid()}` : undefined,
  metadata: {
    sdkName: "pulse-node",
    sdkVersion: `1.${(i % 10) + 1}.0`,
    service: ["api-gateway", "user-service", "payment-service", "notification-service", "analytics-service"][i % 5],
    environment: ["production", "staging", "development"][i % 3],
    release: `v2.${Math.floor(i / 10)}.${i % 10}`,
    serverName: `server-${(i % 8) + 1}.us-east-1.pulse.io`,
  },
  user: i % 3 === 0 ? { id: `user-${1000 + i}`, email: `user${i}@example.com`, username: `user${i}` } : undefined,
  tags: { component: "api", layer: "controller" },
  mechanism: ["uncaughtException", "unhandledRejection", "console.error", "express", "fastify"][i % 5],
}));

// Grouped by fingerprint for the Error Groups page
export const dummyErrorGroups = dummyErrorEvents.reduce((acc, evt) => {
  const fp = evt.fingerprint;
  if (!acc[fp]) {
    acc[fp] = {
      fingerprint: fp,
      name: evt.name,
      message: evt.message,
      severity: evt.severity,
      mechanism: evt.mechanism,
      count: 0,
      firstSeen: evt.timestamp,
      lastSeen: evt.timestamp,
      affectedUsers: new Set<string>(),
      services: new Set<string>(),
      releases: new Set<string>(),
      occurrences: [],
    };
  }
  acc[fp].count++;
  acc[fp].lastSeen = Math.max(acc[fp].lastSeen, evt.timestamp);
  acc[fp].firstSeen = Math.min(acc[fp].firstSeen, evt.timestamp);
  if (evt.user?.id) acc[fp].affectedUsers.add(evt.user.id);
  acc[fp].services.add(evt.metadata.service);
  acc[fp].releases.add(evt.metadata.release);
  acc[fp].occurrences.push(evt);
  return acc;
}, {} as Record<string, ErrorGroup>);

// ============================================
// REQUEST EVENTS
// ============================================
export const dummyRequestEvents: RequestEvent[] = Array.from({ length: 500 }, (_, i) => {
  const statusCodes = [200, 201, 204, 301, 304, 400, 401, 403, 404, 422, 500, 502, 503];
  const statusCode = statusCodes[i % statusCodes.length];
  const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
  const method = methods[i % methods.length];
  const routes = ["/api/v1/users", "/api/v1/orders", "/api/v1/payments", "/api/v1/auth/login", "/api/v1/webhooks", "/health", "/api/v1/metrics"];
  const route = routes[i % routes.length];
  const latency = statusCode >= 500 ? Math.floor(Math.random() * 2000) + 1000 : Math.floor(Math.random() * 300) + 20;

  return {
    type: "request",
    eventId: `evt-req-${uuid()}`,
    requestId: `req-${10000 + i}`,
    url: `${route}${method === "GET" && i % 2 === 0 ? `?page=${i % 10}` : ""}`,
    method,
    statusCode,
    latency,
    timestamp: Date.now() - Math.floor(Math.random() * 2 * 24 * 60 * 60 * 1000),
    headers: {
      "content-type": "application/json",
      "x-request-id": `req-${10000 + i}`,
      "x-tenant-id": `tenant-${(i % 5) + 1}`,
      "user-agent": "Mozilla/5.0 (compatible; PulseBot/1.0)",
    },
    query: method === "GET" ? { page: String(i % 10), limit: "20" } : undefined,
    body: method !== "GET" ? { id: i, action: "create", payload: { data: "sample" } } : undefined,
    bodySize: method !== "GET" ? 256 : undefined,
    responseSize: Math.floor(Math.random() * 5000) + 200,
    userId: i % 4 === 0 ? `user-${1000 + i}` : null,
    tenantId: `tenant-${(i % 5) + 1}`,
    sessionId: i % 3 === 0 ? `sess-${uuid()}` : undefined,
    clientIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    referer: "https://app.pulse.io/dashboard",
    route,
    traceId: `trace-${uuid()}`,
    spanId: `span-${uuid()}`,
    metadata: {
      sdkName: "pulse-node",
      sdkVersion: "1.5.0",
      service: ["api-gateway", "user-service", "payment-service"][i % 3],
      environment: ["production", "staging"][i % 2],
      release: `v2.${Math.floor(i / 50)}.${i % 50}`,
      serverName: `server-${(i % 6) + 1}.us-east-1.pulse.io`,
    },
  };
});

// ============================================
// SPAN EVENTS
// ============================================
export const dummySpanEvents: SpanEvent[] = Array.from({ length: 300 }, (_, i) => {
  const names = ["HTTP GET", "HTTP POST", "pg.query", "redis.get", "mongo.find", "prisma:engine:query", "graphql.execute", "bullmq.process", "axios.request"];
  const kinds: SpanKind[] = ["server", "client", "internal", "producer", "consumer"];
  const duration = Math.floor(Math.random() * 500) + 10;
  const startTime = Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000);

  return {
    type: "span",
    eventId: `span_${uuid()}`,
    spanId: `span-${uuid()}`,
    traceId: `trace-${["abc123", "def456", "ghi789", "jkl012", "mno345"][i % 5]}`,
    parentSpanId: i % 7 === 0 ? undefined : `span-parent-${Math.floor(i / 2)}`,
    name: names[i % names.length],
    kind: kinds[i % kinds.length],
    startTime,
    endTime: startTime + duration,
    duration,
    exclusiveDuration: Math.max(1, duration - Math.floor(Math.random() * 50)),
    status: (["ok", "error", "unset"] as const)[i % 3],
    statusMessage: i % 3 === 1 ? "Connection timeout" : undefined,
    attributes: {
      "http.method": "GET",
      "http.url": "https://api.pulse.io/v1/data",
      "http.status_code": 200,
      "db.system": i % 3 === 0 ? "postgresql" : i % 3 === 1 ? "redis" : "mongodb",
      "db.statement": "SELECT * FROM users WHERE id = $1",
      "pulse.attributes_truncated": i === 0,
      "pulse.original_attribute_count": 150,
    },
    events:
      i % 4 === 0
        ? [
            { name: "pulse.profile.start", timestamp: startTime + 5, attributes: { "profile.type": "cpu" } },
            { name: "pulse.profile.stop", timestamp: startTime + duration - 5, attributes: { "profile.duration_ms": duration - 10 } },
          ]
        : undefined,
    links: i % 10 === 0 ? [{ traceId: `trace-${uuid()}`, spanId: `span-${uuid()}` }] : undefined,
    metadata: {
      sdkName: "pulse-node",
      sdkVersion: "1.5.0",
      service: ["api-gateway", "user-service"][i % 2],
      environment: "production",
      release: "v2.1.0",
      serverName: "server-1.us-east-1.pulse.io",
    },
    requestId: `req-${10000 + i}`,
    sessionId: i % 3 === 0 ? `sess-${uuid()}` : undefined,
    userId: i % 4 === 0 ? `user-${1000 + i}` : undefined,
    tenantId: `tenant-${(i % 5) + 1}`,
    __pulseInternal: true,
  };
});

// ============================================
// TRACE EVENTS
// ============================================
export const dummyTraceEvents: TraceEvent[] = Array.from({ length: 80 }, (_, i) => {
  const traceId = `trace-${["abc123", "def456", "ghi789", "jkl012", "mno345", "pqr678", "stu901", "vwx234"][i % 8]}-${i}`;
  const spanCount = Math.floor(Math.random() * 20) + 3;
  const totalDuration = Math.floor(Math.random() * 2000) + 100;

  const buildSpanTree = (depth: number, parentId?: string): AggregatedSpanEvent => {
    const spanId = `span-${uuid()}`;
    const duration = Math.floor(Math.random() * 200) + 10;
    const startOffset = Math.floor(Math.random() * 100);
    return {
      spanId,
      parentSpanId: parentId,
      name: ["HTTP GET /api/v1/users", "pg.query", "redis.get", "auth.verify", "cache.lookup"][depth % 5],
      kind: ["server", "client", "internal"][depth % 3],
      startTime: startOffset,
      endTime: startOffset + duration,
      duration,
      exclusiveDuration: Math.max(1, duration - 20),
      status: (["ok", "error", "unset"] as const)[depth % 3],
      statusMessage: depth % 3 === 1 ? "Timeout" : undefined,
      attributes: { "http.method": "GET", "db.system": "postgresql" },
      events: [],
      links: [],
      children: depth < 3 ? Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => buildSpanTree(depth + 1, spanId)) : [],
    };
  };

  return {
    type: "trace",
    eventId: `trace_${traceId}`,
    traceId,
    rootSpan: buildSpanTree(0),
    spanCount,
    totalDuration,
    isPartial: i % 15 === 0,
    metadata: {
      sdkName: "pulse-node",
      sdkVersion: "1.5.0",
      service: ["api-gateway", "user-service"][i % 2],
      environment: "production",
      release: "v2.1.0",
      serverName: "server-1.us-east-1.pulse.io",
    },
    requestId: `req-${10000 + i}`,
    sessionId: `sess-${uuid()}`,
    userId: `user-${1000 + i}`,
    tenantId: `tenant-${(i % 5) + 1}`,
    __pulseInternal: true,
  };
});

// ============================================
// METRIC EVENTS
// ============================================
export const dummyMetricEvents: MetricEvent[] = Array.from({ length: 200 }, (_, i) => {
  const metricNames = ["http.requests.total", "http.request.duration", "db.connections.active", "cache.hit_ratio", "queue.depth", "cpu.usage", "memory.used"];
  const metricTypes: MetricType[] = ["counter", "gauge", "histogram"];
  const name = metricNames[i % metricNames.length];
  const type = metricTypes[i % metricTypes.length];

  return {
    type: "metric",
    eventId: `evt-metric-${uuid()}`,
    metricName: name,
    metricType: type,
    value: type === "histogram" ? Math.floor(Math.random() * 500) + 20 : Math.random() * 100,
    unit: type === "histogram" ? "ms" : "percent",
    tags: {
      service: ["api-gateway", "user-service", "payment-service"][i % 3],
      environment: ["production", "staging"][i % 2],
      host: `server-${(i % 4) + 1}`,
    },
    timestamp: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000),
    metadata: {
      sdkName: "pulse-node",
      sdkVersion: "1.5.0",
      service: ["api-gateway", "user-service"][i % 2],
      environment: "production",
      release: "v2.1.0",
      serverName: "server-1.us-east-1.pulse.io",
    },
    count: type === "histogram" ? Math.floor(Math.random() * 1000) + 100 : undefined,
    sum: type === "histogram" ? Math.floor(Math.random() * 50000) : undefined,
    min: type === "histogram" ? 5 : undefined,
    max: type === "histogram" ? 800 : undefined,
    avg: type === "histogram" ? Math.floor(Math.random() * 200) + 50 : undefined,
    rate: 0,
    buckets:
      type === "histogram"
        ? {
            scale: 1,
            offset: 0,
            positiveCounts: Array.from({ length: 10 }, () => Math.floor(Math.random() * 100)),
            zeroCount: Math.floor(Math.random() * 50),
          }
        : undefined,
  };
});

// ============================================
// LOG EVENTS
// ============================================
export const dummyLogEvents: LogEvent[] = Array.from({ length: 1000 }, (_, i) => {
  const levels: LogLevel[] = ["debug", "info", "warn", "error"];
  const level = levels[i % 4];
  const messages = [
    "Processing incoming webhook payload",
    "Database connection pool initialized",
    "Cache miss for key: user:profile:1234",
    "Retrying failed request (attempt 2/3)",
    "User authentication successful",
    "Payment intent created: pi_1234567890",
    "Warning: Deprecated API usage detected",
    "Error: Failed to send email notification",
    "Debug: Request headers received",
    "Job queued: process-report-123",
  ];

  return {
    type: "log",
    eventId: `evt-log-${uuid()}`,
    level: level === "debug" && i % 5 === 0 ? "info" : level,
    message: messages[i % messages.length],
    timestamp: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000),
    args:
      i % 3 === 0
        ? [{ userId: `user-${1000 + i}`, action: "login" }, { duration: Math.floor(Math.random() * 1000) }, "additional context string"]
        : undefined,
    requestId: i % 2 === 0 ? `req-${10000 + i}` : undefined,
    traceId: i % 4 === 0 ? `trace-${uuid()}` : undefined,
    spanId: i % 4 === 0 ? `span-${uuid()}` : undefined,
    metadata: {
      sdkName: "pulse-node",
      sdkVersion: "1.5.0",
      service: ["api-gateway", "user-service", "payment-service"][i % 3],
      environment: ["production", "staging"][i % 2],
      release: "v2.1.0",
      serverName: "server-1.us-east-1.pulse.io",
    },
  };
});

// ============================================
// PROFILE EVENTS
// ============================================
export const dummyProfileEvents: ProfileEvent[] = Array.from({ length: 30 }, (_, i) => ({
  type: "profile",
  eventId: `evt-profile-${uuid()}`,
  profileType: "cpu",
  requestId: `req-${10000 + i}`,
  traceId: `trace-${uuid()}`,
  spanId: `span-${uuid()}`,
  startTime: Date.now() - 3600000,
  endTime: Date.now() - 3540000,
  duration: 60000,
  profile: {
    nodes: Array.from({ length: 50 }, (_, n) => ({
      id: n,
      callFrame: {
        functionName: ["getUser", "queryDB", "validateToken", "processPayment", "sendEmail"][n % 5],
        scriptId: "123",
        url: `/app/src/${["users.ts", "db.ts", "auth.ts", "payments.ts", "email.ts"][n % 5]}`,
        lineNumber: 10 + n,
        columnNumber: 5,
      },
      hitCount: Math.floor(Math.random() * 100),
      children: n < 49 ? [n + 1] : [],
    })),
    startTime: Date.now() - 3600000,
    endTime: Date.now() - 3540000,
    samples: Array.from({ length: 100 }, () => ({ timestamp: Date.now() - Math.random() * 60000, nodeId: Math.floor(Math.random() * 50) })),
    timeDeltas: Array.from({ length: 100 }, () => Math.floor(Math.random() * 1000)),
  },
  timestamp: Date.now() - 3540000,
  metadata: {
    sdkName: "pulse-node",
    sdkVersion: "1.5.0",
    service: ["api-gateway", "user-service"][i % 2],
    environment: "production",
    release: "v2.1.0",
    serverName: "server-1.us-east-1.pulse.io",
  },
}));

// ============================================
// CRON CHECK-IN EVENTS
// ============================================
export const dummyCronEvents: CronCheckInEvent[] = Array.from({ length: 60 }, (_, i) => {
  const statuses: CronStatus[] = ["ok", "error", "in_progress"];
  const slugs = ["nightly-backup", "hourly-cleanup", "daily-report", "weekly-rollup", "health-check"];
  const status = statuses[i % 3];

  return {
    type: "cron_checkin",
    eventId: `evt-cron-${uuid()}`,
    monitorSlug: slugs[i % slugs.length],
    status,
    timestamp: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
    duration: status === "in_progress" ? undefined : Math.floor(Math.random() * 300000) + 10000,
    environment: ["production", "staging"][i % 2],
    metadata: {
      sdkName: "pulse-node",
      sdkVersion: "1.5.0",
      service: "cron-service",
      environment: ["production", "staging"][i % 2],
      release: "v2.1.0",
      serverName: "server-cron-1.pulse.io",
    },
  };
});

// ============================================
// REPLAY EVENTS (reserved)
// ============================================
export const dummyReplayEvents: ReplayEvent[] = Array.from({ length: 10 }, (_, i) => ({
  type: "replay",
  eventId: `evt-replay-${uuid()}`,
  sessionId: `sess-${uuid()}`,
  segmentId: i,
  timestamp: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
  events: Array.from({ length: 50 }, (_, e) => ({
    type: ["domMutation", "mouseMove", "click", "scroll", "input"][e % 5],
    timestamp: Date.now() - (50 - e) * 1000,
    data: { x: Math.random() * 1920, y: Math.random() * 1080 },
  })),
  metadata: {
    sdkName: "pulse-browser",
    sdkVersion: "2.0.0",
    service: "web-app",
    environment: "production",
    release: "v2.1.0",
    serverName: "browser-client",
  },
}));

// ============================================
// PROJECTS
// ============================================
export const dummyProjects = Array.from({ length: 32 }, (_, i) => ({
  id: `proj-${(i + 1).toString().padStart(3, "0")}-${hex(6)}`,
  name: cycName(["Pulse API", "Pulse Web", "Pulse Mobile", "Analytics Platform", "Notification Service", "Payment Gateway", "User Portal", "Admin Dashboard", "Data Pipeline", "ML Inference", "Edge Worker", "Legacy Migrator"], i),
  slug: `${cyc(["pulse-api", "pulse-web", "pulse-mobile", "analytics", "notifications", "payments", "user-portal", "admin", "pipeline", "ml-inference", "edge", "legacy"], i)}-${i + 1}`,
  description: `Primary observability project for the ${cyc(["API gateway", "Web frontend", "Mobile application", "Analytics engine", "Notification delivery", "Payment processing", "User interface", "Administration tools", "Data processing", "Machine learning", "Edge computing", "Legacy system"], i)} service.`,
  status: i % 7 === 6 ? "archived" : "active",
  healthScore: Math.floor(Math.random() * 40) + 60,
  eventVolume24h: Math.floor(Math.random() * 500000) + 50000,
  errorRate: (Math.random() * 2).toFixed(2),
  memberCount: Math.floor(Math.random() * 20) + 3,
  environments: ["production", "staging", "development"],
  lastActivityAt: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000),
  createdAt: Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000),
}));
export type Project = (typeof dummyProjects)[number];

// ============================================
// MEMBERS
// ============================================
export const dummyMembers = Array.from({ length: 25 }, (_, i) => ({
  id: `user-${1000 + i}`,
  name: [
    "Alice Chen", "Bob Smith", "Carol Davis", "David Wilson", "Eva Brown", "Frank Miller", "Grace Lee", "Henry Taylor", "Iris Anderson", "Jack Thomas",
    "Karen White", "Lewis Harris", "Maria Martin", "Nathan Thompson", "Olivia Garcia", "Paul Martinez", "Quinn Robinson", "Rachel Clark", "Sam Rodriguez", "Tina Lewis",
    "Uma Walker", "Victor Hall", "Wendy Allen", "Xavier Young", "Yara King",
  ][i],
  email: `user${i}@pulse.io`,
  role: ["Owner", "Admin", "Member", "Billing", "Viewer"][i % 5],
  status: i === 23 ? "suspended" : i === 24 ? "invited" : "active",
  mfaEnabled: i % 3 === 0,
  lastActiveAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
  joinedAt: Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000),
  avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
  projects: dummyProjects.slice(0, (i % 4) + 1).map((p) => p.id),
  ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
  sessions: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, s) => ({
    id: `sess-${uuid()}`,
    device: ["MacBook Pro", "Windows PC", "iPhone 15", "Android Pixel"][s % 4],
    browser: ["Chrome 120", "Safari 17", "Firefox 121", "Edge 118"][s % 4],
    ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    location: ["New York, US", "London, UK", "Singapore, SG", "Berlin, DE"][s % 4],
    createdAt: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
    lastActiveAt: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000),
    isCurrent: s === 0,
  })),
}));
export type Member = (typeof dummyMembers)[number];

// ============================================
// INCIDENTS
// ============================================
export const dummyIncidents = Array.from({ length: 40 }, (_, i) => {
  const severities = ["P1", "P2", "P3", "P4"];
  const severity = severities[i % 4];
  const status = i < 5 ? "open" : i < 12 ? "investigating" : "resolved";
  const startedAt = Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000);

  return {
    id: `inc-${(i + 1).toString().padStart(4, "0")}`,
    title: [
      "Database connection pool exhausted",
      "Elevated 500 errors on payment API",
      "Latency spike in user service",
      "Cron job nightly-backup failing",
      "Memory leak detected in analytics worker",
      "Redis cluster node unreachable",
      "SSL certificate expiry warning",
      "Queue depth exceeding threshold",
    ][i % 8],
    severity,
    status,
    service: ["api-gateway", "user-service", "payment-service", "notification-service"][i % 4],
    alertRuleId: `rule-${100 + i}`,
    alertRuleName: ["DB Pool Monitor", "Error Rate Threshold", "Latency SLO", "Cron Health Check"][i % 4],
    startedAt,
    resolvedAt: status === "resolved" ? startedAt + Math.floor(Math.random() * 4 * 60 * 60 * 1000) : undefined,
    duration: status === "resolved" ? Math.floor(Math.random() * 4 * 60 * 60 * 1000) : Date.now() - startedAt,
    assignedTo: dummyMembers[i % 25].id,
    assignedToName: dummyMembers[i % 25].name,
    relatedEvents: dummyErrorEvents.slice(i * 3, i * 3 + 3).map((e) => e.eventId),
    activityLog: [
      { timestamp: startedAt, actor: "system", action: "triggered", message: "Alert threshold exceeded" },
      { timestamp: startedAt + 100000, actor: dummyMembers[i % 25].name, action: "acknowledged", message: "Investigating root cause" },
      ...(status === "resolved" ? [{ timestamp: startedAt + 1800000, actor: dummyMembers[i % 25].name, action: "resolved", message: "Issue mitigated after restart" }] : []),
    ],
  };
});
export type Incident = (typeof dummyIncidents)[number];

// ============================================
// ALERT RULES
// ============================================
export const dummyAlertRules = Array.from({ length: 44 }, (_, i) => ({
  id: `rule-${100 + i}`,
  name: cycName(["DB Pool > 90%", "Error Rate > 1%", "P95 Latency > 500ms", "Cron Failure", "Memory > 85%", "CPU > 80%", "Queue Depth > 1000", "Disk Usage > 90%"], i),
  enabled: i !== 3,
  type: i % 3 === 0 ? "threshold" : "anomaly",
  source: ["ErrorEvent", "RequestEvent", "MetricEvent", "CronCheckInEvent", "LogEvent"][i % 5],
  metricName: i % 3 === 0 ? "custom.metric" : undefined,
  condition: i % 3 === 0 ? ">" : "anomaly",
  threshold: i % 3 === 0 ? [90, 1, 500, 1, 85, 80, 1000, 90][i % 8] : undefined,
  window: ["1m", "5m", "15m", "1h"][i % 4],
  severity: ["P1", "P2", "P3", "P4"][i % 4],
  groupBy: ["service", "route", "environment", "release"][i % 4],
  channels: ["email-alerts", "slack-ops", "pagerduty-oncall"].slice(0, (i % 3) + 1),
  lastTriggeredAt: i < 15 ? Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined,
  createdAt: Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000),
}));
export type AlertRule = (typeof dummyAlertRules)[number];

// ============================================
// ESCALATION POLICIES
// ============================================
export const dummyEscalations = Array.from({ length: 24 }, (_, i) => ({
  id: `esc-${100 + i}`,
  name: cycName(["On-Call Primary", "SRE Emergency", "Database Team", "Payment Critical", "Infrastructure", "Security Response", "AI Platform", "Executive Alert"], i),
  description: `Escalation policy for ${cyc(["primary on-call rotation", "SRE emergency response", "database incidents", "payment system outages", "infrastructure alerts", "security breaches", "AI platform issues", "executive notifications"], i)}.`,
  status: "active",
  steps: Array.from({ length: 3 }, (_, s) => ({
    step: s + 1,
    notify: dummyMembers.slice(s * 2, s * 2 + 2).map((m) => ({ id: m.id, name: m.name, email: m.email })),
    waitMinutes: [15, 30, 60][s],
    channels: ["slack", "pagerduty", "email"][s],
  })),
  onCallNow: dummyMembers[i % 25],
  repeatUntilAcknowledged: true,
}));
export type Escalation = (typeof dummyEscalations)[number];

// ============================================
// CHANNELS
// ============================================
export const dummyChannels = Array.from({ length: 30 }, (_, i) => ({
  id: `ch-${100 + i}`,
  name: cycName(["Email Alerts", "Slack #ops", "Slack #incidents", "PagerDuty On-Call", "Discord Webhook", "Teams Channel", "SMS Gateway", "Webhook Primary", "Jira Integration", "GitHub Issues", "SMS Backup", "Custom Endpoint"], i),
  type: cyc(["email", "slack", "slack", "pagerduty", "discord", "teams", "sms", "webhook", "jira", "github", "sms", "webhook"], i),
  destination: cyc([
    "ops@pulse.io", "#operations", "#incident-response", "pd-service-key-123", "https://discord.com/api/webhooks/123",
    "https://teams.webhook.office.com/abc", "+1-555-0100", "https://hooks.pulse.io/primary", "https://jira.pulse.io/rest/api/2/issue",
    "https://api.github.com/repos/pulse/issues", "+1-555-0199", "https://custom.pulse.io/notify",
  ], i),
  status: i % 7 === 5 ? "failed" : "active",
  verified: i % 7 !== 5,
  lastTestedAt: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
  events: ["incident.created", "alert.fired", "incident.resolved"].slice(0, (i % 3) + 1),
}));
export type Channel = (typeof dummyChannels)[number];

// ============================================
// API KEYS
// ============================================
export const dummyApiKeys = Array.from({ length: 44 }, (_, i) => ({
  id: `key-${(i + 1).toString().padStart(3, "0")}-${hex(6)}`,
  name: cycName(["Production Ingest", "Staging Test", "CI/CD Deploy", "Local Dev", "Mobile App", "Partner Integration", "Analytics Export", "Backup Reader", "Monitoring Agent", "Webhook Validator"], i),
  prefix: `pulse_${["abc", "def", "ghi", "jkl", "mno"][i % 5]}123`,
  type: ["ingestion", "read-only", "admin"][i % 3],
  projectId: dummyProjects[i % dummyProjects.length].id,
  createdAt: Date.now() - Math.floor(Math.random() * 180 * 24 * 60 * 60 * 1000),
  lastUsedAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
  lastUsedIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
  status: i % 12 === 11 ? "revoked" : "active",
  permissions: ["events:write", "events:read", "alerts:write", "projects:read"].slice(0, (i % 4) + 1),
  usage24h: Math.floor(Math.random() * 100000),
}));
export type ApiKey = (typeof dummyApiKeys)[number];

// ============================================
// INVOICES
// ============================================
export const dummyInvoices = Array.from({ length: 24 }, (_, i) => ({
  id: `inv-${1000 + i}`,
  number: `INV-2026-${String(i + 1).padStart(3, "0")}`,
  date: new Date(2026, i % 12, 15).getTime(),
  amount: (Math.random() * 5000 + 500).toFixed(2),
  status: i === 0 ? "open" : i === 1 ? "overdue" : "paid",
  dueDate: new Date(2026, i % 12, 30).getTime(),
  paidDate: i > 1 ? new Date(2026, i % 12, 20).getTime() : undefined,
  lineItems: [
    { description: "Pulse Platform — Team Plan", quantity: 1, unitPrice: "299.00", amount: "299.00" },
    { description: "Event Ingestion (1.2M events)", quantity: 1200000, unitPrice: "0.001", amount: "1200.00" },
    { description: "AI Insights Add-on", quantity: 1, unitPrice: "199.00", amount: "199.00" },
    { description: "Data Retention Extension (90d)", quantity: 1, unitPrice: "150.00", amount: "150.00" },
  ],
  subtotal: (299 + 1200 + 199 + 150).toFixed(2),
  tax: "184.80",
  total: "1832.80",
  paymentMethod: i > 1 ? "Visa ending in 4242" : undefined,
}));
export type Invoice = (typeof dummyInvoices)[number];

// ============================================
// AUDIT LOGS
// ============================================
export const dummyAuditLogs = Array.from({ length: 200 }, (_, i) => ({
  id: `audit-${(i + 1).toString().padStart(4, "0")}-${hex(6)}`,
  timestamp: Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000),
  actor: dummyMembers[i % 25].name,
  actorId: dummyMembers[i % 25].id,
  action: ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "EXPORT", "INVITE", "REVOKE"][i % 8],
  resourceType: ["project", "api_key", "alert_rule", "member", "incident", "webhook", "integration", "setting"][i % 8],
  resourceName: ["Pulse API", "Production Key", "DB Pool Alert", "Alice Chen", "INC-1234", "Primary Webhook", "Slack Integration", "Retention Policy"][i % 8],
  resourceId: `res-${1000 + i}`,
  changes: i % 2 === 0 ? { before: { status: "active" }, after: { status: "archived" } } : undefined,
  ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
}));
export type AuditLog = (typeof dummyAuditLogs)[number];

// ============================================
// WEBHOOKS
// ============================================
export const dummyWebhooks = Array.from({ length: 26 }, (_, i) => ({
  id: `wh-${100 + i}`,
  name: cycName(["Primary Notification", "GitHub Sync", "Jira Bridge", "Datadog Forward", "Custom Analytics", "Backup Alert", "Security Notify", "Billing Event"], i),
  url: `https://hooks.pulse.io/webhook-${i}`,
  secret: `whsec_${hex(16)}`,
  events: ["incident.created", "incident.resolved", "alert.fired"].slice(0, (i % 3) + 1),
  status: i % 7 === 6 ? "failed" : "active",
  lastDelivery: {
    timestamp: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000),
    statusCode: i % 7 === 6 ? 500 : 200,
    responsePreview: i % 7 === 6 ? '{"error": "timeout"}' : '{"ok": true}',
  },
  deliveryHistory: Array.from({ length: 10 }, (_, d) => ({
    id: `del-${i}-${d}`,
    timestamp: Date.now() - d * 3600000,
    eventType: "incident.created",
    statusCode: d === 0 && i % 7 === 6 ? 500 : 200,
    duration: Math.floor(Math.random() * 500) + 50,
    retryCount: d === 0 && i % 7 === 6 ? 2 : 0,
  })),
}));
export type Webhook = (typeof dummyWebhooks)[number];

// ============================================
// INTEGRATIONS
// ============================================
export const dummyIntegrations = Array.from({ length: 26 }, (_, i) => ({
  id: `int-${100 + i}`,
  name: cycName(["Slack", "Jira", "GitHub", "PagerDuty", "Datadog", "Grafana", "AWS CloudWatch", "Azure Monitor", "Google Cloud", "Custom API"], i),
  type: cyc(["slack", "jira", "github", "pagerduty", "datadog", "grafana", "aws", "azure", "gcp", "custom"], i),
  status: i % 9 === 8 ? "disconnected" : "connected",
  config: {
    workspace: i % 10 === 0 ? "pulse.slack.com" : undefined,
    project: i % 10 === 1 ? "PULSE" : undefined,
    repo: i % 10 === 2 ? "pulse/platform" : undefined,
    serviceKey: i % 10 === 3 ? "pd-key-123" : undefined,
  },
  lastSyncAt: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000),
  syncLog: Array.from({ length: 5 }, (_, s) => ({
    timestamp: Date.now() - s * 3600000,
    status: s === 0 && i % 9 === 8 ? "failed" : "success",
    message: s === 0 && i % 9 === 8 ? "Authentication token expired" : "Sync completed successfully",
  })),
}));
export type Integration = (typeof dummyIntegrations)[number];

// ============================================
// ENVIRONMENTS
// ============================================
export const dummyEnvironments = Array.from({ length: 6 }, (_, i) => ({
  id: `env-${100 + i}`,
  name: ["Production", "Staging", "Development", "QA", "Demo", "Sandbox"][i],
  slug: ["production", "staging", "development", "qa", "demo", "sandbox"][i],
  color: ["#10b981", "#f59e0b", "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6"][i],
  projectCount: Math.floor(Math.random() * 8) + 2,
  eventVolume24h: Math.floor(Math.random() * 200000) + 10000,
  retentionDays: [90, 30, 7, 14, 7, 7][i],
  settings: {
    captureHeaders: i === 0,
    captureBody: i < 2,
    captureCookies: i === 0,
    maxSpanAttributes: 100,
  },
}));
export type Environment = (typeof dummyEnvironments)[number];

// ============================================
// SECURITY EVENTS
// ============================================
export const dummySecurityEvents = Array.from({ length: 50 }, (_, i) => ({
  id: `se-${100 + i}`,
  timestamp: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
  type: ["failed_login", "mfa_challenge", "api_key_created", "suspicious_ip", "rate_limit_hit", "permission_escalation", "session_hijack_attempt"][i % 7],
  severity: ["low", "medium", "high", "critical"][i % 4],
  user: dummyMembers[i % 25].name,
  userId: dummyMembers[i % 25].id,
  ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
  location: ["New York, US", "London, UK", "Moscow, RU", "Beijing, CN", "Sydney, AU"][i % 5],
  details: { reason: ["Invalid password", "Token expired", "Unknown device", "Brute force detected"][i % 4] },
}));
export type SecurityEvent = (typeof dummySecurityEvents)[number];

// ============================================
// INVITATIONS
// ============================================
export const dummyInvitations = Array.from({ length: 30 }, (_, i) => ({
  id: `invite-${100 + i}`,
  email: `pending${i}@example.com`,
  role: ["Admin", "Member", "Billing", "Viewer"][i % 4],
  status: i % 5 === 3 ? "accepted" : i % 5 === 4 ? "expired" : "pending",
  invitedBy: dummyMembers[i % dummyMembers.length].name,
  invitedAt: Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000),
  expiresAt: Date.now() + Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
}));
export type Invitation = (typeof dummyInvitations)[number];

// ============================================
// QUOTA REQUESTS
// ============================================
export const dummyQuotaRequests = Array.from({ length: 30 }, (_, i) => ({
  id: `qr-${100 + i}`,
  resource: cycName(["Event ingestion", "Data retention", "Team seats", "API rate limit", "Trace storage"], i),
  currentLimit: [1_000_000, 30, 25, 1000, 500_000][i % 5],
  requestedLimit: [5_000_000, 90, 50, 5000, 2_000_000][i % 5],
  status: i % 6 === 0 ? "denied" : i % 3 === 0 ? "pending" : "approved",
  requestedBy: dummyMembers[i % dummyMembers.length].name,
  requestedAt: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
  justification: "Increased traffic from new product launch requires higher limits.",
}));
export type QuotaRequest = (typeof dummyQuotaRequests)[number];

// ============================================
// PAYMENT METHODS
// ============================================
export const dummyPaymentMethods = Array.from({ length: 4 }, (_, i) => ({
  id: `pm-${100 + i}`,
  brand: ["Visa", "Mastercard", "Amex", "Discover"][i],
  last4: ["4242", "5555", "0005", "1117"][i],
  expMonth: [12, 6, 9, 3][i],
  expYear: [2027, 2028, 2026, 2029][i],
  isDefault: i === 0,
  billingName: dummyMembers[i].name,
}));
export type PaymentMethod = (typeof dummyPaymentMethods)[number];

// ============================================
// PROMOTIONS
// ============================================
export const dummyPromotions = Array.from({ length: 26 }, (_, i) => ({
  id: `promo-${100 + i}`,
  code: `${cyc(["LAUNCH50", "ANNUAL20", "STARTUP", "BLACKFRIDAY", "REFER10", "LOYALTY15"], i)}${i >= 6 ? i : ""}`,
  description: cyc(["50% off first 3 months", "20% off annual plans", "Startup program credit", "Black Friday special", "Referral bonus", "Loyalty discount"], i),
  discount: cyc(["50%", "20%", "$500", "40%", "10%", "15%"], i),
  status: i % 3 === 0 ? "active" : i % 3 === 1 ? "expired" : "scheduled",
  appliedAt: i % 3 === 0 ? Date.now() - Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000) : undefined,
  expiresAt: Date.now() + Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000),
}));
export type Promotion = (typeof dummyPromotions)[number];

// ============================================
// ENDPOINTS (ingestion / connections)
// ============================================
export const dummyEndpoints = Array.from({ length: 8 }, (_, i) => ({
  id: `ep-${100 + i}`,
  name: ["Error ingest", "Request ingest", "Span ingest", "Metric ingest", "Log ingest", "Profile ingest", "Cron check-in", "Replay ingest"][i],
  path: ["/v1/errors", "/v1/requests", "/v1/spans", "/v1/metrics", "/v1/logs", "/v1/profiles", "/v1/cron", "/v1/replays"][i],
  method: "POST",
  status: i === 5 ? "degraded" : "healthy",
  p95Latency: Math.floor(Math.random() * 120) + 20,
  requests24h: Math.floor(Math.random() * 800000) + 50000,
  errorRate: (Math.random() * 1.5).toFixed(2),
  curl: `curl -X POST https://ingest.pulse.io${["/v1/errors", "/v1/requests", "/v1/spans", "/v1/metrics", "/v1/logs", "/v1/profiles", "/v1/cron", "/v1/replays"][i]} \\\n  -H "Authorization: Bearer pulse_xxx" \\\n  -H "Content-Type: application/json" \\\n  -d '{"events": []}'`,
}));
export type Endpoint = (typeof dummyEndpoints)[number];

// ============================================
// COMPLIANCE FRAMEWORKS
// ============================================
export const dummyCompliance = Array.from({ length: 5 }, (_, i) => ({
  id: `comp-${100 + i}`,
  framework: ["SOC 2 Type II", "GDPR", "HIPAA", "ISO 27001", "PCI DSS"][i],
  status: i < 3 ? "compliant" : i === 3 ? "in-progress" : "not-started",
  controlsTotal: [61, 28, 45, 114, 12][i],
  controlsPassing: [61, 28, 45, 92, 0][i],
  lastAuditAt: Date.now() - Math.floor(Math.random() * 180 * 24 * 60 * 60 * 1000),
  nextAuditAt: Date.now() + Math.floor(Math.random() * 180 * 24 * 60 * 60 * 1000),
}));
export type Compliance = (typeof dummyCompliance)[number];

// ============================================
// ANOMALIES (insights)
// ============================================
export const dummyAnomalies = Array.from({ length: 40 }, (_, i) => ({
  id: `anom-${100 + i}`,
  title: cyc(["Error rate spike", "Latency regression", "Traffic drop", "Memory anomaly", "Unusual 4xx pattern"], i),
  service: ["api-gateway", "user-service", "payment-service"][i % 3],
  severity: ["low", "medium", "high"][i % 3],
  confidence: Math.floor(Math.random() * 30) + 70,
  detectedAt: Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000),
  metric: ["error.rate", "request.p95", "request.count", "memory.used", "http.4xx"][i % 5],
  deviation: `${(Math.random() * 300 + 50).toFixed(0)}%`,
  status: i % 3 === 0 ? "resolved" : "active",
}));
export type Anomaly = (typeof dummyAnomalies)[number];

// ============================================
// RELEASES (insights)
// ============================================
export const dummyReleases = Array.from({ length: 12 }, (_, i) => ({
  id: `rel-${100 + i}`,
  version: `v2.${Math.floor(i / 3)}.${i % 3}`,
  service: ["api-gateway", "user-service", "payment-service"][i % 3],
  deployedAt: Date.now() - i * 2 * 24 * 60 * 60 * 1000,
  author: dummyMembers[i % 25].name,
  commits: Math.floor(Math.random() * 40) + 3,
  errorRateBefore: (Math.random() * 1).toFixed(2),
  errorRateAfter: (Math.random() * 2).toFixed(2),
  latencyBefore: Math.floor(Math.random() * 100) + 50,
  latencyAfter: Math.floor(Math.random() * 120) + 50,
  status: i % 4 === 0 ? "regression" : "stable",
}));
export type Release = (typeof dummyReleases)[number];
