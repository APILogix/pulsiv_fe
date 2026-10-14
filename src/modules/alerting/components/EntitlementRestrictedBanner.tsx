import { Link } from "react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useNotificationEntitlement, useProjectAlertingStatus } from "../hooks/useAlerting";
import { useProjectMembers } from "@/modules/projects/hooks/useMembers";
import type { ProjectMember } from "@/modules/projects/api/types";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { orgRoutes } from "@/app/router/org-routes";
import { Button as UiButton } from "@/components/ui/button";
import { Pill } from "@/shared/ui/pulse";
import { cn } from "@/lib/utils";

interface EntitlementRestrictedBannerProps {
  projectId?: string;
  className?: string;
  showOwnerDetails?: boolean;
}

/** Connector channels the plan does not include. Named, not decorated. */
const LOCKED_CHANNELS = ["Slack", "Discord", "Teams", "PagerDuty", "Webhook"];

/**
 * Delivery notice for alerting surfaces (design/alerting/DESIGN.md).
 * One hairline sheet, state carried by an amber pill, one action on the right.
 * Renders nothing when connectors are available and configured.
 */
export function EntitlementRestrictedBanner({
  projectId,
  className,
  showOwnerDetails = true,
}: EntitlementRestrictedBannerProps) {
  const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
  const { isRestricted } = useNotificationEntitlement();
  const { data: alertingStatus } = useProjectAlertingStatus(projectId);
  const { data: memberPage } = useProjectMembers(projectId ?? "", { status: "active" });

  // Older member endpoints returned `{ members }` instead of `{ data }`.
  const legacy = memberPage as unknown as { members?: ProjectMember[] } | undefined;
  const members: ProjectMember[] = memberPage?.data ?? legacy?.members ?? [];
  const ownerMember = members.find((m) => m.role === "owner") ?? members[0];
  const ownerUser = ownerMember?.user;
  const ownerEmail = alertingStatus?.projectOwner?.email || ownerUser?.email;
  const ownerName = ownerUser?.fullName || (ownerEmail ? ownerEmail.split("@")[0] : "Project owner");

  const emailOnly = isRestricted || (alertingStatus && !alertingStatus.connectorAccess.allowed);
  const unconfigured =
    !emailOnly &&
    alertingStatus &&
    alertingStatus.connectorAccess.allowed &&
    !alertingStatus.connectorStatus.configured;

  if (!emailOnly && !unconfigured) return null;

  const title = emailOnly ? "Email fallback is active" : "No notification connector configured";
  const body = emailOnly
    ? "Your current plan doesn't include notification connectors. Alerts will continue to be sent to the project owner by email."
    : "Alerts are currently sent to the project owner by email. Configure a connector to route notifications to Slack, PagerDuty, Discord, or webhooks.";

  return (
    <section
      aria-label={emailOnly ? "Email-only alert delivery notice" : "No connector configured notice"}
      className={cn(
        "min-w-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--amber)]/25 bg-[var(--bg1)]",
        className,
      )}
    >
      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[13px] font-semibold text-[var(--text)]">{title}</h2>
            <Pill tone="amber" dot>
              {emailOnly ? "Email only" : "Setup needed"}
            </Pill>
          </div>
          <p className="mt-1.5 max-w-[72ch] text-[13px] leading-[1.6] text-[var(--text2)]">{body}</p>
          {emailOnly && (
            <p className="mt-2 text-[12px] text-[var(--text3)]">
              Not on this plan: <span className="text-[var(--text2)]">{LOCKED_CHANNELS.join(", ")}</span>
            </p>
          )}
        </div>

        <UiButton asChild variant="outline" size="lg" className="shrink-0 self-start">
          <Link
            to={emailOnly ? orgRoutes.billing(activeOrgSlug) : orgRoutes.connectors(activeOrgSlug, "integrations")}
          >
            {emailOnly ? "Upgrade plan" : "Configure connector"}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </UiButton>
      </div>

      {showOwnerDetails && projectId && (
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-[var(--border)] px-5 py-3 text-[12px]">
          <dl className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <dt className="text-[var(--text3)]">{emailOnly ? "Currently routing to" : "Default destination"}</dt>
            <dd className="flex min-w-0 items-center gap-2">
              {emailOnly && <span className="text-[var(--text)]">{ownerName}</span>}
              <span className="truncate font-[family-name:var(--mono)] text-[11.5px] text-[var(--text2)]">
                {ownerEmail || "No verified email configured"}
              </span>
            </dd>
          </dl>
          {emailOnly && !ownerEmail && (
            <p className="flex items-center gap-1.5 text-[var(--red)]">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              Owner email is not verified. Add a verified profile email so alerts can be delivered.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
