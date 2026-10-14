# Workflows

Mode: Operate. Every page under the Workflows sidebar item (`/automation/*`): overview, workflows list and workflow detail, templates, runs and run detail, approvals and approval detail, event inbox, and audit.

## Direction

THESIS: a workflow is a sequence, trigger then conditions then actions, and a run is that sequence played once. Every page shows the sequence in the same vertical order, so a person reading a definition, a dry run, a run, or an approval sees one shape. Refuses the incumbent drift: a hero with icon chips and tinted stat tiles, panels titled with glyphs, card grids for templates, two-column panel mosaics, uppercase tracked meta labels, and full-width tables with no reading order.

OWN-WORLD: the Mono tokens, unchanged ([workspaces](../workspaces/DESIGN.md) and [organization](../organization/DESIGN.md) are sibling records). Zinc canvas, `--bg1` sheets with one hairline, no shadows or gradients. Green means succeeded, on, or approved; amber means waiting, paused, draft, or gated; red means failed, rejected, or high risk. Trigger kinds, action types, and scopes are neutral. Identifiers, paths, cron, keys, and durations are mono.

## Frame

- `ModuleLayout` renders the scroll region. Every page root is `WorkspacePage`. Detail pages use `ProjectPageHeader` with `crumbs`; list pages have none.
- No organization selected renders `NoOrgNotice` inside `WorkspacePage`, never a bare `Notice`.
- Page-level loading renders `DetailLoading` (header plus readout geometry), never `animate-pulse` blocks.

## Page anatomy

1. `ProjectPageHeader`: the sidebar label as title (details use the record's name), one line of purpose, a meta line of mono facts, status pills in `badges`, actions right. One primary action.
2. `Readouts`: 2 to 6 real readings. The overview and lists describe the loaded collection and say so in the sub line.
3. Work surface: `Sheet` + `SheetTable` for collections, `Sheet` + `Sequence` for definitions and runs, `FactGrid` for record facts, `Panel` for payloads and the danger zone.
4. States inside the surface: `SheetLoading`, `SheetEmpty`, `SheetError` with "Try again".

## Signature: the sequence spine

`Sequence` (`src/modules/automation/components/automation-ui.tsx`) is an ordered list with a 1px `--border` spine on the left and one marker per stage. Markers are small mono ordinals; a stage's state colours its marker only (green passed, amber waiting, red failed). Workflow detail renders trigger, conditions, and actions as one spine. Run detail renders the steps on the same spine with retry "From here". Dry runs render condition results on it. Approval detail shows the gated action as the highlighted stage.

## Refuse

- `PageHero`, `HeroFacts`, `StatCard`, `IconChip`, `EmptyPanel` with an icon, and icons beside panel titles.
- Uppercase tracked labels, eyebrows, `--brand` as a link or hover colour. Links are `TextLink` or `RowTitle`.
- shadcn `Table` or observe `Table` inside a `Panel`; card grids for templates, runs, or approvals.
- `rounded-xl` and up, `rounded-[9px]` to `rounded-[16px]`, `shadow-*`, `backdrop-blur`, gradients, `animate-pulse`.
- Invented numbers. Readouts derived from a sampled page say how big the sample is.
