/**
 * Sentinel design-system tokens for JavaScript consumers.
 * sentinel-design.md is the source of truth; this file mirrors §12 exactly.
 *
 * RULE: components should consume `var(--token)` (see `cssVar`) so a theme flip
 * repaints them for free. Raw hex values below exist only for surfaces that
 * cannot read CSS custom properties (canvas 2D contexts, chart libraries that
 * parse colours). For those, prefer `readToken()` which resolves the *live*
 * value of the active theme.
 */

export type SentinelThemeName = 'indigo' | 'mono';

/** The three-channel law (§0): brand = product, green = truth, cyan = AI. */
export const CHANNELS = {
  brand: 'the product — identity, actions, navigation',
  truth: 'the system — health verdicts (green/red/amber)',
  ai: 'the model — insights, predictions, confidence (cyan, theme-invariant)',
} as const;

type TokenMap = Record<string, string>;

/** Values that never change between themes: truth channel + AI channel (§2.2, §2.4). */
const INVARIANT: TokenMap = {
  ai: '#22d3ee',
  aiD: '#06b6d4',
  aiFg: '#032a33',
  aiBg: 'rgba(34,211,238,0.10)',
  green: '#34d399',
  greenD: '#10b981',
  greenBg: 'rgba(52,211,153,0.08)',
  red: '#ef4444',
  redD: '#dc2626',
  redBg: 'rgba(239,68,68,0.08)',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.08)',
  blue: '#60a5fa',
  blueBg: 'rgba(96,165,250,0.10)',
  violet: '#a78bfa',
  violetBg: 'rgba(167,139,250,0.10)',
};

export const SENTINEL_TOKENS: Record<SentinelThemeName, TokenMap> = {
  indigo: {
    ...INVARIANT,
    bg: '#0a0c12',
    bg1: '#10131c',
    bg2: '#161a26',
    bg3: '#1e2331',
    border: '#232939',
    border2: '#303850',
    text: '#e9ecf4',
    text2: '#9aa3b8',
    text3: '#6a7388',
    brand: '#7c6cf5',
    brandD: '#6554ec',
    brandFg: '#ffffff',
    brandBg: 'rgba(124,108,245,0.12)',
    brandGlow: 'rgba(124,108,245,0.35)',
    shadowModal: '0 24px 60px rgba(3,5,10,0.65)',
    shadowToast: '0 8px 24px rgba(3,5,10,0.5)',
    overlay: 'rgba(4,6,12,0.6)',
  },
  mono: {
    ...INVARIANT,
    bg: '#09090b',
    bg1: '#111113',
    bg2: '#18181b',
    bg3: '#232326',
    border: '#26262a',
    border2: '#3f3f46',
    text: '#fafafa',
    text2: '#a1a1aa',
    text3: '#8a8a94',
    brand: '#fafafa',
    brandD: '#e4e4e7',
    brandFg: '#09090b',
    brandBg: 'rgba(250,250,250,0.08)',
    brandGlow: 'rgba(250,250,250,0.35)',
    shadowModal: '0 24px 60px rgba(0,0,0,0.7)',
    shadowToast: '0 8px 24px rgba(0,0,0,0.55)',
    overlay: 'rgba(0,0,0,0.66)',
  },
};

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

/** Multi-series charts draw in this fixed order (§2.7). */
export const CHART_SERIES = [
  'var(--brand)',
  'var(--ai)',
  'var(--green)',
  'var(--amber)',
  'var(--violet)',
  'var(--blue)',
] as const;

/** Forecast / prediction overlays are always AI-dark, dashed 4/4 (§2.7). */
export const FORECAST_STROKE = { stroke: 'var(--ai-d)', strokeDasharray: '4 4' } as const;

/** HTTP status → truth-channel colour (§2.5). */
export function statusColor(status: number): string {
  if (status >= 500) return 'var(--red)';
  if (status >= 400) return 'var(--amber)';
  if (status >= 300) return 'var(--blue)';
  return 'var(--green)';
}

