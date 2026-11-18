// scripts/challenge-m1-interactivity.mjs
// Adversarial Empirical Challenger for Milestone 1: Sidebar Toggle & Interactivity (Standalone)

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';

class StandaloneCdpSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
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
            rej(new Error(`CDP Error: ${msg.error.message}`));
          } else {
            res(msg.result);
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

  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}

class StandaloneChromeRunner {
  constructor() {
    this.process = null;
    this.userDataDir = null;
    this.wsEndpoint = null;
  }

  findChromePath() {
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) return p;
    }
    throw new Error('Chrome not found');
  }

  async launch() {
    const chromePath = this.findChromePath();
    this.userDataDir = path.join(os.tmpdir(), `cwv_chrome_challenger_${Date.now()}`);
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

    this.process = spawn(chromePath, chromeArgs, { stdio: 'ignore' });

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
      await new Promise((r) => setTimeout(r, 150));
    }

    if (!port) throw new Error('DevTools port not ready');
    this.wsEndpoint = `ws://127.0.0.1:${port}${browserWsPath}`;

    const res = await fetch(`http://127.0.0.1:${port}/json/list`);
    const targets = await res.json();
    const page = targets.find((t) => t.type === 'page') || targets[0];
    return page.webSocketDebuggerUrl;
  }

  kill() {
    if (this.process && this.process.pid) {
      try {
        spawn('taskkill', ['/pid', String(this.process.pid), '/T', '/F']);
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

async function isServerRunning(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
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

const AUTH_SEED = `
(() => {
  try {
    sessionStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: { id: 'u_challenger', email: 'challenger@lynk.dev', name: 'Empirical Challenger', is_admin: true },
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
      state: { activeOrgId: 'org_1', activeOrgSlug: 'acme', activeProjectId: 'proj_1', activeProjectSlug: 'prod' },
      version: 0
    }));
    localStorage.setItem('app-bootstrap-storage', JSON.stringify({
      state: {
        bootstrap: {
          currentOrganizationId: 'org_1',
          organizations: [{ id: 'org_1', name: 'Acme Corp', slug: 'acme', role: 'owner', isCurrent: true }],
          projects: [{ id: 'proj_1', name: 'Production', slug: 'prod', status: 'active', publicId: 'proj_1' }],
          billing: { plan: { id: 'p_ent', key: 'enterprise', name: 'Enterprise' }, status: 'active', currentPeriodEnd: new Date(Date.now() + 864000000).toISOString(), cancelAtPeriodEnd: false },
          features: { ai: true, sso: true, scim: true, audit_logs: true, custom_domains: true },
          integrations: { slack: true, pagerduty: true, github: true },
          quotas: { events: { limit: 10000000, used: 250000, remaining: 9750000 }, aiCredits: { limit: 50000, used: 1200, remaining: 48800 } },
          usage: { monthlyEvents: { limit: 10000000, used: 250000, remaining: 9750000, percentage: 2.5 }, aiCredits: { limit: 50000, used: 1200, remaining: 48800, percentage: 2.4 } }
        },
        lastSuccessfulFetchAt: Date.now(),
        lastFetchedAt: Date.now()
      },
      version: 1
    }));
  } catch (err) {}
})();
`;

async function main() {
  console.log('============================================================');
  console.log(' CHALLENGER 1: SIDEBAR INTERACTIVITY & TRANSITION VERIFICATION');
  console.log('============================================================\n');

  const serverUrl = 'http://127.0.0.1:4173';
  let spawnedServer = null;

  if (!(await isServerRunning(serverUrl))) {
    console.log('[Preview Server] Spawning preview server on port 4173...');
    const viteBin = path.resolve('node_modules/vite/bin/vite.js');
    spawnedServer = spawn(process.execPath, [viteBin, 'preview', '--port', '4173', '--host', '127.0.0.1'], {
      stdio: 'ignore'
    });
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await isServerRunning(serverUrl)) break;
    }
  } else {
    console.log('[Preview Server] Connected to existing server at ' + serverUrl);
  }

  const runner = new StandaloneChromeRunner();
  const pageWs = await runner.launch();
  const cdp = new StandaloneCdpSession(pageWs);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  const observerScript = `
    window.__shiftLog = [];
    window.__unattributedCls = 0;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__shiftLog.push({
            value: entry.value,
            hadRecentInput: entry.hadRecentInput,
            startTime: Math.round(entry.startTime)
          });
          if (!entry.hadRecentInput) {
            window.__unattributedCls += entry.value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) {}
  `;

  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `${AUTH_SEED}\n${observerScript}`
  });

  // Pre-warm origin and seed auth storage
  await cdp.send('Page.navigate', { url: serverUrl });
  await new Promise((r) => setTimeout(r, 600));
  await cdp.send('Runtime.evaluate', { expression: AUTH_SEED });

  const testReport = { passed: 0, failed: 0 };
  function assert(name, condition, message) {
    if (condition) {
      console.log(`[PASS] ${name}: ${message}`);
      testReport.passed++;
    } else {
      console.error(`[FAIL] ${name}: ${message}`);
      testReport.failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Initial Render State on /acme/observability
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Testing Initial State on Route with Inner Items (/acme/observability) ---');
  await cdp.send('Page.navigate', { url: `${serverUrl}/acme/observability` });
  await new Promise((r) => setTimeout(r, 2000));

  // Verify URL did not redirect to /auth/login
  const navUrl = await cdp.send('Runtime.evaluate', { expression: 'window.location.pathname' });
  console.log('  -> Current pathname:', navUrl.result?.value);

  const state1 = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const flyout = document.querySelector('.flyout-container');
      if (!flyout) return { found: false };
      const rect = flyout.getBoundingClientRect();
      const style = window.getComputedStyle(flyout);
      const classList = Array.from(flyout.classList);
      return {
        found: true,
        width: Math.round(rect.width),
        opacity: style.opacity,
        hasTransition: classList.some(c => c.includes('transition-[width,opacity]')),
        isInert: flyout.hasAttribute('inert')
      };
    })()`,
    returnByValue: true
  });

  const data1 = state1.result?.value;
  assert('Flyout Exists', data1?.found === true, 'flyout-container found in DOM');
  assert('Initial Flyout Width', data1?.width >= 240, `Initial width is ${data1?.width}px (open)`);
  assert('Post-Mount Transition Enabled', data1?.hasTransition === true, 'Transition class active post-mount');
  assert('Interactive State', data1?.isInert === false, 'Flyout is interactive (not inert)');

  // --------------------------------------------------------------------------
  // TEST 2: Smooth Collapse via Header Toggle Button
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing Header Toggle Click -> Smooth Collapse ---');
  const closeBtn = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[aria-label="Close inner sidebar"]') ||
                  document.querySelector('button[title="Close inner sidebar"]');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width };
    })()`,
    returnByValue: true
  });

  const closePos = closeBtn.result?.value;
  assert('Close Toggle Button Exists', Boolean(closePos && closePos.width > 0), `Button at (${closePos?.x}, ${closePos?.y})`);

  if (closePos) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: closePos.x,
      y: closePos.y,
      button: 'left',
      clickCount: 1
    });
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: closePos.x,
      y: closePos.y,
      button: 'left',
      clickCount: 1
    });

    const collapseSamples = [];
    for (const d of [50, 70, 80, 150]) {
      await new Promise((r) => setTimeout(r, d));
      const s = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const f = document.querySelector('.flyout-container');
          return f ? Math.round(f.getBoundingClientRect().width) : -1;
        })()`,
        returnByValue: true
      });
      collapseSamples.push(s.result?.value);
    }
    console.log('  -> Intermediate collapse widths:', collapseSamples.join('px -> ') + 'px');

    await new Promise((r) => setTimeout(r, 200));
    const finalCollapsed = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const f = document.querySelector('.flyout-container');
        return {
          width: Math.round(f.getBoundingClientRect().width),
          opacity: window.getComputedStyle(f).opacity,
          inert: f.hasAttribute('inert')
        };
      })()`,
      returnByValue: true
    });

    const colData = finalCollapsed.result?.value;
    const hasIntermediate = collapseSamples.some((w) => w > 0 && w < (data1?.width || 272));
    assert('Smooth Transition Animation', hasIntermediate, `Observed in-flight animation frame widths: ${collapseSamples.join(', ')}`);
    assert('Collapsed to 0px', colData?.width === 0, `Final width is ${colData?.width}px, opacity is ${colData?.opacity}`);
    assert('Marked Inert on Collapse', colData?.inert === true, 'Inert attribute applied to collapsed container');

    // --------------------------------------------------------------------------
    // TEST 3: Smooth Expand via Header Toggle Button
    // --------------------------------------------------------------------------
    console.log('\n--- 3. Testing Header Toggle Click -> Smooth Expand ---');
    const openBtn = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('button[aria-label="Open inner sidebar"]') ||
                    document.querySelector('button[title="Open inner sidebar"]');
        if (!btn) {
          const allHeaderBtns = Array.from(document.querySelectorAll('header button')).map(b => ({
            label: b.getAttribute('aria-label'),
            title: b.getAttribute('title'),
            cls: b.className
          }));
          return { notFound: true, allHeaderBtns };
        }
        const rect = btn.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width };
      })()`,
      returnByValue: true
    });

    const openPos = openBtn.result?.value;
    if (openPos?.notFound) {
      console.log('  -> Open button query failed. Header buttons present:', JSON.stringify(openPos.allHeaderBtns));
    }
    assert('Open Toggle Button Exists', Boolean(openPos && !openPos.notFound && openPos.width > 0), `Button at (${openPos?.x}, ${openPos?.y})`);

    if (openPos) {
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: openPos.x,
        y: openPos.y,
        button: 'left',
        clickCount: 1
      });
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: openPos.x,
        y: openPos.y,
        button: 'left',
        clickCount: 1
      });

      const expandSamples = [];
      for (const d of [50, 70, 80, 150]) {
        await new Promise((r) => setTimeout(r, d));
        const s = await cdp.send('Runtime.evaluate', {
          expression: `(() => {
            const f = document.querySelector('.flyout-container');
            return f ? Math.round(f.getBoundingClientRect().width) : -1;
          })()`,
          returnByValue: true
        });
        expandSamples.push(s.result?.value);
      }
      console.log('  -> Intermediate expand widths:', expandSamples.join('px -> ') + 'px');

      await new Promise((r) => setTimeout(r, 200));
      const finalExpanded = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const f = document.querySelector('.flyout-container');
          return {
            width: Math.round(f.getBoundingClientRect().width),
            opacity: window.getComputedStyle(f).opacity,
            inert: f.hasAttribute('inert')
          };
        })()`,
        returnByValue: true
      });

      const expData = finalExpanded.result?.value;
      const hasIntermediateOpen = expandSamples.some((w) => w > 0 && w < (expData?.width || 272));
      assert('Smooth Expand Animation', hasIntermediateOpen, `Observed in-flight animation frame widths: ${expandSamples.join(', ')}`);
      assert('Expanded to Full Width', expData?.width >= 240, `Final width is ${expData?.width}px, opacity is ${expData?.opacity}`);
      assert('Interactive on Expand', expData?.inert === false, 'Inert attribute removed upon expand');
    }
  }

  // --------------------------------------------------------------------------
  // TEST 4: Primary Rail Switching (Home -> Dashboards)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Testing Rail Navigation Interactivity ---');
  await cdp.send('Page.navigate', { url: `${serverUrl}/acme/dashboard` });
  await new Promise((r) => setTimeout(r, 2000));

  const dashFlyout = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const f = document.querySelector('.flyout-container');
      return f ? Math.round(f.getBoundingClientRect().width) : -1;
    })()`,
    returnByValue: true
  });
  assert('Dashboard Initial Flyout Closed', dashFlyout.result?.value === 0, `Width on /dashboard is ${dashFlyout.result?.value}px`);

  // Find Dashboards rail button (which has children)
  const railBtn = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[data-title="Dashboards"]') ||
                  document.querySelector('button[aria-label="Open Dashboards"]') ||
                  document.querySelector('button[data-title="Observe"]') ||
                  document.querySelector('button[aria-label="Open Observe"]');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, title: btn.getAttribute('data-title') };
    })()`,
    returnByValue: true
  });

  const railPos = railBtn.result?.value;
  assert('Rail Button with Children Found', Boolean(railPos), `Button (${railPos?.title}) at (${railPos?.x}, ${railPos?.y})`);

  if (railPos) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: railPos.x,
      y: railPos.y,
      button: 'left',
      clickCount: 1
    });
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: railPos.x,
      y: railPos.y,
      button: 'left',
      clickCount: 1
    });

    await new Promise((r) => setTimeout(r, 350));
    const openedByRail = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const f = document.querySelector('.flyout-container');
        return f ? Math.round(f.getBoundingClientRect().width) : -1;
      })()`,
      returnByValue: true
    });

    assert('Flyout Opened by Rail Click', openedByRail.result?.value >= 240, `Flyout width is ${openedByRail.result?.value}px`);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Verify Layout Shift Attribution During Interactive Clicks
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Testing Layout Shift Attribution During Interactive Clicks ---');
  const shiftReport = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      return {
        unattributedCls: window.__unattributedCls || 0,
        totalEntries: (window.__shiftLog || []).length,
        log: window.__shiftLog || []
      };
    })()`,
    returnByValue: true
  });

  const shifts = shiftReport.result?.value;
  console.log(`  -> Unattributed CLS: ${shifts?.unattributedCls} across ${shifts?.totalEntries} layout shift events`);
  assert('Zero Unattributed CLS', (shifts?.unattributedCls || 0) === 0, 'All user-driven layout movements have hadRecentInput: true (CLS = 0)');

  cdp.close();
  runner.kill();
  if (spawnedServer) {
    try {
      spawn('taskkill', ['/pid', String(spawnedServer.pid), '/T', '/F']);
    } catch {}
  }

  console.log('\n============================================================');
  console.log(`INTERACTIVITY CHALLENGE SUMMARY: ${testReport.passed} PASSED | ${testReport.failed} FAILED`);
  console.log('============================================================\n');

  if (testReport.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
