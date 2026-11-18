# Handoff Report: Explorer M4 3 (Image Explicit Sizing & CWV Telemetry)

**Focus Scope**: Feature F14 (Image Explicit Sizing for CLS Prevention) & Feature F15 (In-App Core Web Vitals Telemetry Instrumentation)  
**Milestone**: M4 (Runtime CWV Hardening & Telemetry)  
**Author**: teamwork_explorer (Explorer M4 3)  
**Target Recipient**: Milestone 4 Workers / Orchestrator  
**File Location**: `.agents/teamwork/teamwork_explorer_m4_3/handoff.md`

---

## 1. Observation

### 1.1 Scope & Context
- `PROJECT.md` line 31 specifies **Feature F14**:
  > "Add explicit `width` and `height` attributes to all images (e.g. `AddDeviceDialog.tsx`)"
- `PROJECT.md` lines 32, 48–69 specify **Feature F15** and the required Telemetry Interface Contract:
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

  declare global {
    interface Window {
      __getLcpReport?: () => unknown;
      __getWebVitalsReport?: () => FullWebVitalsReport;
    }
  }
  ```
- `scripts/audit-cwv.mjs` lines 909–925 consume `window.__getWebVitalsReport()` during automated audits across all 140 routes:
  ```js
  const inAppReport = typeof window.__getWebVitalsReport === 'function' ? window.__getWebVitalsReport() : null;
  const inAppLcp = typeof window.__getLcpReport === 'function' ? window.__getLcpReport() : null;
  const harness = window.__cwv_harness || {};

  const effectiveFcp = inAppReport?.fcp ?? harness.fcp ?? nativeFcp ?? (nav.domContentLoadedEventEnd || 0);
  const effectiveLcp = inAppReport?.lcp?.startTime ?? harness.lcp?.startTime ?? inAppLcp?.lcp?.startTime ?? nativeLcp ?? effectiveFcp;
  const effectiveCls = inAppReport?.cls ?? harness.cls ?? 0;
  const effectiveInp = inAppReport?.inp ?? harness.inp ?? 18;
  const effectiveTtfb = inAppReport?.ttfb ?? nav.responseStart ?? 0;
  ```

---

### 1.2 F14: Codebase Audit of `<img>` Tags, Dialogs, Avatars & SVGs

A full search for `<img` and `src=` attributes across all `.tsx` and `.jsx` files in `src/` revealed exactly four direct `<img` tags, three `AvatarImage` usages, and ten SVG illustrations in empty states:

#### 1.2.1 Missing Dimension Attributes in `AddDeviceDialog.tsx`
- **Location**: `src/modules/auth/components/profile/AddDeviceDialog.tsx` (Note: The prompt noted `src/pages/inventory/AddDeviceDialog.tsx` as a reference path; there is no `inventory` directory in the repository, and the actual dialog is located in `src/modules/auth/components/profile/AddDeviceDialog.tsx`).
- **Verbatim Code** (lines 208–217):
  ```tsx
  <div className="flex flex-col items-center gap-4 pt-2">
    {totpQrCodeUrl ? (
      <div className="bg-white p-3.5 rounded-[var(--radius-lg)] shadow-sm">
        <img src={totpQrCodeUrl} alt="TOTP QR code" className="size-44 object-contain" />
      </div>
    ) : (
      <div className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-4 py-6 text-center text-[13px] text-[var(--text3)]">
        QR code unavailable. Use the manual setup key below in your authenticator app.
      </div>
    )}
  ```
- **Direct Observation**:
  - `className="size-44 object-contain"` applies `width: 11rem (176px)` and `height: 11rem (176px)` via Tailwind CSS.
  - However, the `<img>` tag **completely lacks** HTML `width`, `height`, `loading`, and `decoding` attributes.
  - Until the CSS stylesheet finishes parsing or the QR image finishes loading, the browser does not calculate the aspect ratio or reserve space, causing Cumulative Layout Shift (CLS) in the modal dialog content upon QR image render.

#### 1.2.2 Existing `<img>` Tags in Profile & Team Pages
- **`src/modules/auth/components/profile/PersonalDetailsPanel.tsx`** (lines 250–258):
  ```tsx
  <img
    src={form.avatar_url}
    alt={form.display_name}
    width={80}
    height={80}
    {...({ fetchpriority: "high" } as any)}
    decoding="async"
    className="size-full rounded-full border-2 border-[var(--border2)] object-cover shadow-xs"
  />
  ```
  *Status*: Has `width={80}` and `height={80}`. Missing explicit `loading="eager"` and `aspect-square`.
- **`src/pages/team/OrgOverviewPage.tsx`** (lines 90–98):
  ```tsx
  <img
    src={org.logoUrl}
    alt={org.name || "Organization logo"}
    width={40}
    height={40}
    {...({ fetchpriority: "high" } as any)}
    decoding="async"
    className="size-10 rounded-[8px] object-cover"
  />
  ```
  *Status*: Has `width={40}` and `height={40}`. Missing explicit `loading="eager"` and `aspect-square`.
- **`src/modules/auth/components/profile/AccountOverviewPanel.tsx`** (lines 184–192):
  ```tsx
  <img
    src={user.avatar_url}
    alt={user.display_name}
    width={64}
    height={64}
    {...({ fetchpriority: "high" } as any)}
    decoding="async"
    className="size-16 rounded-full border-2 border-[var(--border2)] object-cover sm:size-18"
  />
  ```
  *Status*: Has `width={64}` and `height={64}`. Missing explicit `loading="eager"` and `aspect-square`.

#### 1.2.3 Avatar Images (`AvatarImage`)
- `src/components/ui/avatar.tsx` (lines 26–40) defines `AvatarImage`:
  ```tsx
  function AvatarImage({
    className,
    ...props
  }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
    return (
      <AvatarPrimitive.Image
        data-slot="avatar-image"
        className={cn(
          "aspect-square size-full rounded-full object-cover",
          className
        )}
        {...props}
      />
    )
  }
  ```
  It has `aspect-square size-full`. Call sites:
  1. `src/app/layouts/SettingsLayout.tsx:98`: Inside `Avatar` with `size-11` (`44px`).
  2. `src/app/layouts/AppHeader/AvatarDropdown/DropdownMenu.tsx:99`: Inside `Avatar` with `size-9` (`36px`).
  3. `src/app/layouts/AppHeader/AvatarDropdown/AvatarButton.tsx:33`: Inside `Avatar` with `size-8.5` (`34px`).
  Call sites currently do not pass explicit `width`, `height`, or `loading` attributes to `AvatarImage`.

#### 1.2.4 Empty State SVG Illustrations
- `src/shared/motion/AnimatedEmptyState.tsx` defines 10 SVG illustrations for empty states:
  - `InboxArt` (line 74), `AlertsArt` (line 104), `TeamArt` (line 150), `DashboardArt` (line 192), `AiArt` (line 221), `AuditArt` (line 272), `ObservabilityArt` (line 287), `BillingArt` (line 310), `SettingsArt` (line 333), `NotFoundArt` (line 356).
  - All 10 SVGs use:
    `<svg viewBox="0 0 96 96" className="size-20" aria-hidden="true">`
  - While `className="size-20"` sets `80px x 80px`, none of them have explicit HTML `width={80}` and `height={80}` attributes, meaning prior to CSS parsing, default SVG viewBox scaling or layout sizing rules can trigger shift.

---

### 1.3 F15: Current Telemetry in `src/infrastructure/web-vitals.ts`
- **Location**: `src/infrastructure/web-vitals.ts` (lines 18–87)
- **Current Observation**:
  - Observes only:
    1. `paint` observer for `first-contentful-paint` (FCP).
    2. `largest-contentful-paint` observer (LCP).
  - Exposes only `(window as any).__getLcpReport(): WebVitalsReport` returning `{ fcp, lcp, domContentLoaded, loadEvent }`.
  - **Critical Telemetry Gaps**:
    1. Zero observation of Cumulative Layout Shift (`layout-shift` PerformanceObserver is missing).
    2. Zero session window aggregation algorithm for CLS.
    3. Zero observation of Interaction to Next Paint (`event` PerformanceObserver and `first-input` fallback are missing).
    4. Missing `window.__getWebVitalsReport(): FullWebVitalsReport` conforming to `PROJECT.md § Telemetry Interface`.
    5. Missing `ttfb` extraction from `PerformanceNavigationTiming`.

---

## 2. Logic Chain

1. **Premise 1 (CLS Vulnerability from Missing Dimensions)**: Modern browsers compute image aspect ratio from HTML `width` and `height` attributes before CSS stylesheet evaluation and network download finish.
   - *Observation Reference*: §1.2.1 shows `AddDeviceDialog.tsx:211` has `<img src={totpQrCodeUrl} className="size-44 object-contain" />` without `width` and `height`.
   - *Deduction*: When the user opens the TOTP modal, the QR code container initially collapses to 0 height. When the QR data URL or image resource arrives, it expands to 176px, inducing an observable layout shift.
   - *Solution*: Adding `width={176}`, `height={176}`, `loading="eager"`, and `decoding="async"` reserves the exact 176x176 physical layout box, eliminating layout shift.
   - *Secondary Refinements*: Adding explicit `width` and `height` to `AvatarImage` usages (§1.2.3) and `AnimatedEmptyState.tsx` SVG illustrations (§1.2.4) reinforces zero layout shifts across all application states.

2. **Premise 2 (CLS Session Window Calculation Requirement)**: According to the W3C Web Vitals specification, CLS is not a simple cumulative sum of all layout shifts, but the maximum sum of layout shift scores in a session window:
   - *Observation Reference*: §1.1 and §1.3.
   - *Deduction*:
     - Layout shifts with `hadRecentInput === true` (shifts occurring within 500ms of user input) must be excluded.
     - A session window starts on the first layout shift.
     - Subsequent shifts belong to the same session window if the gap between shifts is < 1000ms AND the window duration is < 5000ms.
     - If either condition is exceeded, a new session window begins.
     - The reportable CLS value is the maximum session window score across the session lifetime.

3. **Premise 3 (INP Interaction Duration Calculation Requirement)**: According to the W3C Event Timing API:
   - *Observation Reference*: §1.1 and §1.3.
   - *Deduction*:
     - User interactions (clicks, keyboard strokes, taps) produce `event` PerformanceEntry items with an `interactionId` and `duration`.
     - Related events belonging to the same interaction share the same `interactionId`. The duration of that interaction is `max(duration)` among its events.
     - For apps with < 50 interactions, INP is the worst interaction duration.
     - For environments where `type: 'event'` is unsupported or throws (e.g. older engines or synthetic CDP contexts), falling back to `first-input` ensures interaction delay is still recorded.
     - If no interaction has occurred, `inp` must be `null` according to the `FullWebVitalsReport` interface contract.

4. **Premise 4 (Automated E2E Audit Contract Compliance)**:
   - *Observation Reference*: §1.1 shows `scripts/audit-cwv.mjs` directly queries `window.__getWebVitalsReport()` on every tested route and reads `fcp`, `lcp.startTime`, `cls`, `inp`, and `ttfb`.
   - *Deduction*: If `window.__getWebVitalsReport()` is implemented strictly conforming to `PROJECT.md § Telemetry Interface`, `audit-cwv.mjs` immediately acquires accurate, high-fidelity in-app CWV telemetry instead of synthetic fallbacks.

---

## 3. Caveats

1. **Synthetic vs. Real User Interaction in INP**:
   In headless or synthetic audit environments (e.g. `audit-cwv.mjs`), synthetic events dispatched via CDP (`Input.dispatchMouseEvent`) may or may not populate `interactionId` depending on the Chromium build. To handle this, our INP design tracks `interactionId` when present, but also records standalone event durations if `interactionId` is absent or 0, preventing dropped interaction telemetry.
2. **Path Discrepancy Note**:
   The initial dispatch prompt referenced `src/pages/inventory/AddDeviceDialog.tsx`. The repository has no `src/pages/inventory` directory. The actual component is located at `src/modules/auth/components/profile/AddDeviceDialog.tsx`. Workers must modify this file.
3. **Backward Compatibility**:
   Existing code and diagnostic scripts reference `window.__getLcpReport()`. The telemetry extension must maintain `window.__getLcpReport()` alongside the new `window.__getWebVitalsReport()`.
4. **Read-Only Explorer Constraint**:
   This report is strictly an investigation and proposal. No application source code has been altered.

---

## 4. Conclusion & Concrete Code Proposals

### 4.1 F14: Concrete Code Changes for Image Sizing

#### Change 1: `src/modules/auth/components/profile/AddDeviceDialog.tsx`
- **Target**: Line 211
- **Before**:
  ```tsx
  <div className="bg-white p-3.5 rounded-[var(--radius-lg)] shadow-sm">
    <img src={totpQrCodeUrl} alt="TOTP QR code" className="size-44 object-contain" />
  </div>
  ```
- **After**:
  ```tsx
  <div className="bg-white p-3.5 rounded-[var(--radius-lg)] shadow-sm">
    <img
      src={totpQrCodeUrl}
      alt="TOTP QR code"
      width={176}
      height={176}
      loading="eager"
      decoding="async"
      className="size-44 object-contain aspect-square"
    />
  </div>
  ```

#### Change 2: `src/shared/motion/AnimatedEmptyState.tsx`
- **Target**: Lines 74, 104, 150, 192, 221, 272, 287, 310, 333, 356
- **Rationale**: Add explicit `width={80} height={80}` attributes to the 10 illustration `<svg>` elements that have `viewBox="0 0 96 96" className="size-20"`.
- **Example (Line 221)**:
  - **Before**:
    ```tsx
    <svg viewBox="0 0 96 96" className="size-20" aria-hidden="true">
    ```
  - **After**:
    ```tsx
    <svg width={80} height={80} viewBox="0 0 96 96" className="size-20" aria-hidden="true">
    ```

#### Change 3: Avatar Sizing at Header & Layout Call Sites
- **`src/app/layouts/AppHeader/AvatarDropdown/AvatarButton.tsx`** (line 33):
  - **Before**: `<AvatarImage src={avatarUrl} alt={displayName || email || 'User'} className="object-cover" />`
  - **After**: `<AvatarImage src={avatarUrl} alt={displayName || email || 'User'} width={34} height={34} loading="eager" decoding="async" className="object-cover" />`
- **`src/app/layouts/AppHeader/AvatarDropdown/DropdownMenu.tsx`** (line 99):
  - **Before**: `<AvatarImage src={avatarUrl} alt={displayName || email} className="object-cover" />`
  - **After**: `<AvatarImage src={avatarUrl} alt={displayName || email} width={36} height={36} loading="lazy" decoding="async" className="object-cover" />`
- **`src/app/layouts/SettingsLayout.tsx`** (line 98):
  - **Before**: `<AvatarImage src={avatarUrl} alt={fullName || email} className="object-cover" />`
  - **After**: `<AvatarImage src={avatarUrl} alt={fullName || email} width={44} height={44} loading="lazy" decoding="async" className="object-cover" />`

---

### 4.2 F15: Concrete Implementation for `src/infrastructure/web-vitals.ts`

Replace the contents of `src/infrastructure/web-vitals.ts` with the following complete, fully typed implementation:

```ts
/**
 * Web Vitals & Core Web Vitals (CWV) Telemetry Monitoring.
 * Captures real-time paint metrics (FCP, LCP), layout shift (CLS),
 * interaction latency (INP), and network timing (TTFB).
 *
 * Implements W3C / Web Vitals standard algorithms:
 * - CLS: Session window algorithm (5s max session window, 1s inter-shift gap, excluding recent input).
 * - INP: Interaction to Next Paint from 'event' PerformanceObserver (fallback to 'first-input').
 * - LCP: Largest Contentful Paint candidate tracking.
 * - FCP: First Contentful Paint timestamp.
 * - TTFB: Time to First Byte from PerformanceNavigationTiming responseStart.
 */

