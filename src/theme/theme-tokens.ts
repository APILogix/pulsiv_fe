/**
 * Pulse design system color / token constants.
 * Kept separate from React components so the static
 * token list can be imported anywhere without hook deps.
 */

export const theme = {
  colors: {
    /* surfaces + text (design.md neutrals) */
    background: '#0a0a0a',
    foreground: '#e8e8e8',
    card: '#111111',
    cardForeground: '#e8e8e8',
    popover: '#111111',
    popoverForeground: '#e8e8e8',
    secondary: '#161616',
    secondaryForeground: '#e8e8e8',
    muted: '#161616',
    mutedForeground: '#999999',
    accent: '#1e1e1e',
    accentForeground: '#e8e8e8',

    /* brand = emerald (Refined theme). primary buttons, links, focus rings. */
    primary: '#34d399',
    primaryForeground: '#04140d',

    /* alerts */
    destructive: '#ef4444',
    destructiveForeground: '#e8e8e8',

    /* borders */
    border: '#262626',
    input: '#333333',
    ring: '#34d399',

    /* sidebar */
    sidebar: '#111111',
    sidebarForeground: '#e8e8e8',
    sidebarPrimary: '#34d399',
    sidebarPrimaryForeground: '#04140d',
    sidebarAccent: '#161616',
    sidebarAccentForeground: '#e8e8e8',
    sidebarBorder: '#262626',
    sidebarRing: '#34d399',

    /* Semantic Colors (Status pills, badges) */
    green: '#34d399',
    greenD: '#10b981',
    greenBg: 'rgba(52, 211, 153, 0.08)',
    redD: '#dc2626',
    redBg: 'rgba(239, 68, 68, 0.08)',
    amber: '#f59e0b',
    amberBg: 'rgba(245, 158, 11, 0.08)',
    blue: '#6366f1',
    blueBg: 'rgba(99, 102, 241, 0.10)',
    violet: '#a855f7',
    violetBg: 'rgba(168, 85, 247, 0.1)',
    get: '#818cf8',

    /* Charts */
    chart1: '#34d399',
    chart2: '#6366f1',
    chart3: '#f59e0b',
    chart4: '#a855f7',
    chart5: '#ef4444',
  },
  typography: {
    fontFamily: {
      sans: '"Inter Variable", sans-serif',
      mono: '"JetBrains Mono", monospace',
    },
  },
  spacing: {
    padding: '1rem',
    margin: '1rem',
  },
  radius: {
    sm: '0.375rem', /* 6px */
    md: '0.375rem', /* 6px */
    lg: '0.625rem', /* 10px */
    xl: '0.625rem',
  },
  shadows: {
    modal: '0 24px 60px rgba(0,0,0,0.6)',
    toast: '0 8px 24px rgba(0,0,0,0.45)',
  }
};
