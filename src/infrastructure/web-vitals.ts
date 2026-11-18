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
  } catch {
    /* paint observer unsupported */
  }

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
  } catch {
    /* LCP observer unsupported */
  }

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
  } catch {
    /* CLS observer unsupported */
  }

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
    } catch {
      /* first-input observer unsupported */
    }
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
