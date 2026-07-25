# Sentinel — Design System

AI-powered monitoring platform · AI Core theme · dark-first, developer-grade.
Three words: **certain, calm, scannable.**

The entire visual language is built on one rule — **the three-channel separation**:

> **Indigo** = the product (identity, actions, navigation).
> **Green** = the truth (system health — never used for chrome).
> **Cyan** = the AI (insights, predictions, confidence, automation).

No channel ever borrows another's job. This is the fix for the legacy green/black UI:
green is no longer a brand color, it is a verdict.

This document is the single source of truth for every visual decision in the app.
All values below are real CSS custom properties defined once in `:root` and
consumed inline via `var(--token)`.

---

## 1. Theming model

The app ships **two modes** of one identity — AI Core Dark (default) and
AI Core Light. Toggled in user settings and via the topbar; respects
`prefers-color-scheme` on first visit, then persists the explicit choice.
Theme is set via `data-theme` on `#sentinel-root`; no attribute = dark.

| Mode | `--brand` | `--ai` | Personality |
| --- | --- | --- | --- |
| **Core Dark** (default) | `#7c6cf5` indigo | `#22d3ee` cyan | The flagship. 24/7 NOC-friendly, deep blue-charcoal, glowing AI channel. |
| **Core Light** | `#6554ec` indigo | `#0891b2` cyan | Daylight / enterprise / presentation mode. Same identity, deepened for contrast on white. |

> Only neutral, brand, AI, and semantic **values** change between modes.
> Structure, radii, spacing, motion, and component anatomy are identical.
> A screen must be screenshot-identical in layout across both modes.

---

## 2. Color tokens

### 2.1 Neutrals — surfaces & text

| Token | Core Dark | Core Light | Use |
| --- | --- | --- | --- |
| `--bg`      | `#0a0c12` | `#f6f7fb` | App canvas / page background |
| `--bg1`     | `#10131c` | `#ffffff` | Elevated surfaces — sidebar, topbar, cards, modals |
| `--bg2`     | `#161a26` | `#eef0f6` | Inputs, nested panels, hover rows, code blocks |
| `--bg3`     | `#1e2331` | `#e3e6f0` | Track fills (progress, toggles), deepest insets |
| `--border`  | `#232939` | `#e3e6ef` | Default hairline divider / card border |
| `--border2` | `#303850` | `#ccd2e0` | Stronger border — inputs, ghost buttons, hover emphasis |
| `--text`    | `#e9ecf4` | `#171a23` | Primary text, headings, key values |
| `--text2`   | `#9aa3b8` | `#5a6272` | Secondary text, body copy, labels |
| `--text3`   | `#5c6579` | `#99a1b3` | Tertiary — captions, placeholders, timestamps, muted meta |

Neutrals are **blue-tinted**, never pure zinc or pure gray — the faint cool cast
is part of the AI Core identity and keeps dark mode from feeling flat.

### 2.2 Semantic / truth channel (health & alerts)

Each alert color pairs a **saturated foreground** with a **low-alpha tint
background** (pills, badges, strips, icon chips). Light mode deepens every
foreground one step for contrast on white.

| Token | Dark | Light | Tint (dark / light) | Meaning |
| --- | --- | --- | --- | --- |
| `--green`   | `#34d399` | `#16a34a` | `rgba(52,211,153,0.08)` / `rgba(22,163,74,0.09)` | Healthy, live, 2xx, success, "Active" |
| `--green-d` | `#10b981` | `#15803d` | — | Darker green (span bars, hovers) |
| `--red`     | `#ef4444` | `#dc2626` | `rgba(239,68,68,0.08)` / `rgba(220,38,38,0.07)` | Errors, 5xx, firing alerts, danger |
| `--red-d`   | `#dc2626` | `#b91c1c` | — | Red button hover/press |
| `--amber`   | `#f59e0b` | `#d97706` | `rgba(245,158,11,0.08)` / `rgba(217,119,6,0.09)` | Warnings, 4xx, timeouts, p95 attention, "Paused" |
| `--blue`    | `#60a5fa` | `#2563eb` | `rgba(96,165,250,0.10)` / `rgba(37,99,235,0.08)` | Info, GET method, request-count badges |
| `--violet`  | `#a78bfa` | `#7c3aed` | `rgba(167,139,250,0.10)` / `rgba(124,58,237,0.08)` | Data-viz depth, extra series |

