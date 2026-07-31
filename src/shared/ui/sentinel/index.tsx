import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Sentinel signature components — sentinel-design.md §7.
 *
 * These encode the three-channel law so pages cannot drift:
 *   • AI* components are the ONLY place cyan is allowed.
 *   • StatusPill speaks the truth channel (green/red/amber/blue).
 *   • Everything else uses the brand channel, which is indigo in the Indigo
 *     theme and white in Mono — no component needs to know which.
 */

/* ── Eyebrow / section label (§4) ─────────────────────────── */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]',
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Layout rails (§5.1) ──────────────────────────────────── */

/** Forms, settings, billing, invite flows, onboarding. Caps at 720px. */
export function FocusRail({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('w-[var(--focus-rail)] max-w-[720px]', className)}>{children}</div>;
}

/** Tables, log streams, trace lists, dashboards. Takes the room it is given. */
export function DataRail({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('w-full max-w-[var(--data-rail)]', className)}>{children}</div>;
}

/* ── Status pill (truth channel, §7) ──────────────────────── */

export type StatusTone = 'ok' | 'warn' | 'error' | 'info' | 'neutral' | 'ai';

const STATUS_TONE: Record<StatusTone, string> = {
  ok: 'bg-[var(--green-bg)] text-[var(--green)]',
  warn: 'bg-[var(--amber-bg)] text-[var(--amber)]',
  error: 'bg-[var(--red-bg)] text-[var(--red)]',
  info: 'bg-[var(--blue-bg)] text-[var(--blue)]',
  neutral: 'bg-[var(--bg3)] text-[var(--text2)]',
  ai: 'bg-[var(--ai-bg)] text-[var(--ai)]',
};

export function StatusPill({
  tone = 'neutral',
  dot = false,
  children,
  className,
}: {
  tone?: StatusTone;
  /** Adds a live dot; pair with `tone="ok"` for healthy/streaming states. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em]',
        STATUS_TONE[tone],
        className,
      )}
    >
      {dot && <span className="pulse-dot size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ── AI channel (§2.4, §7) ────────────────────────────────── */

/** Confidence score pill. Model output only. */
export function ConfidencePill({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-[var(--ai-bg)] px-2 py-0.5 font-mono text-[10px] font-medium tabular-nums text-[var(--ai)]',
        className,
      )}
    >
      {Math.round(value)}% confidence
    </span>
  );
}

/** Live "AI watching" indicator — 6px cyan dot with an expanding ring. */
export function AiWatchingDot({ label = 'AI watching', className }: { label?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="relative inline-flex size-1.5">
        <span className="ai-pulse absolute inset-0 rounded-full border border-[var(--ai)]" />
        <span className="relative size-1.5 rounded-full bg-[var(--ai)]" />
      </span>
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--ai)]">
        {label}
      </span>
    </span>
  );
}

/** "AI analyzing" state — skeleton block with a cyan shimmer. Never a spinner. */
export function AiAnalyzing({ lines = 2, label = 'analyzing pattern…', className }: { lines?: number; label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="shimmer h-3 rounded-[var(--radius)] bg-[var(--bg2)]"
          style={{ width: index === lines - 1 ? '62%' : '100%' }}
        />
      ))}
      <span className="font-mono text-[10px] text-[var(--ai)]">{label}</span>
    </div>
  );
}

/** The four-point AI spark. Reserved exclusively for model output (§8). */
export function AiSpark({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 1.5v4M8 10.5v4M1.5 8h4M10.5 8h4M3.4 3.4l2.1 2.1M10.5 10.5l2.1 2.1M12.6 3.4l-2.1 2.1M5.5 10.5l-2.1 2.1" />
    </svg>
  );
}

/**
 * AI insight card — the signature component (§7).
 * bg1 · 10px radius · hairline border with a top-right inner cyan glow ·
 * gradient spark chip · body in --text2 · footer confidence pill + optional
 * model-suggested action. Hover shifts the border to --ai-d.
 */
export function AiInsightCard({
  title,
  children,
  confidence,
  action,
  className,
}: {
  title: string;
  children: ReactNode;
  confidence?: number;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'ai-glow relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-colors duration-150 hover:border-[var(--ai-d)]',
        className,
      )}
    >
      <header className="relative flex items-center gap-2">
        <span className="logo-gradient flex size-[22px] items-center justify-center rounded-[6px] text-[var(--brand-fg)]">
          <AiSpark size={12} />
        </span>
        <h3 className="text-[12px] font-semibold text-[var(--text)]">{title}</h3>
      </header>
      <div className="relative mt-2 text-[13px] leading-[1.5] text-[var(--text2)]">{children}</div>
      {(confidence !== undefined || action) && (
        <footer className="relative mt-3 flex items-center justify-between gap-3">
          {confidence !== undefined ? <ConfidencePill value={confidence} /> : <span />}
          {action}
        </footer>
      )}
    </article>
  );
}

/** AI action button (§7) — model-suggested actions only. */
export function AiActionButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--ai-d)] bg-[var(--ai-bg)] px-2.5 text-[12px] font-medium text-[var(--ai)] transition-colors duration-150 outline-none hover:bg-[var(--ai)] hover:text-[var(--ai-fg)] focus-visible:ring-3 focus-visible:ring-[var(--ai-bg)] disabled:opacity-50',
        className,
      )}
    >
      <AiSpark size={12} />
      {children}
    </button>
  );
}

/* ── Logo mark (§8) ───────────────────────────────────────── */

export function SentinelLogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('logo-gradient inline-flex items-center justify-center rounded-[7px]', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 16 16"
        fill="none"
        stroke="var(--brand-fg)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 8.5h3l2-4.5 2.5 9 2-4.5H15" />
      </svg>
    </span>
  );
}
