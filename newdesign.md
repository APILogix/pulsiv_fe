# Pulse — Settings & account pages redesign spec

Design language for the redesigned **SCIM**, **SSO (+ verified domains)**, **Plan & subscription**,
**Integrations** (list + detail) and **Webhooks** (list + detail) pages.

This spec extends `design.md` (the global Pulse system) with concrete, page-level patterns.
Every rule here is grounded in the live theme tokens (`src/styles/themes.css`) and the shared
primitives in `src/shared/observe/`. Follow it exactly — no ad-hoc values.

Three words: **precise, calm, scannable.**

---

## 1. Color theme

### 1.1 Token-only rule

Every color is a CSS variable consumed as `var(--token)` (Tailwind arbitrary values:
`bg-[var(--bg1)]`, `text-[var(--text2)]`, `border-[var(--border)]`).
**Never hardcode hex values** — the app ships multiple themes (`data-theme` on the root:
dark, light, refined, neon, spectrum) and only variables survive a theme switch.

### 1.2 Surface scale

| Token | Role |
| --- | --- |
| `--bg`  | App canvas / page background |
| `--bg1` | Cards, panels, table shells (primary elevated surface) |
| `--bg2` | Inputs, nested panels, hover rows, code/token blocks |
| `--bg3` | Progress-bar tracks, neutral badge fills, deepest insets |
| `--border` | Default hairline border on every card/divider |
| `--input` | Stronger border — inputs, secondary-button hover |

### 1.3 Text scale

| Token | Role |
| --- | --- |
| `--text`  | Headings, primary values, key data |
| `--text2` | Body copy, descriptions, secondary cells |
| `--text3` | Eyebrows, table headers, captions, placeholders, timestamps |

### 1.4 Brand & semantic accents

Each accent pairs a saturated foreground with a low-alpha `-bg` tint for pills, strips and icon tiles.

| Token pair | Meaning |
| --- | --- |
| `--brand` / `--brand-bg` | Identity: primary CTAs, active states, featured plan, focus. Text on a brand fill is **always `--brand-fg`**. |
| `--green` / `--green-bg` | Healthy, active, verified, success |
| `--red` / `--red-bg` | Errors, failed, revoked, danger zones |
| `--amber` / `--amber-bg` | Warnings, pending, attention |
| `--blue` / `--blue-bg` | Info, neutral metadata, informational callouts |
| `--violet` / `--violet-bg` | Extra series / decorative icon tiles only |

Usage rules:
- Green means healthy, red means action needed — never ambiguous.
- Tinted backgrounds (`*-bg`) never carry `--text`; always pair tint bg with its saturated text color.
- `--brand-d` is the hover/press shade for brand fills; `--red` hover uses opacity, not new colors.
- Focus ring: `focus:border-[var(--brand)]` on inputs; `--ring` for focus-visible outlines.

---

## 2. Typography

Two families only:

| Family | Token | Use |
| --- | --- | --- |
| Inter | `--sans` (default) | All UI text, headings, body, buttons |
| JetBrains Mono | `--mono` via `font-[family-name:var(--mono)]` | IDs, tokens, URLs, code, metric numbers, eyebrows, badges |

### 2.1 Type scale

| Role | Classes | Notes |
| --- | --- | --- |
| Page title | `text-2xl font-semibold text-[var(--text)]` | One per page, via `PageHeader` |
| Page description | `text-sm text-[var(--text2)]` | One line under the title |
| Card title | `text-sm font-semibold text-[var(--text)]` | `SectionCard` header row |
| KPI value | `text-2xl font-semibold tabular-nums` | Numbers always `tabular-nums` |
| Eyebrow / label | `text-[12px] font-medium uppercase tracking-wider text-[var(--text3)]` | Field labels, KPI labels, category tags |
| Table header | `text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]` | Built into `Table` |
| Body | `text-sm` / `text-[13px] leading-relaxed` | Descriptions, help copy |
| UI small | `text-[12px]` | Meta rows, hints, badge-adjacent copy |
| Mono data | `text-[11px]`–`text-[12px]` mono | Tokens, URLs, IDs, timestamps |

### 2.2 Voice

- **Sentence case everywhere** — never Title Case. Acronyms (SSO, SCIM, SAML, API, IdP) stay upper.
- No exclamation marks. Status copy states facts: "Active", "Pending verification", "Revoked".
- Empty states: state the fact, then the next action.

---

## 3. Spacing, radii, borders

4px base grid. Surfaces breathe on multiples of 8.

