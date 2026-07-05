import { ArrowUpRight, Bell, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildThemeVariables } from '../css-variables';
import { THEME_MAP, DEFAULT_THEME_ID } from '../constants';
import type { ThemeId } from '../types';

interface ThemePreviewProps {
  /** Render the preview in this theme. Omit to inherit the active theme. */
  themeId?: ThemeId;
  className?: string;
}

const SPARKLINE = [12, 18, 14, 22, 19, 28, 24, 33, 30, 41];
const CHART_SERIES = [
  [30, 45, 38, 55, 48, 62, 70],
  [20, 28, 33, 30, 42, 38, 50],
  [10, 14, 12, 20, 18, 24, 22],
];
const TABLE_ROWS = [
  { route: 'GET /api/users', status: '200', latency: '42ms', tone: 'success' as const },
  { route: 'POST /api/orders', status: '201', latency: '88ms', tone: 'success' as const },
  { route: 'GET /api/search', status: '429', latency: '12ms', tone: 'warning' as const },
  { route: 'PUT /api/profile', status: '500', latency: '512ms', tone: 'error' as const },
  { route: 'GET /api/health', status: '200', latency: '8ms', tone: 'success' as const },
];

const TONE_VAR: Record<'success' | 'warning' | 'error' | 'info', string> = {
  success: 'var(--pulse-accent-success)',
  warning: 'var(--pulse-accent-warning)',
  error: 'var(--pulse-accent-error)',
  info: 'var(--pulse-accent-info)',
};

function Badge({ tone, children }: { tone: 'success' | 'warning' | 'error' | 'info'; children: React.ReactNode }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: TONE_VAR[tone], backgroundColor: 'var(--pulse-bg-active)' }}
    >
      {children}
    </span>
  );
}

/**
 * Renders a dense sample of common UI patterns so users can preview a theme's
 * full coverage. If `themeId` is supplied, the theme's CSS variables are scoped
 * locally (no global change) — perfect for hover-preview in settings.
 */
