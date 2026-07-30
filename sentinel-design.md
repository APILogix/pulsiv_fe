# Sentinel — Design System

AI-powered monitoring platform · AI Core theme · dark-only, two developer themes.
Three words: **certain, calm, scannable.**

The entire visual language is built on one rule — **the three-channel separation**:

> **Brand** = the product (identity, actions, navigation). Indigo in the Indigo
> theme, pure white in the Mono theme.
> **Green** = the truth (system health — never used for chrome).
> **Cyan** = the AI (insights, predictions, confidence, automation).

No channel ever borrows another's job. This is the fix for the legacy green/black UI:
green is no longer a brand color, it is a verdict.

This document is the single source of truth for every visual decision in the app.
All values below are real CSS custom properties defined once in `:root` and
consumed inline via `var(--token)`.

---

## 1. Theming model

The product ships **two dark developer themes** of one identity — **Indigo**
(default) and **Mono**. There is **no light theme**. Both are dark; both are
first-class; neither is a fallback.

Theme is set via `data-theme` on `#sentinel-root`; **no attribute = Indigo**.
The explicit choice is persisted (`localStorage`) and applied before first
paint (inline anti-FOUC script) so users never see a flash of the wrong theme.
There is no `prefers-color-scheme` behavior — both themes are dark, so there is
no system light to respect.

| Theme | `--brand` | `--ai` | Personality |
| --- | --- | --- | --- |
| **Indigo** (default) | `#7c6cf5` indigo | `#22d3ee` cyan | The flagship. 24/7 NOC-friendly, deep blue-charcoal, glowing AI channel. The brand theme — default in app and marketing. |
| **Mono** ("Null") | `#fafafa` white | `#22d3ee` cyan | The purist developer theme. Every chrome color drained to gray/black/white; the product channel speaks in white. The only surviving accents are AI cyan (provenance) and the truth channel (health). Vercel/Raycast register. |

**The three-channel law survives across both themes:**

> - **Product channel**: indigo (Indigo theme) → **white** (Mono theme).
> - **AI channel**: cyan — **never changes between themes**. It is a cross-theme
>   law, not a per-theme color choice. If a pixel is cyan, a model produced it.
> - **Truth channel**: green/red/amber/blue/violet — never changes.

Only neutral and brand **values** change between themes. Structure, radii,
spacing, motion, type, and component anatomy are identical. A screen must be
screenshot-identical in layout across both themes.

**Theme switching UX.** A segmented two-swatch control (14px circular swatches —
indigo dot / white dot — in a pill container; active swatch gets a 2px ring in
its own color). Lives in the topbar and in user settings on the app, and in the
navbar on marketing surfaces. Swaps are **instant hard cuts** — no crossfade,
no color transitions (a mid-swap color fade reads as a glitch). Suppress all
transitions for one frame on flip.

**Readability without a light theme.** Instead of a third palette, ship a
`prefers-contrast: more` media query in both themes that bumps
`--text2 → --text` and `--text3 → --text2`. This is the correct answer to
sunlight/low-vision readability for a dark-only product.

---

## 2. Color tokens

### 2.1 Neutrals — surfaces & text

| Token | Indigo | Mono | Use |
| --- | --- | --- | --- |
| `--bg`      | `#0a0c12` | `#09090b` | App canvas / page background |
| `--bg1`     | `#10131c` | `#111113` | Elevated surfaces — sidebar, topbar, cards, modals |
| `--bg2`     | `#161a26` | `#18181b` | Inputs, nested panels, hover rows, code blocks |
| `--bg3`     | `#1e2331` | `#232326` | Track fills (progress, toggles), deepest insets |
| `--border`  | `#232939` | `#26262a` | Default hairline divider / card border |
| `--border2` | `#303850` | `#3f3f46` | Stronger border — inputs, ghost buttons, hover emphasis |
| `--text`    | `#e9ecf4` | `#fafafa` | Primary text, headings, key values |
| `--text2`   | `#9aa3b8` | `#a1a1aa` | Secondary text, body copy, labels |
| `--text3`   | `#6a7388` | `#8a8a94` | Tertiary — captions, placeholders, timestamps, muted meta, mono eyebrows |

**Neutrals have a cast per theme, and the cast is the identity.**
Indigo neutrals are **blue-tinted** — the faint cool cast keeps dark mode from
feeling flat. Mono neutrals are **pure cool zinc** — zero blue cast, zero warm
cast. Mixing the casts is what makes gray themes look muddy; each theme stays
in its own family.

