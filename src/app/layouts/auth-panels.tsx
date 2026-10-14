import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AuthAside } from "./auth-shell";

/**
 * Auth side panels. Each one shows the answer to its own page's question
 * instead of describing it. They share one frame (wordmark, figure, statement)
 * so the shell reads as one system, and only the figure and statement change.
 *
 * Every value in a figure is either true of the product or labelled as an
 * example. None of it is real telemetry.
 */

export function Wordmark() {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--text)]">Sentinel</span>
      <span className="text-[13px] text-[var(--text3)]">Console</span>
    </span>
  );
}

// ── Shared frame ─────────────────────────────────────────────

function AsideFrame({
  label,
  figure,
  title,
  children,
}: {
  label: string;
  figure: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <aside
      // Sticky so a long form column scrolls past a figure that stays put.
      // `min-h-fit` lets the panel grow instead of clipping on short screens.
      className="sticky top-0 hidden h-[100dvh] min-h-fit flex-col justify-between gap-10 self-start border-r border-[var(--border)] bg-[var(--bg1)] px-12 py-10 lg:flex xl:px-16 xl:py-12"
      aria-label={label}
    >
      <Wordmark />
      {figure}
      <div className="max-w-[30rem]">
        <h2 className="text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] text-[var(--text)] xl:text-[46px]">
          {title}
        </h2>
        <p className="mt-4 max-w-[42ch] text-[15px] leading-[1.6] text-[var(--text2)]">{children}</p>
      </div>
    </aside>
  );
}

function FigureCaption({ subject, note }: { subject: ReactNode; note: string }) {
  return (
    <figcaption className="mb-4 flex items-baseline justify-between gap-4 text-[12px] text-[var(--text3)]">
      <span className="text-[var(--text2)]">{subject}</span>
      <span>{note}</span>
    </figcaption>
  );
}

const pct = (value: number, total: number) => `${((value / total) * 100).toFixed(2)}%`;
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

// ── Sign in: signal ──────────────────────────────────────────
// One latency trace, one threshold, one crossing, one alert.

const VIEW_W = 600;
const VIEW_H = 220;
const THRESHOLD_Y = 70;
const POINTS = 96;
const SPIKE_AT = 68;
// Shape of the incident, relative to SPIKE_AT: climb, peak, recovery.
const SPIKE_SHAPE = [118, 84, 34, 58, 96, 128, 142];

/** Deterministic trace so the figure is identical on every render and SSR-safe. */
function buildTrace(): { points: string; peak: { x: number; y: number } } {
  let seed = 11;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const coords: string[] = [];
  let y = 150;
  let peak = { x: 0, y: VIEW_H };
  for (let i = 0; i < POINTS; i++) {
    y += (rand() - 0.5) * 16;
    y += (150 - y) * 0.22; // mean-revert toward the healthy baseline
    const offset = i - SPIKE_AT + 2;
    const value = offset >= 0 && offset < SPIKE_SHAPE.length ? SPIKE_SHAPE[offset] : y;
    const x = (i / (POINTS - 1)) * VIEW_W;
    if (value < peak.y) peak = { x, y: value };
    coords.push(`${x.toFixed(1)},${value.toFixed(1)}`);
  }
  return { points: coords.join(" "), peak };
}

const TRACE = buildTrace();
const RULER_LABELS = ["60m", "45m", "30m", "15m", "now"];

