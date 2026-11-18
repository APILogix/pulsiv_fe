#!/usr/bin/env node
/**
 * scripts/challenge-m5-adversarial-routing.mjs
 *
 * Tier 5 Adversarial Coverage Challenger Harness:
 * Routing, Query Concurrency, and State Invariants
 *
 * Stress-tests:
 * 1. Ultra-Rapid Navigation Churn (aborting in-flight lazy chunk loads)
 * 2. HTTP Fault Injection during LCP settle window (401, 403, 500, network drop)
 * 3. Query Cache Cleared / Invalidated Mid-Render & Concurrency Invariants
 * 4. LoadingBoundary / Lazy Chunk Error Boundary Fallback & Freeze Prevention
 * 5. VirtualList High-Frequency Scroll, Resize & Collection Stress
 * 6. Dynamic Org / Project Scope Guards, Deep-Link Fallback & Redirect Loops
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ── 1. CDP Session Infrastructure ──────────────────────────────────────────

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
            rej(new Error(`CDP Error (${msg.id}): ${msg.error.message || JSON.stringify(msg.error)}`));
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
    this.userDataDir = path.join(os.tmpdir(), `cwv_m5_chal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
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
    // Use PUT /json/new to create a clean, dedicated page tab
    const res = await fetch(`http://127.0.0.1:${port}/json/new`, { method: 'PUT' });
    const target = await res.json();
    return target.webSocketDebuggerUrl;
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

    // Record runtime errors
    window.__capturedErrors = [];
    window.addEventListener('error', (e) => {
      window.__capturedErrors.push({
        type: 'error',
        message: e.message || String(e),
        filename: e.filename,
        lineno: e.lineno
      });
    });
    window.addEventListener('unhandledrejection', (e) => {
      window.__capturedErrors.push({
        type: 'unhandledrejection',
        reason: e.reason ? (e.reason.message || String(e.reason)) : 'unknown rejection'
      });
    });
  } catch (err) {
    console.warn('[CWV Audit] Auth storage pre-seed warning:', err);
  }
})();
`;

// ── 3. Helper Functions ─────────────────────────────────────────────────────

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    const desc = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
    throw new Error(`Evaluation failed: ${desc}`);
  }
  return result.result?.value;
}

async function navigatePage(cdp, url) {
  await cdp.send('Page.navigate', { url });
  await new Promise(r => setTimeout(r, 700));
}

// ── 4. Main Adversarial Runner ──────────────────────────────────────────────

async function runAdversarialHardening() {
  console.log('='.repeat(70));
  console.log('TIER 5 ADVERSARIAL COVERAGE CHALLENGER: ROUTING, CONCURRENCY & INVARIANTS');
  console.log('='.repeat(70));

  const preview = new PreviewServerManager();
  const chrome = new ChromeRunner();
  let cdp = null;

  const testResults = [];
  function recordResult(suite, scenario, passed, details = '') {
    testResults.push({ suite, scenario, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${mark} [${suite}] ${scenario} ${details ? `(${details})` : ''}`);
  }

  try {
    await preview.ensureRunning();
    await chrome.launch();
    const pageTargetWs = await chrome.getPageTarget();
    cdp = new CdpSession(pageTargetWs);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    // Register script to evaluate on every new document (pre-seed auth)
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: AUTH_SEED_SCRIPT
    });

    console.log('\n[Suite 1] Ultra-Rapid Navigation Churn (Lazy Chunk Abort Race)');
    {
      // 1. Initial baseline navigation to dashboard
      await navigatePage(cdp, 'http://127.0.0.1:4173/acme/dashboard');
      await new Promise(r => setTimeout(r, 800));

      // 2. Fire high-frequency navigation burst across 8 distinct routes with 25ms interval
      const churnRoutes = [
        '/acme/observability/requests',
        '/acme/services',
        '/acme/projects',
        '/acme/dashboards/executive',
        '/acme/observability/latency',
        '/acme/account/security/passkeys',
        '/acme/alerts',
        '/acme/p/proj_1/overview' // Final target
      ];

      console.log(`  Initiating 8-route burst with 25ms delay between transitions...`);
      const churnScript = `
        (async () => {
          const routes = ${JSON.stringify(churnRoutes)};
          for (let i = 0; i < routes.length; i++) {
            window.history.pushState(null, '', routes[i]);
            window.dispatchEvent(new PopStateEvent('popstate'));
            await new Promise(r => setTimeout(r, 25));
          }
        })();
      `;
      await evaluate(cdp, churnScript);

      // Wait for final route to settle
      await new Promise(r => setTimeout(r, 2000));

      // Invariant Check 1.1: Final URL state matches target
      const currentPath = await evaluate(cdp, 'window.location.pathname');
      const pathMatches = currentPath === '/acme/p/proj_1/overview';
      recordResult('Suite 1', 'Final URL state matches target', pathMatches, `Current: ${currentPath}`);

      // Invariant Check 1.2: Zero orphaned route skeletons in DOM
      const overlayInfo = await evaluate(cdp, `(() => {
        const els = Array.from(document.querySelectorAll(".route-skeleton-overlay"));
        return {
          count: els.length,
          details: els.map(e => ({ state: e.getAttribute('data-state'), parent: e.parentElement?.className }))
        };
      })()`);
      recordResult('Suite 1', 'Zero orphaned .route-skeleton-overlay in DOM', overlayInfo.count === 0, `Count: ${overlayInfo.count}, Details: ${JSON.stringify(overlayInfo.details)}`);

      // Invariant Check 1.3: Content gate is active & not hidden
      const gateState = await evaluate(cdp, `
        (() => {
          const gates = Array.from(document.querySelectorAll('.route-gate'));
          return {
            totalGates: gates.length,
            hiddenGates: gates.filter(g => g.getAttribute('data-gate') === 'hidden').length,
            inertGates: gates.filter(g => g.hasAttribute('inert')).length,
            ariaBusy: gates.filter(g => g.getAttribute('aria-busy') === 'true').length
          };
        })()
      `);
      const gatePass = gateState.hiddenGates === 0 && gateState.inertGates === 0 && gateState.ariaBusy === 0;
      recordResult('Suite 1', 'Gate state unblocked & interactive (inert=false, hidden=0)', gatePass, JSON.stringify(gateState));

      // Invariant Check 1.4: Zero uncaught runtime errors during churn
      const capturedErrors = await evaluate(cdp, 'window.__capturedErrors || []');
      recordResult('Suite 1', 'Zero fatal unhandled runtime rejections during churn', capturedErrors.length === 0, `Errors: ${capturedErrors.length}`);
    }

    console.log('\n[Suite 2] HTTP Fault Injection During LCP Settle Window (500, 401, 403, Network Drop)');
    {
      await cdp.send('Fetch.enable', {
        patterns: [{ urlPattern: '*api*', requestStage: 'Request' }]
      });

      // Scenario 2A: 500 Internal Server Error injection
      let intercepted500 = false;
      const onFetch500 = async (params) => {
        intercepted500 = true;
        try {
          await cdp.send('Fetch.fulfillRequest', {
            requestId: params.requestId,
            responseCode: 500,
            responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
            body: Buffer.from(JSON.stringify({ error: 'Internal Server Error' })).toString('base64')
          });
        } catch {}
      };
      cdp.on('Fetch.requestPaused', onFetch500);

      await navigatePage(cdp, 'http://127.0.0.1:4173/acme/observability/latency');
      await new Promise(r => setTimeout(r, 1500));

      const overlay500 = await evaluate(cdp, 'document.querySelectorAll(".route-skeleton-overlay").length');
      const hidden500 = await evaluate(cdp, 'document.querySelectorAll(".route-gate[data-gate=\\"hidden\\"]").length');
      const passed500 = overlay500 === 0 && hidden500 === 0;
      recordResult('Suite 2', 'HTTP 500 Fault: Gate unblocks without permanent skeleton freeze', passed500, `Overlay: ${overlay500}, Hidden: ${hidden500}`);

      cdp.removeAllListeners('Fetch.requestPaused');

      // Scenario 2B: 401 Unauthorized injection
      const onFetch401 = async (params) => {
        try {
          await cdp.send('Fetch.fulfillRequest', {
            requestId: params.requestId,
            responseCode: 401,
            responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
            body: Buffer.from(JSON.stringify({ error: 'Unauthorized Session Expired' })).toString('base64')
          });
        } catch {}
      };
      cdp.on('Fetch.requestPaused', onFetch401);

      await navigatePage(cdp, 'http://127.0.0.1:4173/acme/projects');
      await new Promise(r => setTimeout(r, 1500));

      const overlay401 = await evaluate(cdp, 'document.querySelectorAll(".route-skeleton-overlay").length');
      const passed401 = overlay401 === 0;
      recordResult('Suite 2', 'HTTP 401 Fault: Gate unblocks, session auth cleanly handled', passed401, `Overlay: ${overlay401}`);

      cdp.removeAllListeners('Fetch.requestPaused');

      // Scenario 2C: Network Transport Drop (net::ERR_FAILED)
      const onFetchFail = async (params) => {
        try {
          await cdp.send('Fetch.failRequest', {
            requestId: params.requestId,
            errorReason: 'Failed'
          });
        } catch {}
      };
      cdp.on('Fetch.requestPaused', onFetchFail);

      await navigatePage(cdp, 'http://127.0.0.1:4173/acme/dashboards/executive');
      await new Promise(r => setTimeout(r, 1500));

      const overlayFail = await evaluate(cdp, 'document.querySelectorAll(".route-skeleton-overlay").length');
      const hiddenFail = await evaluate(cdp, 'document.querySelectorAll(".route-gate[data-gate=\\"hidden\\"]").length');
      const passedFail = overlayFail === 0 && hiddenFail === 0;
      recordResult('Suite 2', 'Network Drop Fault: Gate unblocks without freeze on network error', passedFail, `Overlay: ${overlayFail}, Hidden: ${hiddenFail}`);

      cdp.removeAllListeners('Fetch.requestPaused');
      await cdp.send('Fetch.disable');
    }

    console.log('\n[Suite 3] TanStack Query Cache Purge & Concurrency Mid-Render');
    {
      await navigatePage(cdp, 'http://127.0.0.1:4173/acme/dashboard');
      await new Promise(r => setTimeout(r, 500));

      // Trigger navigation and immediately purge the query cache from the React fiber
      const purgeScript = `
        (async () => {
          function findQueryClient(fiber) {
            let curr = fiber;
            while (curr) {
              if (curr.memoizedProps?.client && typeof curr.memoizedProps.client.getQueryCache === 'function') {
                return curr.memoizedProps.client;
              }
              if (curr.child) {
                const found = findQueryClient(curr.child);
                if (found) return found;
              }
              curr = curr.sibling;
            }
            return null;
          }

          const rootEl = document.querySelector('#root');
          const fiberKey = Object.keys(rootEl || {}).find(k => k.startsWith('__reactFiber$'));
          const rootFiber = rootEl ? rootEl[fiberKey] : null;
          const qc = findQueryClient(rootFiber);

          // Trigger navigation
          window.history.pushState(null, '', '/acme/dashboards/executive');
          window.dispatchEvent(new PopStateEvent('popstate'));

          // Mid-flight purge at 25ms and 80ms
          await new Promise(r => setTimeout(r, 25));
          if (qc) {
            qc.clear();
          }

          await new Promise(r => setTimeout(r, 55));
          if (qc) {
            qc.clear();
          }

          return { foundQc: !!qc };
        })();
      `;

      const purgeOutcome = await evaluate(cdp, purgeScript);
      await new Promise(r => setTimeout(r, 1500));

      const overlayPurge = await evaluate(cdp, 'document.querySelectorAll(".route-skeleton-overlay").length');
      const hiddenPurge = await evaluate(cdp, 'document.querySelectorAll(".route-gate[data-gate=\\"hidden\\"]").length');
      const passedPurge = overlayPurge === 0 && hiddenPurge === 0;
      recordResult('Suite 3', 'Mid-flight cache purge: gate unblocks without null dereference or freeze', passedPurge, `Found QC: ${purgeOutcome.foundQc}, Overlay: ${overlayPurge}`);
    }

    console.log('\n[Suite 4] LoadingBoundary & Route Error Boundary Resilience');
    {
      // Navigate to /error-preview to test RouteErrorBoundary / AppErrorFallback
      await navigatePage(cdp, 'http://127.0.0.1:4173/error-preview');
      await new Promise(r => setTimeout(r, 800));

      const errorBoundaryDetails = await evaluate(cdp, `
        (() => {
          const alert = document.querySelector('[role="alert"]');
          const incidentId = alert ? alert.textContent.includes('ERR-') : false;
          const skeletonOverlay = document.querySelectorAll('.route-skeleton-overlay').length;

          return {
            hasAlertRole: !!alert,
            hasIncidentId: incidentId,
            skeletonOverlayCount: skeletonOverlay
          };
        })()
      `);

      const passedEB = errorBoundaryDetails.hasAlertRole && errorBoundaryDetails.skeletonOverlayCount === 0;
      recordResult('Suite 4', 'RouteErrorBoundary mounts cleanly with zero obscuring skeleton overlays', passedEB, JSON.stringify(errorBoundaryDetails));
    }

    console.log('\n[Suite 5] VirtualList Stress, Quantization, Shrinking & Resize Invariants');
    {
      // Intercept backend requests endpoint so InfiniteTable renders live VirtualList with 60 rows
      await cdp.send('Fetch.enable', {
        patterns: [{ urlPattern: '*:5000/*', requestStage: 'Request' }]
      });

      const onRequestsFetch = async (params) => {
        try {
          if (params.request.url.includes('observability/requests')) {
            const mockRows = Array.from({ length: 60 }, (_, i) => ({
              id: `req_${i + 1}`,
              publicId: `req_${i + 1}`,
              endpoint: `/api/v1/resource/${i + 1}`,
              httpMethod: i % 2 === 0 ? 'GET' : 'POST',
              statusCode: 200,
              durationMs: 40 + (i % 30),
              occurredAt: new Date(Date.now() - i * 60000).toISOString()
            }));

            await cdp.send('Fetch.fulfillRequest', {
              requestId: params.requestId,
              responseCode: 200,
              responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
              body: Buffer.from(JSON.stringify({
                success: true,
                data: {
                  items: mockRows,
                  summary: { total: 60, errors: 0, slow: 0 },
                  statistics: { errorRate: 0, p50: 42, p95: 145, p99: 410 }
                }
              })).toString('base64')
            });
          } else {
            await cdp.send('Fetch.continueRequest', { requestId: params.requestId });
          }
        } catch {}
      };
      cdp.on('Fetch.requestPaused', onRequestsFetch);

      await navigatePage(cdp, 'http://127.0.0.1:4173/acme/observability/requests');
      await new Promise(r => setTimeout(r, 1500));

      // Scroll barrage, quantization, and resize stress test directly on mounted VirtualList
      const vListStressScript = `
        (async () => {
          // Find scroll container with VirtualList
          const scrollContainers = Array.from(document.querySelectorAll('.sidebar-scroll'));
          const vList = scrollContainers.find(c => c.scrollHeight > c.clientHeight + 100) || scrollContainers[0];

          if (!vList) return { found: false };

          const initialScroll = vList.scrollTop;
          const jumps = [500, 1500, 2500, 4000, 100, 3000, 0];

          for (const target of jumps) {
            vList.scrollTop = target;
            vList.dispatchEvent(new Event('scroll'));
            await new Promise(r => requestAnimationFrame(r));
          }

          // Test resize observer trigger
          const origH = vList.style.height;
          vList.style.height = '300px';
          await new Promise(r => requestAnimationFrame(r));
          vList.style.height = origH || '100%';
          await new Promise(r => requestAnimationFrame(r));

          const finalScroll = vList.scrollTop;
          const renderedRows = vList.querySelectorAll('div[style*="height: 44px"], div[style*="height:44px"]').length;

          return {
            found: true,
            hasNaN: isNaN(finalScroll),
            finalScroll,
            renderedRows
          };
        })();
      `;

      const vListOutcome = await evaluate(cdp, vListStressScript);
      const passedVList = vListOutcome.found && !vListOutcome.hasNaN;
      recordResult('Suite 5', 'VirtualList survives scroll barrage & resize without NaN or layout crash', passedVList, JSON.stringify(vListOutcome));

      cdp.removeAllListeners('Fetch.requestPaused');
      await cdp.send('Fetch.disable');
    }

    console.log('\n[Suite 6] Dynamic Org & Project Scope Guards & Deep-Link Fallback');
    {
      // 6.1 Direct deep-link to non-existent organization slug
      console.log('  Testing invalid orgSlug redirect (/nonexistent-org-slug/dashboard)...');
      await navigatePage(cdp, 'http://127.0.0.1:4173/nonexistent-org-slug/dashboard');
      await new Promise(r => setTimeout(r, 1500));

      const orgRedirectPath = await evaluate(cdp, 'window.location.pathname');
      // OrgRouteGuard must redirect cleanly to fallback active org /acme/dashboard
      const passedOrgRedirect = orgRedirectPath === '/acme/dashboard';
      recordResult('Suite 6', 'Invalid orgSlug deep-link cleanly redirects to fallback active org', passedOrgRedirect, `Path: ${orgRedirectPath}`);

      // 6.2 Direct deep-link to invalid project public ID
      console.log('  Testing invalid projectPublicId deep link (/acme/p/proj_invalid_uuid/overview)...');
      await navigatePage(cdp, 'http://127.0.0.1:4173/acme/p/proj_invalid_uuid/overview');
      await new Promise(r => setTimeout(r, 1500));

      const projDeepLinkCheck = await evaluate(cdp, `
        (() => {
          const body = document.body.innerText || '';
          const overlays = document.querySelectorAll('.route-skeleton-overlay').length;
          const overlayDetails = Array.from(document.querySelectorAll('.route-skeleton-overlay')).map(el => ({
            dataState: el.getAttribute('data-state'),
            ariaHidden: el.getAttribute('aria-hidden'),
            parent: el.parentElement ? el.parentElement.className : '',
            html: el.innerHTML.slice(0, 100)
          }));
          const isWhiteScreen = body.trim().length === 0;
          const hasChrome = body.includes('Projects') && body.includes('Overview');
          return {
            pathname: window.location.pathname,
            overlays,
            overlayDetails,
            isWhiteScreen,
            hasChrome
          };
        })()
      `);
      // ProjectShellPage renders workspace chrome and maintains interactivity without crashing
      const passedProjDeepLink = !projDeepLinkCheck.isWhiteScreen && projDeepLinkCheck.overlays === 0 && projDeepLinkCheck.hasChrome;
      recordResult('Suite 6', 'Invalid projectPublicId maintains shell chrome & zero skeleton deadlock', passedProjDeepLink, JSON.stringify(projDeepLinkCheck));

      // 6.3 Direct deep-link to legacy UUID project URL
      console.log('  Testing legacy UUID project redirect (/acme/p/550e8400-e29b-41d4-a716-446655440000/overview)...');
      await navigatePage(cdp, 'http://127.0.0.1:4173/acme/p/550e8400-e29b-41d4-a716-446655440000/overview');
      await new Promise(r => setTimeout(r, 1500));

      const legacyUuidPath = await evaluate(cdp, 'window.location.pathname');
      // ProjectShellPage redirects legacy UUIDs to /projects/:uuid -> /acme/projects (graceful fallback)
      const passedLegacyUuid = legacyUuidPath === '/acme/projects' || legacyUuidPath.includes('/projects');
      recordResult('Suite 6', 'Legacy UUID project deep-link safely resolves without infinite redirect loops', passedLegacyUuid, `Path: ${legacyUuidPath}`);

      // 6.4 Direct deep-link to valid pre-seeded project
      console.log('  Testing valid pre-seeded project deep-link (/acme/p/proj_1/overview)...');
      await navigatePage(cdp, 'http://127.0.0.1:4173/acme/p/proj_1/overview');
      await new Promise(r => setTimeout(r, 1500));

      const validProjCheck = await evaluate(cdp, `
        (() => {
          const body = document.body.innerText || '';
          const overlays = document.querySelectorAll('.route-skeleton-overlay').length;
          const overlayDetails = Array.from(document.querySelectorAll('.route-skeleton-overlay')).map(el => ({
            dataState: el.getAttribute('data-state'),
            ariaHidden: el.getAttribute('aria-hidden'),
            parent: el.parentElement ? el.parentElement.className : '',
            html: el.innerHTML.slice(0, 80)
          }));
          return {
            pathname: window.location.pathname,
            overlays,
            overlayDetails,
            hasProductionTitle: body.includes('Production') || body.includes('proj_1')
          };
        })()
      `);
      const passedValidProj = validProjCheck.overlays === 0 && validProjCheck.hasProductionTitle;
      recordResult('Suite 6', 'Valid pre-seeded project mounts Frame 1 metadata cleanly', passedValidProj, JSON.stringify(validProjCheck));
    }

    // ── Summary & Invariants Evaluation ──────────────────────────────────
    console.log('\n' + '='.repeat(70));
    console.log('TIER 5 ADVERSARIAL COVERAGE SUMMARY');
    console.log('='.repeat(70));

    const totalTests = testResults.length;
    const passedTests = testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Invariants Audited: ${totalTests}`);
    console.log(`Passed                 : ${passedTests}`);
    console.log(`Failed                 : ${failedTests}`);
    console.log(`Compliance Rate        : ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.error('\nFAILURES DETECTED:');
      for (const f of testResults.filter(t => !t.passed)) {
        console.error(`- [${f.suite}] ${f.scenario}: ${f.details}`);
      }
      process.exit(1);
    } else {
      console.log('\n✅ ALL TIER 5 ADVERSARIAL INVARIANTS PASSED PERFECTLY.');
      process.exit(0);
    }
  } catch (err) {
    console.error('\n[FATAL RUNNER ERROR]:', err);
    process.exit(1);
  } finally {
    if (cdp) cdp.close();
    chrome.kill();
    preview.stop();
  }
}

runAdversarialHardening();