### 2.3 Brand / identity channel (indigo)

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--brand`    | `#7c6cf5` | `#6554ec` | Logo, primary CTA, active nav, links, focus ring, selected rows |
| `--brand-d`  | `#6554ec` | `#5443d6` | Primary button hover/press |
| `--brand-fg` | `#ffffff` | `#ffffff` | Text/icon color **on** brand-filled surfaces |
| `--brand-bg` | `rgba(124,108,245,0.12)` | `rgba(101,84,236,0.08)` | Brand tint — active sidebar item, selected row, featured plan |

### 2.4 AI channel (cyan)

The AI channel is a **first-class token set**, not a one-off accent. Anything
produced by the model — insights, predictions, anomaly flags, confidence
scores, auto-remediation buttons — is marked in cyan.

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--ai`    | `#22d3ee` | `#0891b2` | AI text, AI icons, live "AI watching" dot, chart overlay series |
| `--ai-d`  | `#06b6d4` | `#0e7490` | AI hover/press, dashed prediction lines |
| `--ai-fg` | `#032a33` | `#ffffff` | Text **on** solid AI fills |
| `--ai-bg` | `rgba(34,211,238,0.10)` | `rgba(8,145,178,0.08)` | AI tint — insight cards, confidence pills, "analyzing" chips |

> If a pixel is cyan, the user knows a model produced it. If it's indigo, the
> product is speaking. If it's green/red/amber, the system is reporting facts.

### 2.5 HTTP status colors

| Status | Color | Token |
| --- | --- | --- |
| 2xx | green  | `--green` |
| 3xx | blue   | `--blue` |
| 4xx | amber  | `--amber` |
| 5xx | red    | `--red` |

### 2.6 HTTP method badge colors

| Method | BG / Text |
| --- | --- |
| GET | `--blue-bg` / `--blue` |
| POST | `--green-bg` / `--green` |
| DEL | `--red-bg` / `--red` |
| PUT · PATCH | `--amber-bg` / `--amber` |

### 2.7 Data-viz series order

Multi-series charts draw in this fixed order:
`--brand` → `--ai` → `--green` → `--amber` → `--violet` → `--blue`.
**Forecast/prediction overlays always draw in `--ai-d`, dashed 4/4**, over a
solid historical series — the AI's guess is visually distinct from measured data.

---

## 3. Glow & gradients

**No gradients in chrome.** No gradient text, no gradient buttons, no gradient
borders. Gradients exist in exactly four places, all radial or single-axis,
all using tint-over-transparent:

| Place | Value |
| --- | --- |
| App canvas ambient (fixed, both modes) | `radial-gradient(1200px 600px at 80% -10%, var(--brand-bg) 0%, transparent 60%)` + a second `radial-gradient(900px 500px at -10% 110%, var(--ai-bg) 0%, transparent 55%)` — the indigo/cyan field the whole app floats on. Light mode halves both alphas. |
| AI insight panel glow | `radial-gradient(circle at 100% 0%, var(--ai-bg) 0%, transparent 45%)`, inside the panel, `pointer-events:none` |
| Logo mark | `linear-gradient(135deg, var(--brand) 0%, var(--ai) 100%)` — the **only** linear gradient in the system, logo only |
| Landing / auth hero glow | `radial-gradient(ellipse, var(--brand-bg) 0%, transparent 70%)`, centered behind headline, 480×240px |

Chart **fills** use a flat low-alpha version of the series color
(`hexA(color, 0.12–0.18)`), never a gradient.

---

## 4. Typography

Three families, strict roles:

| Family | Token | Use |
| --- | --- | --- |
| **Space Grotesk** (500/600/700) | `--display` | Display only — landing headlines, page titles, empty-state titles, big stat values when a human-facing number |
| **Inter** (400/500/600) | `--sans` | All UI text, body, buttons, labels, navigation |
| **JetBrains Mono** (400/500/600) | `--mono` | IDs, API keys, code, metric numbers, timestamps, table data, eyebrows, status badges, confidence scores |

Everything is **sentence case** — never Title Case. Acronyms (API, SDK, SSO,
GPU, p95, LLM) stay upper.

### Type scale (px)