**Contrast floor (both themes).** `--text3` values are chosen to pass WCAG AA
(≥4.5:1 on `--bg`) at the 10–11px mono-eyebrow sizes used throughout the
product. Never introduce a dimmer fourth text color; if text matters, it is
`--text3` or brighter.

### 2.2 Semantic / truth channel (health & alerts)

Theme-invariant. Each alert color pairs a **saturated foreground** with a
**low-alpha tint background** (pills, badges, strips, icon chips).

| Token | Both themes | Tint (both themes) | Meaning |
| --- | --- | --- | --- |
| `--green`   | `#34d399` | `rgba(52,211,153,0.08)` | Healthy, live, 2xx, success, "Active" |
| `--green-d` | `#10b981` | — | Darker green (span bars, hovers) |
| `--red`     | `#ef4444` | `rgba(239,68,68,0.08)` | Errors, 5xx, firing alerts, danger |
| `--red-d`   | `#dc2626` | — | Red button hover/press |
| `--amber`   | `#f59e0b` | `rgba(245,158,11,0.08)` | Warnings, 4xx, timeouts, p95 attention, "Paused" |
| `--blue`    | `#60a5fa` | `rgba(96,165,250,0.10)` | Info, GET method, request-count badges |
| `--violet`  | `#a78bfa` | `rgba(167,139,250,0.10)` | Data-viz depth, extra series |

### 2.3 Brand / identity channel

| Token | Indigo | Mono | Use |
| --- | --- | --- | --- |
| `--brand`    | `#7c6cf5` | `#fafafa` | Logo, primary CTA, active nav, links, focus ring, selected rows |
| `--brand-d`  | `#6554ec` | `#e4e4e7` | Primary button hover/press |
| `--brand-fg` | `#ffffff` | `#09090b` | Text/icon color **on** brand-filled surfaces |
| `--brand-bg` | `rgba(124,108,245,0.12)` | `rgba(250,250,250,0.08)` | Brand tint — active sidebar item, selected row, featured plan |
| `--brand-glow` | `rgba(124,108,245,0.35)` | `rgba(250,250,250,0.35)` | Glow accent on engaged toggles and small brand glows |

Mono consequence, handled entirely by tokens: the primary button becomes a
**white fill with near-black text**, links and active states become white, and
the featured pricing card takes a white border with a white tint.

### 2.4 AI channel (cyan)

The AI channel is a **first-class token set**, not a one-off accent. Anything
produced by the model — insights, predictions, anomaly flags, confidence
scores, auto-remediation buttons — is marked in cyan. **The AI channel is
identical in both themes.** On Mono's drained chrome, cyan carries roughly 3×
the attention — rationing it to model output only is non-negotiable.

| Token | Both themes | Use |
| --- | --- | --- |
| `--ai`    | `#22d3ee` | AI text, AI icons, live "AI watching" dot, chart overlay series |
| `--ai-d`  | `#06b6d4` | AI hover/press, dashed prediction lines |
| `--ai-fg` | `#032a33` | Text **on** solid AI fills |
| `--ai-bg` | `rgba(34,211,238,0.10)` | AI tint — insight cards, confidence pills, "analyzing" chips |

> If a pixel is cyan, the user knows a model produced it. If it's the brand
> channel (indigo or white), the product is speaking. If it's green/red/amber,
> the system is reporting facts.

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
(In Mono the first series is therefore white — correct: the product's own data
speaks in the brand channel.)
**Forecast/prediction overlays always draw in `--ai-d`, dashed 4/4**, over a
solid historical series — the AI's guess is visually distinct from measured data.

---

## 3. Glow & gradients

**No gradients in chrome.** No gradient text, no gradient buttons, no gradient
borders. Gradients exist in exactly four places, all radial or single-axis,
all using tint-over-transparent:

