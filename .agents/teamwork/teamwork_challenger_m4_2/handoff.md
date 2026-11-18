# Handoff Report: Challenger M4 2 (Empirical Verifier: Telemetry Contract & Image Sizing CLS)

## 1. Observation

### 1.1 Direct Source Code Observations
1. **Telemetry Contract & Global Exposure** (`src/infrastructure/web-vitals.ts` lines 32-50, 281-299):
   ```ts
   export interface FullWebVitalsReport {
     fcp: number | null;
     lcp: {
       startTime: number;
       renderTime: number;
       elementTag: string | null;
       url: string | null;
     } | null;
     cls: number;
     inp: number | null;
     ttfb: number | null;
   }
   ```
   Global accessors implemented on `window`:
   ```ts
   window.__getWebVitalsReport = (): FullWebVitalsReport => ({
     fcp: getFcp(),
     lcp: getLcpReportEntry(),
     cls: getCls(),
     inp: getInp(),
     ttfb: getTtfb(),
   });

   window.__getLcpReport = (): WebVitalsReport => {
     const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
     return {
       fcp: getFcp(),
       lcp: latestLcp,
       domContentLoaded: navEntry ? navEntry.domContentLoadedEventEnd - navEntry.startTime : null,
       loadEvent: navEntry ? navEntry.loadEventEnd - navEntry.startTime : null,
     };
   };
   ```

2. **W3C CLS Session Window Algorithm** (`src/infrastructure/web-vitals.ts` lines 198-223):
   ```ts
   const clsObserver = new PerformanceObserver((list) => {
     for (const entry of list.getEntries()) {
       const shift = entry as LayoutShiftEntry;
       if (shift.hadRecentInput) continue;

       const shiftVal = shift.value ?? 0;
       const shiftTime = shift.startTime;

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
   });
   ```

3. **Event Timing INP Algorithm & Fallback** (`src/infrastructure/web-vitals.ts` lines 231-279):
   - For entries with `interactionId > 0`: tracks max duration per interaction ID, sorts descending, and evaluates 98th percentile (`Math.min(durations.length - 1, Math.floor((durations.length - 1) * 0.02))`) when interaction count >= 50, or worst duration otherwise.
   - For entries without `interactionId`: falls back to monotonic peak duration.
   - For runtimes where the `event` PerformanceObserver type is unsupported: falls back to `first-input` observer.

4. **Explicit Image and SVG Sizing**:
   - `src/modules/auth/components/profile/AddDeviceDialog.tsx` lines 211-219:
     `<img src={totpQrCodeUrl} alt="TOTP QR code" width={176} height={176} loading="eager" decoding="async" className="size-44 object-contain aspect-square" />`
   - `src/modules/auth/components/profile/AccountOverviewPanel.tsx` lines 181-190:
     `<img src={user.avatar_url} alt={user.display_name} width={64} height={64} fetchPriority="high" loading="eager" decoding="async" className="size-16 rounded-full border-2 border-[var(--border2)] object-cover sm:size-18 aspect-square" />`
   - `src/modules/auth/components/profile/PersonalDetailsPanel.tsx` lines 251-260:
     `<img src={form.avatar_url} alt={form.display_name} width={80} height={80} fetchPriority="high" loading="eager" decoding="async" className="size-full rounded-full border-2 border-[var(--border2)] object-cover shadow-xs aspect-square" />`
   - `src/shared/motion/AnimatedEmptyState.tsx`:
     All 12 SVG illustration components (`Folder`, `Bell`, `Terminal`, `Team`, `DashboardArt`, `AiArt`, `SearchArt`, `ChartArt`, `KeyArt`, `ConnectorArt`, `WorkflowArt`, `InboxArt`) declare `width={80}` and `height={80}` alongside `viewBox="0 0 96 96"` and `className="size-20"`.
   - `src/pages/team/OrgOverviewPage.tsx` lines 90-97:
     `<img src={org.logoUrl} alt={org.name || "Organization logo"} width={40} height={40} fetchPriority="high" className="size-10 rounded-lg border border-[var(--border2)] object-cover aspect-square" />`
   - `src/components/ui/avatar.tsx` lines 26-44:
     `AvatarImage` defaults to `loading="eager"`, `decoding="async"`, and `className="aspect-square size-full rounded-full object-cover"`.

### 1.2 Tool Execution Results