export interface LcpEntryDetails {
  startTime: number;
  renderTime: number;
  loadTime: number;
  size: number;
  elementTag: string | null;
  elementId: string | null;
  elementClass: string | null;
  url: string | null;
}

export interface WebVitalsReport {
  fcp: number | null;
  lcp: LcpEntryDetails | null;
  domContentLoaded: number | null;
  loadEvent: number | null;
}

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

declare global {
  interface Window {
    __getLcpReport?: () => WebVitalsReport;
    __getWebVitalsReport?: () => FullWebVitalsReport;
  }
}

// ── State Storage ────────────────────────────────────────────────────────────

let latestLcp: LcpEntryDetails | null = null;
let firstContentfulPaint: number | null = null;

// CLS State (Session window algorithm)
let clsScore = 0;
let currentSessionScore = 0;
let sessionStartTime = 0;
let prevShiftTime = 0;

// INP State
let currentInp: number | null = null;
const interactionDurations = new Map<number, number>();

// ── Types for Internal Observers ─────────────────────────────────────────────

interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput?: boolean;
  value?: number;
}

interface EventTimingEntry extends PerformanceEntry {
  processingStart?: number;
  processingEnd?: number;
  duration: number;
  interactionId?: number;
}

// ── Helper Accessors ─────────────────────────────────────────────────────────

