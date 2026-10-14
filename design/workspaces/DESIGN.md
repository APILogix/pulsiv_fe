# Workspaces

Mode: Operate. The projects list (`/:org/projects`), project creation (`/:org/projects/new`), and every tab of a selected project (`/:org/p/:publicId/*`): overview, analytics, usage, activity, environments, API keys, remote config, incidents, alert rules, channels, routing and route detail, connectors, delivery log, dead letters, my notifications, members, and settings.

## Direction

THESIS: a project is one instrument with many tabs, and every tab uses the same structure. Title, one line of purpose, one readout band, then one work surface. Switching tabs changes the content, not the layout. Refuses the incumbent drift: tabs with no title, floating stat tiles, card grids for lists, tables boxed inside panels, uppercase mono labels, and centred icon-chip empty states.

OWN-WORLD: the Mono tokens as they are ([dashboards](../dashboards/DESIGN.md), [observe](../observe/DESIGN.md)). Zinc canvas, `--bg1` sheets with one `--border` hairline, no shadows, glows, or gradients. Green, amber, and red mean healthy, degrading, and broken, nothing else. Cyan appears only on model output.

## Shell

- `ProjectShellPage` renders the scope bar (`ProjectHeaderBar`: breadcrumb, status pill, timezone, environment scope, lifecycle menu) and one scroll region. It centres every tab on the 1400px `WORKSPACE_RAIL`, so no tab sets its own outer width.
- The workspace flyout (`ActiveProjectNav`) is the only project navigation. Tabs never add a second one.
- Height-bound editors use `PROJECT_FILL_HEIGHT`, never `FillPage`. `FillPage` does not account for the scope bar, so it overflows by 52px.

## Page anatomy

Every page follows this order and skips what it doesn't need:

1. `ProjectPageHeader`: 22px title (the tab's name; the overview uses the project's name), one 13px `--text2` line of purpose, an optional meta line (12px `--text3` label, `--text2` value, mono only for identifiers), and actions on the right. Tabs have no breadcrumb because the scope bar carries it. Use `crumbs` only for pages below a list, such as a route detail or the new-project form.
2. `Readouts`: one hairline band of 2–6 readings for the whole collection, not the filtered view. Each has a 12px label, a 22px mono value, and a 12px line of context. Tone only for state.
3. Work surface:
   - Collections use `Sheet`. It holds an optional title row, a toolbar row (`SearchField`, `FilterSelect`, `SegmentedControl`, `ToolbarCount`), then `SheetTable` or `SheetList`, and an optional footer for pagination and footnotes. Rows are 52px with hairline dividers. The identity cell is `RowTitle`: the name as a `--text` link, then one quiet line under it. Secondary and destructive actions go in `RowActions`, a single overflow menu per row. Deleted, revoked, and archived rows use `muted`.
   - Settings use stacked `Panel`s in `SETTINGS_COLUMN` (880px). Toggles are `TogglePanelRow` or `SettingRow` inside `RowStack`. Save lives in the panel footer. The destructive panel is last and uses `danger`.
   - Charts use `Panel` with neutral series. Performance and usage charts follow the observe record.
4. States live inside the surface: `SheetLoading` keeps the rows' geometry, `SheetEmpty` says what fills the list and offers the next step, and `SheetError` names the failure and offers "Try again".

Views inside one page use `PageTabs` (underline, arrow-key navigation) with `pageTabPanelProps`. Filters use `SegmentedControl`.

## Primitives: `src/modules/projects/components/project-page.tsx`

| Primitive | Use |
|---|---|
| `WorkspacePage` | Page root: rail, 24px zone rhythm. |
| `ProjectPageHeader` | Title, purpose, meta line, badges, actions, optional crumbs. |
| `Readouts` | The readout band. Replaces `StatCard` and `HeroFacts` rows. |
| `Sheet` | Collection or settings container with head, toolbar, body, and footer. |
| `SheetTable`, `SheetRow`, `SheetCell`, `RowTitle` | Semantic table with no border of its own. `SheetRow onActivate` adds click-to-open; the row still needs a real link. Use `HIDE_BELOW_*` on a column and its cells. |
| `SheetList`, `SheetListItem` | One-link rows and free-form rows. |
| `SheetLoading`, `SheetEmpty`, `SheetError` | States inside a sheet. |
| `RowActions` | Per-row overflow menu. |
| `PageTabs`, `pageTabPanelProps` | Views inside a page. |
| `TextLink`, `SearchField`, `ToolbarCount` | `--text` links with a `--border2` underline, instant filter input, and result count. |

Dialogs keep `FormDialog`, `ConfirmDialog`, and `DialogField` (`project-ui.tsx`). Field labels are 13px sentence case. Mono is for the value, never the label.

## Refuse

- `StatCard` grids, `HeroFacts`, `IconChip` on pages, icon glyphs beside panel titles, and centred icon-plus-title empty states.
- Uppercase tracked labels (`uppercase tracking-*`) anywhere in the workspace.
- `--brand` as a link or icon colour. It is white and reads as body text. Links are `TextLink`.
- The observe `Table` inside a `Panel` (two borders, a nested scroll). Use `Sheet` and `SheetTable`.
- Card grids for collections of equivalent records. Environments, keys, channels, connectors, and members are rows.
- `rounded-xl`, `rounded-2xl`, fixed `rounded-[12px]` and `rounded-[14px]`, `shadow-*`, `backdrop-blur`, `pulse-edge`, gradients, and glows on panels. Panels use `--radius-lg`, controls `--radius`.
- Invented numbers, and copy that claims something the system doesn't do.