/** HTTP method → badge tint + text (§2.6). */
export function methodTokens(method: string): { bg: string; fg: string } {
  switch (method.toUpperCase()) {
    case 'POST':
      return { bg: 'var(--green-bg)', fg: 'var(--green)' };
    case 'DELETE':
    case 'DEL':
      return { bg: 'var(--red-bg)', fg: 'var(--red)' };
    case 'PUT':
    case 'PATCH':
      return { bg: 'var(--amber-bg)', fg: 'var(--amber)' };
    default:
      return { bg: 'var(--blue-bg)', fg: 'var(--blue)' };
  }
}

/**
 * Token-backed palette. Every entry is a `var()` reference, so values follow the
 * active theme automatically — never hard-code a hex in a component.
 */
export const theme = {
  colors: {
    /* surfaces + text (§2.1) */
    background: 'var(--bg)',
    foreground: 'var(--text)',
    card: 'var(--bg1)',
    cardForeground: 'var(--text)',
    popover: 'var(--bg1)',
    popoverForeground: 'var(--text)',
    secondary: 'var(--bg2)',
    secondaryForeground: 'var(--text)',
    muted: 'var(--bg2)',
    mutedForeground: 'var(--text2)',
    accent: 'var(--bg3)',
    accentForeground: 'var(--text)',

    /* brand channel — indigo in Indigo, white in Mono (§2.3) */
    primary: 'var(--brand)',
    primaryForeground: 'var(--brand-fg)',
    brand: 'var(--brand)',
    brandD: 'var(--brand-d)',
    brandFg: 'var(--brand-fg)',
    brandBg: 'var(--brand-bg)',
    brandGlow: 'var(--brand-glow)',

    /* AI channel — cyan, identical in both themes (§2.4) */
    ai: 'var(--ai)',
    aiD: 'var(--ai-d)',
    aiFg: 'var(--ai-fg)',
    aiBg: 'var(--ai-bg)',

    /* truth channel (§2.2) */
    destructive: 'var(--red)',
    destructiveForeground: '#ffffff',
    green: 'var(--green)',
    greenD: 'var(--green-d)',
    greenBg: 'var(--green-bg)',
    red: 'var(--red)',
    redD: 'var(--red-d)',
    redBg: 'var(--red-bg)',
    amber: 'var(--amber)',
    amberBg: 'var(--amber-bg)',
    blue: 'var(--blue)',
    blueBg: 'var(--blue-bg)',
    violet: 'var(--violet)',
    violetBg: 'var(--violet-bg)',
    get: 'var(--blue)',

    /* borders */
    border: 'var(--border)',
    input: 'var(--border2)',
    ring: 'var(--brand)',

    /* sidebar */
    sidebar: 'var(--bg1)',
    sidebarForeground: 'var(--text)',
    sidebarPrimary: 'var(--brand)',
    sidebarPrimaryForeground: 'var(--brand-fg)',
    sidebarAccent: 'var(--bg2)',
    sidebarAccentForeground: 'var(--text)',
    sidebarBorder: 'var(--border)',
    sidebarRing: 'var(--brand)',

    /* charts — series order per §2.7 */
    chart1: 'var(--brand)',
    chart2: 'var(--ai)',
    chart3: 'var(--green)',
    chart4: 'var(--amber)',
    chart5: 'var(--violet)',
    chart6: 'var(--blue)',
  },
  typography: {
    fontFamily: {
      display: 'var(--display)',
      sans: 'var(--sans)',
      mono: 'var(--mono)',
    },
    /* §4 type scale, in px */
    size: {
      heroH1: 56,
      sectionTitle: 36,
      pageTitle: 22,
      pageMetric: 26,
      cardTitle: 14,
      subHeading: 13,
      body: 13,
      ui: 12,
      monoData: 12,
      eyebrow: 10,
      micro: 9,
    },
  },
  /* §5 spacing — 4px base, surfaces breathe on multiples of 8 */
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
    sidebarWidth: 224,
    sidebarRail: 64,
    detailPanel: 400,
    rowHeight: 44,
    navItemHeight: 34,
  },
  radius: {
    sm: '4px',
    md: '5px',
    lg: '6px' /* --radius */,
    xl: '10px' /* --radius-lg */,
    pill: '100px',
  },
  shadows: {
    modal: 'var(--shadow-modal)',
    toast: 'var(--shadow-toast)',
    card: 'var(--shadow-card)',
  },
  motion: {
    fast: '100ms',
    base: '160ms',
    slow: '250ms',
    ease: 'ease-out',
  },
} as const;