function getFcp(): number | null {
  if (firstContentfulPaint !== null) return firstContentfulPaint;
  if (typeof performance !== "undefined" && typeof performance.getEntriesByName === "function") {
    const paintEntries = performance.getEntriesByName("first-contentful-paint");
    if (paintEntries.length > 0) {
      firstContentfulPaint = paintEntries[0].startTime;
      return firstContentfulPaint;
    }
  }
  return null;
}

function getTtfb(): number | null {
  if (typeof performance !== "undefined" && typeof performance.getEntriesByType === "function") {
    const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navEntry && typeof navEntry.responseStart === "number" && navEntry.responseStart > 0) {
      return navEntry.responseStart;
    }
  }
  return null;
}

function getLcpReportEntry(): FullWebVitalsReport["lcp"] {
  if (latestLcp) {
    return {
      startTime: latestLcp.startTime,
      renderTime: latestLcp.renderTime,
      elementTag: latestLcp.elementTag,
      url: latestLcp.url,
    };
  }
  if (typeof performance !== "undefined" && typeof performance.getEntriesByType === "function") {
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    if (lcpEntries.length > 0) {
      const last = lcpEntries[lcpEntries.length - 1] as PerformanceEntry & {
        element?: Element;
        renderTime?: number;
        url?: string;
      };
      return {
        startTime: last.startTime,
        renderTime: last.renderTime ?? last.startTime,
        elementTag: last.element?.tagName ?? null,
        url: last.url ?? null,
      };
    }
  }
  return null;
}

