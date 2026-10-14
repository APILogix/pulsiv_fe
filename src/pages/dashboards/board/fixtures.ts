// ============================================================
// Dashboard sample data.
//
// Every dashboard reads from this module and nothing else: no API calls, no
// randomness at render, the same numbers on every load. Each dashboard has one
// getter (getHomeBoard, getExecutiveBoard, …) — that getter is the seam a real
// API replaces later. Shared entities (services, endpoints, error groups,
// releases, countries) are defined once so a service reads the same on Home,
// Executive, Performance and the service map.
//
// All values are synthetic and every page says so ("Sample data").
// ============================================================

export type State = "ok" | "warn" | "bad" | "idle";

/** Deterministic series with a daily shape: quiet overnight, peak mid-afternoon. */
export function series(seed: string, n: number, base: number, amp: number, opts: { diurnal?: boolean; spikeAt?: number; spike?: number; floor?: number } = {}): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const noise = (h / 0xffffffff - 0.5) * amp * 0.5;
    const day = opts.diurnal === false ? 0 : Math.sin(((i / n) * 2 - 0.55) * Math.PI) * amp * 0.5;
    let v = base + day + noise;
    if (opts.spikeAt !== undefined) {
      const d = Math.abs(i - opts.spikeAt);
      if (d < 3) v += (opts.spike ?? amp) * (1 - d / 3);
    }
    out.push(Math.max(opts.floor ?? 0, Math.round(v * 100) / 100));
  }
  return out;
}

export const HOURS_24 = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "now"];
export const DAYS_14 = ["Sep 16", "Sep 19", "Sep 22", "Sep 25", "Sep 28", "today"];
export const DAYS_30 = ["Aug 31", "Sep 07", "Sep 14", "Sep 21", "today"];

// ── Services ───────────────────────────────────────────────────────────────

export interface Service {
  id: string;
  team: string;
  region: string;
  version: string;
  requests: number; // 24h
  rps: number; // current
  p95: number; // ms
  p95Base: number; // 30-day baseline
  errorRate: number; // %
  availability: number; // %
  apdex: number;
  state: State;
  note?: string;
  traffic: number[]; // 24 hourly buckets, requests
  latency: number[]; // 24 hourly p95
  errors: number[]; // 24 hourly error %
}

function svc(s: Omit<Service, "traffic" | "latency" | "errors">, spikeAt?: number): Service {
  return {
    ...s,
    traffic: series(`${s.id}-t`, 24, s.requests / 24, s.requests / 24 / 1.8),
    latency: series(`${s.id}-l`, 24, s.p95Base, s.p95Base * 0.25, { diurnal: false, spikeAt, spike: s.p95 - s.p95Base, floor: 1 }),
    errors: series(`${s.id}-e`, 24, s.errorRate * 0.6, s.errorRate * 0.4, { diurnal: false, spikeAt, spike: s.errorRate, floor: 0 }),
  };
}

export const SERVICES: Service[] = [
  svc({ id: "alert-dispatcher", team: "Alerting", region: "us-east-1", version: "v3.8.2", requests: 1_180_000, rps: 14, p95: 412, p95Base: 84, errorRate: 2.84, availability: 98.41, apdex: 0.71, state: "bad", note: "5xx since 14:05; queue depth 18× normal" }, 21),
  svc({ id: "ingest-gateway", team: "Ingest", region: "us-east-1", version: "v2.41.0", requests: 38_400_000, rps: 462, p95: 211, p95Base: 148, errorRate: 0.31, availability: 99.93, apdex: 0.88, state: "warn", note: "P99 spike on POST /v1/ingest at 14:08" }, 20),
  svc({ id: "billing-api", team: "Revenue", region: "us-east-1", version: "v1.19.4", requests: 2_060_000, rps: 24, p95: 188, p95Base: 170, errorRate: 0.42, availability: 99.9, apdex: 0.86, state: "warn", note: "17 failed payment captures" }),
  svc({ id: "query-engine", team: "Platform", region: "us-east-1", version: "v2.41.0", requests: 14_900_000, rps: 181, p95: 96, p95Base: 102, errorRate: 0.08, availability: 99.97, apdex: 0.95, state: "ok" }),
  svc({ id: "trace-collector", team: "Ingest", region: "eu-west-1", version: "v1.7.0", requests: 22_300_000, rps: 270, p95: 61, p95Base: 64, errorRate: 0.05, availability: 99.95, apdex: 0.97, state: "ok" }),
  svc({ id: "auth-service", team: "Identity", region: "us-east-1", version: "v4.2.1", requests: 6_700_000, rps: 79, p95: 22, p95Base: 24, errorRate: 0.02, availability: 100, apdex: 0.99, state: "ok" }),
  svc({ id: "search-indexer", team: "Platform", region: "eu-west-1", version: "v0.14.3", requests: 3_100_000, rps: 37, p95: 142, p95Base: 139, errorRate: 0.11, availability: 99.96, apdex: 0.93, state: "ok" }),
  svc({ id: "webhook-relay", team: "Integrations", region: "ap-south-1", version: "v1.3.0", requests: 910_000, rps: 11, p95: 318, p95Base: 305, errorRate: 0.19, availability: 99.92, apdex: 0.9, state: "ok" }),
];