export function ThemePreview({ themeId, className }: ThemePreviewProps) {
  // Compute scoped CSS variables only when previewing a specific theme.
  // (No manual memo — the React 19 compiler memoizes this pure computation.)
  const config = themeId ? (THEME_MAP[themeId] ?? THEME_MAP[DEFAULT_THEME_ID]) : undefined;
  const wrapperStyle: React.CSSProperties = {
    ...(config ? (buildThemeVariables(config) as React.CSSProperties) : {}),
    backgroundColor: 'var(--pulse-bg-app)',
    borderColor: 'var(--pulse-border-default)',
  };

  return (
    <div
      style={wrapperStyle}
      className={cn(
        'flex flex-col gap-4 rounded-xl border p-4',
        className,
      )}
      // background/border read from the (possibly scoped) pulse vars
      data-pulse-preview
    >
      <div
        className="flex flex-col gap-4"
        style={{ color: 'var(--pulse-text-primary)' }}
      >
        {/* KPI + chart row */}
        <div className="grid grid-cols-2 gap-3">
          {/* KPI card */}
          <div
            className="flex flex-col gap-1 rounded-lg border p-3"
            style={{ backgroundColor: 'var(--pulse-bg-card)', borderColor: 'var(--pulse-border-default)' }}
          >
            <span className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--pulse-text-tertiary)' }}>
              Requests / min
            </span>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-semibold tabular-nums">12,480</span>
              <span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--pulse-accent-success)' }}>
                <ArrowUpRight className="size-3" /> 8.2%
              </span>
            </div>
            {/* sparkline */}
            <svg viewBox="0 0 100 24" className="mt-1 h-6 w-full" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="var(--pulse-accent-info)"
                strokeWidth="2"
                points={SPARKLINE.map((v, i) => `${(i / (SPARKLINE.length - 1)) * 100},${24 - (v / 41) * 22}`).join(' ')}
              />
            </svg>
          </div>

          {/* mini multi-series chart */}
          <div
            className="flex flex-col gap-1 rounded-lg border p-3"
            style={{ backgroundColor: 'var(--pulse-bg-card)', borderColor: 'var(--pulse-border-default)' }}
          >
            <span className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--pulse-text-tertiary)' }}>
              Latency (3 series)
            </span>
            <svg viewBox="0 0 100 40" className="h-12 w-full" preserveAspectRatio="none">
              {CHART_SERIES.map((series, si) => (
                <polyline
                  key={`series-${si}`}
                  fill="none"
                  stroke={`var(--pulse-chart-${si + 1})`}
                  strokeWidth="2"
                  points={series.map((v, i) => `${(i / (series.length - 1)) * 100},${40 - (v / 70) * 36}`).join(' ')}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* status badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success">Healthy</Badge>
          <Badge tone="warning">Degraded</Badge>
          <Badge tone="error">Critical</Badge>
          <Badge tone="info">Info</Badge>
        </div>

        {/* table */}
        <div
          className="overflow-hidden rounded-lg border text-xs"
          style={{ borderColor: 'var(--pulse-border-default)' }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--pulse-bg-panel)', color: 'var(--pulse-text-tertiary)' }}>
                <th className="px-3 py-1.5 text-left font-medium">Route</th>
                <th className="px-3 py-1.5 text-left font-medium">Status</th>
                <th className="px-3 py-1.5 text-right font-medium">Latency</th>
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map((row) => (
                <tr key={row.route} style={{ borderTop: '1px solid var(--pulse-border-subtle)' }}>
                  <td className="px-3 py-1.5 font-mono" style={{ color: 'var(--pulse-text-secondary)' }}>{row.route}</td>
                  <td className="px-3 py-1.5">
                    <span style={{ color: TONE_VAR[row.tone] }}>{row.status}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums" style={{ color: 'var(--pulse-text-tertiary)' }}>
                    {row.latency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* code block */}
        <pre
          className="overflow-x-auto rounded-lg border p-3 font-mono text-[11px] leading-relaxed"
          style={{
            backgroundColor: 'var(--pulse-bg-card)',
            borderColor: 'var(--pulse-border-default)',
            color: 'var(--pulse-accent-success)',
          }}
        >
{`$ pulse deploy --env prod
✓ build complete (3.2s)
✓ 142 checks passed`}
        </pre>

        {/* alert banners */}
        <div className="flex flex-col gap-1.5">
          <AlertRow tone="info" icon={<Info className="size-3.5" />} text="New release v2.4.0 is available." />
          <AlertRow tone="success" icon={<CheckCircle2 className="size-3.5" />} text="All systems operational." />
          <AlertRow tone="warning" icon={<AlertTriangle className="size-3.5" />} text="Latency above threshold on us-east." />
          <AlertRow tone="error" icon={<XCircle className="size-3.5" />} text="Payment service returned 500." />
        </div>

        {/* buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: 'var(--pulse-accent-success)', color: 'var(--pulse-bg-app)' }}
          >
            Primary
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: 'var(--pulse-border-active)', color: 'var(--pulse-text-secondary)' }}
          >
            Secondary
          </button>
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ color: 'var(--pulse-text-tertiary)' }}
          >
            Ghost
          </button>
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: 'var(--pulse-accent-error)', color: '#ffffff' }}
          >
            Destructive
          </button>
        </div>

        {/* input + progress + avatar */}
        <div className="flex items-center gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-[11px]" style={{ color: 'var(--pulse-text-tertiary)' }}>Email</span>
            <input
              readOnly
              placeholder="you@example.com"
              className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
              style={{
                backgroundColor: 'var(--pulse-bg-panel)',
                borderColor: 'var(--pulse-border-active)',
                color: 'var(--pulse-text-primary)',
              }}
            />
          </label>
          <div
            className="flex size-9 items-center justify-center rounded-full text-xs font-semibold"
            style={{ backgroundColor: 'var(--pulse-bg-active)', color: 'var(--pulse-accent-info)' }}
          >
            PA
          </div>
          <Bell className="size-4" style={{ color: 'var(--pulse-text-tertiary)' }} />
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--pulse-bg-active)' }}>
          <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: 'var(--pulse-accent-info)' }} />
        </div>
      </div>
    </div>
  );
}

function AlertRow({ tone, icon, text }: { tone: 'success' | 'warning' | 'error' | 'info'; icon: React.ReactNode; text: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px]"
      style={{ backgroundColor: 'var(--pulse-bg-card)', borderLeft: `3px solid ${TONE_VAR[tone]}`, color: 'var(--pulse-text-secondary)' }}
    >
      <span style={{ color: TONE_VAR[tone] }}>{icon}</span>
      {text}
    </div>
  );
}

export default ThemePreview;
