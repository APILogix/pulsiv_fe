/**
 * Organization surface helpers (design/organization/DESIGN.md).
 *
 * Organization pages are built from the workspace anatomy in
 * src/modules/projects/components/project-page.tsx. This file only holds the
 * pieces that are specific to the organization area.
 */
import { orgRoutes } from "@/app/router/org-routes";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";

/**
 * Org-scoped links for the admin area. Unscoped `/admin/...` paths still work
 * through a redirect, but this skips the extra hop.
 *
 * `href()` is the dashboard, `href("team")` is `/:orgSlug/admin/team`.
 */
export function useAdminHref() {
  const { activeOrgSlug } = useOrganizations();
  return (sub?: string) => orgRoutes.admin(activeOrgSlug, sub);
}

/** Control state vocabulary shared by the dashboard ledger and each owning page. */
export type ControlState = "enforced" | "active" | "partial" | "off" | "unknown";

/** The words the ledger and every owning page use for a control's state. */
export const CONTROL_LABEL: Record<ControlState, string> = {
  enforced: "Enforced",
  active: "On",
  partial: "Needs attention",
  off: "Off",
  unknown: "Unknown",
};

export const CONTROL_TONE: Record<ControlState, "green" | "amber" | "neutral"> = {
  enforced: "green",
  active: "green",
  partial: "amber",
  off: "neutral",
  unknown: "neutral",
};