// ── Endpoints ──────────────────────────────────────────────────────────────

export interface Endpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  service: string;
  requests: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  bytesOut: number;
  state: State;
  latency: number[];
}

function ep(e: Omit<Endpoint, "latency" | "id">, spikeAt?: number): Endpoint {
  const id = `${e.method} ${e.path}`;
  return { ...e, id, latency: series(`${id}-lat`, 24, e.p95 * 0.8, e.p95 * 0.3, { diurnal: false, spikeAt, spike: e.p99 - e.p95, floor: 1 }) };
}

export const ENDPOINTS: Endpoint[] = [
  ep({ method: "POST", path: "/v1/alerts/dispatch", service: "alert-dispatcher", requests: 412_000, p50: 120, p95: 540, p99: 1840, errorRate: 3.9, bytesOut: 2.1e9, state: "bad" }, 21),
  ep({ method: "POST", path: "/v1/ingest", service: "ingest-gateway", requests: 18_600_000, p50: 64, p95: 211, p99: 690, errorRate: 0.31, bytesOut: 9.4e10, state: "warn" }, 20),
  ep({ method: "POST", path: "/v1/billing/charges", service: "billing-api", requests: 184_000, p50: 92, p95: 240, p99: 610, errorRate: 0.84, bytesOut: 4.2e8, state: "warn" }),
  ep({ method: "GET", path: "/v1/traces/:id", service: "query-engine", requests: 2_710_000, p50: 48, p95: 176, p99: 402, errorRate: 0.44, bytesOut: 3.1e10, state: "warn" }),
  ep({ method: "GET", path: "/v1/events", service: "query-engine", requests: 8_120_000, p50: 31, p95: 96, p99: 210, errorRate: 0.12, bytesOut: 5.6e10, state: "ok" }),
  ep({ method: "GET", path: "/v1/projects/:id/metrics", service: "query-engine", requests: 3_890_000, p50: 44, p95: 148, p99: 330, errorRate: 0.09, bytesOut: 1.9e10, state: "ok" }),
  ep({ method: "POST", path: "/v1/spans", service: "trace-collector", requests: 20_100_000, p50: 18, p95: 61, p99: 140, errorRate: 0.05, bytesOut: 7.2e10, state: "ok" }),
  ep({ method: "POST", path: "/auth/sessions/refresh", service: "auth-service", requests: 1_840_000, p50: 9, p95: 22, p99: 48, errorRate: 0.02, bytesOut: 1.1e9, state: "ok" }),
  ep({ method: "GET", path: "/v1/search", service: "search-indexer", requests: 1_320_000, p50: 58, p95: 142, p99: 390, errorRate: 0.11, bytesOut: 8.8e9, state: "ok" }),
  ep({ method: "POST", path: "/v1/webhooks/deliver", service: "webhook-relay", requests: 910_000, p50: 140, p95: 318, p99: 910, errorRate: 0.19, bytesOut: 6.0e8, state: "ok" }),
];

// ── Error groups ───────────────────────────────────────────────────────────

export type Mechanism = "Unhandled" | "Handled" | "Promise rejection" | "HTTP 5xx";
export type IssueStatus = "New" | "Regressed" | "Ongoing" | "Resolving";

export interface ErrorGroup {
  id: string;
  name: string;
  message: string;
  service: string;
  release: string;
  mechanism: Mechanism;
  status: IssueStatus;
  events: number; // 24h
  users: number;
  firstSeen: string;
  lastSeen: string;
  state: State;
  hourly: number[];
  frame: string;
}

function eg(e: Omit<ErrorGroup, "hourly">, spikeAt?: number): ErrorGroup {
  return { ...e, hourly: series(`${e.id}-h`, 24, e.events / 30, e.events / 40, { diurnal: false, spikeAt, spike: e.events / 8, floor: 0 }) };
}

