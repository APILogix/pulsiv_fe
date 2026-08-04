import type { ComponentType, ReactNode } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { DURATION, EASE } from "./tokens";
import { useMotionPreference } from "./MotionProvider";

/**
 * AnimatedEmptyState — Phase 5.
 *
 * Empty screens are the cheapest place to lose a user, so each one gets a
 * purpose-built illustration, a sentence explaining what lives here, and a CTA.
 *
 * The illustrations are hand-rolled SVG + framer-motion rather than Lottie: a
 * Lottie runtime is ~35KB gzipped plus a JSON payload per animation, which is a
 * poor trade for decoration that appears on an empty page. These weigh nothing
 * extra because framer-motion is already in the bundle, and they inherit theme
 * tokens so both themes stay correct.
 *
 * Every loop below is disabled under `prefers-reduced-motion` (Phase 12): the
 * illustration still renders, it just holds still.
 */

export type EmptyIllustration =
  | "folder"
  | "bell"
  | "terminal"
  | "team"
  | "dashboard"
  | "ai"
  | "search"
  | "chart"
  | "key"
  | "connector"
  | "workflow"
  | "inbox";

const FLOAT = {
  y: [0, -5, 0],
  transition: { duration: 3.6, ease: EASE.inOut, repeat: Infinity },
};

/* ─────────────────────────── illustrations ─────────────────────────── */

function Folder({ animate }: { animate: boolean }) {
  return (
    <motion.svg viewBox="0 0 96 96" className="size-20" animate={animate ? FLOAT : undefined} aria-hidden="true">
      {/* back sheet lifts slightly — reads as "empty folder" */}
      <motion.rect
        x="22" y="26" width="52" height="40" rx="6"
        fill="var(--bg3)" stroke="var(--border2)"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 26, opacity: 1 }}
        transition={{ duration: DURATION.slow, ease: EASE.standard }}
      />
      <motion.path
        d="M18 36 h20 l6 -7 h34 a6 6 0 0 1 6 6 v31 a6 6 0 0 1 -6 6 H24 a6 6 0 0 1 -6 -6 z"
        fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1.5"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: DURATION.slow, ease: EASE.standard, delay: 0.06 }}
        style={{ transformOrigin: "48px 56px" }}
      />
      {animate && (
        <motion.circle
          cx="48" cy="52" r="3" fill="var(--brand)"
          animate={{ opacity: [0.25, 1, 0.25], scale: [0.9, 1.15, 0.9] }}
          transition={{ duration: 2.4, ease: EASE.inOut, repeat: Infinity }}
        />
      )}
    </motion.svg>
  );
}

function Bell({ animate }: { animate: boolean }) {
  return (
    <svg viewBox="0 0 96 96" className="size-20" aria-hidden="true">
      <motion.g
        style={{ transformOrigin: "48px 26px" }}
        animate={animate ? { rotate: [0, -8, 7, -4, 0] } : undefined}
        transition={{ duration: 2.4, ease: EASE.inOut, repeat: Infinity, repeatDelay: 1.6 }}
      >
        <path
          d="M48 22a16 16 0 0 1 16 16v12l6 9H26l6-9V38a16 16 0 0 1 16-16z"
          fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1.5"
        />
        <path d="M40 63a8 8 0 0 0 16 0" fill="none" stroke="var(--border2)" strokeWidth="1.5" />
        <circle cx="48" cy="20" r="3" fill="var(--brand)" />
      </motion.g>
      {animate && (
        <>
          <motion.path
            d="M70 34a20 20 0 0 1 5 12" fill="none" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round"
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ duration: 2.4, ease: EASE.inOut, repeat: Infinity, repeatDelay: 1.6 }}
          />
          <motion.path
            d="M26 34a20 20 0 0 0-5 12" fill="none" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round"
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ duration: 2.4, ease: EASE.inOut, repeat: Infinity, repeatDelay: 1.6, delay: 0.1 }}
          />
        </>
      )}
    </svg>
  );
}

