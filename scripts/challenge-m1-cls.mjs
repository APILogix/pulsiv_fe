// scripts/challenge-m1-cls.mjs
// Challenger 2: Adversarial CLS & Performance Metric Verification

import { ChromeRunner, CdpSession, AUTH_SEED_SCRIPT, PreviewServerManager } from './audit-cwv.mjs';

async function runClsChallenge() {
  console.log('============================================================');
  console.log(' CHALLENGER 2: EMPIRICAL CLS & PERFORMANCE HARNESS');
  console.log('============================================================\n');

  const serverManager = new PreviewServerManager('http://127.0.0.1:4173');
  await serverManager.ensureRunning();

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

  const testRoutes = [
    { path: '/auth/login', name: 'Public Login', auth: false },
    { path: '/auth/register', name: 'Public Register', auth: false },
    { path: '/acme/dashboard', name: 'Root Departure Board', auth: true },
    { path: '/acme/observability', name: 'Observability Dashboard', auth: true },
    { path: '/acme/p/proj_1/overview', name: 'Project Overview', auth: true },
    { path: '/acme/account/security/passkeys', name: 'Passkeys Panel', auth: true }
  ];

  const results = [];

  for (const item of testRoutes) {
    console.log(`\nAuditing route: ${item.path} (${item.name})...`);
    const fullUrl = `http://127.0.0.1:4173${item.path}`;

    // Reset metrics on page load
    await cdp.send('Page.navigate', { url: fullUrl });
    await new Promise(r => setTimeout(r, 2000));

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
          clsEvents: window.__clsEvents || [],
          title: document.title
        };
      })()`,
      returnByValue: true
    });

    const data = evalResult.result?.value || {};
    results.push({ ...item, ...data });

    console.log(`  -> FCP: ${data.fcp}ms | LCP: ${data.lcp}ms | TTFB: ${data.ttfb}ms | CLS: ${data.totalCls}`);
    if (data.clsEvents && data.clsEvents.length > 0) {
      console.log(`  -> Detected ${data.clsEvents.length} layout shift events:`);
      for (const ev of data.clsEvents) {
        console.log(`     Shift score: ${ev.value.toFixed(4)} at ${ev.startTime}ms`);
        for (const s of ev.sources) {
          console.log(`       Source element: <${s.tagName} class="${s.className}" id="${s.id}">`);
          console.log(`       Prev rect: ${JSON.stringify(s.prev)} -> Curr rect: ${JSON.stringify(s.curr)}`);
        }
      }
    } else {
      console.log('  -> Zero layout shift events detected!');
    }
  }

  runner.kill();
  return results;
}

runClsChallenge().catch(console.error);