function SignalPanel() {
  const peakLeft = pct(TRACE.peak.x, VIEW_W);
  const peakTop = pct(TRACE.peak.y, VIEW_H);
  const thresholdTop = pct(THRESHOLD_Y, VIEW_H);

  return (
    <AsideFrame
      label="About Sentinel"
      title="Know before your users do."
      figure={
        <figure className="w-full max-w-[640px] self-center">
          <FigureCaption
            subject={<span className="font-mono">GET /v1/checkout · p99 latency</span>}
            note="Illustrative"
          />

          <div className="relative aspect-[600/220] w-full">
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="absolute inset-0 h-full w-full overflow-visible"
              aria-hidden="true"
            >
              {[40, 110, 180].map((gy) => (
                <line key={gy} x1="0" x2={VIEW_W} y1={gy} y2={gy} stroke="var(--border)" strokeWidth="1" />
              ))}
              <line
                x1="0"
                x2={VIEW_W}
                y1={THRESHOLD_Y}
                y2={THRESHOLD_Y}
                stroke="var(--text3)"
                strokeWidth="1"
                strokeDasharray="3 5"
              />
              <line
                x1={TRACE.peak.x}
                x2={TRACE.peak.x}
                y1={TRACE.peak.y}
                y2={VIEW_H}
                stroke="var(--border2)"
                strokeWidth="1"
                className="auth-trace-mark"
              />
              <polyline
                points={TRACE.points}
                pathLength={1}
                fill="none"
                stroke="var(--text)"
                strokeWidth="1.6"
                strokeLinejoin="round"
                strokeLinecap="round"
                className="auth-trace-line"
              />
            </svg>

            <span
              className="absolute right-0 -translate-y-[calc(100%+6px)] font-mono text-[11px] text-[var(--text3)]"
              style={{ top: thresholdTop }}
            >
              budget 400ms
            </span>

            <span
              className="auth-trace-mark absolute flex -translate-x-1/2 -translate-y-1/2 items-center"
              style={{ left: peakLeft, top: peakTop }}
            >
              <span className="size-[11px] rounded-full border-[1.5px] border-[var(--text)] bg-[var(--bg1)]" />
              <span className="absolute left-[calc(100%+10px)] whitespace-nowrap rounded-[4px] bg-[var(--text)] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--bg)]">
                alert opened
              </span>
            </span>
          </div>

          <div className="mt-3 flex justify-between font-mono text-[11px] text-[var(--text3)]" aria-hidden="true">
            {RULER_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </figure>
      }
    >
      Sentinel watches latency, errors, and traffic across your APIs, and opens an alert the moment a line
      crosses its threshold.
    </AsideFrame>
  );
}

// ── Register: setup path ─────────────────────────────────────
// The actual first-run sequence, in order. Copy mirrors the pages it points
// at: verify-email (24h links), organization and project creation (name only;
// Production environment plus ingestion key), API keys (pv_live_ prefix), and
// the project overview empty state (events within a minute).

const SETUP_STEPS: { title: string; detail?: string; mark?: string }[] = [
  { title: "Create your account", mark: "now" },
  { title: "Verify your email", detail: "Open the link we send. It stays valid for 24 hours." },
  {
    title: "Name your organization",
    detail: "Only the name is required. It becomes your workspace URL.",
    mark: "/acme",
  },
  {
    title: "Name your first project",
    detail: "It starts with a Production environment and an ingestion key.",
    mark: "pv_live_…",
  },
  {
    title: "Send your first event",
    detail: "Create an API key, add it to an SDK, and events appear within a minute.",
    mark: "POST /v1/telemetry",
  },
];

/** Time between stops as the rail draws down. */
const STEP_BEAT = 220;

function SetupPanel() {
  const last = SETUP_STEPS.length - 1;

  return (
    <AsideFrame
      label="What happens after you sign up"
      title="From sign-up to first event."
      figure={
        <figure className="w-full max-w-[640px] self-center">
          <FigureCaption subject="Setup path" note="Example values" />

          <ol className="flex flex-col">
            {SETUP_STEPS.map((step, index) => {
              const at = 120 + index * STEP_BEAT;
              const current = index === 0;
              return (
                <li
                  key={step.title}
                  aria-current={current ? "step" : undefined}
                  className="relative grid grid-cols-[11px_minmax(0,1fr)] gap-x-4 pb-5 last:pb-0"
                >
                  {index < last && (
                    <span
                      aria-hidden="true"
                      className="auth-rail-segment absolute -bottom-[3px] left-[5px] top-[19px] w-px bg-[var(--border2)]"
                      style={delay(at + 120)}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "auth-trace-mark mt-[5px] size-[11px] rounded-full border-[1.5px]",
                      current ? "border-[var(--text)] bg-[var(--text)]" : "border-[var(--text3)] bg-[var(--bg1)]"
                    )}
                    style={delay(at)}
                  />
                  <div className="auth-trace-mark min-w-0" style={delay(at)}>
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-[14px] font-medium leading-[1.5] text-[var(--text)]">{step.title}</p>
                      {step.mark && (
                        <span
                          className={cn(
                            "shrink-0 font-mono text-[11px]",
                            current ? "text-[var(--text2)]" : "text-[var(--text3)]"
                          )}
                        >
                          {step.mark}
                        </span>
                      )}
                    </div>
                    {step.detail && (
                      <p className="mt-0.5 text-[13px] leading-[1.5] text-[var(--text2)]">{step.detail}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </figure>
      }
    >
      Your organization and first project need only a name each. Retention, environments, and alert routing
      can wait for settings.
    </AsideFrame>
  );
}

// ── SSO: handoff ─────────────────────────────────────────────
// The redirect as a round trip: out to the identity provider over the top,
// back signed in along the bottom. Matches SsoLoginPage: domain discovery
// against SAML and OIDC providers, then a redirect and a return.

// Sized so the loop renders near 1:1 at common widths, keeping its strokes
// close to the signal trace's weight.
const LOOP_W = 400;
const LOOP_H = 176;
const LOOP_MID = LOOP_H / 2;
const LOOP_CTRL = Math.round(LOOP_W * 0.27);
const LOOP_OUT = `M6 ${LOOP_MID} C ${LOOP_CTRL} -6, ${LOOP_W - LOOP_CTRL} -6, ${LOOP_W - 6} ${LOOP_MID}`;
const LOOP_BACK = `M${LOOP_W - 6} ${LOOP_MID} C ${LOOP_W - LOOP_CTRL} ${LOOP_H + 6}, ${LOOP_CTRL} ${LOOP_H + 6}, 6 ${LOOP_MID}`;
// Apex of each symmetric cubic: 0.25 * mid + 0.75 * control y.
const APEX_TOP = 0.25 * LOOP_MID + 0.75 * -6;
const APEX_BOTTOM = 0.25 * LOOP_MID + 0.75 * (LOOP_H + 6);
const CX = LOOP_W / 2;

function Station({ title, detail, align }: { title: string; detail: ReactNode; align: "start" | "end" }) {
  return (
    <div className={cn("flex flex-col gap-0.5", align === "end" ? "items-end text-right" : "items-start text-left")}>
      <span className="whitespace-nowrap text-[13px] font-medium text-[var(--text)]">{title}</span>
      <span className="whitespace-nowrap text-[12px] text-[var(--text3)]">{detail}</span>
    </div>
  );
}

function HandoffPanel() {
  return (
    <AsideFrame
      label="How single sign-on works"
      title="Your identity provider signs you in."
      figure={
        <figure className="w-full max-w-[640px] self-center">
          <FigureCaption
            subject={
              <>
                SSO sign-in · <span className="font-mono">company.com</span>
              </>
            }
            note="Illustrative"
          />

          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2">
            <p
              className="auth-trace-mark col-start-2 row-start-1 text-center text-[12px] text-[var(--text3)]"
              style={delay(640)}
            >
              Finds your provider and sends you there
            </p>

            <div className="col-start-1 row-start-2">
              <Station
                align="end"
                title="Sentinel"
                detail={<span className="font-mono text-[11px]">company.com</span>}
              />
            </div>

            <svg
              viewBox={`0 0 ${LOOP_W} ${LOOP_H}`}
              className="col-start-2 row-start-2 block h-auto w-full overflow-visible"
              aria-hidden="true"
            >
              <line
                x1="6"
                x2={LOOP_W - 6}
                y1={LOOP_MID}
                y2={LOOP_MID}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="3 5"
              />
              <path
                d={LOOP_OUT}
                pathLength={1}
                fill="none"
                stroke="var(--text3)"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="auth-trace-line"
                style={{ animationDuration: "900ms" }}
              />
              <path
                d={LOOP_BACK}
                pathLength={1}
                fill="none"
                stroke="var(--text)"
                strokeWidth="1.6"
                strokeLinecap="round"
                className="auth-trace-line"
                style={{ animationDuration: "900ms", animationDelay: "1000ms" }}
              />
              <polyline
                points={`${CX - 5},${APEX_TOP - 6} ${CX + 1},${APEX_TOP} ${CX - 5},${APEX_TOP + 6}`}
                fill="none"
                stroke="var(--text3)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="auth-trace-mark"
                style={delay(640)}
              />
              <polyline
                points={`${CX + 5},${APEX_BOTTOM - 6} ${CX - 1},${APEX_BOTTOM} ${CX + 5},${APEX_BOTTOM + 6}`}
                fill="none"
                stroke="var(--text)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="auth-trace-mark"
                style={delay(1600)}
              />
              <circle cx="6" cy={LOOP_MID} r="5.5" fill="var(--bg1)" stroke="var(--text)" strokeWidth="1.5" />
              <circle
                cx={LOOP_W - 6}
                cy={LOOP_MID}
                r="5.5"
                fill="var(--bg1)"
                stroke="var(--text2)"
                strokeWidth="1.5"
              />
              {/* The return lands: Sentinel's node fills once you are back signed in. */}
              <circle cx="6" cy={LOOP_MID} r="2.75" fill="var(--text)" className="auth-trace-mark" style={delay(1850)} />
            </svg>

            <div className="col-start-3 row-start-2">
              <Station align="start" title="Identity provider" detail="SAML 2.0 or OIDC" />
            </div>

            <p
              className="auth-trace-mark col-start-2 row-start-3 text-center text-[12px] text-[var(--text2)]"
              style={delay(1600)}
            >
              Returns you signed in
            </p>
          </div>
        </figure>
      }
    >
      Sentinel matches your email domain to your organization&apos;s SAML or OIDC provider and sends you there.
      You come back signed in, and your SSO password never reaches Sentinel.
    </AsideFrame>
  );
}

export const AUTH_ASIDES: Record<AuthAside, ComponentType> = {
  signal: SignalPanel,
  setup: SetupPanel,
  handoff: HandoffPanel,
};
