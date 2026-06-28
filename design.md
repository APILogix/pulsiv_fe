# Pulse — Design System

API observability platform · dark, developer-first, "Linear meets Datadog".
Three words: **precise, calm, scannable.** Green means healthy, red means action needed — no ambiguity.

This document is the single source of truth for every visual decision in the app
(`Pulse.dc.html` + `PulseSidebar.dc.html`). All values below are real CSS custom
properties defined once in `<helmet>` `:root` and consumed inline via `var(--token)`.

---

## 1. Theming model

The app ships **three switchable palettes** (toggled in the top demo bar → "Palette").
Only the **accent / green** tokens change between themes — the neutral, surface, and
semantic-alert scales are shared. The theme is set via `data-theme` on `#pulse-root`;
the default (no attribute) is **Refined**.

| Theme | `--brand` | Personality |
| --- | --- | --- |
| **Refined** (default) | `#34d399` emerald | Restrained, sophisticated, Linear-leaning. The recommended upgrade over raw neon. |
| **Neon** | `#00ff87` | The original hacker-terminal neon green. Loud, high-energy. |
| **Spectrum** | `#6366f1` indigo | Brand becomes indigo; green is reserved purely for "healthy" status; violet adds data-viz depth. The richest, most differentiated option. |

> Rule of separation: **`--brand`** = identity (logo, CTAs, active nav, links, focus).
> **`--green`** = semantic health/success (live dots, healthy metrics, "Active" pills).
> In Refined/Neon these are the same hue; in Spectrum they intentionally diverge.

---

## 2. Color tokens

### 2.1 Neutrals — surfaces & text (shared across all themes)

| Token | Value | Use |
| --- | --- | --- |
| `--bg`      | `#0a0a0a` | App canvas / page background (primary) |
| `--bg1`     | `#111111` | Elevated surfaces — sidebar, topbar, cards, modals |
| `--bg2`     | `#161616` | Inputs, nested panels, hover rows, code blocks |
| `--bg3`     | `#1e1e1e` | Track fills (progress bars, toggles), deepest insets |
| `--border`  | `#262626` | Default hairline divider / card border |
| `--border2` | `#333333` | Stronger border — inputs, ghost buttons, hover emphasis |
| `--text`    | `#e8e8e8` | Primary text, headings, key values |
| `--text2`   | `#999999` | Secondary text, body copy, labels |
| `--text3`   | `#555555` | Tertiary — captions, placeholders, timestamps, muted meta |

### 2.2 Semantic / alert colors (shared)

Each alert color pairs a **saturated foreground** with a **low-alpha tint background**
(used for pills, badges, strips, icon chips).

| Token | Value | Tint token | Tint value | Meaning |
| --- | --- | --- | --- | --- |
| `--red`    | `#ef4444` | `--red-bg`    | `rgba(239,68,68,0.08)`  | Errors, 5xx, suspended, "Firing", danger |
| `--red-d`  | `#dc2626` | — | — | Red button hover/press |
| `--amber`  | `#f59e0b` | `--amber-bg`  | `rgba(245,158,11,0.08)` | Warnings, 4xx, timeouts, p95 attention, "Paused" |
| `--blue`   | `#6366f1` | `--blue-bg`   | `rgba(99,102,241,0.10)` | Info, GET method, request-count badge |
| `--violet` | `#a855f7` | `--violet-bg` | `rgba(168,85,247,0.10)` | Data-viz depth (Spectrum theme), extra series |
| GET badge text | `#818cf8` | uses `--blue-bg` | — | HTTP method GET, JSON keys, span "HTTP/RES" |
| JSON string | `#86efac` | — | — | String literals in syntax-highlighted JSON |

### 2.3 Accent / brand tokens (per theme)