| Role | Size | Family / weight | Tracking | Notes |
| --- | --- | --- | --- | --- |
| Hero H1 | 56 | Space Grotesk 600 | -0.03em | Landing headline; AI keyword in `--ai`, never gradient-filled |
| Section title | 36 | Space Grotesk 600 | -0.02em | Landing sections |
| Page title | 22–24 | Space Grotesk 600 | -0.02em | App page headers |
| Page metric | 26–32 | JetBrains Mono 500 | -0.02em | Stat-card values |
| Card / panel title | 14–16 | Inter 600 | — | Panels, modal titles |
| Sub-heading | 13–15 | Inter 500 | — | Chart titles, list headers |
| Body | 13–15 | Inter 400 | — | Paragraphs, descriptions |
| UI default | 12–13 | Inter 400–500 | — | Buttons, inputs, nav, table cells |
| Mono data | 11–13 | JetBrains Mono 400–500 | — | Trace rows, IDs, log lines, code |
| Eyebrow / label | 10–11 | JetBrains Mono 500 | 0.08–0.1em uppercase | Section labels, stat labels, table headers |
| Micro | 9–10 | Inter 600 | — | Span-bar labels, severity badges |

Line-height: `1.5` body, `1.1–1.2` large headings, `1.6–1.9` code/log blocks.
Numbers always `font-variant-numeric: tabular-nums`.

---

## 5. Spacing & layout

4px base; surfaces breathe on multiples of 8.

### 5.1 The Dual-Width Strategy (mandatory)

Two content rails, never mixed:

| Rail | Width | Applies to |
| --- | --- | --- |
| **Focus rail** | `min(100% - 48px, 720px)`, left-aligned in the content area | Forms, settings, billing, invite flows, alert-rule editors, API-key creation, onboarding |
| **Data rail** | `100%` of content area, `max-width:1400px`, horizontal scroll below `1100px` | Request tables, log streams, trace lists, dashboards, audit feeds |

Focus rail caps at 720px so a settings form never stretches into a 400px-wide
input on an ultrawide. Data rail always takes the room it's given — monitoring
is a density business.

### 5.2 Shell metrics

| Token / metric | Value |
| --- | --- |
| Page padding (marketing) | 48px horizontal |
| Page padding (app content) | 24px |
| Focus-rail content padding | 28px 32px |
| Content gap (stacked sections) | 20–24px |
| Card internal padding | 16–24px |
| Grid gaps | 12px (app cards) · 16px (pricing) · 1px (feature-grid hairlines) |
| App topbar height | 52px |
| Sidebar width | 224px (64px collapsed, icon-only) |
| Trace/error detail panel | 380–420px, right-docked |
| Request list column | 420px |
| Table row height | 44–52px |
| Sidebar item height | 34px |

App shell: **224px sidebar + flex main (52px topbar + scroll content)**.
Dashboards use 4-up stat grids, `2fr / 1fr` chart rows (chart + AI insights
rail), `1fr / 1fr` bottom rows.

**The app opens on a live status board** — health, firing alerts, AI insights —
never a welcome splash or empty hero. First paint must already be monitoring.

### 5.3 Responsive breakpoints

| Width | Behavior |
| --- | --- |
| ≤1100px | 4-col grids → 2-col; data rail scrolls horizontally; chart rows stack |
| ≤900px | Sidebar collapses to 64px icon rail |
| ≤760px | All grids → 1 col; AI insights rail moves below charts |

---

## 6. Radii, borders, shadows

| Token | Value | Use |
| --- | --- | --- |
| `--radius` | `6px` | Buttons, inputs, badges, small cards |
| `--radius-lg` | `10px` | Cards, panels, modals, plan cards |
| pill | `100px` | Status pills, eyebrows, toggles, avatars, confidence chips |
| Border | `1px solid var(--border)` | Card delineation, dividers |
| Selected row | `inset 2px 0 0 var(--brand)` + `--brand-bg` | Trace / error / list selection |

**Shadows are functional, not decorative.** Cards use a hairline border **or**
a tiny shadow — never both heavily.

| Shadow | Dark | Light | Use |
| --- | --- | --- | --- |
| Modal | `0 24px 60px rgba(3,5,10,0.65)` | `0 24px 60px rgba(23,26,35,0.18)` | Dialog elevation over backdrop |
| Toast | `0 8px 24px rgba(3,5,10,0.5)` | `0 8px 24px rgba(23,26,35,0.12)` | Toast lift |
| Card (light only) | — | `0 1px 2px rgba(23,26,35,0.05)` | Light-mode cards trade border weight for a whisper of depth |

---

## 7. Components

### Buttons

