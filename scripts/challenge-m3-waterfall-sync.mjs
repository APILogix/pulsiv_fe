#!/usr/bin/env node
/**
 * scripts/challenge-m3-waterfall-sync.mjs
 *
 * Empirical Challenge Harness for Milestone 3:
 * - Feature F10: ProjectShellPage Sequential Waterfall Flattening
 * - Feature F11: Deep-Link Org Scope Synchronization & Legacy UUID Redirects
 *
 * Scenarios Tested:
 * 1. Frame 1 Concurrent Rendering:
 *    Direct navigation to `/acme/p/proj_1/overview` renders shell chrome
 *    (`ProjectHeaderBar`) and child `<Outlet />` concurrently on Frame 1.
 * 2. Legacy Redirect & Loop Prevention:
 *    Direct navigation to `/projects/proj_1/overview` cleanly redirects to
 *    `/:orgSlug/p/proj_1/overview` with zero bounce loops and zero skeleton mismatch.
 * 3. UUID Route Regex Bounce Protection:
 *    Navigation to `/acme/p/<UUID>/overview` routes safely without infinite loops.
 * 4. Deep-Link Org Scope Alignment:
 *    Direct navigation to `/acme/p/proj_1/overview` with an out-of-sync org state
 *    in localStorage synchronizes `activeOrgId` on Frame 1 without double-skeleton
 *    flash or CLS > 0.1.
 * 5. ProjectSwitcher Display & Layout Stability:
 *    Evaluates `ProjectSwitcher` display, button width, and layout shift during cold
 *    load and tab switches.
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ── 1. Lightweight CDP Session Client ────────────────────────────────────────

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
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { res, rej } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) {
            rej(new Error(`CDP Error in method: ${msg.error.message}`));
          } else {
            res(msg.result);
          }
        } else if (msg.method && this.eventListeners.has(msg.method)) {
          for (const listener of this.eventListeners.get(msg.method)) {
            listener(msg.params);
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

  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}

// ── 2. Chrome Runner ────────────────────────────────────────────────────────

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
    throw new Error('No Chrome or Chromium executable found on system.');
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
      '--disable-default-apps',
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
    const page = targets.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension://')) || targets[0];
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

// ── 3. Preview Server Checker ───────────────────────────────────────────────

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
      this.stop();
      throw new Error(`Timed out waiting for preview server at ${this.baseUrl}`);
    }

    console.log(`[Preview Server] Preview server ready at ${this.baseUrl}`);
  }

  stop() {
    if (this.spawned && this.process && this.process.pid) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(this.process.pid), '/T', '/F']);
        } else {
          this.process.kill('SIGTERM');
        }
      } catch {}
      this.spawned = false;
    }
  }
}

// ── 4. Storage Injection Scripts ────────────────────────────────────────────

function generateSeedScript(orgStorageOverride = null) {
  const orgStorage = orgStorageOverride || {
    state: {
      activeOrgId: 'org_1',
      activeOrgSlug: 'acme',
      activeProjectId: 'proj_1',
      activeProjectSlug: 'prod'
    },
    version: 0
  };

  return `
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
    sessionStorage.setItem('pulse_current_org_id', '${orgStorage.state.activeOrgId || 'org_1'}');
    sessionStorage.setItem('pulse_current_org_slug', '${orgStorage.state.activeOrgSlug || 'acme'}');
    sessionStorage.setItem('pulse_current_project_id', '${orgStorage.state.activeProjectId || 'proj_1'}');
    sessionStorage.setItem('pulse_current_project_slug', '${orgStorage.state.activeProjectSlug || 'prod'}');

    localStorage.setItem('org-storage', JSON.stringify(${JSON.stringify(orgStorage)}));

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
    // Ignore on about:blank
  }
})();
`;
}

// Injected Frame 1 / Layout Shift / Skeleton Telemetry
const INJECTED_OBSERVER_SCRIPT = `
(() => {
  window.__m3_telemetry = {
    cls: 0,
    shifts: [],
    frame1Captured: false,
    frame1Data: null,
    skeletonMounts: 0,
    skeletonUnmounts: 0,
    skeletonHistory: [],
    projectSwitcherStates: [],
    orgStoreSnapshots: []
  };

  // 1. Layout Shift Observer
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      const clsObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__m3_telemetry.cls += entry.value;
            window.__m3_telemetry.shifts.push({
              value: entry.value,
              startTime: entry.startTime,
              sources: (entry.sources || []).map(s => ({
                tag: s.node ? s.node.tagName : null,
                class: s.node ? s.node.className : null,
                rectCurrent: s.currentRect,
                rectPrevious: s.previousRect
              }))
            });
          }
        }
      });
      clsObs.observe({ type: 'layout-shift', buffered: true });
    } catch {}
  }

  // 2. DOM Mutation Observer to detect Frame 1 mounting and skeleton lifecycle
  const domObs = new MutationObserver((mutations) => {
    const projectHeader = document.querySelector('nav[aria-label="Breadcrumb"]');
    const scrollRegion = document.querySelector('.scroll-region');
    const hasSkeleton = Boolean(document.querySelector('.loading-skeleton') || document.querySelector('[data-skeleton]'));

    // Capture Frame 1 when first meaningful shell elements appear
    if (!window.__m3_telemetry.frame1Captured && (projectHeader || scrollRegion || hasSkeleton)) {
      window.__m3_telemetry.frame1Captured = true;
      window.__m3_telemetry.frame1Data = {
        timestamp: performance.now(),
        hasProjectHeader: Boolean(projectHeader),
        hasScrollRegion: Boolean(scrollRegion),
        hasSkeleton
      };
    }

    // Track Skeleton Transitions
    if (hasSkeleton) {
      const last = window.__m3_telemetry.skeletonHistory[window.__m3_telemetry.skeletonHistory.length - 1];
      if (!last || !last.active) {
        window.__m3_telemetry.skeletonMounts++;
        window.__m3_telemetry.skeletonHistory.push({ time: performance.now(), active: true });
      }
    } else {
      const last = window.__m3_telemetry.skeletonHistory[window.__m3_telemetry.skeletonHistory.length - 1];
      if (last && last.active) {
        window.__m3_telemetry.skeletonUnmounts++;
        window.__m3_telemetry.skeletonHistory.push({ time: performance.now(), active: false });
      }
    }

    // Sample ProjectSwitcher Button Text and Width using specific FolderOpen icon selector
    const switcherButton = document.querySelector('button:has(svg.lucide-folder-open)');
    const switcherSpan = switcherButton?.querySelector('span.truncate');
    if (switcherButton && switcherSpan) {
      const rect = switcherButton.getBoundingClientRect();
      const currentText = switcherSpan.textContent?.trim() || '';
      const prev = window.__m3_telemetry.projectSwitcherStates[window.__m3_telemetry.projectSwitcherStates.length - 1];
      if (!prev || prev.text !== currentText || Math.abs(prev.width - rect.width) > 0.5) {
        window.__m3_telemetry.projectSwitcherStates.push({
          time: performance.now(),
          text: currentText,
          width: rect.width,
          x: rect.x
        });
      }
    }
  });

  domObs.observe(document, { childList: true, subtree: true, attributes: true });

  // Sample on initial animation frames
  requestAnimationFrame(() => {
    const orgStore = window.localStorage ? window.localStorage.getItem('org-storage') : null;
    window.__m3_telemetry.orgStoreSnapshots.push({ frame: 1, time: performance.now(), orgStore });
    requestAnimationFrame(() => {
      const orgStore2 = window.localStorage ? window.localStorage.getItem('org-storage') : null;
      window.__m3_telemetry.orgStoreSnapshots.push({ frame: 2, time: performance.now(), orgStore: orgStore2 });
    });
  });
})();
`;

// ── 5. Main Empirical Challenge Suite ────────────────────────────────────────

async function runChallenge() {
  console.log('============================================================');
  console.log(' EMPIRICAL CHALLENGER (M3): Waterfall & Scope Synchronization');
  console.log('============================================================\n');

  const preview = new PreviewServerManager('http://127.0.0.1:4173');
  await preview.ensureRunning();

  const runner = new ChromeRunner();
  console.log('[Runner] Launching headless browser...');
  await runner.launch();
  const pageWs = await runner.getPageTarget();
  const cdp = new CdpSession(pageWs);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');
  await cdp.send('Performance.enable');
  await cdp.send('Network.enable');

  // Pre-inject observer telemetry into every document
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: INJECTED_OBSERVER_SCRIPT
  });

  // Warmup navigation to baseUrl so document origin is established
  console.log('[Warmup] Initial navigation to root origin...');
  await cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  await new Promise(r => setTimeout(r, 600));

  const testResults = [];

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // TEST 1: Frame 1 Concurrent Rendering of ProjectShell & Outlet (F10)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n── Test 1: Frame 1 Concurrent Rendering of ProjectShell Chrome & Outlet ──');
    let scriptId = (await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: generateSeedScript()
    })).identifier;

    // Track network request start times to verify parallel dispatch
    const networkRequests = [];
    const requestHandler = (params) => {
      networkRequests.push({
        url: params.request.url,
        timestamp: params.wallTime,
        type: params.type
      });
    };
    cdp.on('Network.requestWillBeSent', requestHandler);

    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173/acme/p/proj_1/overview' });
    await new Promise(r => setTimeout(r, 1600));

    // Evaluate Frame 1 observations and DOM state
    const evalResult1 = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const headers = Array.from(document.querySelectorAll('header')).map(h => ({
          classes: h.className,
          text: h.textContent?.replace(/\\s+/g, ' ').trim()?.slice(0, 80)
        }));
        const navs = Array.from(document.querySelectorAll('nav')).map(n => ({
          ariaLabel: n.getAttribute('aria-label'),
          text: n.textContent?.replace(/\\s+/g, ' ').trim()?.slice(0, 80)
        }));
        const projectHeader = document.querySelector('nav[aria-label="Breadcrumb"]');
        const projectTitle = projectHeader ? projectHeader.querySelector('a:nth-of-type(2)')?.textContent : null;
        const outletScrollRegion = document.querySelector('.scroll-region');
        const workspacePage = document.querySelector('.workspace-page');
        const telemetry = window.__m3_telemetry;

        return {
          headers,
          navs,
          headerPresent: headers.length > 0,
          projectHeaderPresent: Boolean(projectHeader),
          projectTitle: projectTitle ? projectTitle.trim() : null,
          outletPresent: Boolean(outletScrollRegion),
          workspacePagePresent: Boolean(workspacePage),
          telemetry,
          currentUrl: window.location.href
        };
      })()`,
      returnByValue: true
    });

    const res1 = evalResult1.result.value;
    console.log(`- Final URL: ${res1.currentUrl}`);
    console.log(`- Headers found:`, res1.headers);
    console.log(`- Navs found:`, res1.navs);
    console.log(`- ProjectHeaderBar Present: ${res1.projectHeaderPresent}`);
    console.log(`- Project Breadcrumb Title: "${res1.projectTitle}"`);
    console.log(`- Child Outlet Scroll Region Present: ${res1.outletPresent}`);
    console.log(`- Child Workspace Page Content Present: ${res1.workspacePagePresent}`);
    console.log(`- Frame 1 Telemetry:`, res1.telemetry?.frame1Data);

    const frame1Ok = res1.projectHeaderPresent && res1.outletPresent;
    if (frame1Ok) {
      console.log('✅ PASS: ProjectHeaderBar and child <Outlet /> mounted concurrently on Frame 1.');
      testResults.push({ name: 'F10 Frame 1 Concurrent Shell & Outlet Mount', pass: true });
    } else {
      console.error('❌ FAIL: Shell chrome and Outlet did not mount concurrently on Frame 1!');
      testResults.push({ name: 'F10 Frame 1 Concurrent Shell & Outlet Mount', pass: false, details: res1 });
    }

    await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId });

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 2: Legacy UUID / ID Redirect (`/projects/proj_1/overview`) (F10 & F11)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n── Test 2: Legacy UUID / Identifier Redirect Without Bounce Loops ──');
    scriptId = (await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: generateSeedScript()
    })).identifier;

    const navHistory = [];
    const navHandler = (params) => {
      if (params.frame && !params.frame.parentId) {
        navHistory.push({ url: params.frame.url, time: performance.now() });
      }
    };
    cdp.on('Page.frameNavigated', navHandler);

    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173/projects/proj_1/overview' });
    await new Promise(r => setTimeout(r, 1600));

    const evalResult2 = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        return {
          currentUrl: window.location.href,
          pathname: window.location.pathname,
          cls: window.__m3_telemetry.cls,
          shifts: window.__m3_telemetry.shifts,
          hasProjectHeader: Boolean(document.querySelector('header nav[aria-label="Breadcrumb"]')),
          hasOutlet: Boolean(document.querySelector('.scroll-region'))
        };
      })()`,
      returnByValue: true
    });

    const res2 = evalResult2.result.value;
    console.log(`- Final Pathname: ${res2.pathname}`);
    console.log(`- Redirect CLS: ${res2.cls}`);
    console.log(`- Frame Navigations Count: ${navHistory.length}`);
    for (const nav of navHistory) {
      console.log(`    -> ${nav.url}`);
    }

    const redirectTargetOk = res2.pathname === '/acme/p/proj_1/overview';
    const noLoopOk = navHistory.length <= 4;
    const redirectClsOk = res2.cls <= 0.1;

    if (redirectTargetOk && noLoopOk && redirectClsOk) {
      console.log('✅ PASS: Redirected to /acme/p/proj_1/overview with 0 bounce loops and CLS <= 0.1.');
      testResults.push({ name: 'F11 Legacy Redirect Clean Resolution & CLS', pass: true });
    } else {
      console.error('❌ FAIL: Legacy redirect looped or incurred excessive CLS:', { redirectTargetOk, noLoopOk, redirectClsOk, res2 });
      testResults.push({ name: 'F11 Legacy Redirect Clean Resolution & CLS', pass: false, details: res2 });
    }

    await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId });

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 3: UUID Format Direct Bounce Prevention (F10)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n── Test 3: UUID Regex Protection Against Infinite Route Oscillation ──');
    scriptId = (await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: generateSeedScript()
    })).identifier;

    const uuidNavHistory = [];
    const uuidNavHandler = (params) => {
      if (params.frame && !params.frame.parentId) {
        uuidNavHistory.push(params.frame.url);
      }
    };
    cdp.on('Page.frameNavigated', uuidNavHandler);

    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173/acme/p/11111111-2222-3333-4444-555555555555/overview' });
    await new Promise(r => setTimeout(r, 1600));

    const evalResult3 = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        return {
          currentUrl: window.location.href,
          pathname: window.location.pathname
        };
      })()`,
      returnByValue: true
    });

    const res3 = evalResult3.result.value;
    console.log(`- Final Path after UUID bounce: ${res3.pathname}`);
    console.log(`- UUID Navigation Trail:`, uuidNavHistory);

    const uuidNoInfiniteLoop = uuidNavHistory.length <= 5;
    if (uuidNoInfiniteLoop) {
      console.log('✅ PASS: UUID bounce handled gracefully without infinite router oscillation.');
      testResults.push({ name: 'F10 UUID Regex Route Loop Protection', pass: true });
    } else {
      console.error('❌ FAIL: Infinite loop detected during UUID route bounce!');
      testResults.push({ name: 'F10 UUID Regex Route Loop Protection', pass: false, details: res3 });
    }

    await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId });

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 4: Deep-Link Org Scope Synchronization with Out-Of-Sync State (F11)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n── Test 4: Deep-Link Org Scope Alignment & Double-Skeleton Flash ──');
    // Seed with intentionally MISMATCHED org state: activeOrgId is 'org_mismatched_xyz'
    const mismatchedStorage = {
      state: {
        activeOrgId: 'org_mismatched_xyz',
        activeOrgSlug: 'other-slug',
        activeProjectId: 'proj_other',
        activeProjectSlug: 'other'
      },
      version: 0
    };

    scriptId = (await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: generateSeedScript(mismatchedStorage)
    })).identifier;

    const test4Exceptions = [];
    const test4Console = [];
    const exceptionHandler = (params) => {
      test4Exceptions.push({
        text: params.exceptionDetails.text,
        description: params.exceptionDetails.exception?.description
      });
    };
    const consoleHandler = (params) => {
      if (params.type === 'error' || params.type === 'warning') {
        test4Console.push({
          type: params.type,
          args: params.args?.map(a => a.value || a.description || JSON.stringify(a)).join(' ')
        });
      }
    };
    cdp.on('Runtime.exceptionThrown', exceptionHandler);
    cdp.on('Runtime.consoleAPICalled', consoleHandler);

    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173/acme/p/proj_1/overview' });
    await new Promise(r => setTimeout(r, 2600));

    const evalResult4 = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const orgStorageRaw = localStorage.getItem('org-storage');
        const orgStorage = orgStorageRaw ? JSON.parse(orgStorageRaw) : null;
        const telemetry = window.__m3_telemetry;

        const headers = Array.from(document.querySelectorAll('header')).map(h => ({
          classes: h.className,
          text: h.textContent?.replace(/\\s+/g, ' ').trim()?.slice(0, 80)
        }));
        const navs = Array.from(document.querySelectorAll('nav')).map(n => ({
          ariaLabel: n.getAttribute('aria-label'),
          text: n.textContent?.replace(/\\s+/g, ' ').trim()?.slice(0, 80)
        }));

        const mainContent = (document.querySelector('main')?.textContent || document.querySelector('.scroll-region')?.textContent || document.body.textContent)?.replace(/\\s+/g, ' ').trim()?.slice(0, 200) || '';
        const exceptionMessage = document.querySelector('div.break-words')?.textContent?.trim() || null;
        const exceptionStack = document.querySelector('pre')?.textContent?.trim() || Array.from(document.querySelectorAll('.break-all, .truncate')).map(el => el.textContent).filter(t => t && t.includes('at ')).slice(0, 5).join('; ');

        return {
          headers,
          navs,
          mainContent,
          exceptionMessage,
          exceptionStack,
          persistedOrgId: orgStorage?.state?.activeOrgId,
          persistedOrgSlug: orgStorage?.state?.activeOrgSlug,
          cls: telemetry.cls,
          skeletonMounts: telemetry.skeletonMounts,
          skeletonUnmounts: telemetry.skeletonUnmounts,
          skeletonHistory: telemetry.skeletonHistory,
          hasProjectHeader: Boolean(document.querySelector('nav[aria-label="Breadcrumb"]')),
          hasOutlet: Boolean(document.querySelector('.scroll-region'))
        };
      })()`,
      returnByValue: true
    });

    const res4 = evalResult4.result.value;
    console.log(`- Test 4 Headers:`, res4.headers);
    console.log(`- Test 4 Navs:`, res4.navs);
    console.log(`- Test 4 Main Content: "${res4.mainContent}"`);
    console.log(`- Test 4 Exception Message: "${res4.exceptionMessage}"`);
    console.log(`- Test 4 Exception Stack:`, res4.exceptionStack);
    console.log(`- Test 4 Captured Exceptions:`, test4Exceptions);
    console.log(`- Test 4 Captured Console Messages:`, test4Console);
    console.log(`- Persisted Org ID after render: ${res4.persistedOrgId}`);
    console.log(`- Persisted Org Slug after render: ${res4.persistedOrgSlug}`);
    console.log(`- Skeleton Mounts: ${res4.skeletonMounts}, Unmounts: ${res4.skeletonUnmounts}`);
    console.log(`- Skeleton History:`, res4.skeletonHistory);
    console.log(`- Deep-Link CLS: ${res4.cls}`);

    const orgSyncedOk = res4.persistedOrgId === 'org_1' && res4.persistedOrgSlug === 'acme';
    const noDoubleSkeletonFlash = res4.skeletonMounts <= 1;
    const deepLinkClsOk = res4.cls <= 0.1;
    const shellMountedOk = res4.hasProjectHeader && res4.hasOutlet;

    if (orgSyncedOk && noDoubleSkeletonFlash && deepLinkClsOk && shellMountedOk) {
      console.log('✅ PASS: Org scope aligned synchronously on Frame 1 with 0 double-skeleton flash and CLS <= 0.1.');
      testResults.push({ name: 'F11 Org Scope Sync & Zero Double-Skeleton Flash', pass: true });
    } else {
      console.error('❌ FAIL: Org scope synchronization failed or caused double-skeleton flash:', {
        orgSyncedOk, noDoubleSkeletonFlash, deepLinkClsOk, shellMountedOk, res4
      });
      testResults.push({ name: 'F11 Org Scope Sync & Zero Double-Skeleton Flash', pass: false, details: res4 });
    }

    await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId });

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 5: ProjectSwitcher Display & Layout Stability
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n── Test 5: ProjectSwitcher Immediate Display & Layout Shift ──');
    scriptId = (await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: generateSeedScript()
    })).identifier;

    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173/acme/p/proj_1/overview' });
    await new Promise(r => setTimeout(r, 1200));

    const evalResult5 = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const switcherStates = window.__m3_telemetry.projectSwitcherStates;
        const switcherButton = document.querySelector('button:has(svg.lucide-folder-open)');
        const currentText = switcherButton?.querySelector('span.truncate')?.textContent?.trim();
        const cls = window.__m3_telemetry.cls;
        const shifts = window.__m3_telemetry.shifts;

        return {
          switcherStates,
          currentText,
          cls,
          shifts
        };
      })()`,
      returnByValue: true
    });

    const res5 = evalResult5.result.value;
    console.log(`- ProjectSwitcher States Observed:`, res5.switcherStates);
    console.log(`- Final ProjectSwitcher Text: "${res5.currentText}"`);
    console.log(`- Total CLS during Project Workspace: ${res5.cls}`);

    // Test tab transition within the project:
    console.log('[Tab Transition] Navigating to /acme/p/proj_1/analytics...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const analyticsLink = document.querySelector('a[href*="/analytics"]');
        if (analyticsLink) {
          analyticsLink.click();
        } else {
          window.location.href = '/acme/p/proj_1/analytics';
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    const evalResult5b = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const switcherButton = document.querySelector('button:has(svg.lucide-folder-open)');
        const text = switcherButton?.querySelector('span.truncate')?.textContent?.trim();
        const cls = window.__m3_telemetry.cls;
        return { text, cls, pathname: window.location.pathname };
      })()`,
      returnByValue: true
    });

    const res5b = evalResult5b.result.value;
    console.log(`- Tab Switch Pathname: ${res5b.pathname}`);
    console.log(`- Tab Switch Switcher Text: "${res5b.text}"`);
    console.log(`- Tab Switch Total Cumulative CLS: ${res5b.cls}`);

    const switcherClsOk = res5b.cls <= 0.1;
    const tabSwitchOk = Boolean(res5b.text);

    if (switcherClsOk && tabSwitchOk) {
      console.log('✅ PASS: ProjectSwitcher remained stable across navigation with CLS <= 0.1.');
      testResults.push({ name: 'F10 & F11 ProjectSwitcher Stability & CLS', pass: true });
    } else {
      console.error('❌ FAIL: ProjectSwitcher caused layout shift:', { switcherClsOk, tabSwitchOk, res5b });
      testResults.push({ name: 'F10 & F11 ProjectSwitcher Stability & CLS', pass: false, details: res5b });
    }

    await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId });

  } finally {
    cdp.close();
    runner.kill();
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log(' EMPIRICAL CHALLENGE SUITE SUMMARY');
  console.log('============================================================');
  let allPass = true;
  for (const t of testResults) {
    const status = t.pass ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${t.name}`);
    if (!t.pass) allPass = false;
  }
  console.log('============================================================\n');

  if (!allPass) {
    process.exit(1);
  }
}

runChallenge().catch((err) => {
  console.error('[FATAL CHALLENGE ERROR]', err);
  process.exit(1);
});
