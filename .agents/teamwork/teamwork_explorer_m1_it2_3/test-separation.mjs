import { ChromeRunner, CdpSession, INJECTED_CWV_HARNESS } from '../../../scripts/audit-cwv.mjs';

const TEST_SCRIPT = `
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
        user: { id: 'u_audit_admin', email: 'auditor@lynk.dev', name: 'CWV Auditor', is_admin: true },
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
  } catch (err) {
    console.warn(err);
  }
})();
`;

async function run() {
  const runner = new ChromeRunner();
  await runner.launch();
  const pageWs = await runner.getPageTarget();
  const cdp = new CdpSession(pageWs);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');
  await cdp.send('Performance.enable');

  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: TEST_SCRIPT + '\n' + INJECTED_CWV_HARNESS
  });

  const routes = [
    { path: '/auth/login', expected: 'guest' },
    { path: '/acme/dashboard', expected: 'auth' },
    { path: '/auth/register', expected: 'guest' }
  ];

  for (const r of routes) {
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173' + r.path });
    await new Promise(res => setTimeout(res, 1500));
    const evalRes = await cdp.send('Runtime.evaluate', {
      expression: 'JSON.stringify({ url: window.location.href, title: document.title, cls: window.__cwv_harness.cls })',
      returnByValue: true
    });
    console.log(r.path, '->', evalRes.result?.value);
  }

  runner.kill();
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
