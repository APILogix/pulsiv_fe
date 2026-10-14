# Organization

Mode: Operate. Every page under the Organization sidebar item (`/:org/admin/*`): dashboard, team, SSO, SCIM, domains, security monitoring, audit logs, compliance, and settings.

## Direction

THESIS: the organization is a control plane. Each page owns one set of controls (who is in, how they sign in, what gets recorded) and opens with the current state of those controls, then the surface that changes them. The dashboard is the ledger of every control with a link to the page that owns it. Refuses the incumbent drift: a hero with four tinted stat tiles, icon-chip panels in rainbow tones, progress rings standing in for content, card grids for lists, and full-bleed pages with no reading width.

OWN-WORLD: the Mono tokens, unchanged ([workspaces](../workspaces/DESIGN.md) is the sibling record). Zinc canvas, `--bg1` sheets with one hairline, no shadows or gradients. Green means enforced or healthy, amber means partial or needs action, red means failed or destructive. Everything else, including roles and plan names, is neutral.

## Frame

- `ModuleLayout` renders the scroll region. Every page root is `WorkspacePage` (1400px rail, 24px rhythm). Settings-style columns use `SETTINGS_COLUMN`.
- Links inside the area use `useAdminHref()` from `src/modules/organizations/components/org-page.ts`, so they stay org-scoped.

## Page anatomy

1. `ProjectPageHeader`: title is the sidebar label (the dashboard uses the organization name), one line of purpose, a meta line with the page's control state (for example "Enforcement: Required"), actions right.
2. `Readouts`: 2 to 6 real readings for the whole collection. Tone only for state.
3. Work surface: `Sheet` + `SheetTable` or `SheetList` for collections, stacked `Panel`s for configuration, with setup guidance in a `SplitShell` rail only where a real sequence exists (SSO, SCIM, domains).
4. States inside the surface: `SheetLoading`, `SheetEmpty`, `SheetError`.

## Signature: the controls ledger

The dashboard's first work surface is a `Sheet` titled "Access controls". One row per control: single sign-on, SCIM provisioning, verified domains, MFA requirement, session timeout, audit log retention. Each row has the control name, one line of what it currently does, the value in mono, a state `Pill`, and a text link to the page that owns it. The owning page repeats the same state in its header meta line, so the ledger and the page never disagree.

## Refuse

- `StatCard`, `HeroFacts`, `Ring`, `IconChip`, and icons beside panel titles.
- Uppercase tracked labels, eyebrows, `--brand` as a link or icon colour.
- The observe `Table` inside a `Panel`, and card grids for members, domains, tokens, or providers.
- `rounded-xl` and up, `shadow-*` on page surfaces, `backdrop-blur`, gradients, glows.
- Invented numbers. Compliance still reads demo data; its page says so.