| Variant | Style |
| --- | --- |
| **Primary** | `background:var(--brand); color:var(--brand-fg)`; 600 weight; radius 6px; hover → `--brand-d` |
| **Ghost** | transparent, `1px solid var(--border2)`, `--text2`; hover → border `--text3`, text `--text` |
| **Danger** | `--red-bg` bg, `rgba(239,68,68,0.35)` border, `--red` text (solid `--red`/white for destructive confirm) |
| **AI action** | `--ai-bg` bg, `1px solid var(--ai-d)`, `--ai` text, leading spark icon — used **only** for model-suggested actions ("Apply fix", "Auto-scale", "Silence anomaly"). Hover → solid `--ai` bg + `--ai-fg` text |

### Inputs
36–40px tall · `--bg2` bg · `1px solid var(--border)` · radius 6px · no inner
shadow · placeholder `--text3` · **focus → `border-color:var(--brand)` +
`box-shadow:0 0 0 3px var(--brand-bg)`**.

### Status pills
Always tinted bg + saturated text, pill radius, mono 10px uppercase. Never
outline-only. `Active`/`Healthy` = green · `Firing`/`Error` = red ·
`Paused`/`Degraded` = amber · `AI suggested` = cyan.

### Cards
`--bg1` · 10px radius · `1px solid var(--border)` · 16–24px padding.
Featured (pricing) card: `--brand` border + `--brand-bg` fill + uppercase mono badge.

### AI insight card (signature component)
`--bg1` · 10px radius · `1px solid var(--border)` with **top-right inner glow**
(§3) · header row: 22px rounded-square chip (`linear-gradient(135deg,
var(--brand), var(--ai))`, white spark glyph) + Inter 12px 600 title ·
body 13px `--text2` · footer: **confidence pill** (`--ai-bg` bg, `--ai` text,
mono 10px, e.g. `94% confidence`) + optional AI action button.
Hover → border shifts to `var(--ai-d)`.

### "AI analyzing" state
Skeleton block in `--bg2` with a cyan shimmer sweep
(`linear-gradient(90deg, transparent, var(--ai-bg), transparent)`,
1.4s infinite) + mono 10px `--ai` label: `analyzing pattern…`. Never a spinner.

### Live "AI watching" indicator
6px `--ai` dot with expanding ring (`ai-pulse`, §9) + mono 10px uppercase
`--ai` label. Placed on the insights rail header and anomaly charts.

### Sidebar
34px items · 6px radius · 8px side margin · `--text2`.
**Active** = `--brand-bg` bg + `--brand` text. Hover = `--bg2` bg + `--text`.
Section eyebrows: mono 10px uppercase `--text3`. Badges: tinted
(blue for counts, red for errors, cyan for AI-pending).

### Tables / lists
Sticky header row (`--bg2`, mono 10px uppercase `--text3`). Hairline `--border`
dividers. Row hover → `--bg2`. Selected → `--brand-bg` + inset brand bar.
Mono for all data columns. Anomaly rows: `inset 2px 0 0 var(--red)` + `--red-bg`.

### Tabs
Underline style: 13px, `--text3` idle → `--text` + `2px` `--brand`
bottom-border active.

### Modals
Overlay: `rgba(4,6,12,0.6)` (dark) / `rgba(23,26,35,0.35)` (light) +
`backdrop-filter:blur(3px)`, flex-centered. Card: `--bg1`, `--border2`,
10px radius, modal shadow, `modalin` entry. Header / body (16px gap) /
footer (right-aligned Cancel + primary). Built-ins: **create alert rule,
invite member, create API key, apply AI recommendation, delete confirm.**

### Toasts
Bottom-right stack. `--bg2` bg, `--border2`, 8px radius, toast shadow,
`toastin` animation. Leading dot: green (success) / red (error) /
cyan (AI event) / brand (info). Auto-dismiss ~2.8s.

### Trace waterfall
Span row = 220px label gutter (service chip + name) + flex bar track + 54px
duration. Bars positioned `left%`/`width%`, colored by service
(HTTP=indigo, MW/cache=green-d, DB=amber, ERR=red, RES=violet).
Time axis 0→1200ms. Error span gets red bar + error box below.

---

## 8. Iconography & imagery

- **Inline stroke SVGs**, `stroke-width` 1.2–1.5, round caps, `currentColor`.
  Sizes: 15px sidebar, 16px feature chips, 11–14px inline.
- **AI glyph**: a four-point spark (✦-style stroke), always `--ai` or white-on-gradient-chip. Reserved exclusively for model output.
- **No emoji** in product UI.
- **Monogram avatars** — initials on a tinted circle (`--blue`/`--green-d`/`--violet`/`--amber`).
- **No photos, textures, or illustrations.** Solid colors and the ambient glow only.
- Logo: rounded square (7px radius) filled with the §3 logo gradient, holding a
  pulse-wave mark in white; mono lowercase wordmark.