| Place | Value |
| --- | --- |
| App canvas ambient (fixed, both themes) | `radial-gradient(1200px 600px at 80% -10%, var(--brand-bg) 0%, transparent 60%)` + a second `radial-gradient(900px 500px at -10% 110%, var(--ai-bg) 0%, transparent 55%)` — the field the whole app floats on. Indigo theme: an indigo/cyan field. Mono theme: a gray/cyan field (automatic, because it consumes `--brand-bg`). |
| AI insight panel glow | `radial-gradient(circle at 100% 0%, var(--ai-bg) 0%, transparent 45%)`, inside the panel, `pointer-events:none` |
| Logo mark | `linear-gradient(135deg, var(--brand) 0%, var(--ai) 100%)` — the **only** linear gradient in the system, logo only. Indigo: indigo→cyan. Mono: white→cyan. |
| Landing / auth hero glow | `radial-gradient(ellipse, var(--brand-bg) 0%, transparent 70%)`, centered behind headline, 480×240px |

Chart **fills** use a flat low-alpha version of the series color
(`hexA(color, 0.12–0.18)`), never a gradient.

---

## 4. Typography

Identical in both themes. Three families, strict roles:

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

**Text clarity rule (both themes).** Hierarchy is carried by **weight and tint,
never by extra colors**: headings are 600 weight in `--text`, body is
`--text2`, meta is `--text3`. This rule is what keeps Mono especially legible:
with chrome drained, the three neutral text steps must do all the work, and
each step is individually AA-contrasted (§2.1). Never brighten body text to
`--text` for emphasis — use weight.

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

| Shadow | Indigo | Mono | Use |
| --- | --- | --- | --- |
| Modal | `0 24px 60px rgba(3,5,10,0.65)` | `0 24px 60px rgba(0,0,0,0.7)` | Dialog elevation over backdrop |
| Toast | `0 8px 24px rgba(3,5,10,0.5)` | `0 8px 24px rgba(0,0,0,0.55)` | Toast lift |

**Borders carry structure in Mono.** With no brand color separating surfaces,
Mono relies on `--border` hairlines and 1px dividers for delineation. Never
remove card borders in Mono "for cleanliness" — the theme collapses without
them.

---

## 7. Components

Component anatomy is token-driven and therefore theme-invariant. The table
below each component notes what the theme swap changes visually — which should
always be "nothing structural".

### Buttons

| Variant | Style |
| --- | --- |
| **Primary** | `background:var(--brand); color:var(--brand-fg)`; 600 weight; radius 6px; hover → `--brand-d`. Indigo: indigo fill, white text. Mono: white fill, near-black text |
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
Featured (pricing) card: `--brand` border + `--brand-bg` fill + uppercase mono badge
(in Mono: white border, white tint, white badge with near-black text).

### AI insight card (signature component)
`--bg1` · 10px radius · `1px solid var(--border)` with **top-right inner glow**
(§3) · header row: 22px rounded-square chip (`linear-gradient(135deg,
var(--brand), var(--ai))`, spark glyph in `var(--brand-fg)`) + Inter 12px 600 title ·
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
Overlay: `rgba(4,6,12,0.6)` (Indigo) / `rgba(0,0,0,0.66)` (Mono) +
`backdrop-filter:blur(3px)`, flex-centered. Card: `--bg1`, `--border2`,
10px radius, modal shadow, `modalin` entry. Header / body (16px gap) /
footer (right-aligned Cancel + primary). Built-ins: **create alert rule,
invite member, create API key, apply AI recommendation, delete confirm.**

### Toasts
Bottom-right stack. `--bg2` bg, `--border2`, 8px radius, toast shadow,
`toastin` animation. Leading dot: green (success) / red (error) /
cyan (AI event) / brand (info). Auto-dismiss ~2.8s.

### Toggles
Pill track: `--bg3` off → `var(--brand)` on (Mono: dark knob on a white track —
the knob consumes `var(--brand-fg)`). Engaged glow: `0 0 10px var(--brand-glow)`.
**Killswitch toggles break the brand rule on purpose:** they are operational
truth, so on = `--red` with a red glow, in both themes.

### Trace waterfall
Span row = 220px label gutter (service chip + name) + flex bar track + 54px
duration. Bars positioned `left%`/`width%`, colored by service
(HTTP = `--brand`, MW/cache = `--green-d`, DB = `--amber`, ERR = `--red`,
RES = `--violet`). Time axis 0→1200ms. Error span gets red bar + error box below.

---

## 8. Iconography & imagery

- **Inline stroke SVGs**, `stroke-width` 1.2–1.5, round caps, `currentColor`.
  Sizes: 15px sidebar, 16px feature chips, 11–14px inline.
- **AI glyph**: a four-point spark (✦-style stroke), always `--ai` or
  `var(--brand-fg)`-on-gradient-chip. Reserved exclusively for model output.