| Metric | Value |
| --- | --- |
| Stacked page sections gap | `gap-6` (24px) on the page root: `flex flex-col gap-6` |
| Inside-card element gap | `gap-4` (16px); tight clusters `gap-2`/`gap-3` |
| Card header padding | `px-5 py-3` (built into `SectionCard`) |
| Card body padding | `p-5` (built into `SectionCard`); dense inner panels `p-4` |
| KPI/grid gaps | `gap-4` |
| Icon-tile → text gap | `gap-3` |

Radius scale:

| Radius | Use |
| --- | --- |
| `rounded-[12px]` | Cards, table shells, KPI cards |
| `rounded-[10px]` | Icon tiles, filter bars, inner hero panels |
| `rounded-[8px]` | Buttons, inputs, selects, nested code blocks |
| `rounded-[6px]` | Copy buttons, small chips |
| `rounded-[5px]` | Status/severity badges |
| `rounded-full` | Status dots, progress bars, pill filters |

Borders: `1px solid var(--border)` everywhere. Never stack heavy shadows on bordered cards —
hairline border **or** subtle shadow, not both. Layout is **flexbox-first**; CSS grid only for
true 2-D layouts (KPI strips, card galleries, two-column shells).

---

## 4. Layout patterns

### 4.1 Page shell

Every page:

```tsx
<div className="flex flex-col gap-6">
  <PageHeader title="…" description="…" actions={…} />
  {/* sections */}
</div>
```

- Settings/forms content: constrain with `max-w-[960px]` on two-column pages (dual-width strategy:
  forms ~600–800px, tables/galleries full width).
- Detail pages add `breadcrumbs` to `PageHeader` plus a back affordance.

### 4.2 Status hero card

The first section of a stateful page (SCIM, SSO, Plan) is a **hero card**: a `rounded-[12px]`
`--bg1` card with a left icon tile, title + `StatusBadge`, one-line description, and the primary
action right-aligned. When the feature is enabled/featured, the card gets
`border-[var(--brand)]/…` accents or a `--brand-bg` icon tile — never a full brand-filled card.

### 4.3 Two-column settings layout

```
lg:grid lg:grid-cols-[1fr_320px] lg:items-start gap-6
```

- Left: main configuration cards (stacked `gap-6`).
- Right: side rail — setup guide steps, reference info, quick links. Stacks below on mobile.

### 4.4 KPI strip

`grid grid-cols-2 gap-4 md:grid-cols-3` (or 4) of `KpiCard`s directly under the header.
Use only for pages with live counts (webhooks, plan usage).

### 4.5 Card-grid gallery (integrations)

`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3`. Each card: icon tile + name +
mono uppercase category eyebrow + `StatusBadge` + meta row (`Timestamp`) + action row.
Hover: `hover:border-[var(--input)]` + `transition-colors`, cursor-pointer when clickable.

### 4.6 List/table pages (webhooks)

Header → KPI strip → `Table` (shared primitive: sticky mono-uppercase header, hairline dividers,
`Tr` hover `--bg2`). Mono for URLs/IDs, badges for status, `Timestamp` for times.

### 4.7 Setup guide rail

Numbered step list in a `SectionCard`: each step = `flex gap-3` with a `size-6` rounded-full
`--bg2` numbered chip (mono 11px) + step title (13px medium) + description (12px `--text2`).

### 4.8 Empty states

Centered in the card body: muted icon (`size-8 text-[var(--text3)]`), one-line fact
(13px `--text2`), then the next action (button or hint). Never an empty white void.

---

## 5. Component recipes

All shared primitives live in `src/shared/observe/` — reuse them, never fork styles.

### 5.1 Existing primitives (use as-is)

| Primitive | Use |
| --- | --- |
| `PageHeader` | Title, description, breadcrumbs, right-aligned actions |
| `SectionCard` | Titled card with header row + `p-5` body |
| `KpiCard` | Label + tabular value + optional delta/icon |
| `StatusBadge` | Dot + tint pill; keys: active, verified, pending, failed, revoked, connected, disconnected, expired… |
| `StatusCodeBadge` | HTTP status coloring (2xx green, 4xx amber, 5xx red) |
| `CopyButton` | Bordered `--bg2` chip with copied-state check |
| `MonospaceText` | Truncating mono span with title tooltip |
| `Timestamp` | Relative time with absolute tooltip |
| `Table` / `Tr` / `Td` | Sticky-header table shell |
| `Tabs` | Underline tabs: `--text3` idle → `--text` + 2px `--brand` bottom border |
| `Field` + `inputClass` / `textareaClass` | Label + input + hint/error stack |
| `SubmitButton` | `useFormStatus`-aware primary/danger submit |
| `Button` | primary / secondary / danger / ghost variants |
| `SearchInput`, `FilterSelect`, `FilterBar` | List controls |
| `DetailSkeleton`, `CardSkeleton` | Loading states |