1. **Production CWV Quick Audit (`npm run test:cwv:quick`)**:
   - Command: `npm run test:cwv:quick`
   - Result: Exit code 0, 15/15 PASS (100.0% compliance).
   - Metrics:
     - Mean LCP: 519 ms (threshold <= 2500 ms)
     - Mean CLS: 0.0002 (threshold <= 0.1)
     - Peak INP: 22 ms (threshold <= 200 ms)
     - Individual route CLS: 13 routes with CLS = 0, 1 route with CLS = 0.0009, 1 route with CLS = 0.0017 (all strictly < 0.01).

2. **Empirical Adversarial Challenger Harness (`node scripts/challenge-m4-telemetry.mjs`)**:
   - Command: `node scripts/challenge-m4-telemetry.mjs`
   - Result: Exit code 0, 27/27 assertions PASS.
   - Summary of test suites executed:
     - **Suite 1 (Telemetry Interface Contract & Backwards Compatibility)**:
       - `window.__getWebVitalsReport is a function on window`: PASS
       - `window.__getLcpReport is a function on window`: PASS
       - `report.fcp conforms to number | null`: PASS
       - `report.lcp conforms to schema { startTime, renderTime, elementTag, url } | null`: PASS
       - `report.cls conforms to non-negative number`: PASS
       - `report.inp conforms to number | null`: PASS
       - `report.ttfb conforms to number | null`: PASS
       - `window.__getLcpReport() returns legacy WebVitalsReport structure`: PASS
     - **Suite 2 (W3C CLS Session Window Algorithm Adversarial Verification)**:
       - `2.1 Intra-window accumulation (gap < 1s, duration < 5s sums correctly)`: PASS
       - `2.2a Inter-window split on gap >= 1s retains previous max window`: PASS
       - `2.2b Inter-window score updates when subsequent window exceeds previous`: PASS
       - `2.3 5000ms duration cap splits session window even if gap < 1s`: PASS
       - `2.4 hadRecentInput: true entries are strictly discarded`: PASS
       - `2.5 Number(toFixed(4)) maintains numeric type and avoids floating inaccuracy`: PASS
     - **Suite 3 (INP Event Timing API & Fallback Logic Verification)**:
       - `3.1 Interactions < 50 selects worst duration`: PASS
       - `3.2 Interactions >= 50 selects 98th percentile (p98) duration`: PASS
       - `3.3 Missing/zero interactionId fallback records and updates monotonically`: PASS
     - **Suite 4 (Image Layout Box Reservation & Explicit Sizing Verification)**:
       - `4.1 AddDeviceDialog source declares width={176}, height={176}, aspect-square, loading=eager, decoding=async`: PASS
       - `4.2 AccountOverviewPanel source declares width={64}, height={64}, aspect-square, fetchPriority=high`: PASS
       - `4.3 PersonalDetailsPanel source declares width={80}, height={80}, aspect-square, fetchPriority=high`: PASS
       - `4.4 AnimatedEmptyState source declares width={80} and height={80} across all 12 SVG illustrations`: PASS (12 widths, 12 heights verified)
       - `4.5 OrgOverviewPage source declares width={40}, height={40}, aspect-square on org logo`: PASS
       - `4.6 AvatarImage in components/ui/avatar.tsx defaults to loading=eager, decoding=async, aspect-square`: PASS
       - `4.7 QR Code (176x176), Account Avatar (64x64), Profile Avatar (80x80), and SVG (80x80) reserve exact layout boxes with CLS = 0`: PASS
     - **Suite 5 (Dynamic Layout Shift Detection & hadRecentInput Input Guarding)**:
       - `5.1 Baseline CLS on Departure Board is 0`: PASS
       - `5.2 Telemetry observer actively detects genuine layout shift when hadRecentInput is false`: PASS (pre: 0, post: 0.2625)
     - **Suite 6 (Multi-Route CWV Compliance Audit: 15 Items)**:
       - `All 15 audited quick scope items maintain CLS < 0.01 and LCP <= 2500ms`: PASS (15/15 passed)

---

## 2. Logic Chain

1. **Telemetry Interface Fidelity**:
   - Observation: `src/infrastructure/web-vitals.ts` implements and assigns `window.__getWebVitalsReport` and `window.__getLcpReport`.
   - Inspection of runtime report returns `{ fcp, lcp, cls, inp, ttfb }` with exact property names and expected types matching `PROJECT.md § Telemetry Interface`.
   - Legacy `window.__getLcpReport()` continues to return `{ fcp, lcp, domContentLoaded, loadEvent }`.
   - Therefore, the telemetry interface contract is strictly fulfilled without breaking backwards compatibility.