function getCls(): number {
  return Number(clsScore.toFixed(4));
}

function getInp(): number | null {
  return currentInp !== null ? Math.round(currentInp) : null;
}

// ── Observers Initialization ─────────────────────────────────────────────────

if (typeof window !== "undefined" && "PerformanceObserver" in window) {
  // 1. Observe Paint entries (FCP)
  try {
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          firstContentfulPaint = entry.startTime;
        }
      }
    });
    paintObserver.observe({ type: "paint", buffered: true });
  } catch {}

  // 2. Observe Largest Contentful Paint (LCP)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & {
        element?: Element;
        renderTime?: number;
        loadTime?: number;
        size?: number;
        url?: string;
      };

      if (last) {
        latestLcp = {
          startTime: last.startTime,
          renderTime: last.renderTime ?? last.startTime,
          loadTime: last.loadTime ?? 0,
          size: last.size ?? 0,
          elementTag: last.element?.tagName ?? null,
          elementId: last.element?.id ?? null,
          elementClass: last.element?.className ?? null,
          url: last.url ?? null,
        };

        if (import.meta.env.DEV) {
          console.debug(
            `[LCP] ${Math.round(last.startTime)}ms on <${last.element?.tagName?.toLowerCase() ?? "text"}>`,
            last.element,
          );
        }
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}

  // 3. Observe Cumulative Layout Shift (CLS) with Session Window Algorithm
  // Window rules: maximum 5000ms duration, maximum 1000ms gap between shifts.
  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as LayoutShiftEntry;
        // Ignore shifts with recent user input (within 500ms)
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
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch {}

  // 4. Observe Interaction to Next Paint (INP) via Event Timing API
  try {
    const eventObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const ev = entry as EventTimingEntry;
        if (!ev.duration || ev.duration <= 0) continue;

        if (ev.interactionId && ev.interactionId > 0) {
          const prev = interactionDurations.get(ev.interactionId) ?? 0;
          if (ev.duration > prev) {
            interactionDurations.set(ev.interactionId, ev.duration);
          }
          // Compute INP (p98 if >= 50 interactions, else worst)
          const durations = Array.from(interactionDurations.values()).sort((a, b) => b - a);
          const p98Index = durations.length >= 50
            ? Math.min(durations.length - 1, Math.floor((durations.length - 1) * 0.02))
            : 0;
          currentInp = durations[p98Index];
        } else {
          // Fallback for interactions without interactionId (e.g. synthetic test clicks)
          if (currentInp === null || ev.duration > currentInp) {
            currentInp = ev.duration;
          }
        }
      }
    });

    // Attempt durationThreshold: 16ms first, fallback if options unsupported
    try {
      eventObserver.observe({
        type: "event",
        buffered: true,
        durationThreshold: 16,
      } as PerformanceObserverInit);
    } catch {
      eventObserver.observe({ type: "event", buffered: true });
    }
  } catch {
    // Fallback to first-input if 'event' type is unsupported
    try {
      const firstInputObserver = new PerformanceObserver((list) => {
        const first = list.getEntries()[0];
        if (first && currentInp === null) {
          currentInp = first.duration;
        }
      });
      firstInputObserver.observe({ type: "first-input", buffered: true });
    } catch {}
  }

  // 5. Expose Global Accessors
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
}

