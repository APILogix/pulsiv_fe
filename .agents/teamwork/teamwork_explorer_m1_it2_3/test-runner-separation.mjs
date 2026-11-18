import { ChromeRunner, CdpSession, AUTH_SEED_SCRIPT, INJECTED_CWV_HARNESS, ROUTE_MANIFEST } from '../../../scripts/audit-cwv.mjs';

class TestAuditor {
  constructor() {
    this.runner = new ChromeRunner();
    this.cdp = null;
    this.authScriptIdentifier = null;
  }

  async setupSession() {
    await this.runner.launch();
    const pageWs = await this.runner.getPageTarget();
    this.cdp = new CdpSession(pageWs);
    await this.cdp.connect();

    await this.cdp.send('Page.enable');
    await this.cdp.send('Runtime.enable');
    await this.cdp.send('DOM.enable');
    await this.cdp.send('Performance.enable');

    // ONLY inject CWV harness globally
    await this.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: INJECTED_CWV_HARNESS
    });
  }

  async prepareAuthContext(requiresAuth) {
    if (requiresAuth) {
      if (!this.authScriptIdentifier) {
        const res = await this.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
          source: AUTH_SEED_SCRIPT
        });
        this.authScriptIdentifier = res.identifier;
      }
    } else {
      if (this.authScriptIdentifier) {
        await this.cdp.send('Page.removeScriptToEvaluateOnNewDocument', {
          identifier: this.authScriptIdentifier
        });
        this.authScriptIdentifier = null;
      }
      // Clear residual auth session storage
      try {
        await this.cdp.send('Runtime.evaluate', {
          expression: `(() => {
            sessionStorage.removeItem('auth-storage');
            sessionStorage.removeItem('pulse_access_token');
            sessionStorage.removeItem('pulse_access_token_expires_at');
            sessionStorage.removeItem('pulse_current_org_id');
            sessionStorage.removeItem('pulse_current_org_slug');
            sessionStorage.removeItem('pulse_current_project_id');
            sessionStorage.removeItem('pulse_current_project_slug');
          })()`
        });
      } catch {}
    }
  }

  async auditSingleRoute(item) {
    await this.prepareAuthContext(item.auth !== false);

    const fullUrl = 'http://127.0.0.1:4173' + item.path;
    await this.cdp.send('Page.navigate', { url: fullUrl });
    await new Promise(r => setTimeout(r, 1200));

    const evalResult = await this.cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const harness = window.__cwv_harness || {};
        return {
          url: window.location.href,
          title: document.title,
          cls: Number((harness.cls || 0).toFixed(4)),
          lcp: harness.lcp?.startTime || 0,
          isAuthenticated: (() => {
            try {
              return JSON.parse(sessionStorage.getItem('auth-storage') || '{}')?.state?.isAuthenticated || false;
            } catch { return false; }
          })()
        };
      })()`,
      returnByValue: true
    });

    return evalResult.result?.value;
  }

  async auditScenario(scenario) {
    await this.prepareAuthContext(scenario.auth !== false);

    const results = [];
    for (const stepPath of scenario.steps) {
      const fullUrl = 'http://127.0.0.1:4173' + stepPath;
      await this.cdp.send('Page.navigate', { url: fullUrl });
      await new Promise(r => setTimeout(r, 800));

      const stepEval = await this.cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const harness = window.__cwv_harness || {};
          return {
            step: window.location.pathname,
            title: document.title,
            cls: Number((harness.cls || 0).toFixed(4)),
            isAuthenticated: (() => {
              try {
                return JSON.parse(sessionStorage.getItem('auth-storage') || '{}')?.state?.isAuthenticated || false;
              } catch { return false; }
            })()
          };
        })()`,
        returnByValue: true
      });
      results.push(stepEval.result?.value);
    }
    return results;
  }

  destroy() {
    if (this.cdp) this.cdp.close();
    if (this.runner) this.runner.kill();
  }
}

async function testRunner() {
  const auditor = new TestAuditor();
  await auditor.setupSession();

  console.log('\n--- Test 1: Public Login (auth: false) ---');
  const res1 = await auditor.auditSingleRoute({ path: '/auth/login', name: 'Public Login', auth: false, tier: 1 });
  console.log('Result 1:', res1);

  console.log('\n--- Test 2: Public Register (auth: false) ---');
  const res2 = await auditor.auditSingleRoute({ path: '/auth/register', name: 'Public Register', auth: false, tier: 1 });
  console.log('Result 2:', res2);

  console.log('\n--- Test 3: Protected Departure Board (auth: true) ---');
  const res3 = await auditor.auditSingleRoute({ path: '/acme/dashboard', name: 'Departure Board', auth: true, tier: 1 });
  console.log('Result 3:', res3);

  console.log('\n--- Test 4: Protected Projects List (auth: true) ---');
  const res4 = await auditor.auditSingleRoute({ path: '/acme/projects', name: 'Projects List', auth: true, tier: 1 });
  console.log('Result 4:', res4);

  console.log('\n--- Test 5: Scenario T3.1 Guest Routing Transition (auth: false) ---');
  const res5 = await auditor.auditScenario({
    name: 'T3.1 Public Guest Routing Transition',
    steps: ['/auth/login', '/auth/register', '/auth/forgot-password'],
    action: 'navigate-sequence',
    auth: false,
    tier: 3
  });
  console.log('Result 5:', res5);

  console.log('\n--- Test 6: Another Public Route after Protected (/auth/forgot-password, auth: false) ---');
  const res6 = await auditor.auditSingleRoute({ path: '/auth/forgot-password', name: 'Forgot Password', auth: false, tier: 1 });
  console.log('Result 6:', res6);

  auditor.destroy();
  process.exit(0);
}

testRunner().catch(err => {
  console.error(err);
  process.exit(1);
});
