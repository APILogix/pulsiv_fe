/**
 * Monitra design-system tokens for JavaScript consumers.
 * newdesign.md is the single source of truth.
 *
 * RULE: components should consume `var(--token)` (see `cssVar`) so tokens
 * apply reactively. Raw hex values below exist only for surfaces that
 * cannot read CSS custom properties (canvas 2D contexts, chart libraries that
 * parse colours). For those, prefer `readToken()` which resolves the *live*
 * value of the active token from the document root.
 */

export type MonitraThemeName = 'mono' | 'indigo';
export type SentinelThemeName = MonitraThemeName;

/** The three-channel law: brand = product, truth = system health, ai = model. */
export const CHANNELS = {
  brand: 'the product — identity, actions, navigation (#8B7CF6)',
  truth: 'the system — health verdicts (#3CCB7F / #F05D5E / #E8B84A)',
  ai: 'the model — insights, predictions, confidence (#5EA7F5)',
} as const;

type TokenMap = Record<string, string>;

/** Values that never change between themes: truth channel + AI channel. */
const INVARIANT: TokenMap = {
  ai: '#5EA7F5',
  aiD: '#4592E8',
  aiFg: '#08090A',
  aiBg: 'rgba(94,167,245,0.10)',
  green: '#3CCB7F',
  greenD: '#34B36F',
  greenBg: 'rgba(60,203,127,0.12)',
  red: '#F05D5E',
  redD: '#D94849',
  redBg: 'rgba(240,93,94,0.12)',
  amber: '#E8B84A',
  amberBg: 'rgba(232,184,74,0.12)',
  blue: '#5EA7F5',
  blueBg: 'rgba(94,167,245,0.12)',
  violet: '#8B7CF6',
  violetBg: 'rgba(139,124,246,0.12)',
};

export const MONITRA_TOKENS: Record<MonitraThemeName, TokenMap> = {
  mono: {
    ...INVARIANT,
    canvas: '#08090A',
    canvasElevated: '#0B0C0E',
    surface0: '#08090A',
    surface1: '#0F1012',
    surface2: '#141518',
    surface3: '#191A1D',
    surface4: '#1E2024',
    bg: '#08090A',
    bg1: '#0F1012',
    bg2: '#141518',
    bg3: '#191A1D',
    bg4: '#1E2024',
    border: 'rgba(255,255,255,0.06)',
    border2: 'rgba(255,255,255,0.08)',
    borderSubtle: 'rgba(255,255,255,0.05)',
    borderDefault: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.12)',
    borderFocus: 'rgba(255,255,255,0.20)',
    text: '#F4F5F7',
    text2: '#B4B8C0',
    text3: '#858A94',
    textPrimary: '#F4F5F7',
    textSecondary: '#B4B8C0',
    textTertiary: '#858A94',
    textDisabled: '#555A63',
    brand: '#8B7CF6',
    brandHover: '#9B8DFF',
    brandD: '#7A6BE0',
    brandFg: '#FFFFFF',
    brandBg: 'rgba(139,124,246,0.12)',
    brandGlow: 'rgba(139,124,246,0.20)',
    shadowModal: '0 16px 40px rgba(0,0,0,0.5)',
    shadowToast: '0 8px 24px rgba(0,0,0,0.4)',
    overlay: 'rgba(0,0,0,0.65)',
  },
  indigo: {
    ...INVARIANT,
    canvas: '#08090A',
    canvasElevated: '#0B0C0E',
    surface0: '#08090A',
    surface1: '#0F1012',
    surface2: '#141518',
    surface3: '#191A1D',
    surface4: '#1E2024',
    bg: '#08090A',
    bg1: '#0F1012',
    bg2: '#141518',
    bg3: '#191A1D',
    bg4: '#1E2024',
    border: 'rgba(255,255,255,0.06)',
    border2: 'rgba(255,255,255,0.08)',
    borderSubtle: 'rgba(255,255,255,0.05)',
    borderDefault: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.12)',
    borderFocus: 'rgba(255,255,255,0.20)',
    text: '#F4F5F7',
    text2: '#B4B8C0',
    text3: '#858A94',
    textPrimary: '#F4F5F7',
    textSecondary: '#B4B8C0',
    textTertiary: '#858A94',
    textDisabled: '#555A63',
    brand: '#8B7CF6',
    brandHover: '#9B8DFF',
    brandD: '#7A6BE0',
    brandFg: '#FFFFFF',
    brandBg: 'rgba(139,124,246,0.12)',
    brandGlow: 'rgba(139,124,246,0.20)',
    shadowModal: '0 16px 40px rgba(0,0,0,0.5)',
    shadowToast: '0 8px 24px rgba(0,0,0,0.4)',
    overlay: 'rgba(0,0,0,0.65)',
  },
};

export const SENTINEL_TOKENS = MONITRA_TOKENS;

/** `cssVar('brand') → 'var(--brand)'` — the preferred way to reference a token. */
export function cssVar(token: string): string {
  const kebab = token.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return `var(--${kebab})`;
}

/**
 * Resolve the live computed value of a token from the DOM. Use for canvas /
 * WebGL / libraries that cannot parse `var()`.
 */