function Terminal({ animate }: { animate: boolean }) {
  return (
    <svg viewBox="0 0 96 96" className="size-20" aria-hidden="true">
      <rect x="14" y="22" width="68" height="52" rx="8" fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1.5" />
      <path d="M14 33h68" stroke="var(--border)" strokeWidth="1.5" />
      <circle cx="23" cy="27.5" r="2" fill="var(--red)" opacity="0.7" />
      <circle cx="31" cy="27.5" r="2" fill="var(--amber)" opacity="0.7" />
      <circle cx="39" cy="27.5" r="2" fill="var(--green)" opacity="0.7" />
      <path d="M24 46l5 5-5 5" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {[0, 1, 2].map((row) => (
        <motion.rect
          key={row}
          x={36} y={44 + row * 9} height="3.5" rx="1.75"
          fill="var(--text3)" opacity={0.5}
          initial={{ width: 0 }}
          animate={animate ? { width: [0, 30 - row * 6, 30 - row * 6, 0] } : { width: 30 - row * 6 }}
          transition={
            animate
              ? { duration: 3.6, times: [0, 0.35, 0.8, 1], repeat: Infinity, delay: row * 0.25, ease: EASE.inOut }
              : undefined
          }
        />
      ))}
      {animate && (
        <motion.rect
          x="36" y="62" width="6" height="3.5" rx="1" fill="var(--ai)"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
        />
      )}
    </svg>
  );
}

function Team({ animate }: { animate: boolean }) {
  const people = [
    { cx: 34, cy: 44, r: 8, delay: 0 },
    { cx: 62, cy: 44, r: 8, delay: 0.12 },
    { cx: 48, cy: 34, r: 9, delay: 0.06 },
  ];
  return (
    <svg viewBox="0 0 96 96" className="size-20" aria-hidden="true">
      {people.map((person, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.slow, ease: EASE.standard, delay: person.delay }}
        >
          <motion.circle
            cx={person.cx} cy={person.cy} r={person.r}
            fill="var(--bg3)" stroke="var(--border2)" strokeWidth="1.5"
            animate={animate ? { y: [0, -3, 0] } : undefined}
            transition={{ duration: 3.2, ease: EASE.inOut, repeat: Infinity, delay: person.delay * 4 }}
          />
          <motion.path
            d={`M${person.cx - person.r - 3} ${person.cy + person.r + 13} a${person.r + 3} ${person.r + 1} 0 0 1 ${(person.r + 3) * 2} 0`}
            fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1.5"
            animate={animate ? { y: [0, -3, 0] } : undefined}
            transition={{ duration: 3.2, ease: EASE.inOut, repeat: Infinity, delay: person.delay * 4 }}
          />
        </motion.g>
      ))}
      {animate && (
        <motion.circle
          cx="48" cy="34" r="14" fill="none" stroke="var(--brand)" strokeWidth="1"
          animate={{ scale: [0.9, 1.35], opacity: [0.4, 0] }}
          transition={{ duration: 2.6, ease: EASE.standard, repeat: Infinity }}
          style={{ transformOrigin: "48px 34px" }}
        />
      )}
    </svg>
  );
}

function DashboardArt({ animate }: { animate: boolean }) {
  const bars = [
    { x: 26, h: 14 },
    { x: 38, h: 22 },
    { x: 50, h: 17 },
    { x: 62, h: 26 },
  ];
  return (
    <svg viewBox="0 0 96 96" className="size-20" aria-hidden="true">
      <rect x="14" y="22" width="68" height="52" rx="8" fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1.5" />
      <rect x="22" y="30" width="22" height="4" rx="2" fill="var(--text3)" opacity="0.45" />
      {bars.map((bar, i) => (
        <motion.rect
          key={i}
          x={bar.x} width="8" rx="2"
          fill={i === 3 ? "var(--brand)" : "var(--bg3)"}
          stroke="var(--border2)" strokeWidth={i === 3 ? 0 : 1}
          initial={{ height: 0, y: 66 }}
          animate={
            animate
              ? { height: [0, bar.h, bar.h * 0.7, bar.h], y: [66, 66 - bar.h, 66 - bar.h * 0.7, 66 - bar.h] }
              : { height: bar.h, y: 66 - bar.h }
          }
          transition={
            animate
              ? { duration: 4, repeat: Infinity, ease: EASE.inOut, delay: i * 0.15 }
              : { duration: DURATION.slow, ease: EASE.standard, delay: i * 0.06 }
          }
        />
      ))}
      <path d="M22 66h52" stroke="var(--border)" strokeWidth="1.5" />
    </svg>
  );
}

