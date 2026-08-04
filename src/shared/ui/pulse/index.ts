/**
 * Pulse surface kit.
 *
 * Composition layer above `@/shared/observe` primitives. Everything here is
 * driven by the theme tokens declared in `src/app/index.css`, so surfaces
 * inherit light/dark automatically. Use these for org, billing, auth, and
 * developer surfaces instead of hand-rolling card markup per page.
 */
export * from "./surfaces";
export * from "./metrics";
export * from "./controls";
export * from "./auth";
export * from "./chart-tooltip";