| Token | Refined | Neon | Spectrum | Use |
| --- | --- | --- | --- | --- |
| `--green`    | `#34d399` | `#00ff87` | `#34d399` | Health, success, live, healthy metrics |
| `--green-d`  | `#10b981` | `#00cc6a` | `#10b981` | Darker green (span bars, hovers) |
| `--green-bg` | `rgba(52,211,153,0.08)` | `rgba(0,255,135,0.07)` | `rgba(52,211,153,0.08)` | Green tint — "Active" pills, success strips |
| `--brand`    | `#34d399` | `#00ff87` | `#6366f1` | Logo, primary CTA, active nav, links, focus ring |
| `--brand-d`  | `#10b981` | `#00cc6a` | `#4f46e5` | Primary button hover/press |
| `--brand-fg` | `#04140d` | `#001a0e` | `#ffffff` | Text/icon color **on** a brand-filled button |
| `--brand-bg` | `rgba(52,211,153,0.10)` | `rgba(0,255,135,0.07)` | `rgba(99,102,241,0.12)` | Brand tint — active sidebar item, selected row, featured plan |

> `--brand-fg` flips from near-black (on bright green) to white (on indigo) so CTA
> labels always pass contrast. Always use it for text on a `--brand` background.

### 2.4 HTTP status colors

| Status | Color | Token |
| --- | --- | --- |
| 2xx | green | `--green` |
| 3xx | indigo | `#818cf8` |
| 4xx | amber | `--amber` |
| 5xx | red | `--red` |

### 2.5 HTTP method badge colors

| Method | BG / Text |
| --- | --- |
| GET | `--blue-bg` / `#818cf8` |
| POST | `--green-bg` / `--green` |
| DEL | `--red-bg` / `--red` |
| PUT · PATCH | `--amber-bg` / `--amber` |

---

## 3. Gradients

**No gradients in chrome.** Gradients appear in exactly two decorative places, both
radial glows of the brand tint over transparent — never linear, never on UI surfaces:

| Place | Value |
| --- | --- |
| Landing bottom-CTA glow | `radial-gradient(ellipse, var(--brand-bg) 0%, transparent 70%)`, 400×200px, centered, behind the headline |
| Auth background glow | `radial-gradient(ellipse, var(--brand-bg) 0%, transparent 60%)`, 600×500px, top-left, behind the form |

Chart **fills** use a flat low-alpha version of the series color (`hexA(color, 0.12–0.18)`),
not a gradient.

---

## 4. Typography

| Family | Token | Use |
| --- | --- | --- |
| **Inter** (300/400/500/600/700) | `--sans` | All UI text, headings, body, buttons, labels |
| **JetBrains Mono** (400/500/600) | `--mono` | IDs, API keys, code, metric numbers, timestamps, table data, section eyebrows, status badges |

Everything is **sentence case** — never Title Case. Acronyms (API, SDK, RBAC, SSO, GPU, p95) stay upper.

### Type scale (px, Inter unless noted)

| Role | Size | Weight | Tracking | Notes |
| --- | --- | --- | --- | --- |
| Hero H1 | 56 | 600 | -0.03em | Landing headline; accent word in `--brand` |
| Section title | 36 | 600 | -0.02em | Landing sections, big CTA |
| Page metric (mono) | 26–32 | 500 | -0.02em | Stat-card values, landing stats |
| Card / panel title | 14–18 | 600 | — | Settings cards, modal titles |
| Sub-heading | 13–15 | 500 | — | Chart titles, list headers, feature titles |
| Body | 13–15 | 400 | — | Paragraphs, descriptions |
| UI default | 12–13 | 400–500 | — | Buttons, inputs, nav, table cells |
| Mono data | 11–13 | 400–500 | — | Trace rows, IDs, log lines, code |
| Eyebrow / label (mono) | 10–11 | 500 | 0.08–0.1em uppercase | Section labels, stat-card labels, table headers |
| Micro | 9–10 | 600 | — | Span-bar labels, severity badges |

Line-height: `1.5` body default, `1.1–1.2` on large headings, `1.6–1.9` on code/log blocks.

---

## 5. Spacing & layout

4px base; surfaces breathe on multiples of 8.

