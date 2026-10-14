# Alerting

Mode: Operate. Every page under the Alerts sidebar item (`/:org/alerts/*`): overview, incidents and incident detail, alert events and event detail, alert rules (catalog, custom, effective) with rule and policy detail, escalations and escalation detail, templates, silences, routing, metrics, and dead letters. The overview and metrics pages also follow [dashboards/DESIGN.md](../dashboards/DESIGN.md).

## Direction

THESIS: alerting is a path, not a pile of settings. An alert is evaluated by a rule, opens an incident, may be silenced, is matched by routing, climbs an escalation, is formatted by a template, and is delivered or lands in dead letters. Every page owns one stage of that path and opens with the live state of that stage; the overview draws the whole path. Refuses the incumbent drift: rose and emerald Tailwind literals, pulsing badges, gradient-and-glow banners, card grids for policies and templates, tables with uppercase mono headers, and centred icon empty states.

OWN-WORLD: the Mono tokens as they are ([workspaces](../workspaces/DESIGN.md) and [organization](../organization/DESIGN.md) are the sibling records). Zinc canvas, `--bg1` sheets with one hairline, no shadows, gradients, or blur. Severity and incident state are the only colour on these pages: red means someone must act (open, triggered, escalated, critical, error, exhausted), amber means someone has it or it is degrading (acknowledged, pending, warning, retrying), green means it is over or healthy (resolved, delivered, enabled). Info, categories, channels, and tiers stay neutral.

STORY: the on-call engineer lands on incidents, sees how many need a human and how long the oldest has waited, acknowledges or resolves from the row, and opens one incident to read what fired, where, since when, and what happened next. The admin tunes the path from its stage pages and reads the overview to see which stage is failing.

FIRST VIEWPORT (incidents, the index route): header with the title, one line of purpose, a meta line (`Active` count in the unfiltered view), refresh on the right; a readout band from the incident summary endpoint (active, critical active, opened and resolved in the summary window); the triage sheet (toolbar with search, status, severity, service, count) filling the rest.

FORM: extension of the established Mono world; no new identity, no new tokens.

## Page anatomy

Same order as the workspace and organization records: `WorkspacePage` root, `ProjectPageHeader`, one `Readouts` band of real readings for the whole collection, then one work surface (`Sheet` with `SheetTable` or `SheetList`, or stacked pulse `Panel`s). States live inside the surface: `SheetLoading`, `SheetEmpty`, `SheetError`. Detail pages use `crumbs` back to their list, state pills in `badges`, one meta line, a readout band, `PageTabs` when there is more than one view, then panels with hairline key-value rows.

## Signatures

- The alert path (overview): a `Sheet` titled "Alert path" with one row per stage in the order an alert travels: rules, incidents, silences, routing, escalations, templates, delivery. Each row has the stage name as a link to its page, one line of what it currently does, the stage's real count in mono, and a state pill only when the stage has a state. A stage without a count shows none; nothing is invented to fill the column.
- The triage row (incidents, events): severity pill first, then the title as the row's link with the fingerprint or dimension under it in mono, the state pill, the running duration and occurrence count in mono, and exactly one inline action for the next lifecycle step (acknowledge when open, resolve when acknowledged). Everything else sits in `RowActions`.
- Incident state (`IncidentStateBadge`) and severity (`SeverityBadge`) are pills: sentence case, 4px radius, a dot only while the incident is live.

## Refuse

- Tailwind palette literals (`rose-*`, `emerald-*`, `amber-*`, `sky-*`, `purple-*`, `slate-*`) and hex or rgb colours. State colour comes from `--red`, `--amber`, `--green` and their `-bg` tints.
- `animate-pulse` on state, `StatCard`, `KpiCard`, `HeroFacts`, `IconChip`, icons beside headings, and centred icon-plus-title empty states.
- Uppercase tracked labels and table headers, eyebrows, `--brand` as a link or icon colour.
- Card grids for policies, templates, silences, and routes. They are rows.
- `rounded-xl` and up, `shadow-*` on page surfaces, `backdrop-blur`, gradients, glows.
- Invented numbers. A readout that has no source is removed, not estimated.