export const ERROR_GROUPS: ErrorGroup[] = [
  eg({ id: "ERR-4F2A", name: "QueueFullError", message: "dispatch queue at capacity (8192), dropping notification", service: "alert-dispatcher", release: "v3.8.2", mechanism: "Unhandled", status: "New", events: 9_412, users: 1_204, firstSeen: "14:05", lastSeen: "now", state: "bad", frame: "dispatcher/queue.go:212 enqueue()" }, 21),
  eg({ id: "ERR-19C7", name: "TimeoutError", message: "upstream ingest-gateway exceeded 2000ms", service: "alert-dispatcher", release: "v3.8.2", mechanism: "HTTP 5xx", status: "Regressed", events: 3_880, users: 611, firstSeen: "Sep 12", lastSeen: "1m ago", state: "bad", frame: "dispatcher/client.go:88 post()" }, 21),
  eg({ id: "ERR-7B10", name: "CardDeclinedError", message: "payment capture failed: insufficient_funds", service: "billing-api", release: "v1.19.4", mechanism: "Handled", status: "Ongoing", events: 1_731, users: 17, firstSeen: "Sep 02", lastSeen: "6m ago", state: "warn", frame: "billing/capture.ts:141 capture()" }),
  eg({ id: "ERR-2D55", name: "PayloadTooLarge", message: "batch exceeds 5 MB limit", service: "ingest-gateway", release: "v2.41.0", mechanism: "HTTP 5xx", status: "Regressed", events: 1_204, users: 88, firstSeen: "Sep 29 11:40", lastSeen: "3m ago", state: "warn", frame: "gateway/limits.rs:57 check_size()" }, 20),
  eg({ id: "ERR-A031", name: "TypeError", message: "Cannot read properties of undefined (reading 'spans')", service: "query-engine", release: "v2.41.0", mechanism: "Promise rejection", status: "New", events: 402, users: 64, firstSeen: "11:41", lastSeen: "9m ago", state: "warn", frame: "query/traces.ts:320 assemble()" }),
  eg({ id: "ERR-5E88", name: "ConnectionReset", message: "ECONNRESET on replica pg-read-2", service: "search-indexer", release: "v0.14.3", mechanism: "Unhandled", status: "Ongoing", events: 219, users: 12, firstSeen: "Sep 21", lastSeen: "22m ago", state: "ok", frame: "indexer/db.ts:44 query()" }),
  eg({ id: "ERR-0C4D", name: "SignatureMismatch", message: "webhook HMAC did not verify", service: "webhook-relay", release: "v1.3.0", mechanism: "Handled", status: "Resolving", events: 96, users: 5, firstSeen: "Sep 18", lastSeen: "1h ago", state: "ok", frame: "relay/verify.go:30 verify()" }),
  eg({ id: "ERR-9F61", name: "JwtExpiredError", message: "token expired at 2026-09-29T13:59:12Z", service: "auth-service", release: "v4.2.1", mechanism: "Handled", status: "Ongoing", events: 1_560, users: 402, firstSeen: "Aug 30", lastSeen: "now", state: "ok", frame: "auth/verify.ts:77 verifyJwt()" }),
];

// ── Releases ───────────────────────────────────────────────────────────────

export interface Release {
  id: string;
  service: string;
  deployedAt: string;
  author: string;
  commits: number;
  adoption: number; // % of traffic
  errorBefore: number;
  errorAfter: number;
  p95Before: number;
  p95After: number;
  crashFree: number;
  newIssues: number;
  state: State;
  verdict: string;
}

export const RELEASES: Release[] = [
  { id: "v3.8.2", service: "alert-dispatcher", deployedAt: "Today 13:52", author: "m.okafor", commits: 14, adoption: 100, errorBefore: 0.21, errorAfter: 2.84, p95Before: 84, p95After: 412, crashFree: 97.1, newIssues: 2, state: "bad", verdict: "Roll back" },
  { id: "v2.41.0", service: "ingest-gateway", deployedAt: "Today 11:38", author: "a.lindqvist", commits: 31, adoption: 82, errorBefore: 0.24, errorAfter: 0.31, p95Before: 148, p95After: 211, crashFree: 99.6, newIssues: 1, state: "warn", verdict: "Watch" },
  { id: "v2.41.0", service: "query-engine", deployedAt: "Today 11:38", author: "a.lindqvist", commits: 31, adoption: 100, errorBefore: 0.09, errorAfter: 0.08, p95Before: 102, p95After: 96, crashFree: 99.9, newIssues: 1, state: "ok", verdict: "Healthy" },
  { id: "v1.19.4", service: "billing-api", deployedAt: "Sep 27 16:10", author: "r.chen", commits: 6, adoption: 100, errorBefore: 0.4, errorAfter: 0.42, p95Before: 172, p95After: 188, crashFree: 99.8, newIssues: 0, state: "ok", verdict: "Healthy" },
  { id: "v4.2.1", service: "auth-service", deployedAt: "Sep 25 09:02", author: "d.sato", commits: 3, adoption: 100, errorBefore: 0.03, errorAfter: 0.02, p95Before: 25, p95After: 22, crashFree: 100, newIssues: 0, state: "ok", verdict: "Healthy" },
  { id: "v1.7.0", service: "trace-collector", deployedAt: "Sep 22 14:45", author: "j.moreau", commits: 19, adoption: 100, errorBefore: 0.07, errorAfter: 0.05, p95Before: 70, p95After: 61, crashFree: 99.9, newIssues: 0, state: "ok", verdict: "Healthy" },
];

