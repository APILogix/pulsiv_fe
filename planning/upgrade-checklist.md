# Upgrade Checklist

Status key: **✅ done** · **➖ inherited** (covered by a shared boundary/primitive, no per-page
work needed) · **⬜ open** (still to do).

## Phase coverage

| Phase | Deliverable | Status |
|---|---|---|
| 1 | Full frontend audit, ranked | ✅ `planning/frontend-audit-report.md` |
| 2 | Premium startup animation, fades into dashboard | ✅ `AppBootstrapLoader` + `AppBootstrapGate` |
| 3 | Page-specific skeletons for every route | ✅ 27 skeletons + URL resolver |
| 4 | Workflow progress for CRUD | ✅ machine + 11 presets; wired into org, project, API key |
| 5 | Empty state animations with CTA | ✅ 12 illustrations; wired into both shared list surfaces + `EmptyState` |
| 6 | Sidebar motion | ✅ shared-layout indicator, prefetch, tooltips, accordion fix |
| 7 | Page transition system (<200ms, no flash) | ✅ entrance-only `PageTransition` |
| 8 | Micro-interaction library | ✅ `interactions.tsx` + base primitives upgraded |
| 9 | Scroll experience | ✅ restoration in 4 containers, passive listeners, sticky header, scroll-to-top |
| 10 | Optimistic/streamed data UX | ✅ `AnimatedSkeleton`, `CounterAnimation`, chart animation, `LiveValue` |
| 11 | AI interaction motion | ✅ `ai.tsx` (streaming, thinking, autoscroll, prompts) |
| 12 | Accessibility | ✅ audited in the report; reduced motion, focus trap, ARIA |
| 13 | React performance audit + fixes | ✅ report section + prefetch, listener and boot-path fixes |
| 14 | Reusable motion architecture | ✅ `planning/motion-architecture.md` |
| 15 | Constraints respected (no broken auth/routing/themes) | ✅ no auth, guard, permission or theme logic touched |
| — | Before/after Web Vitals numbers | ⬜ needs a terminal — see below |

## Route skeleton coverage

Resolved from the URL by `shared/skeletons/RouteSkeleton.tsx`. Every entry below has a
purpose-built shape, not a generic rectangle.

| Route family | Skeleton |
|---|---|
| `/`, `/dashboard`, `/dashboards/:persona` | `DashboardSkeleton` (KPI row → dual charts → ranked table) |
| `/dashboards`, `/dashboards/overview` | `DashboardGallerySkeleton` |
| `/dashboards/geo`, `/services/dependencies` | `GeoSkeleton` (map slab + regional list) |
| `/observability/requests`, `/events`, `/traces` | `ExplorerTableSkeleton` (filters → histogram → dense table) |
| `/observability/logs` | `LogsSkeleton` (timestamp gutter + mono stream) |
| `/observability/errors` | `ErrorGroupsSkeleton` (grouped rows + occurrence sparklines) |
| `/observability/traces/:id` | `TraceWaterfallSkeleton` (indented spans, offset bars) |
| `/observability/service-health`, `/services/slos`, `/ingestion/health` | `ServiceHealthSkeleton` |
| `/observability/{latency,metrics,profiling,runtime-metrics,event-loop,gc-monitoring}` | `MetricsSkeleton` (small multiples) |
| `/:org/projects` | `ProjectsSkeleton` |
| `/:org/p/:id/overview` | `ProjectOverviewSkeleton` |
| `/:org/p/:id/{environments,api-keys}`, `/ingestion/keys` | `KeysSkeleton` |
| `/:org/p/:id/members`, `/admin/team`, `/account/activity/active-sessions`, `/auth/sessions` | `MembersSkeleton` |
| `/alerts` | `AlertsSkeleton` (tabs → KPI → severity table) |
| `/alerts/{rules,escalations,routing}`, project alert rules, `/ingestion/rate-limits` | `RulesSkeleton` |
| `/automation/workflows` | `WorkflowsSkeleton` (node-graph previews) |
| `/ai`, `/ai/{investigations,knowledge}` | `AiOverviewSkeleton` |
| `/ai/assistant` | `AiConversationSkeleton` (transcript + composer) |
| `/billing`, `/super-admin/billing` | `BillingSkeleton` |
| `/admin/*`, `/settings/*`, `/account/*`, `/developer/*`, project settings | `SettingsSkeleton` |
| `/admin/{audit-logs,security-events}`, `/connectors/audit`, `/automation/{events,audit}`, project activity/deliveries | `AuditSkeleton` |
| `/connectors/integrations`, `/alerts/templates`, `/automation/templates`, project connectors/channels | `IntegrationsSkeleton` |
| `*/new`, `/onboarding/*`, alert route wizard | `WizardSkeleton` (step rail + form) |
| any `/…/:id` detail | `DetailSkeleton` (breadcrumb, tabs, panels + metadata rail) |
| unmatched | `GenericPageSkeleton` |

