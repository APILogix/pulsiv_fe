# Product

<!-- impeccable:product-schema 1 -->

> Inferred from the repository and the first request; the user said "continue" to the confirmation round instead of correcting it. Facts marked (inferred) should be confirmed when convenient.

## Platform

web

## Users

- Primary (inferred): on-call and backend engineers who open Sentinel during a shift or an incident to see whether their APIs are healthy, what broke, and where.
- Secondary (inferred): engineering leads and leadership reading the Executive, Release and Business dashboards to judge reliability, release quality, and product usage without digging into raw events.

## Product Purpose

Sentinel is AI-powered API observability (page title: "Sentinel — AI-powered API observability"). SDKs in each project send requests, errors, traces, spans, and metrics; Sentinel turns them into dashboards, error groups, alerts, and automated workflows so teams find and fix API problems before customers notice. Success is a user knowing within seconds whether something needs their attention, and where to go next.

## Positioning

Observability with a model watching alongside the human (inferred): anomaly detection and suggested fixes appear inline, clearly marked as model output, next to the telemetry they explain.

## Operating Context

- Multi-tenant: organizations contain projects; routes are org-scoped (`/:orgSlug/...`).
- Surrounding workflows in the console: alerting (incidents, rules, escalations, silences), automation workflows, SSO/SCIM, billing, audit.
- Dashboards set: Home (`/dashboard`), Dashboards overview, and ten role dashboards: Executive, Performance, Errors, Geo, Traffic (realtime), Service map (tracing), Infrastructure, Security, Releases, Business. Scheduled reports live under Dashboards too.

## Capabilities and Constraints

- Stack: React 19, Vite, Tailwind v4, react-router 7, TanStack Query, zustand, hand-rolled SVG charts (no chart library).
- Dashboard pages currently run without a backend: they must render complete, deterministic sample data and make no API calls (user decision, first request). Real API wiring returns later behind the same data seams.
- Dark theme only; `prefers-contrast: more` is the accessibility variant. Tokens live in `src/app/index.css`.
- Model output (`--ai`) is a distinct channel and must never be confused with measured telemetry.

## Brand Commitments

- Name: Sentinel. Existing app-wide foundation (zinc dark tokens, Inter UI, JetBrains Mono for data) is shared with every other surface and stays.

## Evidence on Hand

- No real customer data in the frontend. All dashboard figures are synthetic sample data and must read as such (a visible "Sample data" marker), never as claims about real customers or benchmarks.

## Product Principles

1. Attention first: every page answers "is anything wrong, and where" before anything else.
2. Numbers carry the page; colour means state, never decoration.
3. Model output is labelled and separable from measurement.
4. Each dashboard serves one role's question; no two pages should read the same.