function AiArt({ animate }: { animate: boolean }) {
  return (
    <svg viewBox="0 0 96 96" className="size-20" aria-hidden="true">
      {animate && (
        <>
          <motion.circle
            cx="48" cy="48" r="18" fill="none" stroke="var(--ai)" strokeWidth="1"
            animate={{ scale: [1, 1.9], opacity: [0.45, 0] }}
            transition={{ duration: 2.6, ease: EASE.standard, repeat: Infinity }}
            style={{ transformOrigin: "48px 48px" }}
          />
          <motion.circle
            cx="48" cy="48" r="18" fill="none" stroke="var(--ai)" strokeWidth="1"
            animate={{ scale: [1, 1.9], opacity: [0.45, 0] }}
            transition={{ duration: 2.6, ease: EASE.standard, repeat: Infinity, delay: 1.3 }}
            style={{ transformOrigin: "48px 48px" }}
          />
        </>
      )}
      <motion.circle
        cx="48" cy="48" r="16" fill="var(--ai-bg)" stroke="var(--ai)" strokeWidth="1.5"
        animate={animate ? { scale: [1, 1.05, 1] } : undefined}
        transition={{ duration: 2.4, ease: EASE.inOut, repeat: Infinity }}
        style={{ transformOrigin: "48px 48px" }}
      />
      {/* orbiting nodes — one group rotation keeps this to a single transform */}
      <motion.g
        animate={animate ? { rotate: 360 } : undefined}
        transition={{ duration: 14, ease: "linear", repeat: Infinity }}
        style={{ transformOrigin: "48px 48px" }}
      >
        {[0, 120, 240].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <circle
              key={angle}
              cx={48 + Math.cos(rad) * 28}
              cy={48 + Math.sin(rad) * 28}
              r="3.5"
              fill="var(--bg1)"
              stroke="var(--ai)"
              strokeWidth="1.5"
            />
          );
        })}
      </motion.g>
      <path d="M42 48h12M48 42v12" stroke="var(--ai)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