- **No emoji** in product UI.
- **Monogram avatars** — initials on a tinted circle (`--blue`/`--green-d`/`--violet`/`--amber`).
- **No photos, textures, or illustrations.** Solid colors and the ambient glow only.
- Logo: rounded square (7px radius) filled with the §3 logo gradient, holding a
  pulse-wave mark in `var(--brand-fg)`; mono lowercase wordmark.

---

## 9. Motion

- Quiet & quick: **100–250ms**, ease-out.
- Hovers **fade** (color/border/background) — never bounce or scale.
- **Theme flips are hard cuts**: suppress all transitions for one frame, swap
  tokens, restore. Never crossfade themes.
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

## 11. Mono discipline — the five rules

Mono fails in predictable ways. These rules keep it sharp:

1. **Zinc, not gray.** Mono neutrals are pure cool zinc (`#09090b` family).
   Zero blue cast (that is Indigo's identity), zero warm cast. Mixing casts is
   what makes gray themes look muddy.
2. **White is earned.** `--text` and `--brand` are both near-white, so
   hierarchy comes from weight and tint, not color. Never brighten body text
   to compensate; never introduce a dimmer fourth gray below `--text3`.
3. **Cyan rationing is stricter in Mono.** On drained chrome, cyan pulls
   roughly 3× the attention. AI-only usage is non-negotiable — one cyan pixel
   on a marketing button and the theme's premise collapses.
4. **Hairlines do the heavy lifting.** `--border` and 1px dividers carry all
   structure. Never remove them in Mono "for cleanliness".
5. **Contrast floor.** `--text3 #8a8a94` ≈ 5.6:1 on `--bg` — safe at 10–11px
   mono eyebrow sizes. This is the minimum; do not go dimmer.

---

## 12. Token quick-reference (paste-ready)

```css
/* ============ INDIGO (default — AI Core) ============ */
:root, [data-theme="indigo"] {
  /* neutrals — blue-tinted */
  --bg:#0a0c12; --bg1:#10131c; --bg2:#161a26; --bg3:#1e2331;
  --border:#232939; --border2:#303850;
  --text:#e9ecf4; --text2:#9aa3b8; --text3:#6a7388;
  /* brand — identity channel */
  --brand:#7c6cf5; --brand-d:#6554ec; --brand-fg:#ffffff;
  --brand-bg:rgba(124,108,245,0.12); --brand-glow:rgba(124,108,245,0.35);
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

/* ============ MONO ("Null" — purist developer theme) ============ */
[data-theme="mono"] {
  /* neutrals — pure cool zinc, no blue cast */
  --bg:#09090b; --bg1:#111113; --bg2:#18181b; --bg3:#232326;
  --border:#26262a; --border2:#3f3f46;
  --text:#fafafa; --text2:#a1a1aa; --text3:#8a8a94;
  /* brand — identity channel becomes white */
  --brand:#fafafa; --brand-d:#e4e4e7; --brand-fg:#09090b;
  --brand-bg:rgba(250,250,250,0.08); --brand-glow:rgba(250,250,250,0.35);
  /* ai — model channel: UNCHANGED, the single surviving accent */
  --ai:#22d3ee; --ai-d:#06b6d4; --ai-fg:#032a33;
  --ai-bg:rgba(34,211,238,0.10);
  /* semantic — truth channel: UNCHANGED */
  --green:#34d399; --green-d:#10b981; --green-bg:rgba(52,211,153,0.08);
  --red:#ef4444; --red-d:#dc2626; --red-bg:rgba(239,68,68,0.08);
  --amber:#f59e0b; --amber-bg:rgba(245,158,11,0.08);
  --blue:#60a5fa; --blue-bg:rgba(96,165,250,0.10);
  --violet:#a78bfa; --violet-bg:rgba(167,139,250,0.10);
  /* shadows */
  --shadow-modal:0 24px 60px rgba(0,0,0,0.7);
  --shadow-toast:0 8px 24px rgba(0,0,0,0.55);
}

/* ============ Contrast accessibility (replaces light theme) ============ */
@media (prefers-contrast: more) {
  :root, [data-theme="indigo"] { --text2:#e9ecf4; --text3:#9aa3b8; }
  [data-theme="mono"]          { --text2:#fafafa; --text3:#a1a1aa; }
}
```