| Token / metric | Value |
| --- | --- |
| Page padding (marketing) | 48px horizontal |
| Page padding (app content) | 24px |
| Settings content padding | 28px 32px, capped `max-width:760px` |
| Content gap (stacked sections) | 20–24px |
| Card internal padding | 16–24px |
| Grid gaps | 12px (app cards) · 16px (pricing) · 1px (feature grid hairlines) |
| Demo nav height | 44px (fixed, top) |
| Marketing nav height | 60px (sticky under demo bar) |
| App topbar height | 52px |
| Sidebar width | 220px |
| Trace/error detail panel | 360–420px |
| Request list column | 420px |
| Table row height | ~44–52px |
| Sidebar item height | ~34px |

Layout is grid-based. Common app shell: **220px sidebar + flex main (52px topbar + scroll content)**.
Dashboards use 4-up stat grids, `2fr / 1fr` chart rows, and `1fr / 1fr` bottom rows.

### Responsive breakpoints

| Width | Behavior |
| --- | --- |
| ≤1100px | 4-col grids → 2-col; chart rows stack |
| ≤760px | All grids → 1 col; auth right-rail (`[data-hideauth]`) hidden |

---

## 6. Radii, borders, shadows

| Token | Value | Use |
| --- | --- | --- |
| `--radius` | `6px` | Buttons, inputs, pills-inputs, badges, small cards |
| `--radius-lg` | `10px` | Cards, panels, modals, plan cards |
| pill | `100px` | Status pills, eyebrows, toggles, avatars |
| Border | `1px solid var(--border)` | Card delineation, dividers |
| Selected row | `inset 2px 0 0 var(--brand)` + `--brand-bg` | Trace / error / list selection |

**Shadows are functional, not decorative.**

| Shadow | Value | Use |
| --- | --- | --- |
| Modal | `0 24px 60px rgba(0,0,0,0.6)` | Dialog elevation over backdrop |
| Toast | `0 8px 24px rgba(0,0,0,0.45)` | Toast notification lift |

Cards use a hairline border **or** a tiny shadow — never both heavily.

---

## 7. Components

### Buttons
| Variant | Style |
| --- | --- |
| **Primary** | `background:var(--brand); color:var(--brand-fg)`; 600 weight; radius 6px; hover → `--brand-d` |
| **Ghost** | transparent, `1px solid var(--border2)`, `--text2`; hover → border `--text3`, text `--text` |
| **GitHub / secondary** | `--bg2` bg, `--border2` border, `--text` |
| **Danger** | `--red-bg` bg, `rgba(239,68,68,0.35)` border, `--red` text (or solid `--red`/white for destructive confirm) |

### Inputs
36–40px tall · `--bg1`/`--bg2` bg · `1px solid var(--border)` · radius 6px · no inner shadow ·
placeholder `--text3` · **focus → `border-color:var(--brand)`** (via `style-focus`).

### Status pills
Always tinted bg + saturated text, pill radius, mono 10px. Never outline-only.
`Active`/`Paid` = green · `Firing`/`Ongoing`/error = red · `Paused`/warning = amber.

### Cards
`--bg1` · 10px radius · `1px solid var(--border)` · 16–24px padding.
Featured (pricing) card: `--brand` border + `--brand-bg` fill + uppercase mono badge.

### Sidebar item (`PulseSidebar`)
~34px tall · 6px radius · 8px side margin · `--text2`.
**Active** = `--brand-bg` bg + `--brand` text. Hover = `--bg2` bg + `--text`.
Section eyebrows: mono 10px uppercase `--text3`. Badges: tinted (blue for counts, red for errors).

### Tables / lists
Sticky header row (`--bg2`, mono 10px uppercase `--text3`). Hairline `--border` dividers.
Row hover → `--bg2`. Selected → `--brand-bg` + inset brand bar. Mono for data columns.

### Tabs
Underline style: 13px, `--text3` idle → `--text` + `2px` `--brand` bottom-border active.

### Modals
Overlay: `rgba(0,0,0,0.6)` + `backdrop-filter:blur(3px)`, flex-centered.
Card: `--bg1`, `--border2`, 10px radius, modal shadow, `modalin` entry animation.
Header (title + `×`) / body (16px gap fields) / footer (right-aligned Cancel + primary).
Built-in modals: **create alert, invite member, create API key, delete confirm.**

