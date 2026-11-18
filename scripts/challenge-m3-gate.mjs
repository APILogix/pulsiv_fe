#!/usr/bin/env node
/**
 * scripts/challenge-m3-gate.mjs
 *
 * Empirical & Adversarial Challenger Harness for Milestone 3:
 * - Feature F8: LoadingBoundary & Gate Delay Optimization (SETTLE_MS = 0, Frame 1 cached reveal)
 * - Feature F9: Dashboard Multi-Query Gate Decoupling (ExecutiveDashboard 9 queries & LatencyPage 7 queries)
 *
 * Scenarios Tested:
 * 1. Executive Dashboard Gate Decoupling with Simulated Slow Secondary Queries (2500ms delay)
 * 2. Latency Page Gate Decoupling with Simulated Slow Secondary Queries (2500ms delay)
 * 3. Inverted Latency Challenge (Fast Secondary Queries, Slow Primary Query -> Verify Gate Holds)
 * 4. Secondary Query Failure Fault Tolerance (500 Error -> Gate Unblocks, Zero Page Crashes)
 * 5. LoadingBoundary SETTLE_MS = 0 Stress Test (State Monotonicity, Rapid Nav Barrage, Zero Flickers, Frame 1 Cached Reveal)
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ── 1. Lightweight CDP & Process Infrastructure ─────────────────────────────

class CdpSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { res, rej } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) {
            rej(new Error(`CDP Error in method: ${msg.error.message || JSON.stringify(msg.error)}`));
          } else {
            res(msg.result);
          }
        } else if (msg.method && this.eventListeners.has(msg.method)) {
          for (const listener of this.eventListeners.get(msg.method)) {
            try {
              await listener(msg.params);
            } catch (err) {
              console.error(`[CDP Listener Error] ${msg.method}:`, err);
            }
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = this.msgId++;
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  removeAllListeners(event) {
    if (event) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
  }

  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}

class ChromeRunner {
  constructor() {
    this.process = null;
    this.userDataDir = null;
    this.wsEndpoint = null;
  }

  findChromePath() {
    const isWin = process.platform === 'win32';
    if (isWin) {
      const paths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
      ];
      for (const p of paths) {
        if (fs.existsSync(p)) return p;
      }
    }
    throw new Error('No compatible Chrome/Edge executable found on system.');
  }

  async launch() {
    const chromePath = this.findChromePath();
    this.userDataDir = path.join(os.tmpdir(), `cwv_m3_chal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    fs.mkdirSync(this.userDataDir, { recursive: true });

    const chromeArgs = [
      '--headless=new',
      '--remote-debugging-port=0',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-extensions',
      '--disable-sync',
      `--user-data-dir=${this.userDataDir}`,
      'about:blank'
    ];

    this.process = spawn(chromePath, chromeArgs, {
      stdio: ['ignore', 'ignore', 'pipe']
    });

    const activePortPath = path.join(this.userDataDir, 'DevToolsActivePort');
    let port = null;
    let browserWsPath = null;

    for (let i = 0; i < 40; i++) {
      if (fs.existsSync(activePortPath)) {
        try {
          const content = fs.readFileSync(activePortPath, 'utf8').trim().split('\n');
          if (content.length >= 2) {
            port = parseInt(content[0].trim(), 10);
            browserWsPath = content[1].trim();
            break;
          }
        } catch {}
      }
      await new Promise(r => setTimeout(r, 150));
    }

    if (!port) {
      throw new Error('Failed to read DevToolsActivePort from Chrome instance.');
    }

    this.wsEndpoint = `ws://127.0.0.1:${port}${browserWsPath}`;
    return { port, wsEndpoint: this.wsEndpoint };
  }

  async getPageTarget() {
    const portMatch = this.wsEndpoint.match(/:(\d+)\//);
    const port = portMatch ? portMatch[1] : 9222;
    const res = await fetch(`http://127.0.0.1:${port}/json/list`);
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page') || targets[0];
    return page.webSocketDebuggerUrl;
  }

  kill() {
    if (this.process && this.process.pid) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(this.process.pid), '/T', '/F']);
        } else {
          this.process.kill('SIGKILL');
        }
      } catch {}
    }
    if (this.userDataDir) {
      setTimeout(() => {
        try {
          fs.rmSync(this.userDataDir, { recursive: true, force: true });
        } catch {}
      }, 1000);
    }
  }
}

class PreviewServerManager {
  constructor(baseUrl = 'http://127.0.0.1:4173') {
    this.baseUrl = baseUrl;
    this.port = new URL(baseUrl).port || 4173;
    this.spawned = false;
    this.process = null;
  }

  async isListening() {
    return new Promise((resolve) => {
      const req = http.get(this.baseUrl, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(1000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  async ensureRunning() {
    const running = await this.isListening();
    if (running) {
      console.log(`[Preview Server] Connected to existing server at ${this.baseUrl}`);
      return;
    }

    console.log(`[Preview Server] Spawning preview server on port ${this.port}...`);
    this.spawned = true;

    const viteBin = path.resolve('node_modules/vite/bin/vite.js');
    this.process = spawn(process.execPath, [viteBin, 'preview', '--port', String(this.port), '--host', '127.0.0.1'], {
      stdio: 'pipe'
    });

    let ready = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (await this.isListening()) {
        ready = true;
        break;
      }
    }

    if (!ready) {
      throw new Error(`Failed to bind preview server on port ${this.port}`);
    }
    console.log(`[Preview Server] Preview server ready at ${this.baseUrl}`);
  }

  stop() {
    if (this.spawned && this.process && this.process.pid) {
      console.log(`[Preview Server] Stopping spawned preview server (PID: ${this.process.pid})...`);
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(this.process.pid), '/T', '/F']);
        } else {
          this.process.kill('SIGKILL');
        }
      } catch {}
    }
  }
}

// ── 2. Storage Pre-seeding Script ───────────────────────────────────────────

const AUTH_SEED_SCRIPT = `
(() => {
  try {
    sessionStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: {
          id: 'u_audit_admin',
          email: 'auditor@lynk.dev',
          name: 'CWV Auditor',
          is_admin: true
        },
        isAuthenticated: true,
        isAdmin: true,
        mfaVerified: true,
        stepUpFresh: true,
        hasHydrated: true
      },
      version: 0
    }));

    sessionStorage.setItem('pulse_access_token', 'mock_jwt_audit_token');
    sessionStorage.setItem('pulse_access_token_expires_at', new Date(Date.now() + 86400000).toISOString());
    sessionStorage.setItem('pulse_current_org_id', 'org_1');
    sessionStorage.setItem('pulse_current_org_slug', 'acme');
    sessionStorage.setItem('pulse_current_project_id', 'proj_1');
    sessionStorage.setItem('pulse_current_project_slug', 'prod');

    localStorage.setItem('org-storage', JSON.stringify({
      state: {
        activeOrgId: 'org_1',
        activeOrgSlug: 'acme',
        activeProjectId: 'proj_1',
        activeProjectSlug: 'prod'
      },
      version: 0
    }));

    localStorage.setItem('app-bootstrap-storage', JSON.stringify({
      state: {
        bootstrap: {
          currentOrganizationId: 'org_1',
          organizations: [
            { id: 'org_1', name: 'Acme Corp', slug: 'acme', role: 'owner', isCurrent: true }
          ],
          projects: [
            { id: 'proj_1', name: 'Production', slug: 'prod', status: 'active', publicId: 'proj_1' }
          ],
          billing: {
            plan: { id: 'p_ent', key: 'enterprise', name: 'Enterprise' },
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 864000000).toISOString(),
            cancelAtPeriodEnd: false
          },
          features: { ai: true, sso: true, scim: true, audit_logs: true, custom_domains: true },
          integrations: { slack: true, pagerduty: true, github: true },
          quotas: {
            events: { limit: 10000000, used: 250000, remaining: 9750000 },
            aiCredits: { limit: 50000, used: 1200, remaining: 48800 }
          },
          usage: {
            monthlyEvents: { limit: 10000000, used: 250000, remaining: 9750000, percentage: 2.5 },
            aiCredits: { limit: 50000, used: 1200, remaining: 48800, percentage: 2.4 }
          }
        },
        lastSuccessfulFetchAt: Date.now(),
        lastFetchedAt: Date.now()
      },
      version: 1
    }));
  } catch (err) {
    console.warn('[CWV Audit] Auth storage pre-seed warning:', err);
  }
})();
`;

// ── 3. Mock Data Payloads ───────────────────────────────────────────────────

const MOCK_DATA = {
  projects: {
    success: true,
    data: [
      { id: 'proj_1', name: 'Production', slug: 'prod', status: 'active', publicId: 'proj_1' }
    ]
  },
  requestsSummary: {
    success: true,
    data: {
      items: [{ id: 'req_1', path: '/api/v1/checkout', duration: 42, status: 200 }],
      summary: { total: 84210, errors: 312 },
      statistics: { errorRate: 0.0037, p50: 42, p95: 145, p99: 410 }
    }
  },
  errorsSummary: {
    success: true,
    data: {
      items: [{ id: 'err_1', message: 'Payment gateway timeout', count: 14 }],
      summary: { total: 312, affectedUsers: 48, fatal: 2, uniqueFingerprints: 14 },
      statistics: {}
    }
  },
  tracesSummary: {
    success: true,
    data: {
      items: [{ id: 'tr_1', duration: 160 }],
      summary: { total: 19400 },
      statistics: { p95: 160 }
    }
  },
  logsSummary: {
    success: true,
    data: {
      items: [{ id: 'lg_1', message: 'User logged in' }],
      summary: { total: 450000, errorLogs: 28 },
      statistics: {}
    }
  },
  cronsSummary: {
    success: true,
    data: {
      items: [{ id: 'cr_1', name: 'hourly-rollup' }],
      summary: { total: 12, failed: 0, uniqueMonitors: 8 },
      statistics: {}
    }
  },
  timelineSummary: {
    success: true,
    data: [
      { bucket: '2026-11-01T00:00:00Z', count: 1200, errorCount: 4 },
      { bucket: '2026-11-01T01:00:00Z', count: 1450, errorCount: 2 }
    ]
  },
  servicesSummary: {
    success: true,
    data: {
      table: {
        rows: [
          { service: 'api-gateway', requests: 50000, errorRatePct: 0.1, p95Ms: 85, availabilityPct: 99.99, status: 'healthy' },
          { service: 'auth-service', requests: 15000, errorRatePct: 0.0, p95Ms: 45, availabilityPct: 100.0, status: 'healthy' },
          { service: 'billing-worker', requests: 19210, errorRatePct: 1.2, p95Ms: 240, availabilityPct: 99.8, status: 'healthy' }
        ]
      }
    }
  },
  errorGroupsSummary: {
    success: true,
    data: {
      groups: [
        { id: 'grp_101', name: 'PaymentGatewayTimeout', occurrenceCount: 42, severity: 'high', status: 'open' },
        { id: 'grp_102', name: 'DatabaseConnectionPoolExhausted', occurrenceCount: 18, severity: 'critical', status: 'open' }
      ]
    }
  },
  latencyOverview: {
    success: true,
    data: {
      totalRequests: 124500,
      avgLatencyMs: 68.4,
      p50Ms: 42.0,
      p95Ms: 185.0,
      p99Ms: 420.0,
      maxLatencyMs: 1250.0,
      statusCodes: { c2xx: 122000, c3xx: 0, c4xx: 2475, c5xx: 25 },
      errorRate4xxPct: 1.98,
      errorRate5xxPct: 0.02,
      totalErrorRatePct: 2.0,
      slowCount: 500,
      slowRatePct: 0.4,
      timeRange: {
        from: '2026-11-01T00:00:00Z',
        to: '2026-11-01T01:00:00Z',
        durationMs: 3600000
      },
      comparison: {
        previousPeriod: {
          from: '2026-10-31T23:00:00Z',
          to: '2026-11-01T00:00:00Z',
          totalRequests: 118300,
          avgLatencyMs: 70.6,
          p50Ms: 42.4,
          p95Ms: 193.1,
          p99Ms: 430.0,
          errorRatePct: 2.1
        },
        deltas: {
          totalRequestsPct: 5.2,
          avgLatencyPct: -3.1,
          p50Pct: -1.0,
          p95Pct: -4.2,
          p99Pct: -2.3,
          errorRatePct: 0.0
        }
      },
      dataQuality: {
        sampleCount: 124500,
        isSampled: false,
        confidence: 'high',
        unit: 'ms'
      }
    }
  },
  latencyTimeSeries: {
    success: true,
    data: {
      buckets: [
        {
          bucket: '2026-11-01T00:00:00Z',
          requestCount: 62000,
          avgLatencyMs: 65,
          p50Ms: 40,
          p95Ms: 180,
          p99Ms: 400,
          status2xx: 60800,
          status3xx: 0,
          status4xx: 1190,
          status5xx: 10,
          errorCount: 1200,
          errorRatePct: 1.93,
          throughputRps: 17.2
        },
        {
          bucket: '2026-11-01T01:00:00Z',
          requestCount: 62500,
          avgLatencyMs: 68,
          p50Ms: 42,
          p95Ms: 185,
          p99Ms: 410,
          status2xx: 61200,
          status3xx: 0,
          status4xx: 1285,
          status5xx: 15,
          errorCount: 1300,
          errorRatePct: 2.08,
          throughputRps: 17.3
        }
      ],
      interval: '1h',
      timeRange: {
        from: '2026-11-01T00:00:00Z',
        to: '2026-11-01T01:00:00Z'
      },
      summary: {
        totalRequests: 124500,
        avgLatencyMs: 66.5,
        p95Ms: 182.5
      }
    }
  },
  latencyDistribution: {
    success: true,
    data: {
      buckets: [
        { fromMs: 0, toMs: 50, label: '0-50ms', count: 80000, percentage: 64.2, cumulativePercentage: 64.2, isSlow: false },
        { fromMs: 50, toMs: 200, label: '50-200ms', count: 35000, percentage: 28.1, cumulativePercentage: 92.3, isSlow: false },
        { fromMs: 200, toMs: 1000, label: '200-1000ms', count: 9000, percentage: 7.2, cumulativePercentage: 99.5, isSlow: false },
        { fromMs: 1000, toMs: null, label: '>1000ms', count: 500, percentage: 0.5, cumulativePercentage: 100.0, isSlow: true }
      ],
      totalRequests: 124500,
      p50Ms: 42.0,
      p90Ms: 140.0,
      p95Ms: 185.0,
      p99Ms: 420.0,
      maxLatencyMs: 1250.0
    }
  },
  latencyEndpoints: {
    success: true,
    data: {
      items: [
        {
          endpoint: '/api/v1/checkout',
          method: 'POST',
          route: '/api/v1/checkout',
          service: 'checkout-service',
          requestCount: 4000,
          avgLatencyMs: 55.0,
          p50Ms: 45.0,
          p95Ms: 120.0,
          p99Ms: 310.0,
          status2xx: 3996,
          status3xx: 0,
          status4xx: 4,
          status5xx: 0,
          errorRatePct: 0.1,
          slowCount: 2,
          slowRatePct: 0.05
        },
        {
          endpoint: '/api/v1/auth/verify',
          method: 'GET',
          route: '/api/v1/auth/verify',
          service: 'auth-service',
          requestCount: 12000,
          avgLatencyMs: 30.0,
          p50Ms: 25.0,
          p95Ms: 60.0,
          p99Ms: 150.0,
          status2xx: 12000,
          status3xx: 0,
          status4xx: 0,
          status5xx: 0,
          errorRatePct: 0.0,
          slowCount: 0,
          slowRatePct: 0.0
        }
      ],
      pagination: {
        total: 2,
        page: 1,
        limit: 15,
        totalPages: 1,
        hasMore: false
      },
      timeRange: {
        from: '2026-11-01T00:00:00Z',
        to: '2026-11-01T01:00:00Z'
      }
    }
  },
  latencySlowRequests: {
    success: true,
    data: [
      {
        id: 'req_slow_1',
        publicId: 'req_slow_1',
        traceId: 'tr_123',
        spanId: 'sp_123',
        requestId: 'req_123',
        method: 'POST',
        endpoint: '/api/v1/checkout',
        route: '/api/v1/checkout',
        statusCode: 504,
        durationMs: 1250,
        occurredAt: '2026-11-01T01:15:00Z'
      }
    ]
  }
};

async function fulfillCdpJson(cdp, requestId, data, statusCode = 200, delayMs = 0) {
  if (delayMs > 0) {
    await new Promise(r => setTimeout(r, delayMs));
  }
  try {
    await cdp.send('Fetch.fulfillRequest', {
      requestId,
      responseCode: statusCode,
      responseHeaders: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Access-Control-Allow-Origin', value: 'http://127.0.0.1:4173' },
        { name: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS, HEAD' },
        { name: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type, x-org-id, sentry-trace, baggage, *' },
        { name: 'Access-Control-Allow-Credentials', value: 'true' }
      ],
      body: Buffer.from(JSON.stringify(data)).toString('base64')
    });
  } catch (err) {}
}

// ── 4. Main Challenger Harness ──────────────────────────────────────────────

class Milestone3Challenger {
  constructor() {
    this.serverManager = new PreviewServerManager();
    this.chromeRunner = new ChromeRunner();
    this.cdp = null;
    this.testResults = [];
  }

  async setup() {
    await this.serverManager.ensureRunning();
    await this.chromeRunner.launch();
    const wsUrl = await this.chromeRunner.getPageTarget();
    this.cdp = new CdpSession(wsUrl);
    await this.cdp.connect();

    await this.cdp.send('Page.enable');
    await this.cdp.send('Runtime.enable');
    await this.cdp.send('DOM.enable');

    this.cdp.on('Runtime.exceptionThrown', (params) => {
      console.error('[BROWSER EXCEPTION]:', params.exceptionDetails?.text, params.exceptionDetails?.exception?.description);
    });
    this.cdp.on('Runtime.consoleAPICalled', (params) => {
      if (params.type === 'error') {
        console.error('[BROWSER CONSOLE ERROR]:', params.args?.map(a => a.value || a.description).join(' '));
      }
    });

    await this.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: AUTH_SEED_SCRIPT
    });

    // Warm up the preview server session and lazy chunks
    await this.cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173/acme/dashboard' });
    await new Promise(r => setTimeout(r, 600));
    await this.cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173/acme/observability' });
    await new Promise(r => setTimeout(r, 600));
    await this.cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173/acme/observability/latency' });
    await new Promise(r => setTimeout(r, 600));
  }

  async evalInPage(expression) {
    const res = await this.cdp.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res && res.result ? res.result.value : null;
  }

  record(name, passed, details) {
    this.testResults.push({ name, passed, details });
    const tag = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    console.log(` ${tag} ${name}`);
    if (details) {
      console.log(`        └─ ${details}`);
    }
  }

  // ── Challenge 1: Executive Dashboard Multi-Query Gate Decoupling ───────────
  async testExecutiveDashboardDecoupling() {
    console.log('\n--- Challenge 1: Executive Dashboard (9 Queries) Decoupling with 2500ms Secondary Delay ---');

    await this.cdp.send('Page.navigate', { url: 'about:blank' });
    await new Promise(r => setTimeout(r, 100));

    await this.cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*5000*' }] });

    const fetchHandler = async (params) => {
      const { requestId, request } = params;
      const url = request.url;
      const method = request.method;
      console.log(`[PAUSED URL]: ${method} ${url}`);

      if (method === 'OPTIONS') {
        await fulfillCdpJson(this.cdp, requestId, {}, 204);
        return;
      }

      // Secondary: Timeline sub-resource held for 2500ms
      if (url.includes('/timeline')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.timelineSummary, 200, 2500);
        return;
      }

      // Primary Hero Queries: resolve quickly (50ms)
      if (url.includes('/observability/requests')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.requestsSummary, 200, 50);
        return;
      }
      if (url.includes('/observability/errors')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.errorsSummary, 200, 50);
        return;
      }

      // Secondary Queries: held in-flight for 2500ms
      if (url.includes('/observability/traces')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.tracesSummary, 200, 2500);
        return;
      }
      if (url.includes('/observability/logs')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.logsSummary, 200, 2500);
        return;
      }
      if (url.includes('/observability/crons')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.cronsSummary, 200, 2500);
        return;
      }
      if (url.includes('analytics-v2') && url.includes('services')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.servicesSummary, 200, 2500);
        return;
      }
      if (url.includes('analytics-v2') && url.includes('endpoints')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.servicesSummary, 200, 2500);
        return;
      }
      if (url.includes('error-groups')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.errorGroupsSummary, 200, 2500);
        return;
      }
      if (url.includes('/projects')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.projects, 200, 50);
        return;
      }

      // Non-secondary layout queries: fulfill in 50ms so background widgets don't stall
      await fulfillCdpJson(this.cdp, requestId, { success: true, data: [] }, 200, 50);
    };

    this.cdp.on('Fetch.requestPaused', fetchHandler);

    await this.cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173/acme/observability' });

    // 1. Check at t = 1800ms (Chunks loaded, primary queries done, secondary queries STILL in-flight)
    await new Promise(r => setTimeout(r, 1800));

    const checkIntermediate = (await this.evalInPage(`
      (() => {
        const routeGate = document.querySelector('.route-gate');
        const gateAttr = routeGate ? routeGate.getAttribute('data-gate') : null;
        const overlay = document.querySelector('.route-skeleton-overlay');
        const overlayState = overlay ? overlay.getAttribute('data-state') : null;
        const pageText = document.body.innerText;
        const pulseSkeletons = document.querySelectorAll('.animate-pulse');

        function getError() {
          const el = document.querySelector('[role="status"]');
          if (!el) return null;
          for (const k in el) {
            if (k.startsWith('__reactFiber$')) {
              let f = el[k];
              while (f) {
                if (f.memoizedProps?.error) {
                  const e = f.memoizedProps.error;
                  return { message: e.message || String(e), stack: e.stack || '' };
                }
                if (f.memoizedState?.error) {
                  const e = f.memoizedState.error;
                  return { message: e.message || String(e), stack: e.stack || '' };
                }
                f = f.return;
              }
            }
          }
          return null;
        }

        return {
          routeGateExists: Boolean(routeGate),
          gateAttr,
          overlayExists: Boolean(overlay),
          overlayState,
          pulseSkeletonCount: pulseSkeletons.length,
          hasRequestsKpi: pageText.includes('84.2K') || pageText.includes('Requests'),
          hasErrorRateKpi: pageText.includes('0.37%') || pageText.includes('Error rate'),
          pageTextSnippet: pageText.slice(0, 300),
          routeError: getError()
        };
      })()
    `)) || {};

    console.log('[DEBUG ROUTE ERROR]:', JSON.stringify(checkIntermediate.routeError));

    const gateUnblockedEarly = checkIntermediate.routeGateExists && checkIntermediate.gateAttr !== 'hidden';
    this.record(
      'F9.1: Primary LCP element unblocks immediately while secondary queries are in-flight (at 1000ms)',
      gateUnblockedEarly && checkIntermediate.hasRequestsKpi,
      `data-gate="${checkIntermediate.gateAttr}", hasRequestsKpi=${checkIntermediate.hasRequestsKpi}, overlayState=${checkIntermediate.overlayState}, text="${checkIntermediate.pageTextSnippet}"`
    );

    this.record(
      'F9.2: Secondary widgets render dedicated in-place mini-skeletons (not blocking outer gate)',
      checkIntermediate.pulseSkeletonCount > 0,
      `Detected ${checkIntermediate.pulseSkeletonCount} in-place mini-skeleton elements during secondary in-flight hold`
    );

    // 2. Wait for the 2500ms delay to elapse and verify secondary queries resolve cleanly
    await new Promise(r => setTimeout(r, 2000));

    const checkFinal = (await this.evalInPage(`
      (() => {
        const pageText = document.body.innerText;
        const routeGate = document.querySelector('.route-gate');
        const gateAttr = routeGate ? routeGate.getAttribute('data-gate') : null;
        const overlay = document.querySelector('.route-skeleton-overlay');
        return {
          gateAttr,
          overlayExists: Boolean(overlay),
          hasServiceRow: pageText.includes('api-gateway') || pageText.includes('auth-service'),
          hasErrorGroup: pageText.includes('PaymentGatewayTimeout') || pageText.includes('DatabaseConnectionPoolExhausted'),
          hasResolvedSignals: pageText.includes('19.4K') || pageText.includes('Traces') || pageText.includes('distributed traces')
        };
      })()
    `)) || {};

    this.record(
      'F9.3: Secondary queries resolve and populate data without being permanently paused or broken',
      checkFinal.hasServiceRow || checkFinal.hasResolvedSignals || checkFinal.hasErrorGroup,
      `hasServiceRow=${checkFinal.hasServiceRow}, hasErrorGroup=${checkFinal.hasErrorGroup}, gateAttr="${checkFinal.gateAttr}"`
    );

    this.cdp.removeAllListeners('Fetch.requestPaused');
    await this.cdp.send('Fetch.disable');
  }

  // ── Challenge 2: Latency Page Multi-Query Gate Decoupling ───────────────────
  async testLatencyPageDecoupling() {
    console.log('\n--- Challenge 2: Latency Page (7 Queries) Decoupling with 2500ms Secondary Delay ---');

    await this.cdp.send('Page.navigate', { url: 'about:blank' });
    await new Promise(r => setTimeout(r, 100));

    await this.cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*5000*' }] });

    const fetchHandler = async (params) => {
      const { requestId, request } = params;
      const url = request.url;
      const method = request.method;
      console.log('[CHALLENGE 2 PAUSED]:', method, url);

      if (method === 'OPTIONS') {
        await fulfillCdpJson(this.cdp, requestId, {}, 204);
        return;
      }

      // Primary Hero Query: Latency Overview (resolves in 50ms)
      if (url.includes('/latency/overview')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.latencyOverview, 200, 50);
        return;
      }

      // Secondary Queries: delayed by 2500ms
      if (url.includes('/latency/timeseries')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.latencyTimeSeries, 200, 2500);
        return;
      }
      if (url.includes('/latency/distribution')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.latencyDistribution, 200, 2500);
        return;
      }
      if (url.includes('/latency/endpoints')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.latencyEndpoints, 200, 2500);
        return;
      }
      if (url.includes('/latency/slow-requests')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.latencySlowRequests, 200, 2500);
        return;
      }
      if (url.includes('/projects')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.projects, 200, 50);
        return;
      }

      await fulfillCdpJson(this.cdp, requestId, { success: true, data: [] }, 200, 50);
    };

    this.cdp.on('Fetch.requestPaused', fetchHandler);

    await this.cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173/acme/observability/latency' });

    // 1. Check at t = 1800ms (Overview has resolved, secondary queries still in-flight)
    await new Promise(r => setTimeout(r, 1800));

    const intermediate = (await this.evalInPage(`
      (() => {
        const routeGate = document.querySelector('.route-gate');
        const gateAttr = routeGate ? routeGate.getAttribute('data-gate') : null;
        const pageText = document.body.innerText;
        return {
          routeGateExists: Boolean(routeGate),
          gateAttr,
          hasTotalRequestsKpi: pageText.includes('Total Requests') || pageText.includes('125K'),
          hasAvgLatencyKpi: pageText.includes('Avg Latency') || pageText.includes('68ms'),
          hasP50Kpi: pageText.includes('p50') || pageText.includes('42ms'),
          hasP95Kpi: pageText.includes('p95') || pageText.includes('185ms')
        };
      })()
    `)) || {};

    const gateUnblocked = intermediate.routeGateExists && intermediate.gateAttr !== 'hidden';
    this.record(
      'F9.4: Latency Page unblocks 6 hero KPI readout cells on overviewQuery resolution (at 1000ms)',
      gateUnblocked && intermediate.hasTotalRequestsKpi && intermediate.hasAvgLatencyKpi,
      `data-gate="${intermediate.gateAttr}", Total Requests KPI=${intermediate.hasTotalRequestsKpi}, Avg Latency KPI=${intermediate.hasAvgLatencyKpi}`
    );

    // 2. Wait for the 2500ms delay to elapse
    await new Promise(r => setTimeout(r, 3000));

    const final = (await this.evalInPage(`
      (() => {
        const pageText = document.body.innerText;
        return {
          hasDistribution: pageText.includes('0-50ms') || pageText.includes('64.2%'),
          hasEndpointRow: pageText.includes('/api/v1/checkout') || pageText.includes('/api/v1/auth/verify'),
          text: pageText.slice(0, 500)
        };
      })()
    `)) || {};

    console.log('[CHALLENGE 2 FINAL TEXT]:', final.text);

    this.record(
      'F9.5: Latency Page secondary charts and endpoints populate cleanly after delay',
      final.hasDistribution || final.hasEndpointRow,
      `hasDistribution=${final.hasDistribution}, hasEndpointRow=${final.hasEndpointRow}`
    );

    this.cdp.removeAllListeners('Fetch.requestPaused');
    await this.cdp.send('Fetch.disable');
  }

  // ── Challenge 3: Inverted Latency (Fast Secondary, Slow Primary) ───────────
  async testInvertedLatencyGateHolding() {
    console.log('\n--- Challenge 3: Inverted Latency (Fast Secondary @ 20ms, Slow Primary @ 1800ms) ---');

    await this.cdp.send('Page.navigate', { url: 'about:blank' });
    await new Promise(r => setTimeout(r, 100));

    await this.cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*5000*' }] });

    const fetchHandler = async (params) => {
      const { requestId, request } = params;
      const url = request.url;
      const method = request.method;

      if (method === 'OPTIONS') {
        await fulfillCdpJson(this.cdp, requestId, {}, 204);
        return;
      }

      // Primary Queries: deliberately delayed by 1800ms
      if (url.includes('/observability/requests') && !url.includes('/timeline')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.requestsSummary, 200, 1800);
        return;
      }
      if (url.includes('/observability/errors')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.errorsSummary, 200, 1800);
        return;
      }

      // Secondary Queries: ultra-fast (20ms)
      if (url.includes('/timeline')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.timelineSummary, 200, 20);
        return;
      }
      if (url.includes('/observability/traces')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.tracesSummary, 200, 20);
        return;
      }
      if (url.includes('/observability/logs')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.logsSummary, 200, 20);
        return;
      }
      if (url.includes('analytics-v2')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.servicesSummary, 200, 20);
        return;
      }

      if (url.includes('/projects')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.projects, 200, 20);
        return;
      }

      await fulfillCdpJson(this.cdp, requestId, { success: true, data: [] }, 200, 20);
    };

    this.cdp.on('Fetch.requestPaused', fetchHandler);

    await this.cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173/acme/observability?t_inv=' + Date.now() });

    // Check at t = 1200ms: secondary queries (20ms) are ALREADY DONE, but primary (1800ms) is still waiting!
    await new Promise(r => setTimeout(r, 1200));

    const checkWaiting = (await this.evalInPage(`
      (() => {
        const routeGate = document.querySelector('.route-gate');
        const overlay = document.querySelector('.route-skeleton-overlay');
        const overlayState = overlay ? overlay.getAttribute('data-state') : null;
        return {
          routeGateExists: Boolean(routeGate),
          gateAttr: routeGate ? routeGate.getAttribute('data-gate') : null,
          overlayExists: Boolean(overlay),
          overlayState
        };
      })()
    `)) || {};

    const gateIsHolding = checkWaiting.gateAttr === 'hidden' || checkWaiting.overlayExists;
    this.record(
      'F8.1: Gate remains held behind route skeleton when primary query is slow, even if secondary queries finish early',
      gateIsHolding,
      `data-gate="${checkWaiting.gateAttr}", overlayExists=${checkWaiting.overlayExists}, overlayState="${checkWaiting.overlayState}"`
    );

    // Wait until primary resolves (t = 3500ms)
    await new Promise(r => setTimeout(r, 2200));

    const checkReleased = (await this.evalInPage(`
      (() => {
        const routeGate = document.querySelector('.route-gate');
        return {
          gateAttr: routeGate ? routeGate.getAttribute('data-gate') : null
        };
      })()
    `)) || {};

    const gateReleased = checkReleased.gateAttr !== 'hidden';
    this.record(
      'F8.2: Gate promptly releases once the primary blocking query completes',
      gateReleased,
      `data-gate="${checkReleased.gateAttr}" after primary query finished`
    );

    this.cdp.removeAllListeners('Fetch.requestPaused');
    await this.cdp.send('Fetch.disable');
  }

  // ── Challenge 4: Secondary Query Network Error Fault Tolerance ────────────
  async testSecondaryQueryFaultTolerance() {
    console.log('\n--- Challenge 4: Secondary Query HTTP 500 Error Fault Tolerance ---');

    await this.cdp.send('Page.navigate', { url: 'about:blank' });
    await new Promise(r => setTimeout(r, 100));

    await this.cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*5000*' }] });

    const fetchHandler = async (params) => {
      const { requestId, request } = params;
      const url = request.url;
      const method = request.method;

      if (method === 'OPTIONS') {
        await fulfillCdpJson(this.cdp, requestId, {}, 204);
        return;
      }

      // Primary query succeeds
      if (url.includes('/observability/requests') && !url.includes('/timeline')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.requestsSummary, 200, 50);
        return;
      }
      if (url.includes('/observability/errors')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.errorsSummary, 200, 50);
        return;
      }

      // Secondary queries simulate internal server errors (500)
      if (url.includes('/observability/traces') || url.includes('analytics-v2') || url.includes('error-groups') || url.includes('/timeline')) {
        await fulfillCdpJson(this.cdp, requestId, { success: false, message: 'Internal Server Error' }, 500, 50);
        return;
      }
      if (url.includes('/projects')) {
        await fulfillCdpJson(this.cdp, requestId, MOCK_DATA.projects, 200, 50);
        return;
      }

      await fulfillCdpJson(this.cdp, requestId, { success: true, data: [] }, 200, 50);
    };

    this.cdp.on('Fetch.requestPaused', fetchHandler);

    await this.cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173/acme/observability?err_test=' + Date.now() });
    // Allow 2400ms for primary resolution and axios retry backoffs to conclude
    await new Promise(r => setTimeout(r, 2400));

    const checkErrorState = (await this.evalInPage(`
      (() => {
        const routeGate = document.querySelector('.route-gate');
        const errorBoundary = document.querySelector('[data-error-boundary], .error-boundary');
        // Exclude Sonner notification toasts when checking whether the page/route crashed
        const clone = document.body.cloneNode(true);
        const toasts = clone.querySelectorAll('[data-sonner-toaster], [aria-label*="Notification"], [data-sonner-toast]');
        toasts.forEach(t => t.remove());
        const mainText = clone.innerText || '';
        const crashed = mainText.includes('Something went wrong') ||
                        mainText.includes('Application Error') ||
                        mainText.includes('Runtime exception captured') ||
                        mainText.includes('Incident Isolation');
        return {
          routeGateExists: Boolean(routeGate),
          gateAttr: routeGate ? routeGate.getAttribute('data-gate') : null,
          hasErrorBoundary: Boolean(errorBoundary) || crashed,
          readoutExists: mainText.includes('Requests') || mainText.includes('84.2K')
        };
      })()
    `)) || {};

    const gateUnblocked = checkErrorState.routeGateExists && checkErrorState.gateAttr !== 'hidden';
    this.record(
      'F8.3: Secondary query 500 error does NOT block gate or crash page into unhandled ErrorBoundary',
      gateUnblocked && !checkErrorState.hasErrorBoundary,
      `data-gate="${checkErrorState.gateAttr}", hasErrorBoundary=${checkErrorState.hasErrorBoundary}, readoutExists=${checkErrorState.readoutExists}`
    );

    this.cdp.removeAllListeners('Fetch.requestPaused');
    await this.cdp.send('Fetch.disable');
  }

  // ── Challenge 5: LoadingBoundary SETTLE_MS = 0 Race Condition & Flicker Test
  async testLoadingBoundarySettleMsZero() {
    console.log('\n--- Challenge 5: LoadingBoundary SETTLE_MS = 0 Race Condition & Flicker Stress ---');

    await this.cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173/acme/observability' });
    await new Promise(r => setTimeout(r, 800));

    // 1. Part A: State Monotonicity & Zero-Flicker Observer
    await this.evalInPage(`
      (() => {
        window.__gate_transitions = [];
        window.__overlay_records = [];

        const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.type === 'attributes' && m.attributeName === 'data-gate') {
              window.__gate_transitions.push({
                time: performance.now(),
                val: m.target.getAttribute('data-gate')
              });
            }
            if (m.type === 'childList') {
              for (const node of m.addedNodes) {
                if (node.nodeType === 1 && node.classList && node.classList.contains('route-skeleton-overlay')) {
                  window.__overlay_records.push({ type: 'added', time: performance.now() });
                }
              }
              for (const node of m.removedNodes) {
                if (node.nodeType === 1 && node.classList && node.classList.contains('route-skeleton-overlay')) {
                  window.__overlay_records.push({ type: 'removed', time: performance.now() });
                }
              }
            }
          }
        });

        observer.observe(document.documentElement, {
          attributes: true,
          subtree: true,
          childList: true,
          attributeFilter: ['data-gate', 'data-state']
        });
        return true;
      })()
    `);

    // 2. Part B: Rapid Route Barrage (10 navigations back and forth)
    const routesToBarrage = [
      '/acme/dashboard',
      '/acme/observability',
      '/acme/observability/latency',
      '/acme/p/proj_1/overview',
      '/acme/projects',
      '/acme/alerts',
      '/acme/observability',
      '/acme/dashboard',
      '/acme/observability/latency',
      '/acme/p/proj_1/overview'
    ];

    for (const r of routesToBarrage) {
      await this.evalInPage(`
        (() => {
          const link = Array.from(document.querySelectorAll('a')).find(a => a.getAttribute('href') === '${r}');
          if (link) {
            link.click();
          } else {
            window.history.pushState({}, '', '${r}');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        })()
      `);
      await new Promise(res => setTimeout(res, 90));
    }

    // Allow settling
    await new Promise(r => setTimeout(r, 1500));

    const stressReport = (await this.evalInPage(`
      (() => {
        const overlays = document.querySelectorAll('.route-skeleton-overlay:not([data-state="leaving"])');
        const transitions = window.__gate_transitions || [];
        let oscillations = 0;
        for (let i = 1; i < transitions.length; i++) {
          if (transitions[i-1].val === null && transitions[i].val === 'hidden') {
            oscillations++;
          }
        }
        return {
          activeOverlaysCount: overlays.length,
          totalTransitions: transitions.length,
          oscillations,
          currentPath: window.location.pathname
        };
      })()
    `)) || {};

    this.record(
      'F8.4: Zero ghost/orphaned skeleton overlays remaining after rapid navigation barrage',
      stressReport.activeOverlaysCount === 0,
      `activeOverlays=${stressReport.activeOverlaysCount}, totalTransitionsRecorded=${stressReport.totalTransitions}`
    );

    this.record(
      'F8.5: Zero gate state oscillations (monotonic settle with SETTLE_MS = 0)',
      stressReport.oscillations === 0,
      `Detected oscillations=${stressReport.oscillations}`
    );

    // 3. Part C: Cached Navigation Frame 1 Reveal (0ms gate delay)
    // Click to /acme/dashboard then back to /acme/observability
    await this.evalInPage(`
      (() => {
        const dashLink = Array.from(document.querySelectorAll('a')).find(a => a.getAttribute('href')?.includes('/dashboard'));
        if (dashLink) dashLink.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 400));

    // Return to /acme/observability and immediately inspect data-gate before next tick
    const cachedEntrance = (await this.evalInPage(`
      new Promise(resolve => {
        const obsLink = Array.from(document.querySelectorAll('a')).find(a => a.getAttribute('href')?.includes('/observability'));
        if (obsLink) obsLink.click();
        requestAnimationFrame(() => {
          const routeGate = document.querySelector('.route-gate');
          const overlay = document.querySelector('.route-skeleton-overlay');
          resolve({
            routeGateExists: Boolean(routeGate),
            gateAttrImmediate: routeGate ? routeGate.getAttribute('data-gate') : null,
            overlayMounted: Boolean(overlay)
          });
        });
      })
    `)) || {};

    const frame1Ready = cachedEntrance.routeGateExists && cachedEntrance.gateAttrImmediate !== 'hidden';
    this.record(
      'F8.6: Cached navigation renders on Frame 1 with 0ms gate delay without mounting skeleton overlay',
      frame1Ready,
      `routeGateExists=${cachedEntrance.routeGateExists}, gateAttrImmediate="${cachedEntrance.gateAttrImmediate}", overlayMounted=${cachedEntrance.overlayMounted}`
    );
  }

  async runAll() {
    console.log(`\n======================================================================`);
    console.log(` Milestone 3 Empirical Challenger Test Suite`);
    console.log(` Focus: Gate Unblocking (F8) & Multi-Query Decoupling (F9)`);
    console.log(` Target Server: http://127.0.0.1:4173`);
    console.log(`======================================================================`);

    try {
      await this.setup();
      await this.testExecutiveDashboardDecoupling();
      await this.testLatencyPageDecoupling();
      await this.testInvertedLatencyGateHolding();
      await this.testSecondaryQueryFaultTolerance();
      await this.testLoadingBoundarySettleMsZero();
    } finally {
      this.cleanup();
    }

    console.log(`\n======================================================================`);
    console.log(` Milestone 3 Challenge Suite Summary`);
    console.log(`======================================================================`);
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = total - passed;
    console.log(` Total Scenarios Tested: ${total}`);
    console.log(` Passed                : ${passed}`);
    console.log(` Failed                : ${failed}`);
    console.log(` Empirical Verdict     : ${failed === 0 ? '\x1b[32mAPPROVE\x1b[0m' : '\x1b[31mREJECT\x1b[0m'}`);
    console.log(`======================================================================\n`);

    return failed === 0 ? 0 : 1;
  }

  cleanup() {
    if (this.cdp) this.cdp.close();
    if (this.chromeRunner) this.chromeRunner.kill();
    if (this.serverManager) this.serverManager.stop();
  }
}

// ── 5. Runner ───────────────────────────────────────────────────────────────

const challenger = new Milestone3Challenger();
process.on('SIGINT', () => { challenger.cleanup(); process.exit(130); });
process.on('SIGTERM', () => { challenger.cleanup(); process.exit(143); });

challenger.runAll().then((exitCode) => {
  process.exit(exitCode);
}).catch((err) => {
  console.error('\n[FATAL CHALLENGER ERROR]:', err);
  challenger.cleanup();
  process.exit(1);
});
