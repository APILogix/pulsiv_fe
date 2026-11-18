// scripts/challenge-m1-adversarial.mjs
// Adversarial Stress Harness for CLS & Layout Stability (Self-contained)

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';

class CdpSession {
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
          if (msg.error) rej(new Error(msg.error.message || JSON.stringify(msg.error)));
          else res(msg.result);
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

class ChromeRunner {
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
    throw new Error('No compatible Chrome/Edge executable found on system.');
  }

  async launch() {
    const chromePath = this.findChromePath();
    this.userDataDir = path.join(os.tmpdir(), `cwv_adv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
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

    if (!port) throw new Error('Failed to read DevToolsActivePort.');
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
    if (this.userDataDir && fs.existsSync(this.userDataDir)) {
      try {
        fs.rmSync(this.userDataDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

async function isServerRunning(url = 'http://127.0.0.1:4173') {
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

const AUTH_SEED_SCRIPT = `
(() => {
  try {
    const pathname = window.location.pathname;
    const isPublicGuestPath = 
      pathname.startsWith('/auth') ||
      pathname === '/accept-invite' ||
      pathname === '/loading' ||
      pathname === '/error-preview' ||
      pathname.startsWith('/account/delete/confirm');

    if (isPublicGuestPath) {
      sessionStorage.removeItem('auth-storage');
      sessionStorage.removeItem('pulse_access_token');
      sessionStorage.removeItem('pulse_access_token_expires_at');
      sessionStorage.removeItem('pulse_current_org_id');
      sessionStorage.removeItem('pulse_current_org_slug');
      sessionStorage.removeItem('pulse_current_project_id');
      sessionStorage.removeItem('pulse_current_project_slug');
      return;
    }

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

    localStorage.setItem('org-storage', JSON.stringify({
      state: {
        activeOrgId: 'org_1',
        activeOrgSlug: 'acme',
        currentProjectId: 'proj_1',
        currentProjectSlug: 'pulsiv-core',
        sidebarCollapsed: false,
        recentlyViewedProjects: ['proj_1', 'proj_2']
      },
      version: 0
    }));
  } catch (e) {
    console.error('Failed to seed auth in harness', e);
  }
})();
`;

async function runAdversarialClsSuite() {
  console.log('============================================================');
  console.log(' ADVERSARIAL CLS & CWV STRESS HARNESS');
  console.log('============================================================\n');

  if (!await isServerRunning('http://127.0.0.1:4173')) {
    console.log('[Notice] Spawning preview server on 4173...');
    const viteBin = path.resolve('node_modules/vite/bin/vite.js');
    spawn(process.execPath, [viteBin, 'preview', '--port', '4173', '--host', '127.0.0.1'], {
      stdio: 'ignore',
      detached: true
    }).unref();
    await new Promise(r => setTimeout(r, 2000));
  }

  const runner = new ChromeRunner();
  await runner.launch();
  const pageWs = await runner.getPageTarget();
  const cdp = new CdpSession(pageWs);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');
  await cdp.send('Performance.enable');

  const observerScript = `
    window.__clsEvents = [];
    window.__totalCls = 0;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__totalCls += entry.value;
            window.__clsEvents.push({
              value: entry.value,
              startTime: Math.round(entry.startTime),
              hadRecentInput: entry.hadRecentInput,
              sources: (entry.sources || []).map(s => {
                const node = s.node;
                return {
                  tagName: node ? node.tagName : null,
                  className: node ? (typeof node.className === 'string' ? node.className : '') : null,
                  id: node ? node.id : null,
                  prev: s.previousRect ? { x: Math.round(s.previousRect.x), y: Math.round(s.previousRect.y), w: Math.round(s.previousRect.width), h: Math.round(s.previousRect.height) } : null,
                  curr: s.currentRect ? { x: Math.round(s.currentRect.x), y: Math.round(s.currentRect.y), w: Math.round(s.currentRect.width), h: Math.round(s.currentRect.height) } : null
                };
              })
            });
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.error('Failed to attach layout-shift observer', e);
    }
  `;

  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `${AUTH_SEED_SCRIPT}\n${observerScript}`
  });

  const stressScenarios = [
    // 1. Viewport Variations
    {
      name: 'Mobile Viewport (375x667)',
      path: '/acme/dashboard',
      viewport: { width: 375, height: 667, deviceScaleFactor: 2, mobile: true },
      throttle: false,
      seedStorage: null
    },
    {
      name: 'Tablet Viewport (768x1024)',
      path: '/acme/dashboard',
      viewport: { width: 768, height: 1024, deviceScaleFactor: 2, mobile: false },
      throttle: false,
      seedStorage: null
    },
    {
      name: 'Standard Laptop (1366x768)',
      path: '/acme/dashboard',
      viewport: { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false },
      throttle: false,
      seedStorage: null
    },
    {
      name: 'Ultrawide Desktop (2560x1440)',
      path: '/acme/dashboard',
      viewport: { width: 2560, height: 1440, deviceScaleFactor: 1, mobile: false },
      throttle: false,
      seedStorage: null
    },

    // 2. Network & CPU Throttling (Fast 3G + 4x CPU slowdown)
    {
      name: 'Throttled Fast 3G + 4x CPU: /acme/dashboard',
      path: '/acme/dashboard',
      viewport: { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
      throttle: true,
      seedStorage: null
    },
    {
      name: 'Throttled Fast 3G + 4x CPU: /auth/login',
      path: '/auth/login',
      viewport: { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
      throttle: true,
      seedStorage: null
    },
    {
      name: 'Throttled Fast 3G + 4x CPU: /acme/observability',
      path: '/acme/observability',
      viewport: { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
      throttle: true,
      seedStorage: null
    },
    {
      name: 'Throttled Fast 3G + 4x CPU: /acme/p/proj_1/overview',
      path: '/acme/p/proj_1/overview',
      viewport: { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
      throttle: true,
      seedStorage: null
    },

    // 3. Direct Route Deep Link Mounts
    {
      name: 'Direct Mount: /acme/projects',
      path: '/acme/projects',
      viewport: { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
      throttle: false,
      seedStorage: null
    },
    {
      name: 'Direct Mount: /acme/alerts',
      path: '/acme/alerts',
      viewport: { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
      throttle: false,
      seedStorage: null
    },
    {
      name: 'Direct Mount: /acme/dashboards/geo',
      path: '/acme/dashboards/geo',
      viewport: { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
      throttle: false,
      seedStorage: null
    },

    // 4. Stale Session Storage Attack (Spurious rail selection)
    {
      name: 'Stale Storage: sentinel_selected_rail="Observability" on /acme/dashboard',
      path: '/acme/dashboard',
      viewport: { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
      throttle: false,
      seedStorage: { 'sentinel_selected_rail': 'Observability' }
    },
    {
      name: 'Stale Storage: sentinel_selected_rail="Workspaces" on /acme/dashboard',
      path: '/acme/dashboard',
      viewport: { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
      throttle: false,
      seedStorage: { 'sentinel_selected_rail': 'Workspaces' }
    }
  ];

  let passedAll = true;
  const results = [];

  for (const scenario of stressScenarios) {
    console.log(`Running Stress Scenario: ${scenario.name}...`);

    // Set viewport
    await cdp.send('Emulation.setDeviceMetricsOverride', scenario.viewport);

    // Set CPU & Network throttling
    if (scenario.throttle) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: ((1.6 * 1024 * 1024) / 8),
        uploadThroughput: ((750 * 1024) / 8),
        connectionType: 'cellular3g'
      });
    } else {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
        connectionType: 'none'
      });
    }

    // Seed custom storage if requested
    if (scenario.seedStorage) {
      await cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173/loading' });
      await new Promise(r => setTimeout(r, 300));
      for (const [k, v] of Object.entries(scenario.seedStorage)) {
        await cdp.send('Runtime.evaluate', {
          expression: `sessionStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)})`
        });
      }
    }

    // Navigate to target route
    const fullUrl = `http://127.0.0.1:4173${scenario.path}`;
    await cdp.send('Page.navigate', { url: fullUrl });

    // Wait for route settle
    const waitTime = scenario.throttle ? 3500 : 2000;
    await new Promise(r => setTimeout(r, waitTime));

    const evalResult = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const nav = performance.getEntriesByType('navigation')[0] || {};
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find(p => p.name === 'first-contentful-paint')?.startTime || null;
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        const lcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : null;

        return {
          fcp: fcp ? Math.round(fcp) : null,
          lcp: lcp ? Math.round(lcp) : null,
          ttfb: Math.round(nav.responseStart || 0),
          totalCls: Number((window.__totalCls || 0).toFixed(4)),
          clsEvents: window.__clsEvents || []
        };
      })()`,
      returnByValue: true
    });

    const data = evalResult.result?.value || {};
    const pass = data.totalCls < 0.1;
    if (!pass) passedAll = false;

    console.log(`  Result: CLS = ${data.totalCls} | LCP = ${data.lcp}ms | FCP = ${data.fcp}ms | Status: ${pass ? 'PASS' : 'FAIL'}`);
    if (data.clsEvents && data.clsEvents.length > 0) {
      console.log(`  -> ${data.clsEvents.length} layout shift events:`);
      for (const ev of data.clsEvents) {
        console.log(`     Shift: ${ev.value.toFixed(4)} at ${ev.startTime}ms (hadRecentInput: ${ev.hadRecentInput})`);
        for (const s of ev.sources) {
          console.log(`       Target: <${s.tagName} class="${s.className}" id="${s.id}">`);
          console.log(`       Prev: ${JSON.stringify(s.prev)} -> Curr: ${JSON.stringify(s.curr)}`);
        }
      }
    }

    results.push({
      scenario: scenario.name,
      cls: data.totalCls,
      lcp: data.lcp,
      fcp: data.fcp,
      status: pass ? 'PASS' : 'FAIL'
    });
  }

  runner.kill();

  console.log('\n============================================================');
  console.log(' ADVERSARIAL STRESS SUITE SUMMARY');
  console.log('============================================================');
  console.table(results);
  console.log(`All Scenarios Passed: ${passedAll ? 'YES' : 'NO'}`);
  return passedAll ? 0 : 1;
}

runAdversarialClsSuite().then(code => process.exit(code)).catch(err => {
  console.error(err);
  process.exit(1);
});