### Toasts
Bottom-right stack. `--bg2` bg, `--border2`, 8px radius, toast shadow, `toastin` animation.
Leading dot: green (success) / red (error) / brand (info). Auto-dismiss ~2.8s.

### Trace waterfall
Span row = 220px label gutter (service chip + name) + flex bar track + 54px duration.
Bars: positioned `left%`/`width%`, colored by service (HTTP=indigo, MW/cache=green-d,
DB=amber, ERR=red, RES=indigo). Time axis 0→1200ms. Error span gets red bar + error box below.

---

## 8. Iconography & imagery

- **Inline stroke SVGs**, `stroke-width` 1.2–1.5, round caps, `currentColor` (inherits text/brand).
  Sizes: 15px sidebar, 16px feature chips, 11–14px inline.
- **No emoji** in product UI.
- **Monogram avatars** — initials on a tinted circle (`--blue`/`--green-d`/`--violet`/`--amber`).
- **No photos, textures, patterns, or illustrations.** Solid colors only.
- Logo: brand-filled rounded square (6–7px radius) holding a crosshair-pulse mark in `--brand-fg`; mono "pulse" wordmark.

---

## 9. Motion

- Quiet & quick: **100–250ms**, ease-out.
- Hovers **fade** (color/border/background) — never bounce or scale.
- `pulse-dot` — live/health indicator (2s ease-in-out infinite, opacity+scale).
- `toastin` — toast entry (translateY 8px + fade, 250ms).
- `modalin` — modal entry (translateY 10px + scale 0.99 + fade, 200ms).
- `fadein` — overlay backdrop (150ms).
- Loading uses skeleton blocks / inline busy, never page spinners.

---

## 10. Content voice

- Direct, declarative, slightly clinical — a senior ops engineer, not a marketer.
- No exclamation marks in product UI. Sentence case everywhere.
- Status copy states facts: "Active", "Degraded", "Suspended", "Rate-limited" — not "All good!".
- Numbers tabular & mono; humanized in headlines ("2.4B"), exact in tables ("2,847").
- Empty states: state the fact, then the next action.

---

## 11. Token quick-reference (paste-ready `:root`)

```css
/* shared */
--bg:#0a0a0a; --bg1:#111111; --bg2:#161616; --bg3:#1e1e1e;
--border:#262626; --border2:#333333;
--text:#e8e8e8; --text2:#999999; --text3:#555555;
--red:#ef4444; --red-d:#dc2626; --red-bg:rgba(239,68,68,0.08);
--amber:#f59e0b; --amber-bg:rgba(245,158,11,0.08);
--blue:#6366f1; --blue-bg:rgba(99,102,241,0.10);
--violet:#a855f7; --violet-bg:rgba(168,85,247,0.10);
--mono:'JetBrains Mono',monospace; --sans:'Inter',sans-serif;
--radius:6px; --radius-lg:10px;

/* Refined (default) */
--green:#34d399; --green-d:#10b981; --green-bg:rgba(52,211,153,0.08);
--brand:#34d399; --brand-d:#10b981; --brand-fg:#04140d; --brand-bg:rgba(52,211,153,0.10);

/* [data-theme="neon"] */
--green:#00ff87; --green-d:#00cc6a; --green-bg:rgba(0,255,135,0.07);
--brand:#00ff87; --brand-d:#00cc6a; --brand-fg:#001a0e; --brand-bg:rgba(0,255,135,0.07);

/* [data-theme="spectrum"] */
--green:#34d399; --green-d:#10b981; --green-bg:rgba(52,211,153,0.08);
--brand:#6366f1; --brand-d:#4f46e5; --brand-fg:#ffffff; --brand-bg:rgba(99,102,241,0.12);
```

The UI Best Practice: "Dual-Width" Strategy
In enterprise dashboards, you should apply a Dual-Width Strategy:

Forms & Settings: Constrain to ~600px - 800px (Centered or Left-aligned).

Data Tables & Logs: Expand to ~1100px - 1400px (or take up 100% of the container with some padding).