### 5.2 New shared primitives (added for this redesign)

| Primitive | Recipe |
| --- | --- |
| `IconTile` | `size-10 rounded-[10px]` flex-centered tinted square: `bg-[var(--{tone}-bg)] text-[var(--{tone})]`, icon `size-5`. Tones: brand, green, red, amber, blue, violet, neutral (`--bg2`/`--text2`) |
| `ToggleRow` | `flex items-center justify-between gap-4` row: label (13px medium `--text`) + description (12px `--text2`) left, switch right. Switch: `h-5 w-9 rounded-full` track (`--bg3` off / `--brand` on) with sliding `size-4` thumb, 150ms transition |
| `Callout` | Tinted strip: `rounded-[10px] border p-3.5 flex gap-2.5`, tone-tinted bg + border at low alpha, icon `size-4` in tone color, 13px text. Tones: info (blue), warning (amber), danger (red), success (green) |
| `DangerZone` | `SectionCard`-like card with `border-[var(--red)]/25`, title in `--red`, rows of destructive actions each with description + danger `Button` |
| `EmptyState` | Centered icon + fact line + action slot (see §4.8) |
| `SetupStep` | Numbered chip + title + description (see §4.7) |

### 5.3 Copyable value field

For ACS URLs, SCIM base URLs, secrets, tokens:

```
flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2
  └ MonospaceText (flex-1, truncate)
  └ CopyButton
```

Secrets render masked (`••••` + last 4) with an eye/reveal toggle where applicable.

### 5.4 Progress / usage bars

`h-1.5 rounded-full bg-[var(--bg3)]` track, fill `rounded-full` with semantic tone:
green &lt; 70% · amber 70–90% · red &gt; 90%. Value labels mono `tabular-nums`.

### 5.5 Buttons

| Variant | Style |
| --- | --- |
| Primary | `bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-d)]` |
| Secondary | `border border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--input)]` |
| Danger | `bg-[var(--red-bg)] text-[var(--red)]` (destructive confirm: solid `--red`/white) |
| Ghost | text-only, hover `--bg2` |

All: `h-9 rounded-[8px] px-3 text-sm font-medium transition-colors disabled:opacity-50`.

---

## 6. Interaction & states

- **Hover**: color/border/background fades only (`transition-colors`, 100–250ms ease-out). Never scale or bounce.
- **Focus**: inputs `focus:border-[var(--brand)]`; interactive elements keep visible focus (`--ring`).
- **Loading**: skeleton blocks (`DetailSkeleton`/`CardSkeleton`) — never page spinners.
- **Pending forms**: `SubmitButton` auto-disables via `useFormStatus` (`aria-busy`).
- **Feedback**: sonner toasts, bottom-right; success/error dot semantics.
- **Destructive actions**: always inside a `DangerZone`, always require an explicit confirm.
- **Disabled**: `disabled:opacity-50`, no pointer events.

---

## 7. Engineering constraints (rules.md)

- React 19 compiler is on: **no manual `useMemo`/`useCallback`/`React.memo`** (3 documented exceptions only).
- **No inline object/array literals in JSX** — hoist to module-level constants.
- Forms use `useActionState` + `SubmitButton` (`useFormStatus`); no manual `isSubmitting` state.
- Keep state local; server state via TanStack Query. Redesigns must not move or rewrite data hooks.
- Stable keys from data ids — never array index.
- Search inputs uncontrolled (ref + submit), per `SearchInput`.

---

## 8. Do / Don't

**Do**
- Consume every color through `var(--token)`.
- Use mono for anything a developer would copy (URLs, IDs, tokens, timestamps).
- Right-align primary actions in headers; left-align content.
- Pair every tinted background with its saturated foreground.
- Keep one page title, one description, one primary action per page.

**Don't**
- No gradients in chrome. No shadows-plus-borders. No purple as a primary hue.
- No Title Case, no exclamation marks, no emoji in product UI.
- No hardcoded hex/rgb values anywhere in page code.
- No absolute positioning for layout; flexbox first, grid for true 2-D.
- No new colors, fonts, or radii beyond the scales above.
