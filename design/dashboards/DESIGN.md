# Dashboards

Mode: Operate. Covers Home (`/:orgSlug/dashboard`), the Dashboards overview (`/dashboards`) and the ten role dashboards under `/dashboards/*`: executive, performance, errors, geo, realtime, tracing, infrastructure, security, releases, business. Other overview pages (`/observability`, `/alerts/overview`, `/automation`, project analytics tabs) still use the older primitives in `src/pages/dashboards/widgets.tsx` and `@/shared/observe`. Move them onto the board kit when they are next rebuilt.

Seed 712c8ad6. Form: signal ledger fused with the split-flap concourse board.

## Direction

THESIS: each dashboard is a departure board for one role's question. The page leads with a ranked ledger of the things that can fail, worst first, and each row is lit by a state lamp. The design refuses a grid of KPI tiles and floating chart cards that gives the reader no order of attention.

OWN-WORLD: the app's zinc Mono tokens, unchanged. Ruled rows on `--bg1` with 1px `--border` hairlines. Columns stay fixed and never move. Numerals are JetBrains Mono in tabular cells. State lamps are square 8px, 2px radius. No shadows, gradients, glows or icon chips.

## Page anatomy (every board)

1. **`BoardPage` header**, on the canvas:
   - 22px title and a 13px `--text2` description of at most 68ch.
   - The verdict line: one to three lamp-lit phrases answering "is anything wrong?". It carries `role="status"`.
   - On the right, the window chip and a dashed **Sample data** chip.
2. **`Readouts`**: one hairline-divided strip of 4 to 6 cells.
   - Label: 12px `--text2`.
   - Value: 26px mono. It is coloured only when it breaches (`state`), and a lamp sits in the label.
   - Delta: a signed mono figure coloured by its verdict (good is green, bad is red, flat is `--text3`), never by direction.
3. **Lead `Ledger`**: the page's own entity, ranked by state and then by an attention score. It owns the rest of the first viewport.
4. **Evidence**: two or three `Panel`s or secondary `Ledger`s in a responsive grid. Panels are never nested.

Home is the only page rendered outside `ModuleLayout`, so it passes `padded`.

| Board | Question | Lead ledger |
|---|---|---|
| Home | Is anything wrong across the org? | Services |
| Dashboards | Which board should I open? | The ten boards, linked |
| Executive overview | Are we keeping reliability promises? | SLOs by budget burn |
| Performance overview | Where is request time spent? | Endpoints or services, by p99 |
| Error overview | What do we fix first? | Triage queue of error groups, filtered by mechanism |
| Geo analytics | Where are users slow or failing? | Countries, beside the map |
| Traffic overview | What is happening now? | Live routes, on a 2s tick with pause |
| Service map | Which hop adds the time? | Dependency edges, under the topology diagram |
| Infrastructure overview | Is capacity and spend healthy? | Nodes and pools by saturation |
| Security & threats | Is anyone abusing the API? | Suspicious sources |
| Release quality | Did the last deploy hurt? | Releases, before → after |
| Business metrics | Who is about to churn? | Tenants by churn risk |

## Primitives (`src/pages/dashboards/board/kit.tsx`)

- **Ledger.** An optional rank column (mono `01`), a lamp plus primary cell, and fixed columns. Columns hide by priority (`hide: sm|md|lg|xl`).
  - Sort: clicking a column header cycles desc, asc, off. "Reset to worst first" restores the default order.
  - Filter: "All" / "Needs attention".
  - Unfold: clicking a row opens an evidence row in place.
  - Deep link: the open row is stored in `?<ledgerId>=<rowId>`, which makes the page shareable.
  - Failing rows get a 5% red wash.
  - When a filter leaves no rows, the empty row names the healthy state and offers "Show all rows".
- **Unfolded evidence.** `Facts` (a 4-up label/value grid) with a `TimeChart`, beside a `ModelNote` or a plain hairline note. Row actions are `BoardButton`s.
- **TimeChart.** Mono 11px axes in `--text3`, dashed gridlines, and an optional dashed threshold in its state colour. On hover, a crosshair appears and the legend values show the hovered point instead of a floating tooltip. Each chart has an `aria-label`.
- **Columns, SplitBar, RankList, Meter, Trend, Timeline.**
  - `Meter`: a 3px rule with a threshold tick. It is coloured only on breach.
  - `Trend`: plots only the metric in its own row.
  - `SplitBar` replaces donuts. There are no gauges and no donuts anywhere.
- **Tag.** 11px sentence case on a 4px tint of its state.
- **ModelNote.** The only place `--ai` appears besides `AiActionButton`. It has a cyan spark, a "Model" label and a confidence pill.

## Colour law

- `STATE_COLOR`: ok is green, warn is amber, bad is red, idle is `--border2`.
- Healthy values stay `--text` (`stateText`).
- Series order: `--text`, `--blue`, `--violet`, `--text3`.
- Status classes are explicit everywhere: 2xx `--border2`, 4xx amber, 5xx red.
- On the map, land is `--bg3`. Served countries are `--text` at an opacity set by their request share. Only degraded or failing countries get a coloured square marker.

## Motion

- **The one authored moment: `Flip`.** Reading characters flip into place (`.board-flap`, 380ms expo-out, 22ms stagger). They flip on first render and then only when a character changes, which is what Traffic overview's live tick does.
- **Row unfold.** A 220ms clip-path reveal (`.board-unfold`).
- **Reduced motion.** Both are removed under `prefers-reduced-motion`, and values are always visible at rest.

## Data

- **No API calls.** Every board reads synchronous, deterministic sample data:
  - `board/fixtures.ts`: shared entities (services, endpoints, error groups, releases, countries, activity) plus the seeded `series()`.
  - Page-local constants.
- **The API seam.** Each page has a single `get<Name>Board()` getter, which is what a live API replaces.
- **No render randomness.** There is no `Math.random` or `Date.now` in render. Traffic overview advances a tick index through precomputed sequences.
- **Labelling.** Every page shows the Sample data chip. Addresses on the security board use documentation ranges (RFC 5737).

## Refuse

- KPI tile grids, icon chips, gradients, glows, shadows, aurora or grid backgrounds on any board.
- Eyebrow or kicker labels, and uppercase tracked mono labels.
- Donuts, gauges, and sparklines that do not plot their own row's metric.
- Emoji flags. Countries are shown as their 2-letter code in mono.
- Colour that only tells series apart when a neutral would do, and state colour on healthy values.
- Cards inside cards, or panels inside panels.