function SearchArt({ animate }: { animate: boolean }) {
  return (
    <svg viewBox="0 0 96 96" className="size-20" aria-hidden="true">
      <motion.g
        animate={animate ? { x: [0, 6, -4, 0], y: [0, -4, 3, 0] } : undefined}
        transition={{ duration: 4.4, ease: EASE.inOut, repeat: Infinity }}
      >
        <circle cx="43" cy="43" r="17" fill="var(--bg2)" stroke="var(--border2)" strokeWidth="2" />
        <path d="M56 56l14 14" stroke="var(--text3)" strokeWidth="3" strokeLinecap="round" />
      </motion.g>
      <path d="M36 43h14M43 36v14" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function ChartArt({ animate }: { animate: boolean }) {
  return (
    <svg viewBox="0 0 96 96" className="size-20" aria-hidden="true">
      <path d="M22 70V26M22 70h52" stroke="var(--border2)" strokeWidth="1.5" strokeLinecap="round" />
      <motion.path
        d="M26 62 L38 50 L48 56 L60 36 L72 44"
        fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={animate ? { pathLength: [0, 1, 1, 0] } : { pathLength: 1 }}
        transition={animate ? { duration: 4.2, times: [0, 0.4, 0.85, 1], repeat: Infinity, ease: EASE.inOut } : { duration: 0.6 }}
      />
      {[[38, 50], [60, 36]].map(([cx, cy], i) => (
        <motion.circle
          key={i} cx={cx} cy={cy} r="3" fill="var(--bg1)" stroke="var(--brand)" strokeWidth="2"
          animate={animate ? { scale: [1, 1.3, 1] } : undefined}
          transition={{ duration: 2.2, ease: EASE.inOut, repeat: Infinity, delay: i * 0.3 }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
      ))}
    </svg>
  );
}

function KeyArt({ animate }: { animate: boolean }) {
  return (
    <svg viewBox="0 0 96 96" className="size-20" aria-hidden="true">
      <motion.g
        animate={animate ? { rotate: [-6, 6, -6] } : undefined}
        transition={{ duration: 4, ease: EASE.inOut, repeat: Infinity }}
        style={{ transformOrigin: "48px 48px" }}
      >
        <circle cx="38" cy="40" r="12" fill="none" stroke="var(--brand)" strokeWidth="2.5" />
        <path d="M46 48l18 18M58 60l5 5M52 54l5 5" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
      </motion.g>
      {animate && (
        <motion.circle
          cx="38" cy="40" r="12" fill="none" stroke="var(--brand)" strokeWidth="1"
          animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
          transition={{ duration: 2.4, ease: EASE.standard, repeat: Infinity }}
          style={{ transformOrigin: "38px 40px" }}
        />
      )}
    </svg>
  );
}

function ConnectorArt({ animate }: { animate: boolean }) {
  return (
    <svg viewBox="0 0 96 96" className="size-20" aria-hidden="true">
      <rect x="16" y="38" width="24" height="20" rx="6" fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1.5" />
      <rect x="56" y="38" width="24" height="20" rx="6" fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1.5" />
      <path d="M40 48h16" stroke="var(--border2)" strokeWidth="2" strokeDasharray="3 3" />
      {animate && (
        <motion.circle
          r="3" fill="var(--ai)" cy="48"
          animate={{ cx: [40, 56], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.8, ease: EASE.inOut, repeat: Infinity, repeatDelay: 0.4 }}
        />
      )}
    </svg>
  );
}

function WorkflowArt({ animate }: { animate: boolean }) {
  const nodes = [
    { x: 24, y: 48 },
    { x: 48, y: 32 },
    { x: 48, y: 64 },
    { x: 72, y: 48 },
  ];
  return (
    <svg viewBox="0 0 96 96" className="size-20" aria-hidden="true">
      <path d="M32 48 L40 34M32 48 L40 62M56 34 L64 48M56 62 L64 48" stroke="var(--border2)" strokeWidth="1.5" />
      {nodes.map((node, i) => (
        <motion.rect
          key={i}
          x={node.x - 8} y={node.y - 8} width="16" height="16" rx="5"
          fill="var(--bg2)" stroke={i === 0 ? "var(--brand)" : "var(--border2)"} strokeWidth="1.5"
          animate={animate ? { opacity: [0.55, 1, 0.55] } : undefined}
          transition={{ duration: 2.6, ease: EASE.inOut, repeat: Infinity, delay: i * 0.45 }}
        />
      ))}
    </svg>
  );
}

function InboxArt({ animate }: { animate: boolean }) {
  return (
    <motion.svg viewBox="0 0 96 96" className="size-20" animate={animate ? FLOAT : undefined} aria-hidden="true">
      <path
        d="M20 44 L28 26 h40 l8 18 v22 a6 6 0 0 1 -6 6 H26 a6 6 0 0 1 -6 -6z"
        fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1.5"
      />
      <path d="M20 44h16l4 8h16l4-8h16" fill="none" stroke="var(--border2)" strokeWidth="1.5" />
    </motion.svg>
  );
}

const ILLUSTRATIONS: Record<EmptyIllustration, ComponentType<{ animate: boolean }>> = {
  folder: Folder,
  bell: Bell,
  terminal: Terminal,
  team: Team,
  dashboard: DashboardArt,
  ai: AiArt,
  search: SearchArt,
  chart: ChartArt,
  key: KeyArt,
  connector: ConnectorArt,
  workflow: WorkflowArt,
  inbox: InboxArt,
};

/* ───────────────────────────── empty state ─────────────────────────── */

export function AnimatedEmptyState({
  illustration = "folder",
  title,
  description,
  action,
  secondaryAction,
  hint,
  className,
  compact = false,
}: {
  illustration?: EmptyIllustration;
  title: string;
  description?: string;
  /** Primary CTA — every empty state should offer the next step. */
  action?: ReactNode;
  secondaryAction?: ReactNode;
  /** Small print under the actions (docs link, keyboard hint). */
  hint?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const { enabled } = useMotionPreference();
  const Illustration = ILLUSTRATIONS[illustration];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.slow, ease: EASE.standard }}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-4 text-center",
        compact ? "px-4 py-10" : "px-6 py-16",
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        {/* single radial wash, consistent with §3 — no extra DOM nodes */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute size-32 rounded-full"
          style={{
            background: "radial-gradient(circle, var(--brand-bg) 0%, transparent 70%)",
          }}
        />
        <Illustration animate={enabled} />
      </div>

      <div className="flex max-w-[46ch] flex-col gap-1.5">
        <h3 className="text-[15px] font-semibold text-[var(--text)]">{title}</h3>
        {description && (
          <p className="text-[13px] leading-[1.55] text-[var(--text2)]">{description}</p>
        )}
      </div>

      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.base, ease: EASE.standard, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {action}
          {secondaryAction}
        </motion.div>
      )}

      {hint && <div className="text-[12px] text-[var(--text3)]">{hint}</div>}
    </motion.div>
  );
}
