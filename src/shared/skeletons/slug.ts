/** Strip the trailing slash so `/alerts/` and `/alerts` resolve identically. */
export function normalize(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export const TOP_LEVEL_UNSCOPED = new Set([
  "auth",
  "accept-invite",
  "loading",
  "onboarding",
]);

export const KNOWN_MODULE_ROOTS = new Set([
  "dashboard",
  "dashboards",
  "observability",
  "services",
  "projects",
  "p",
  "alerts",
  "automation",
  "ingestion",
  "ai",
  "admin",
  "super-admin",
  "billing",
  "connectors",
  "developer",
  "settings",
  "account",
  "team",
]);

/**
 * Normalizes an application URL by stripping the `:orgSlug` prefix if present.
 * For example:
 *   `/acme/observability/traces` -> `/observability/traces`
 *   `/acme/p/prj_123/remote-config` -> `/p/prj_123/remote-config`
 *   `/acme/billing` -> `/billing`
 *   `/auth/login` -> `/auth/login`
 *   `/dashboard` -> `/dashboard`
 */
export function stripOrgSlug(pathname: string): string {
  const norm = normalize(pathname);
  const segments = norm.split("/").filter(Boolean);
  if (segments.length === 0) return "/";

  // Public/unscoped top-level roots
  if (TOP_LEVEL_UNSCOPED.has(segments[0])) {
    return norm;
  }

  // Already a known root without org slug
  if (KNOWN_MODULE_ROOTS.has(segments[0])) {
    return norm;
  }

  // Legacy root or single org slug e.g. /acme
  if (segments.length === 1) {
    return "/dashboard";
  }

  // Strip orgSlug segment
  return "/" + segments.slice(1).join("/");
}