export function readToken(token: string, fallback = '#ffffff'): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  const kebab = token.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${kebab}`).trim();
  return value || fallback;
}

/** Multi-series charts draw in this fixed order per newdesign.md §28. */
export const CHART_SERIES = [
  'var(--brand)',
  'var(--info)',
  'var(--success)',
  'var(--warning)',
  'var(--error)',
  'var(--text-secondary)',
] as const;

/** Forecast / prediction overlays are always AI-dark, dashed 4/4. */
export const FORECAST_STROKE = { stroke: 'var(--ai-d)', strokeDasharray: '4 4' } as const;

/** HTTP status → truth-channel colour. */
export function statusColor(status: number): string {
  if (status >= 500) return 'var(--error)';
  if (status >= 400) return 'var(--warning)';
  if (status >= 300) return 'var(--info)';
  return 'var(--success)';
}

/** HTTP method → badge tint + text. */
export function methodTokens(method: string): { bg: string; fg: string } {
  switch (method.toUpperCase()) {
    case 'POST':
      return { bg: 'var(--success-muted)', fg: 'var(--success)' };
    case 'DELETE':
    case 'DEL':
      return { bg: 'var(--error-muted)', fg: 'var(--error)' };
    case 'PUT':
    case 'PATCH':
      return { bg: 'var(--warning-muted)', fg: 'var(--warning)' };
    default:
      return { bg: 'var(--info-muted)', fg: 'var(--info)' };
  }
}

/**
 * Token-backed palette. Every entry is a `var()` reference.
 */
export const theme = {
  colors: {
    /* surfaces + text */
    background: 'var(--surface-0)',
    foreground: 'var(--text-primary)',
    card: 'var(--surface-1)',
    cardForeground: 'var(--text-primary)',
    popover: 'var(--surface-1)',
    popoverForeground: 'var(--text-primary)',
    secondary: 'var(--surface-2)',
    secondaryForeground: 'var(--text-primary)',
    muted: 'var(--surface-2)',
    mutedForeground: 'var(--text-secondary)',
    accent: 'var(--surface-3)',
    accentForeground: 'var(--text-primary)',

    /* brand channel */
    primary: 'var(--brand)',
    primaryForeground: 'var(--brand-fg)',
    brand: 'var(--brand)',
    brandHover: 'var(--brand-hover)',
    brandD: 'var(--brand-d)',
    brandFg: 'var(--brand-fg)',
    brandBg: 'var(--brand-bg)',
    brandGlow: 'var(--brand-glow)',

    /* AI channel */
    ai: 'var(--ai)',
    aiD: 'var(--ai-d)',
    aiFg: 'var(--ai-fg)',
    aiBg: 'var(--ai-bg)',

    /* truth channel */
    destructive: 'var(--error)',
    destructiveForeground: '#ffffff',
    green: 'var(--success)',
    greenD: 'var(--green-d)',
    greenBg: 'var(--success-muted)',
    red: 'var(--error)',
    redD: 'var(--red-d)',
    redBg: 'var(--error-muted)',
    amber: 'var(--warning)',
    amberBg: 'var(--warning-muted)',
    blue: 'var(--info)',
    blueBg: 'var(--info-muted)',
    violet: 'var(--violet)',
    violetBg: 'var(--violet-bg)',
    get: 'var(--info)',

    /* borders */
    border: 'var(--border)',
    input: 'var(--border-default)',
    ring: 'var(--brand)',

    /* sidebar */
    sidebar: 'var(--color-canvas-elevated)',
    sidebarForeground: 'var(--text-secondary)',
    sidebarPrimary: 'var(--brand)',
    sidebarPrimaryForeground: '#ffffff',
    sidebarAccent: 'var(--surface-2)',
    sidebarAccentForeground: 'var(--text-primary)',
    sidebarBorder: 'var(--border-subtle)',
    sidebarRing: 'var(--brand)',

    /* charts */
    chart1: 'var(--brand)',
    chart2: 'var(--info)',
    chart3: 'var(--success)',
    chart4: 'var(--warning)',
    chart5: 'var(--error)',
    chart6: 'var(--text-secondary)',
  },
  typography: {
    fontFamily: {
      display: 'var(--display)',
      sans: 'var(--sans)',
      mono: 'var(--mono)',
    },
    size: {
      heroH1: 48,
      sectionTitle: 28,
      pageTitle: 20,
      pageMetric: 26,
      cardTitle: 15,
      subHeading: 14,
      body: 14,
      ui: 13,
      monoData: 12,
      eyebrow: 11,
      micro: 10,
    },
  },
  spacing: {
    base: 4,
    pageApp: 24,
    pageMarketing: 48,
    focusRail: 'min(100% - 48px, 720px)',
    dataRail: 1400,
    cardPadding: 16,
    gridGap: 12,
  },
  layout: {
    topbarHeight: 52,
    sidebarWidth: 240,
    sidebarRail: 60,
    detailPanel: 400,
    rowHeight: 44,
    navItemHeight: 32,
  },
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '10px',
    xl: '12px',
    pill: '9999px',
  },
  shadows: {
    modal: 'var(--shadow-modal)',
    toast: 'var(--shadow-toast)',
    card: 'none',
  },
  motion: {
    fast: '100ms',
    base: '150ms',
    slow: '200ms',
    ease: 'ease-out',
  },
} as const;