// ── Module Exports ───────────────────────────────────────────────────────────

export function getLcpDetails(): LcpEntryDetails | null {
  return latestLcp;
}

export function getWebVitalsReport(): FullWebVitalsReport {
  return {
    fcp: getFcp(),
    lcp: getLcpReportEntry(),
    cls: getCls(),
    inp: getInp(),
    ttfb: getTtfb(),
  };
}
```

---

## 5. Verification Method

### 5.1 Independent Verification Steps for Workers
1. **Type Checking & Production Build**:
   ```bash
   npm run build
   ```
   *Expected Outcome*: `tsc -b && vite build` succeeds with exit code 0 and zero TypeScript or module bundling errors.
2. **In-App Global Telemetry Contract Verification**:
   Start the preview server:
   ```bash
   npm run preview
   ```
   Open a browser console or execute via Node/Puppeteer/Playwright:
   ```javascript
   const report = window.__getWebVitalsReport();
   console.assert(typeof report === 'object' && report !== null, 'Report exists');
   console.assert('fcp' in report, 'Report has fcp');
   console.assert('lcp' in report, 'Report has lcp');
   console.assert('cls' in report && typeof report.cls === 'number', 'Report has numeric cls');
   console.assert('inp' in report, 'Report has inp');
   console.assert('ttfb' in report, 'Report has ttfb');
   ```
3. **Automated CWV Audit Harness**:
   Run the quick tier 1 route audit:
   ```bash
   node scripts/audit-cwv.mjs --routes quick
   ```
   *Expected Outcome*: `window.__getWebVitalsReport()` is picked up by `audit-cwv.mjs:909`, returning valid metric values with CLS < 0.1, INP < 200ms, and LCP < 2500ms.
4. **Image Dimension Inspection in DOM**:
   Inspect the rendered TOTP QR dialog in `MfaSecurityPanel.tsx`:
   ```javascript
   const img = document.querySelector('img[alt="TOTP QR code"]');
   console.assert(img.getAttribute('width') === '176', 'width is 176');
   console.assert(img.getAttribute('height') === '176', 'height is 176');
   ```

### 5.2 Invalidation Conditions
- Any occurrence of `window.__getWebVitalsReport()` returning `undefined` or throwing an unhandled exception.
- Return type of `__getWebVitalsReport()` missing any property of `{ fcp, lcp, cls, inp, ttfb }`.
- Any TypeScript error during `tsc -b` on `src/infrastructure/web-vitals.ts`.
- Any image rendering with unstabilized dimensions resulting in a layout shift score > 0.05 on modal activation.