---

## 9. Motion

- Quiet & quick: **100–250ms**, ease-out.
- Hovers **fade** (color/border/background) — never bounce or scale.
- `pulse-dot` — health/live indicator (2s ease-in-out infinite, opacity+scale), green.
- `ai-pulse` — AI watching ring (2.4s ease-out infinite, cyan ring expands to 200% and fades).
- `shimmer` — AI analyzing skeleton sweep (1.4s linear infinite).
- `toastin` — toast entry (translateY 8px + fade, 250ms).
- `modalin` — modal entry (translateY 10px + scale 0.99 + fade, 200ms).
- `fadein` — overlay backdrop (150ms).
- Chart lines draw once on load (`stroke-dashoffset` sweep, 600ms). No looping chart animation.
- Loading uses skeleton blocks / inline busy, never page spinners.
- `prefers-reduced-motion`: kill all infinite animations, keep fades.

---

## 10. Content voice

- Direct, declarative, slightly clinical — a senior ops engineer, not a marketer.
- No exclamation marks in product UI. Sentence case everywhere.
- Status copy states facts: "Active", "Degraded", "Suspended" — not "All good!".
- AI copy states findings + confidence, never hype:
  "Anomaly detected — 94% confidence", "Capacity limit projected in ~6h",
  never "Amazing insight found!".
- Numbers tabular & mono; humanized in headlines ("2.4B"), exact in tables ("2,847").
- Empty states: state the fact, then the next action.

---

## 11. Token quick-reference (paste-ready `:root`)

```css
/* ============ CORE DARK (default) ============ */
:root, [data-theme="dark"] {
  /* neutrals */
  --bg:#0a0c12; --bg1:#10131c; --bg2:#161a26; --bg3:#1e2331;
  --border:#232939; --border2:#303850;
  --text:#e9ecf4; --text2:#9aa3b8; --text3:#5c6579;
  /* brand — identity channel */
  --brand:#7c6cf5; --brand-d:#6554ec; --brand-fg:#ffffff;
  --brand-bg:rgba(124,108,245,0.12);
  /* ai — model channel */
  --ai:#22d3ee; --ai-d:#06b6d4; --ai-fg:#032a33;
  --ai-bg:rgba(34,211,238,0.10);
  /* semantic — truth channel */
  --green:#34d399; --green-d:#10b981; --green-bg:rgba(52,211,153,0.08);
  --red:#ef4444; --red-d:#dc2626; --red-bg:rgba(239,68,68,0.08);
  --amber:#f59e0b; --amber-bg:rgba(245,158,11,0.08);
  --blue:#60a5fa; --blue-bg:rgba(96,165,250,0.10);
  --violet:#a78bfa; --violet-bg:rgba(167,139,250,0.10);
  /* shadows */
  --shadow-modal:0 24px 60px rgba(3,5,10,0.65);
  --shadow-toast:0 8px 24px rgba(3,5,10,0.5);
  /* type & radii */
  --display:'Space Grotesk',sans-serif;
  --sans:'Inter',sans-serif;
  --mono:'JetBrains Mono',monospace;
  --radius:6px; --radius-lg:10px;
}

/* ============ CORE LIGHT ============ */
[data-theme="light"] {
  --bg:#f6f7fb; --bg1:#ffffff; --bg2:#eef0f6; --bg3:#e3e6f0;
  --border:#e3e6ef; --border2:#ccd2e0;
  --text:#171a23; --text2:#5a6272; --text3:#99a1b3;

  --brand:#6554ec; --brand-d:#5443d6; --brand-fg:#ffffff;
  --brand-bg:rgba(101,84,236,0.08);

  --ai:#0891b2; --ai-d:#0e7490; --ai-fg:#ffffff;
  --ai-bg:rgba(8,145,178,0.08);

  --green:#16a34a; --green-d:#15803d; --green-bg:rgba(22,163,74,0.09);
  --red:#dc2626; --red-d:#b91c1c; --red-bg:rgba(220,38,38,0.07);
  --amber:#d97706; --amber-bg:rgba(217,119,6,0.09);
  --blue:#2563eb; --blue-bg:rgba(37,99,235,0.08);
  --violet:#7c3aed; --violet-bg:rgba(124,58,237,0.08);

  --shadow-modal:0 24px 60px rgba(23,26,35,0.18);
  --shadow-toast:0 8px 24px rgba(23,26,35,0.12);
}