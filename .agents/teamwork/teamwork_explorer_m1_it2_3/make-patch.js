import fs from 'node:fs';

const orig = fs.readFileSync('scripts/audit-cwv.mjs', 'utf8');

let modified = orig;

// 1. Add auth: false to T3.1
modified = modified.replace(
  `      name: 'T3.1 Public Guest Routing Transition',
      steps: ['/auth/login', '/auth/register', '/auth/forgot-password'],
      action: 'navigate-sequence',
      tier: 3`,
  `      name: 'T3.1 Public Guest Routing Transition',
      steps: ['/auth/login', '/auth/register', '/auth/forgot-password'],
      action: 'navigate-sequence',
      auth: false,
      tier: 3`
);

// 2. Add pathname check in AUTH_SEED_SCRIPT
const seedAnchor = "export const AUTH_SEED_SCRIPT = `\n(() => {\n  try {";
const seedInsert = `
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
`;

modified = modified.replace(seedAnchor, seedAnchor + seedInsert);

// 3. Constructor authScriptIdentifier
const ctorAnchor = "    this.cdp = null;\n    this.results = [];";
modified = modified.replace(ctorAnchor, "    this.cdp = null;\n    this.authScriptIdentifier = null;\n    this.results = [];");

// 4. Custom route mode
const customRoute = "return [{ path: mode, name: `Custom Route (${mode})`, auth: true, tier: 1 }];";
const customRouteReplacement = `const isPublic =
      mode.startsWith('/auth') ||
      mode === '/accept-invite' ||
      mode === '/loading' ||
      mode === '/error-preview' ||
      mode.startsWith('/account/delete/confirm');
    return [{ path: mode, name: \`Custom Route (\${mode})\`, auth: !isPublic, tier: 1 }];`;
modified = modified.replace(customRoute, customRouteReplacement);

// 5. setupSession and prepareAuthContext
const setupAnchor = `    // Pre-inject Auth State and CWV Observers into every new document
    await this.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: \`\${AUTH_SEED_SCRIPT}\\n\${INJECTED_CWV_HARNESS}\`
    });
  }`;

const setupReplacement = `    // Pre-inject CWV Observers into every new document
    await this.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: INJECTED_CWV_HARNESS
    });
    this.authScriptIdentifier = null;
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
      try {
        await this.cdp.send('Runtime.evaluate', {
          expression: \`(() => {
            sessionStorage.removeItem('auth-storage');
            sessionStorage.removeItem('pulse_access_token');
            sessionStorage.removeItem('pulse_access_token_expires_at');
            sessionStorage.removeItem('pulse_current_org_id');
            sessionStorage.removeItem('pulse_current_org_slug');
            sessionStorage.removeItem('pulse_current_project_id');
            sessionStorage.removeItem('pulse_current_project_slug');
          })()\`
        });
      } catch {}
    }
  }`;

modified = modified.replace(setupAnchor, setupReplacement);

// 6. auditSingleRoute
const singleRouteAnchor = "  async auditSingleRoute(item) {\n    const fullUrl =";
modified = modified.replace(singleRouteAnchor, "  async auditSingleRoute(item) {\n    await this.prepareAuthContext(item.auth !== false);\n\n    const fullUrl =");

// 7. auditScenario
const scenarioAnchor = "  async auditScenario(scenario) {\n    let worstLcp = 0;";
modified = modified.replace(scenarioAnchor, "  async auditScenario(scenario) {\n    await this.prepareAuthContext(scenario.auth !== false);\n\n    let worstLcp = 0;");

fs.writeFileSync('.agents/teamwork/teamwork_explorer_m1_it2_3/proposed_audit-cwv.mjs', modified);
console.log('Successfully written proposed_audit-cwv.mjs, size:', modified.length);