## Workflow progress coverage

| Operation | Preset | Status |
|---|---|---|
| Create organization | `ORGANIZATION_WORKFLOW` (6 steps) | ✅ `CreateOrganizationPage` |
| Create project | `PROJECT_WORKFLOW` (5 steps) | ✅ `CreateProjectWizardPage` |
| Create API key | `API_KEY_WORKFLOW` (3 steps) | ✅ `ProjectApiKeysPage` |
| Any project dialog | via `FormDialog` `workflowSteps`/`workflowState` props | ➖ one prop pair per call site |
| Connector / Slack connect | `CONNECTOR_WORKFLOW` | ⬜ preset ready, not wired |
| Create alert rule | `ALERT_RULE_WORKFLOW` | ⬜ preset ready, not wired |
| Invite member | `INVITE_MEMBER_WORKFLOW` | ⬜ preset ready, not wired |
| Billing checkout | `BILLING_WORKFLOW` | ⬜ preset ready, not wired |
| Create environment | `ENVIRONMENT_WORKFLOW` | ⬜ preset ready, not wired |
| Create webhook | `WEBHOOK_WORKFLOW` | ⬜ preset ready, not wired |
| Verify domain | `DOMAIN_WORKFLOW` | ⬜ preset ready, not wired |

Wiring pattern for the remaining ones is three lines:

```tsx
const workflow = useWorkflow(CONNECTOR_WORKFLOW);
void workflow.run(() => mutation.mutateAsync(payload), { onSuccess: … });
<WorkflowOverlay open={workflow.isActive} title="…" steps={CONNECTOR_WORKFLOW} state={workflow} />
```

## No-regression checks performed by inspection

- Auth guards untouched: `RequireAuth`, `AuthenticatedAppLayout`, `route-guards.tsx`, auth store.
- Routing shape unchanged: no path added, removed or renamed. Only per-route loading wrappers
  were removed, and their job moved up to the layout boundaries.
- Both themes: every new surface uses `var(--…)` tokens only. No hard-coded colour was
  introduced — the two places that needed a concrete colour to animate were reworked to animate
  `opacity` over a tokenised background instead (`LiveValue`, `FieldFeedback`, boot pips).
- Responsive: skeletons and empty states use the same breakpoint utilities as the pages they
  stand in for.
- React Query cache: `QueryProvider` untouched. The module-scoped boundary was chosen
  specifically so intra-module navigation does not unmount query subscribers.
- Zustand: no store shape changed.
- React Compiler: no manual `useMemo`/`useCallback`/`React.memo` added in any new file.

## Outstanding verification (requires a terminal)

1. `npm run build` — type-check + bundle. **Not run in this session** (no shell access).
2. `npm run lint`.
3. Bundle size before/after, from the Vite output.
4. Lighthouse / Web Vitals capture (LCP, INP, CLS, TBT) against the target of 95+.
5. Manual click-through: one route per family above, plus a reduced-motion pass
   (DevTools → Rendering → Emulate `prefers-reduced-motion`) and a keyboard-only pass through
   the sidebar, a dialog and the drawer.