2. **W3C Session Window Algorithm Correctness**:
   - The W3C specification for Cumulative Layout Shift specifies that shifts are grouped into session windows having a maximum duration of 5000ms with a maximum gap between consecutive shifts of 1000ms.
   - Shifts with `hadRecentInput === true` (user input within 500ms) are discarded.
   - Suite 2 empirically verified boundary cases:
     - Shifts within 1000ms gap and < 5000ms duration sum together (e.g. 0.05 + 0.03 = 0.08).
     - Shifts separated by >= 1000ms split into distinct windows, and the max window score is retained.
     - Shifts spanning > 5000ms from window start split into a new window even if the gap is < 1000ms.
     - Shifts with `hadRecentInput: true` are discarded.
     - `Number(clsScore.toFixed(4))` returns a numeric value with up to 4 decimal places.
   - Therefore, the session window algorithm faithfully reproduces the W3C layout-shift specification.

3. **INP Event Timing API & Graceful Fallback**:
   - Event Timing API entries with `interactionId > 0` are tracked per unique interaction.
   - Suite 3 verified that with fewer than 50 interactions, the worst interaction latency is reported; with 50 or more interactions, the 98th percentile latency is computed and reported.
   - Runtimes with synthetic clicks or older browsers where `interactionId` is zero/absent fall back to monotonic peak latency.
   - Runtimes without `event` PerformanceObserver support fall back to the `first-input` observer.
   - Therefore, INP tracking handles all browser and synthetic testing environments robustly.

4. **Image Explicit Sizing & CLS Elimination**:
   - Before image network bytes resolve, unsized `<img>` tags have intrinsic dimensions 0x0, which causes neighbor reflow and layout shift upon byte arrival.
   - Explicit `width` and `height` HTML attributes, combined with CSS `aspect-square`, instruct the browser layout engine to reserve the geometry immediately upon DOM insertion.
   - Suite 4 verified both statically and empirically:
     - `AddDeviceDialog` QR code reserves 176x176 layout box.
     - `AccountOverviewPanel` avatar reserves 64x64 layout box.
     - `PersonalDetailsPanel` avatar reserves 80x80 layout box.
     - `AnimatedEmptyState` all 12 SVG illustrations declare explicit `width={80}` and `height={80}` with `size-20`.
     - In live headless Chrome, mounting these elements resulted in instant layout reservation with CLS = 0.
   - Therefore, F14 prevents layout shift reflows.

---

## 3. Caveats

- Hardware-dependent WebAuthn ceremony execution (such as biometric passkey enrollment) was tested at the DOM and telemetry observation level; physical FIDO2 USB/NFC touch interactions were not executed physically.
- In `scripts/audit-cwv.mjs`, the file invokes `main()` on module import, so custom challenger test harnesses must remain self-contained rather than importing `audit-cwv.mjs` directly.

---

## 4. Conclusion

Features **F14 (Image Explicit Sizing for CLS Prevention)** and **F15 (In-App Core Web Vitals Telemetry)** are verified:
- `window.__getWebVitalsReport()` matches `PROJECT.md § Telemetry Interface` schema.
- Legacy `window.__getLcpReport()` backwards compatibility is preserved.
- CLS session window clustering (5s window, 1s gap, `hadRecentInput` filtering) is correct.
- INP Event Timing API tracking and fallbacks are correct.
- All target dialogs, panels, avatars, and SVGs declare explicit dimensions and reserve layout boxes with CLS = 0.
- All 15 routes in `npm run test:cwv:quick` passed with CLS < 0.01 and LCP < 2.5s.
- All 27 empirical assertions in `scripts/challenge-m4-telemetry.mjs` passed with exit code 0.

**Verdict: APPROVE**

---

## 5. Verification Method

To independently reproduce and verify this challenger assessment:

1. **Execute Quick Production CWV Audit**:
   ```powershell
   npm run test:cwv:quick
   ```
   *Expected outcome*: Exit code 0, 15/15 items PASS, Mean LCP < 2500ms, Mean CLS < 0.01, Peak INP < 200ms.

2. **Execute Milestone 4 Empirical Telemetry & Image Sizing Challenger Harness**:
   ```powershell
   node scripts/challenge-m4-telemetry.mjs
   ```
   *Expected outcome*: Exit code 0, 27/27 assertions PASS across Suites 1 through 6, Overall Verdict: APPROVE.