// ── Countries ──────────────────────────────────────────────────────────────

export interface Country {
  code: string;
  name: string;
  region: string;
  pop: string; // nearest edge
  requests: number;
  users: number;
  p95: number;
  errorRate: number;
  state: State;
}

export const COUNTRIES: Country[] = [
  { code: "US", name: "United States", region: "Americas", pop: "iad", requests: 31_800_000, users: 48_200, p95: 88, errorRate: 0.21, state: "ok" },
  { code: "IN", name: "India", region: "Asia Pacific", pop: "bom", requests: 12_400_000, users: 31_900, p95: 612, errorRate: 0.94, state: "bad" },
  { code: "DE", name: "Germany", region: "Europe", pop: "fra", requests: 9_700_000, users: 14_100, p95: 104, errorRate: 0.18, state: "ok" },
  { code: "GB", name: "United Kingdom", region: "Europe", pop: "lhr", requests: 8_100_000, users: 12_800, p95: 97, errorRate: 0.16, state: "ok" },
  { code: "BR", name: "Brazil", region: "Americas", pop: "gru", requests: 5_300_000, users: 9_400, p95: 388, errorRate: 0.52, state: "warn" },
  { code: "JP", name: "Japan", region: "Asia Pacific", pop: "nrt", requests: 4_900_000, users: 7_300, p95: 174, errorRate: 0.2, state: "ok" },
  { code: "FR", name: "France", region: "Europe", pop: "cdg", requests: 4_200_000, users: 6_900, p95: 111, errorRate: 0.17, state: "ok" },
  { code: "CA", name: "Canada", region: "Americas", pop: "yyz", requests: 3_600_000, users: 5_800, p95: 96, errorRate: 0.19, state: "ok" },
  { code: "AU", name: "Australia", region: "Asia Pacific", pop: "syd", requests: 2_800_000, users: 4_100, p95: 342, errorRate: 0.31, state: "warn" },
  { code: "SG", name: "Singapore", region: "Asia Pacific", pop: "sin", requests: 2_300_000, users: 3_200, p95: 131, errorRate: 0.14, state: "ok" },
];

// ── Activity ───────────────────────────────────────────────────────────────

export interface ActivityItem {
  at: string;
  state: State;
  title: string;
  source: string;
  kind: "Incident" | "Alert" | "Deploy" | "Limit" | "Resolved";
}

export const ACTIVITY: ActivityItem[] = [
  { at: "14:22", state: "bad", kind: "Incident", title: "Elevated 5xx on alert-dispatcher", source: "INC-2291 · paged on-call" },
  { at: "14:08", state: "warn", kind: "Alert", title: "P99 latency above 600ms on POST /v1/ingest", source: "rule ingest-p99-slo" },
  { at: "13:52", state: "idle", kind: "Deploy", title: "alert-dispatcher v3.8.2 rolled out to 100%", source: "m.okafor · 14 commits" },
  { at: "11:38", state: "idle", kind: "Deploy", title: "v2.41.0 rolled out to ingest-gateway, query-engine", source: "a.lindqvist · 31 commits" },
  { at: "09:47", state: "warn", kind: "Limit", title: "Org acme-retail reached 90% of its rate limit", source: "ingest-gateway" },
  { at: "07:15", state: "ok", kind: "Resolved", title: "Replica lag on pg-read-2 back under 1s", source: "INC-2288 · auto-resolved" },
];

// ── Totals derived from the entities above ─────────────────────────────────

export function fleetTotals() {
  const requests = SERVICES.reduce((a, s) => a + s.requests, 0);
  const weightedErr = SERVICES.reduce((a, s) => a + s.errorRate * s.requests, 0) / requests;
  const weightedAvail = SERVICES.reduce((a, s) => a + s.availability * s.requests, 0) / requests;
  const traffic = Array.from({ length: 24 }, (_, i) => SERVICES.reduce((a, s) => a + s.traffic[i], 0));
  const errors = Array.from({ length: 24 }, (_, i) =>
    Math.round(SERVICES.reduce((a, s) => a + (s.traffic[i] * s.errors[i]) / 100, 0)),
  );
  return { requests, errorRate: weightedErr, availability: weightedAvail, traffic, errors };
}

export function attentionCount<T extends { state: State }>(rows: T[]) {
  return {
    bad: rows.filter((r) => r.state === "bad").length,
    warn: rows.filter((r) => r.state === "warn").length,
  };
}
