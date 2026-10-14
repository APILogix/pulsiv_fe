# Sentinel design

Index of surface-level design records for the Sentinel console. Tokens live in
`src/app/index.css`; this folder records the decisions made on top of them, one
folder per surface.

| Surface | Record | Status |
|---|---|---|
| Auth (sign in, register, recovery, second factor, invites) | [auth/DESIGN.md](auth/DESIGN.md) | Shipped |
| Dashboards (Home, Dashboards overview, ten role boards: departure-board ledger) | [dashboards/DESIGN.md](dashboards/DESIGN.md) | Redesigned |
| Observe (signal explorers, performance pages, event detail) | [observe/DESIGN.md](observe/DESIGN.md) | Shipped |
| Workspaces (projects list, project creation, every project tab) | [workspaces/DESIGN.md](workspaces/DESIGN.md) | Shipped |
| Organization (dashboard, team, SSO, SCIM, domains, security, audit, compliance, settings) | [organization/DESIGN.md](organization/DESIGN.md) | Shipped |
| Alerting (overview, incidents, events, rules, escalations, templates, silences, routing, metrics, dead letters) | [alerting/DESIGN.md](alerting/DESIGN.md) | Shipped |
| Workflows (automation overview, workflows, templates, runs, approvals, event inbox, audit) | [automation/DESIGN.md](automation/DESIGN.md) | Shipped |

## Shared foundations

- Theme: dark only, cool zinc neutrals (`--bg` to `--bg3`, `--border`, `--border2`, `--text` to `--text3`). No light theme; `prefers-contrast: more` replaces it.
- Colour channels: `--brand` is the product (white in Mono), `--green`/`--red`/`--amber` are truth (state), `--ai` is model output only. Colour never decorates chrome.
- Type: Inter for UI, JetBrains Mono only for code, data, identifiers, and measurements. Tracking stays between -0.02em and -0.035em on headings.
- Radius: `--radius` (6px) for controls, `--radius-lg` (10px) for larger surfaces.
- Motion: one authored moment per surface, exponential ease-out, disabled under `prefers-reduced-motion`.

## Adding a surface record

Create `design/<surface>/DESIGN.md` with: the mode (Persuade, Operate, Read, Experience), layout, primitives, per-page rules, and a "refuse" list. Link it in the table above.
