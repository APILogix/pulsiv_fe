import React from 'react';
import { cn } from '@/lib/utils';

export interface LynkTraceLogoProps {
  /** Pixel size for width and height (default: 32) */
  size?: number;
  /** Additional CSS class names */
  className?: string;
  /** Whether the telemetry pulse line animates */
  animate?: boolean;
  /** 'badge' includes the rounded squircle container, 'mark' is transparent */
  variant?: 'badge' | 'mark' | 'monochrome';
}

/**
 * The official LynkTrace logo mark.
 * Combines interlocking distributed system links ("Lynk")
 * with a real-time telemetry pulse span ("Trace").
 */
export function LynkTraceLogo({
  size = 32,
  className,
  animate = false,
  variant = 'badge',
}: LynkTraceLogoProps) {
  const isBadge = variant === 'badge';
  const isMono = variant === 'monochrome';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('inline-block select-none shrink-0 transition-transform duration-200', className)}
      aria-label="LynkTrace Logo"
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    >
      <defs>
        {/* Mono theme metallic zinc gradient for the Lynk brackets */}
        <linearGradient id={`lt-mono-bracket-${size}`} x1="8" y1="7" x2="25" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#E4E4E7" />
          <stop offset="100%" stopColor="#A1A1AA" />
        </linearGradient>
        {/* Mono theme telemetry trace pulse gradient */}
        <linearGradient id={`lt-mono-pulse-${size}`} x1="5" y1="16" x2="27" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#71717A" />
          <stop offset="30%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#71717A" />
        </linearGradient>
        {/* Subtle dark-mode glow filter for the telemetry pulse */}
        <filter id={`lt-glow-${size}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.6" floodColor="#FFFFFF" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Background container squircle for badge variant */}
      {isBadge && (
        <>
          <rect
            width="32"
            height="32"
            rx="7.5"
            fill="#09090B"
            stroke="#27272A"
            strokeWidth="1"
          />
          <rect
            x="0.75"
            y="0.75"
            width="30.5"
            height="30.5"
            rx="6.75"
            fill="none"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="0.5"
          />
        </>
      )}

      {/* Lynk 'L' bracket ribbon */}
      <path
        d="M8.5 7.5V22C8.5 23.38 9.62 24.5 11 24.5H23.5"
        stroke={isMono ? 'currentColor' : `url(#lt-mono-bracket-${size})`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Lynk 'T' cross & stem bracket ribbon */}
      <path
        d="M14 7.5H23.5C24.33 7.5 25 8.17 25 9V11.5"
        stroke={isMono ? 'currentColor' : `url(#lt-mono-bracket-${size})`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M19.5 7.5V17C19.5 18.1 18.6 19 17.5 19H13.5"
        stroke={isMono ? 'currentColor' : `url(#lt-mono-bracket-${size})`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Central Real-time Telemetry Trace Pulse */}
      <path
        d="M5.5 16H10.5L13.5 10.5L17.5 21.5L20.5 16H26.5"
        stroke={isMono ? 'currentColor' : `url(#lt-mono-pulse-${size})`}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={isMono ? undefined : `url(#lt-glow-${size})`}
        className={animate ? 'animate-pulse' : undefined}
      />

      {/* Telemetry Nodes in mono theme */}
      {!isMono && (
        <>
          <circle cx="8.5" cy="7.5" r="1.5" fill="#FAFAFA" />
          <circle cx="23.5" cy="24.5" r="1.5" fill="#A1A1AA" />
          <circle cx="13.5" cy="10.5" r="1.25" fill="#FFFFFF" />
          <circle cx="17.5" cy="21.5" r="1.25" fill="#E4E4E7" />
        </>
      )}
    </svg>
  );
}

export interface LynkTraceWordmarkProps {
  /** Size of the logo icon in pixels (default: 32) */
  size?: number;
  /** Whether to hide the logo icon */
  hideIcon?: boolean;
  /** Whether the telemetry pulse line animates */
  animate?: boolean;
  /** Optional subtitle or suffix, e.g. "Console" */
  subtitle?: string;
  /** Additional container classes */
  className?: string;
}

/**
 * LynkTrace official wordmark in mono theme.
 */
export function LynkTraceWordmark({
  size = 32,
  hideIcon = false,
  animate = false,
  subtitle,
  className,
}: LynkTraceWordmarkProps) {
  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      {!hideIcon && <LynkTraceLogo size={size} animate={animate} />}
      <div className="flex items-baseline gap-1.5 leading-none">
        <span
          className="font-sans font-bold tracking-tight text-[var(--text)]"
          style={{ fontSize: Math.max(16, size * 0.68) }}
        >
          Lynk<span className="font-medium text-[var(--text2)]">Trace</span>
        </span>
        {subtitle && (
          <span
            className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--text3)] px-1.5 py-0.5 rounded-[4px] bg-[var(--bg2)] border border-[var(--border)] ml-1"
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

// Backward-compatibility exports
export const SentinelLogo = LynkTraceLogo;
export const PulsivLogo = LynkTraceLogo;
export const SentinelWordmark = LynkTraceWordmark;
export const PulsivWordmark = LynkTraceWordmark;
