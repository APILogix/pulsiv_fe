# Observe

Mode: Operate. Every page under the Observe sidebar group (`/observability/*`): the signal explorers (requests, errors, error groups, traces, logs, replays, crons), the performance pages (latency, metrics, runtime metrics, profiling, event loop, GC), and every detail-by-id page. The overview at `/observability` also follows [dashboards/DESIGN.md](../dashboards/DESIGN.md).

## Direction contract

THESIS: every signal page is an instrument, not a brochure. A readout strip and a volume histogram sit above the event table on one hairline sheet, so the shape of the window is visible before a single row is read. Refuses the category default: floating KPI tiles with icon chips, "coming soon" teasers, and uppercase tracked-mono labels.

OWN-WORLD: the Mono tokens as-is. Zinc canvas, `--bg1` panels with one `--border` hairline, no shadows or glows. Volume bars are neutral (`--border2`, `--text3` on hover); the error share of a bucket stacks in `--red`. Green, amber, and red appear only for state; violet marks trace links; cyan only for model output.

STORY: the engineer sees the window's volume and failure shape, narrows it with search and filters, opens one event, and reads a detail sheet whose header answers what, where, when, and how bad in one line.

FIRST VIEWPORT: page header (title, description, time range right); the signal sheet (readout cells over a 64px histogram); the filter toolbar; the table filling the remaining height.

FORM: extension of the established dashboards world; no new identity.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Primitives

- Signal sheet (`SignalSheet`): readout cells (12px `--text2` sentence-case label, 22px JetBrains Mono tabular value, 12px sub line) divided by hairlines, histogram below. Hovering a bar shows the bucket time, event count, and error count.
- Table header: 12px Inter `--text3`, sentence case. Rows 44px, hairline dividers.
- Link chips inside rows: trace = violet tint, error group = red tint, 4px radius, mono id.
- Detail sheet: header on the canvas (breadcrumb, headline, state pills, one meta line, actions right), then a readout band, sticky underline tabs, then panels. Key-value rows put a 12px `--text3` label left of the value, divided by hairlines.
- Empty and not-configured states teach: they name the SDK signal that feeds the page and what to send.
- Performance pages chart real series only. When a series has no samples in the window, the panel says so in place instead of drawing a flat line.

## Refuse

- `PerformanceComingSoonOverlay` and any "coming soon" framing for data the backend already stores.
- Uppercase tracked mono labels, eyebrows, icon chips beside titles or on readout cells.
- `rounded-2xl`, `shadow-*`, and `backdrop-blur` on panels. Panels use `--radius-lg`, controls `--radius`.
- `--brand` as an accent colour for links or icons; it is white and reads as body text.
- Fabricated numbers (multiplied totals, hard-coded deltas, invented service lists).
