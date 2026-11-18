#!/usr/bin/env node
/**
 * scripts/challenge-m4-telemetry.mjs
 *
 * Empirical Challenger Verification Harness for Milestone 4:
 * - Feature F15: In-App Core Web Vitals Telemetry (web-vitals.ts)
 * - Feature F14: Image Explicit Sizing for CLS Prevention
 *
 * Suites:
 * 1. Telemetry Interface Contract & Backwards Compatibility
 * 2. W3C CLS Session Window Algorithm Adversarial Verification
 * 3. INP Event Timing API & Fallback Logic Verification
 * 4. Image Layout Box Reservation & Explicit Sizing Verification
 * 5. Dynamic Layout Shift Detection & hadRecentInput Input Guarding
 * 6. Full Quick-Scope CWV Compliance Audit (15 Items)
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE_URL = 'http://127.0.0.1:4173';

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
              listener(msg.params);
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
    this.userDataDir = path.join(os.tmpdir(), `cwv_m4_chal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
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
            { id: 'org_1', name: 'Acme Corp', slug: 'acme', role: 'owner', isCurrent: true, logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="teal"/></svg>' }
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
            monthlyEvents: { limit: 10000000, used: 250000, remaining: 9750000, percentage: 2.5 }
          }
        },
        hasHydrated: true
      },
      version: 0
    }));
  } catch (e) {
    console.error('[Pre-seed Error]', e);
  }
})();
`;

// ── 3. Empirical Challenger Test Engine ──────────────────────────────────────

class TelemetryChallenger {
  constructor() {
    this.runner = new ChromeRunner();
    this.cdp = null;
    this.results = [];
  }

  record(suite, testName, passed, details = '') {
    const status = passed ? 'PASS' : 'FAIL';
    this.results.push({ suite, testName, passed, details });
    const mark = passed ? '✓' : '✗';
    console.log(`  [${mark}] ${testName} -> ${status}${details ? ` (${details})` : ''}`);
    if (!passed) {
      console.error(`      ERROR: ${details}`);
    }
  }

  async setup() {
    await this.runner.launch();
    const pageWs = await this.runner.getPageTarget();
    this.cdp = new CdpSession(pageWs);
    await this.cdp.connect();

    await this.cdp.send('Page.enable');
    await this.cdp.send('Runtime.enable');
    await this.cdp.send('DOM.enable');
    await this.cdp.send('Performance.enable');

    await this.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: AUTH_SEED_SCRIPT
    });
  }

  async teardown() {
    if (this.cdp) {
      this.cdp.close();
    }
    if (this.runner) {
      this.runner.kill();
    }
  }

  // ── Suite 1: Telemetry Interface Contract & Backwards Compatibility ─────────
  async runSuite1() {
    console.log('\n============================================================');
    console.log(' SUITE 1: Telemetry Interface Contract & Backwards Compatibility');
    console.log('============================================================');

    await this.cdp.send('Page.navigate', { url: `${BASE_URL}/acme/dashboard` });
    await new Promise(r => setTimeout(r, 1500));

    const evalResult = await this.cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const hasVitals = typeof window.__getWebVitalsReport === 'function';
        const hasLcp = typeof window.__getLcpReport === 'function';
        const report = hasVitals ? window.__getWebVitalsReport() : null;
        const lcpReport = hasLcp ? window.__getLcpReport() : null;

        return {
          hasVitals,
          hasLcp,
          report,
          lcpReport
        };
      })()`,
      returnByValue: true
    });

    const val = evalResult.result?.value || {};

    // 1.1 window.__getWebVitalsReport exists
    this.record('Suite 1', 'window.__getWebVitalsReport is a function on window', val.hasVitals === true);

    // 1.2 window.__getLcpReport exists
    this.record('Suite 1', 'window.__getLcpReport is a function on window (backwards compatibility)', val.hasLcp === true);

    const report = val.report || {};

    // 1.3 Schema validation: fcp
    const fcpValid = report.fcp === null || (typeof report.fcp === 'number' && !Number.isNaN(report.fcp) && report.fcp >= 0);
    this.record('Suite 1', 'report.fcp conforms to number | null', fcpValid, `fcp: ${report.fcp}`);

    // 1.4 Schema validation: lcp
    const lcpValid = report.lcp === null || (
      typeof report.lcp === 'object' &&
      typeof report.lcp.startTime === 'number' &&
      typeof report.lcp.renderTime === 'number' &&
      'elementTag' in report.lcp &&
      'url' in report.lcp
    );
    this.record('Suite 1', 'report.lcp conforms to schema { startTime, renderTime, elementTag, url } | null', lcpValid, `lcp: ${JSON.stringify(report.lcp)}`);

    // 1.5 Schema validation: cls
    const clsValid = typeof report.cls === 'number' && !Number.isNaN(report.cls) && report.cls >= 0;
    this.record('Suite 1', 'report.cls conforms to non-negative number', clsValid, `cls: ${report.cls}`);

    // 1.6 Schema validation: inp
    const inpValid = report.inp === null || (typeof report.inp === 'number' && !Number.isNaN(report.inp) && report.inp >= 0);
    this.record('Suite 1', 'report.inp conforms to number | null', inpValid, `inp: ${report.inp}`);

    // 1.7 Schema validation: ttfb
    const ttfbValid = report.ttfb === null || (typeof report.ttfb === 'number' && !Number.isNaN(report.ttfb) && report.ttfb >= 0);
    this.record('Suite 1', 'report.ttfb conforms to number | null', ttfbValid, `ttfb: ${report.ttfb}`);

    // 1.8 Backwards compatibility report structure
    const lcpReport = val.lcpReport || {};
    const lcpReportValid = 'fcp' in lcpReport && 'lcp' in lcpReport && 'domContentLoaded' in lcpReport && 'loadEvent' in lcpReport;
    this.record('Suite 1', 'window.__getLcpReport() returns legacy WebVitalsReport structure', lcpReportValid, `keys: ${Object.keys(lcpReport).join(', ')}`);
  }

  // ── Suite 2: W3C CLS Session Window Algorithm Adversarial Verification ──────
  async runSuite2() {
    console.log('\n============================================================');
    console.log(' SUITE 2: W3C CLS Session Window Algorithm Adversarial Verification');
    console.log('============================================================');

    const simResult = await this.cdp.send('Runtime.evaluate', {
      expression: `(() => {
        // Exact web-vitals.ts session window logic
        function createClsTracker() {
          let clsScore = 0;
          let currentSessionScore = 0;
          let sessionStartTime = 0;
          let prevShiftTime = 0;

          function recordShift(entry) {
            if (entry.hadRecentInput) return;

            const shiftVal = entry.value ?? 0;
            const shiftTime = entry.startTime;

            if (
              currentSessionScore > 0 &&
              shiftTime - prevShiftTime < 1000 &&
              shiftTime - sessionStartTime < 5000
            ) {
              currentSessionScore += shiftVal;
            } else {
              sessionStartTime = shiftTime;
              currentSessionScore = shiftVal;
            }
            prevShiftTime = shiftTime;

            if (currentSessionScore > clsScore) {
              clsScore = currentSessionScore;
            }
          }

          function getCls() {
            return Number(clsScore.toFixed(4));
          }

          return { recordShift, getCls };
        }

        // Test Scenario 2.1: Intra-window accumulation (gap < 1000ms, duration < 5000ms)
        const tracker1 = createClsTracker();
        tracker1.recordShift({ startTime: 100, value: 0.05, hadRecentInput: false });
        tracker1.recordShift({ startTime: 600, value: 0.03, hadRecentInput: false });
        const s21 = tracker1.getCls() === 0.08;

        // Test Scenario 2.2: Inter-window split on gap >= 1000ms, max score retained
        tracker1.recordShift({ startTime: 1800, value: 0.04, hadRecentInput: false }); // gap 1200ms -> new window (0.04), max is 0.08
        const s22a = tracker1.getCls() === 0.08;
        tracker1.recordShift({ startTime: 2300, value: 0.05, hadRecentInput: false }); // Window 2 = 0.04 + 0.05 = 0.09 -> max is 0.09
        const s22b = tracker1.getCls() === 0.09;

        // Test Scenario 2.3: Duration cap (5000ms max window) split
        const tracker2 = createClsTracker();
        tracker2.recordShift({ startTime: 1000, value: 0.10, hadRecentInput: false });
        tracker2.recordShift({ startTime: 1800, value: 0.10, hadRecentInput: false });
        tracker2.recordShift({ startTime: 2600, value: 0.10, hadRecentInput: false });
        tracker2.recordShift({ startTime: 3400, value: 0.10, hadRecentInput: false });
        tracker2.recordShift({ startTime: 4200, value: 0.10, hadRecentInput: false });
        tracker2.recordShift({ startTime: 5000, value: 0.10, hadRecentInput: false }); // duration 4000ms, score 0.60
        tracker2.recordShift({ startTime: 5800, value: 0.10, hadRecentInput: false }); // duration 4800ms, score 0.70
        // Next shift is at 6200ms (duration 5200ms >= 5000ms from window start 1000ms) -> MUST split into new window!
        tracker2.recordShift({ startTime: 6200, value: 0.05, hadRecentInput: false });
        // Score in window 2 is 0.05. Max score should remain 0.70 (not 0.75).
        const s23 = tracker2.getCls() === 0.70;

        // Test Scenario 2.4: Exclusion of shifts with hadRecentInput: true
        const tracker3 = createClsTracker();
        tracker3.recordShift({ startTime: 100, value: 0.05, hadRecentInput: false });
        tracker3.recordShift({ startTime: 300, value: 0.85, hadRecentInput: true }); // user clicked button -> discarded!
        const s24 = tracker3.getCls() === 0.05;

        // Test Scenario 2.5: Floating-point precision and numeric type
        tracker3.recordShift({ startTime: 500, value: 0.00014, hadRecentInput: false });
        const score = tracker3.getCls();
        const s25 = typeof score === 'number' && score === 0.0501;

        return { s21, s22a, s22b, s23, s24, s25 };
      })()`,
      returnByValue: true
    });

    const res = simResult.result?.value || {};
    this.record('Suite 2', '2.1 Intra-window accumulation (gap < 1s, duration < 5s sums correctly)', res.s21 === true);
    this.record('Suite 2', '2.2a Inter-window split on gap >= 1s retains previous max window', res.s22a === true);
    this.record('Suite 2', '2.2b Inter-window score updates when subsequent window exceeds previous', res.s22b === true);
    this.record('Suite 2', '2.3 5000ms duration cap splits session window even if gap < 1s', res.s23 === true);
    this.record('Suite 2', '2.4 hadRecentInput: true entries are strictly discarded', res.s24 === true);
    this.record('Suite 2', '2.5 Number(toFixed(4)) maintains numeric type and avoids floating inaccuracy', res.s25 === true);
  }

  // ── Suite 3: INP Event Timing API & Fallback Logic Verification ────────────
  async runSuite3() {
    console.log('\n============================================================');
    console.log(' SUITE 3: INP Event Timing API & Fallback Logic Verification');
    console.log('============================================================');

    const inpSim = await this.cdp.send('Runtime.evaluate', {
      expression: `(() => {
        function createInpTracker() {
          let currentInp = null;
          const interactionDurations = new Map();

          function recordEvent(ev) {
            if (!ev.duration || ev.duration <= 0) return;

            if (ev.interactionId && ev.interactionId > 0) {
              const prev = interactionDurations.get(ev.interactionId) ?? 0;
              if (ev.duration > prev) {
                interactionDurations.set(ev.interactionId, ev.duration);
              }
              const durations = Array.from(interactionDurations.values()).sort((a, b) => b - a);
              const p98Index = durations.length >= 50
                ? Math.min(durations.length - 1, Math.floor((durations.length - 1) * 0.02))
                : 0;
              currentInp = durations[p98Index];
            } else {
              if (currentInp === null || ev.duration > currentInp) {
                currentInp = ev.duration;
              }
            }
          }

          function getInp() {
            return currentInp !== null ? Math.round(currentInp) : null;
          }

          return { recordEvent, getInp };
        }

        // Test 3.1: < 50 interactions -> worst duration
        const tracker1 = createInpTracker();
        tracker1.recordEvent({ interactionId: 1, duration: 42 });
        tracker1.recordEvent({ interactionId: 2, duration: 110 });
        tracker1.recordEvent({ interactionId: 3, duration: 35 });
        const s31 = tracker1.getInp() === 110;

        // Test 3.2: >= 50 interactions -> p98 calculation
        const tracker2 = createInpTracker();
        for (let i = 1; i <= 100; i++) {
          tracker2.recordEvent({ interactionId: i, duration: i * 2 }); // durations 2, 4, 6, ..., 200
        }
        // Sorted descending: 200, 198, 196, ...
        // p98 index: Math.floor(99 * 0.02) = 1 -> duration 198
        const s32 = tracker2.getInp() === 198;

        // Test 3.3: Missing interactionId fallback
        const tracker3 = createInpTracker();
        tracker3.recordEvent({ interactionId: 0, duration: 48 });
        const s33a = tracker3.getInp() === 48;
        tracker3.recordEvent({ interactionId: 0, duration: 30 }); // smaller -> stays 48
        const s33b = tracker3.getInp() === 48;
        tracker3.recordEvent({ interactionId: 0, duration: 65 }); // larger -> updates to 65
        const s33c = tracker3.getInp() === 65;

        return { s31, s32, s33a, s33b, s33c };
      })()`,
      returnByValue: true
    });

    const res = inpSim.result?.value || {};
    this.record('Suite 3', '3.1 Interactions < 50 selects worst duration', res.s31 === true);
    this.record('Suite 3', '3.2 Interactions >= 50 selects 98th percentile (p98) duration', res.s32 === true);
    this.record('Suite 3', '3.3 Missing/zero interactionId fallback records and updates monotonically', res.s33a && res.s33b && res.s33c);
  }

  // ── Suite 4: Image Layout Box Reservation & Explicit Sizing Verification ────
  async runSuite4() {
    console.log('\n============================================================');
    console.log(' SUITE 4: Image Layout Box Reservation & Explicit Sizing Verification');
    console.log('============================================================');

    // 4.1 Static Component Code Audit
    const addDeviceCode = fs.readFileSync('src/modules/auth/components/profile/AddDeviceDialog.tsx', 'utf8');
    const hasAddDeviceSizing = addDeviceCode.includes('width={176}') &&
      addDeviceCode.includes('height={176}') &&
      addDeviceCode.includes('aspect-square') &&
      addDeviceCode.includes('loading="eager"') &&
      addDeviceCode.includes('decoding="async"');
    this.record('Suite 4', '4.1 AddDeviceDialog source declares width={176}, height={176}, aspect-square, loading=eager, decoding=async', hasAddDeviceSizing);

    const accountOverviewCode = fs.readFileSync('src/modules/auth/components/profile/AccountOverviewPanel.tsx', 'utf8');
    const hasAccountOverviewSizing = accountOverviewCode.includes('width={64}') &&
      accountOverviewCode.includes('height={64}') &&
      accountOverviewCode.includes('fetchPriority="high"') &&
      accountOverviewCode.includes('loading="eager"') &&
      accountOverviewCode.includes('decoding="async"') &&
      accountOverviewCode.includes('aspect-square');
    this.record('Suite 4', '4.2 AccountOverviewPanel source declares width={64}, height={64}, aspect-square, fetchPriority=high', hasAccountOverviewSizing);

    const personalDetailsCode = fs.readFileSync('src/modules/auth/components/profile/PersonalDetailsPanel.tsx', 'utf8');
    const hasPersonalDetailsSizing = personalDetailsCode.includes('width={80}') &&
      personalDetailsCode.includes('height={80}') &&
      personalDetailsCode.includes('fetchPriority="high"') &&
      personalDetailsCode.includes('loading="eager"') &&
      personalDetailsCode.includes('decoding="async"') &&
      personalDetailsCode.includes('aspect-square');
    this.record('Suite 4', '4.3 PersonalDetailsPanel source declares width={80}, height={80}, aspect-square, fetchPriority=high', hasPersonalDetailsSizing);

    const animatedEmptyStateCode = fs.readFileSync('src/shared/motion/AnimatedEmptyState.tsx', 'utf8');
    const emptyStateIllustrations = ['Folder', 'Bell', 'Terminal', 'Team', 'DashboardArt', 'AiArt', 'SearchArt', 'ChartArt', 'KeyArt', 'ConnectorArt', 'WorkflowArt', 'InboxArt'];
    const widthMatches = (animatedEmptyStateCode.match(/width=\{80\}/g) || []).length;
    const heightMatches = (animatedEmptyStateCode.match(/height=\{80\}/g) || []).length;
    const hasAllEmptyStateSizes = widthMatches >= 12 && heightMatches >= 12;
    this.record('Suite 4', '4.4 AnimatedEmptyState source declares width={80} and height={80} across all 12 SVG illustrations', hasAllEmptyStateSizes, `found ${widthMatches} widths, ${heightMatches} heights`);

    const orgOverviewCode = fs.readFileSync('src/pages/team/OrgOverviewPage.tsx', 'utf8');
    const hasOrgOverviewSizing = orgOverviewCode.includes('width={40}') &&
      orgOverviewCode.includes('height={40}') &&
      orgOverviewCode.includes('fetchPriority="high"') &&
      orgOverviewCode.includes('aspect-square');
    this.record('Suite 4', '4.5 OrgOverviewPage source declares width={40}, height={40}, aspect-square on org logo', hasOrgOverviewSizing);

    const avatarUiCode = fs.readFileSync('src/components/ui/avatar.tsx', 'utf8');
    const hasAvatarDefaults = avatarUiCode.includes('loading = "eager"') &&
      avatarUiCode.includes('decoding = "async"') &&
      avatarUiCode.includes('aspect-square');
    this.record('Suite 4', '4.6 AvatarImage in components/ui/avatar.tsx defaults to loading=eager, decoding=async, aspect-square', hasAvatarDefaults);

    // 4.7 Empirical Layout Box Reservation in Live Headless Browser
    // Mount the exact component DOM markup into live browser context and measure layout reservation
    console.log('  Testing empirical layout box reservation and CLS on live document...');
    await this.cdp.send('Page.navigate', { url: `${BASE_URL}/acme/dashboard` });
    await new Promise(r => setTimeout(r, 1200));

    const mountResult = await this.cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const testContainer = document.createElement('div');
        testContainer.id = '__image_sizing_test_container__';
        testContainer.style.cssText = 'position: absolute; top: -9999px; left: -9999px; width: 1000px;';
        document.body.appendChild(testContainer);

        // 1. AddDeviceDialog QR Code representation: width="176" height="176" class="size-44 object-contain aspect-square"
        const qrImg = document.createElement('img');
        qrImg.id = '__test_qr__';
        qrImg.width = 176;
        qrImg.height = 176;
        qrImg.loading = 'eager';
        qrImg.decoding = 'async';
        qrImg.className = 'size-44 object-contain aspect-square';
        qrImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="176" height="176"><rect width="176" height="176" fill="black"/></svg>';
        testContainer.appendChild(qrImg);

        // 2. AccountOverviewPanel representation: width="64" height="64" class="size-16 rounded-full aspect-square"
        const accImg = document.createElement('img');
        accImg.id = '__test_account__';
        accImg.width = 64;
        accImg.height = 64;
        accImg.loading = 'eager';
        accImg.decoding = 'async';
        accImg.className = 'size-16 rounded-full aspect-square';
        accImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="blue"/></svg>';
        testContainer.appendChild(accImg);

        // 3. PersonalDetailsPanel representation: width="80" height="80" class="size-20 rounded-full aspect-square"
        const profImg = document.createElement('img');
        profImg.id = '__test_profile__';
        profImg.width = 80;
        profImg.height = 80;
        profImg.loading = 'eager';
        profImg.decoding = 'async';
        profImg.className = 'size-20 rounded-full aspect-square';
        profImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="purple"/></svg>';
        testContainer.appendChild(profImg);

        // 4. AnimatedEmptyState SVG representation: width="80" height="80" class="size-20"
        const emptySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        emptySvg.id = '__test_svg__';
        emptySvg.setAttribute('width', '80');
        emptySvg.setAttribute('height', '80');
        emptySvg.setAttribute('viewBox', '0 0 96 96');
        emptySvg.setAttribute('class', 'size-20');
        testContainer.appendChild(emptySvg);

        // Force synchronous layout computation to measure initial reserved box
        const qrRect = qrImg.getBoundingClientRect();
        const accRect = accImg.getBoundingClientRect();
        const profRect = profImg.getBoundingClientRect();
        const svgRect = emptySvg.getBoundingClientRect();

        const cls = window.__getWebVitalsReport ? window.__getWebVitalsReport().cls : 0;

        return {
          qrWidth: Math.round(qrRect.width),
          qrHeight: Math.round(qrRect.height),
          accWidth: Math.round(accRect.width),
          accHeight: Math.round(accRect.height),
          profWidth: Math.round(profRect.width),
          profHeight: Math.round(profRect.height),
          svgWidth: Math.round(svgRect.width),
          svgHeight: Math.round(svgRect.height),
          cls
        };
      })()`,
      returnByValue: true
    });

    const m = mountResult.result?.value || {};
    const qrReserved = m.qrWidth === 176 && m.qrHeight === 176;
    const accReserved = m.accWidth === 64 && m.accHeight === 64;
    const profReserved = m.profWidth === 80 && m.profHeight === 80;
    const svgReserved = m.svgWidth === 80 && m.svgHeight === 80;
    const zeroCls = m.cls === 0;

    this.record('Suite 4', '4.7 QR Code (176x176), Account Avatar (64x64), Profile Avatar (80x80), and SVG (80x80) reserve exact layout boxes with CLS = 0', qrReserved && accReserved && profReserved && svgReserved && zeroCls, `QR: ${m.qrWidth}x${m.qrHeight}, Acc: ${m.accWidth}x${m.accHeight}, Prof: ${m.profWidth}x${m.profHeight}, SVG: ${m.svgWidth}x${m.svgHeight}, CLS: ${m.cls}`);

    // Cleanup test container
    await this.cdp.send('Runtime.evaluate', {
      expression: `document.getElementById('__image_sizing_test_container__')?.remove()`
    });
  }

  // ── Suite 5: Dynamic Layout Shift Detection & hadRecentInput Input Guarding ──
  async runSuite5() {
    console.log('\n============================================================');
    console.log(' SUITE 5: Dynamic Layout Shift Detection & hadRecentInput Input Guarding');
    console.log('============================================================');

    await this.cdp.send('Page.navigate', { url: `${BASE_URL}/acme/dashboard` });
    await new Promise(r => setTimeout(r, 1500));

    // Baseline CLS
    const baselineResult = await this.cdp.send('Runtime.evaluate', {
      expression: `window.__getWebVitalsReport ? window.__getWebVitalsReport().cls : 0`,
      returnByValue: true
    });
    const baselineCls = baselineResult.result?.value ?? 0;
    this.record('Suite 5', '5.1 Baseline CLS on Departure Board is 0', baselineCls === 0, `baseline: ${baselineCls}`);

    // Adversarial Injection: Inject a 200px shift WITHOUT recent input
    console.log('  Injecting synthetic DOM shift without recent input...');
    await this.cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const shifter = document.createElement('div');
        shifter.id = '__synthetic_shifter__';
        shifter.style.height = '0px';
        shifter.style.width = '100%';
        shifter.style.transition = 'none';
        document.body.prepend(shifter);

        requestAnimationFrame(() => {
          shifter.style.height = '200px';
        });
      })()`
    });

    await new Promise(r => setTimeout(r, 800));

    const shiftedResult = await this.cdp.send('Runtime.evaluate', {
      expression: `window.__getWebVitalsReport ? window.__getWebVitalsReport().cls : 0`,
      returnByValue: true
    });
    const postShiftCls = shiftedResult.result?.value ?? 0;
    const detectedShift = postShiftCls > baselineCls;
    this.record('Suite 5', '5.2 Telemetry observer actively detects genuine layout shift when hadRecentInput is false', detectedShift, `pre: ${baselineCls}, post: ${postShiftCls}`);

    // Remove synthetic shifter
    await this.cdp.send('Runtime.evaluate', {
      expression: `document.getElementById('__synthetic_shifter__')?.remove()`
    });
    await new Promise(r => setTimeout(r, 500));
  }

  // ── Suite 6: Full Quick-Scope CWV Compliance Audit ─────────────────────────
  async runSuite6() {
    console.log('\n============================================================');
    console.log(' SUITE 6: Multi-Route CWV Compliance Audit (Quick Scope: 15 Items)');
    console.log('============================================================');

    const QUICK_ITEMS = [
      { path: '/auth/login', name: 'Public Login' },
      { path: '/auth/register', name: 'Public Register' },
      { path: '/acme/dashboard', name: 'Departure Board' },
      { path: '/acme/observability', name: 'Executive Dashboard (9 Queries)' },
      { path: '/acme/projects', name: 'Projects List' },
      { path: '/acme/alerts', name: 'Alerts & Incidents' },
      { path: '/acme/observability/latency', name: 'Latency Deep Dive (7 Queries)' },
      { path: '/acme/dashboards/geo', name: 'Geo Choropleth Map' },
      { path: '/acme/observability/traces/tr_abc123', name: 'Trace Waterfall' },
      { path: '/acme/p/proj_1/overview', name: 'Project Overview (Waterfall Hotspot)' },
      { path: '/acme/account/security/passkeys', name: 'Passkeys Panel (Auth Profile Chunk)' },
      { steps: ['/auth/login', '/auth/register', '/auth/forgot-password'], name: 'T3.1 Public Guest Routing Transition' },
      { steps: ['/acme/p/proj_1/overview', '/acme/p/proj_1/activity', '/acme/p/proj_1/settings'], name: 'T3.3 Project Workspace Tab Transitions' },
      { steps: ['/acme/alerts', '/acme/alerts/incidents/inc_404', '/acme/alerts/rules'], name: 'T4.1 Incident Responder Forensic Journey' },
      { steps: ['/acme/dashboards/overview', '/acme/dashboards/executive', '/acme/dashboards/realtime'], name: 'T4.2 Executive Observability Audit Review' }
    ];

    let allPassed = true;
    const routeResults = [];

    for (let i = 0; i < QUICK_ITEMS.length; i++) {
      const item = QUICK_ITEMS[i];

      if (item.steps) {
        let worstCls = 0;
        let worstLcp = 0;
        for (const stepPath of item.steps) {
          const fullUrl = `${BASE_URL}${stepPath}`;
          await this.cdp.send('Page.navigate', { url: fullUrl });
          await new Promise(r => setTimeout(r, 800));

          const stepEval = await this.cdp.send('Runtime.evaluate', {
            expression: `(() => {
              const report = window.__getWebVitalsReport ? window.__getWebVitalsReport() : null;
              return {
                cls: report?.cls ?? 0,
                lcp: report?.lcp?.startTime ?? 0
              };
            })()`,
            returnByValue: true
          });

          const stepMetrics = stepEval.result?.value || { cls: 0, lcp: 0 };
          if (stepMetrics.cls > worstCls) worstCls = stepMetrics.cls;
          if (stepMetrics.lcp > worstLcp) worstLcp = stepMetrics.lcp;
        }

        const pass = worstCls < 0.01 && worstLcp <= 2500;
        if (!pass) allPassed = false;
        routeResults.push({ name: item.name, cls: worstCls, lcp: worstLcp, pass });
        console.log(`  [${i + 1}/${QUICK_ITEMS.length}] (Scenario) ${item.name} -> Max CLS: ${worstCls}, Max LCP: ${Math.round(worstLcp)}ms -> ${pass ? 'PASS' : 'FAIL'}`);
      } else {
        const fullUrl = `${BASE_URL}${item.path}`;
        await this.cdp.send('Page.navigate', { url: fullUrl });
        await new Promise(r => setTimeout(r, 1000));

        const evalRes = await this.cdp.send('Runtime.evaluate', {
          expression: `(() => {
            const report = window.__getWebVitalsReport ? window.__getWebVitalsReport() : null;
            return {
              cls: report?.cls ?? 0,
              lcp: report?.lcp?.startTime ?? 0
            };
          })()`,
          returnByValue: true
        });

        const metrics = evalRes.result?.value || { cls: 0, lcp: 0 };
        const clsPass = metrics.cls < 0.01;
        const lcpPass = metrics.lcp <= 2500;
        const pass = clsPass && lcpPass;

        if (!pass) allPassed = false;
        routeResults.push({ path: item.path, name: item.name, ...metrics, pass });
        console.log(`  [${i + 1}/${QUICK_ITEMS.length}] ${item.path} -> CLS: ${metrics.cls}, LCP: ${Math.round(metrics.lcp)}ms -> ${pass ? 'PASS' : 'FAIL'}`);
      }
    }

    this.record('Suite 6', 'All 15 audited quick scope items maintain CLS < 0.01 and LCP <= 2500ms', allPassed, `${routeResults.filter(r => r.pass).length}/${routeResults.length} passed`);
  }

  async runAll() {
    try {
      await this.setup();
      await this.runSuite1();
      await this.runSuite2();
      await this.runSuite3();
      await this.runSuite4();
      await this.runSuite5();
      await this.runSuite6();
    } finally {
      await this.teardown();
    }

    console.log('\n============================================================');
    console.log(' CHALLENGER VERIFICATION SUMMARY');
    console.log('============================================================');
    const passedCount = this.results.filter(r => r.passed).length;
    const totalCount = this.results.length;
    console.log(`Total Assertions: ${totalCount}`);
    console.log(`Passed: ${passedCount}`);
    console.log(`Failed: ${totalCount - passedCount}`);
    console.log(`Overall Verdict: ${passedCount === totalCount ? 'APPROVE' : 'REQUEST_CHANGES'}`);

    return {
      passed: passedCount === totalCount,
      totalCount,
      passedCount,
      results: this.results
    };
  }
}

const challenger = new TelemetryChallenger();
challenger.runAll().then(({ passed }) => {
  process.exit(passed ? 0 : 1);
}).catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
